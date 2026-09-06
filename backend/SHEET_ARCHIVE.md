# Sheet Archive & Corruption Guard

Protection for the offline-sales pipeline against a corrupted Google Sheet.

## Why this exists

Every region sync is **wipe-and-replace**. `offlineSyncService.syncFromGoogleSheet()` runs
`deleteMany({})` and then re-inserts, inside one transaction:

```ts
await prisma.$transaction(async (tx) => {
  const preserveMap = await this.buildPreserveMap(txModel);
  await txModel.deleteMany({});                       // ← every row gone
  syncResult = await this.processData(rows, targetModel, txModel, preserveMap);
});
```

That is fine when the sheet is healthy. When it isn't — someone deletes a tab, a filter
hides most rows, the sheet stops being publicly shared and Google serves an HTML sign-in
page with HTTP 200 — the sync destroys good data and replaces it with nothing. The daily
cron and the on-every-boot sync mean this can happen unattended, overnight.

Two layers address that:

1. **The guard** stops a corrupted export from being imported at all. Nothing is deleted,
   so there is nothing to recover from.
2. **The archive** records every export and every pre-wipe table state in a *separate
   database*, so even a failure the guard doesn't catch is recoverable.

## What gets stored

All of it lives in the archive database, never in the application DB.

| Table | Holds | Purpose |
|---|---|---|
| `sheet_dumps` | Gzipped raw bytes of every sheet export ever fetched, SHA-256, parsed totals, guard verdict | Rebuild from any past export |
| `table_snapshots` | Gzipped JSONL of a region table's full contents, captured immediately before each wipe | Exact point-in-time restore |
| `restore_events` | Who restored what, when | Audit trail |

Byte-identical repeat exports store their bytes once and reference the first copy — the
sheet is re-fetched on every boot as well as daily, so unchanged days would otherwise
dominate storage.

## The one rule

**The archive never falls back to the application database.** With `ARCHIVE_DATABASE_URL`
unset, the whole feature is inert: no tables, no rows, no queries, no guard, and the sync
runs exactly as it did before this code existed. Deploying it changes nothing until you
deliberately point it at an archive DB.

The only thing this feature ever does to the application DB is **read** it — to snapshot a
table before the sync wipes it. It writes to it only during a restore you explicitly run.

## Deploying to the VPS

Ordered so that nothing changes the running service until the archive has proved itself.
Steps 1–5 are safe with the backend still serving traffic.

### 1. Ship the code

Pushing to `main` triggers `.github/workflows/deploy.yml`, which SSHes into the VPS,
resets to `origin/main`, runs `npm install` + `npm run build`, and restarts PM2.

**Safe to push before any of the setup below.** Without `ARCHIVE_DATABASE_URL` the feature
is completely inert — the deploy ships dormant code and the sync behaves exactly as it
does today.

The workflow runs a plain `npm install` (not `--omit=dev`), which matters: the `archive:*`
commands run through `tsx`, a devDependency — the same requirement the `sync:*` scripts have.

If deploying by hand instead:

```bash
cd /var/www/app && git pull
cd backend && npm install && npm run build
```

### 2. Provision the archive Postgres

The application database is a Postgres **container** on this same VPS, publishing 5432.
The archive gets its own container, its own named volume, and a different port — do NOT
`apt install postgresql`, which would fight the existing container for port 5432.

Check what is already running and match the major version:

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
df -h                    # room for the archive volume?
```

```bash
docker run -d --name rk-archive-db --restart unless-stopped \
  -e POSTGRES_USER=rk_archive \
  -e POSTGRES_PASSWORD=CHANGE_ME \
  -e POSTGRES_DB=rk_archive \
  -v rk_archive_data:/var/lib/postgresql/data \
  -p 127.0.0.1:5433:5432 \
  postgres:16-alpine
```

Two details that matter:

- **`-p 127.0.0.1:5433:5432`** — bound to loopback only. A bare `-p 5433:5432` publishes
  the archive to the public internet, since Docker writes its own iptables rules and
  bypasses `ufw`.
- **`-v rk_archive_data:...`** — a named volume, so `docker rm` on the container does not
  destroy the archive.

The backend runs on the host under PM2, so it reaches this at `localhost:5433`.

Sizing: budget roughly **10–15 MB/day** across all six regions before retention kicks in —
the largest region snapshots to ~3 MB gzipped. The prune ladder caps long-term growth at a
few hundred MB.

### 2b. What this isolation does and does not buy

A second container on the same VPS is a genuinely separate database: separate process,
separate storage, separate credentials. It survives everything that makes the archive
worth having in the first place —

- a corrupted sheet wiping a live table (the whole point),
- a bad migration, a dropped table, a mistaken `deleteMany`,
- credentials for the application DB leaking.

It does **not** survive loss of the VPS itself — host failure, disk failure, or the volume
being deleted takes both databases at once.

Weigh that against the source-of-truth chain: an ERP export feeds the Google Sheets, and
the sheets feed the database. **Losing the VPS alone is recoverable** — re-provision and
re-sync from the sheets. The genuinely unrecoverable case is losing the VPS *while the
sheets are also in a bad state*, which is a narrow window but precisely the one this
archive exists to cover.

`scripts/archive-backup.sh` produces one portable, integrity-checked dump per night:

```bash
cd /var/www/app/backend
./scripts/archive-backup.sh                        # -> /var/backups/rk-archive/
BACKUP_DIR=/mnt/data/bk KEEP_DAYS=60 ./scripts/archive-backup.sh
```

It writes to a `.partial` file first (so a crash cannot leave a truncated file that looks
valid), verifies the gzip, rotates anything older than `KEEP_DAYS`, and logs sizes.

That still leaves the dump on the same disk. To close the gap properly, uncomment one line
at the bottom of the script — `rclone` to Google Drive or B2, or `scp` to a second machine.
**Before building that**, check whether Hostinger's VPS snapshots are enabled on your plan;
if they are and the retention suits you, host loss may already be covered.

### 3. Add the env vars

In `/var/www/app/backend/.env`:

```bash
ARCHIVE_DATABASE_URL="postgresql://rk_archive:CHANGE_ME@localhost:5433/rk_archive"
ARCHIVE_GUARD=block
```

Note the port: **5433**, the archive container. 5432 is the application database.

`.env` is untracked, so this survives `git pull` but must be set by hand on the server.

### 4. Prove the archive DB works — before it touches anything

```bash
cd /var/www/app/backend
npm run archive:smoketest
```

Expect `✅ 37 passed, 0 failed`. It writes and deletes its own rows under the reserved
region `__smoketest__` and never touches real data. **If this fails, stop here** — the
running backend is still untouched, and the fix is a connection-string or permissions
problem, not a code problem.

### 5. Create the schema and take a first restore point

```bash
npm run archive:init -- --now
```

Snapshots all six live tables immediately, so a restore point exists *before* the guard
is ever in a position to matter. Expect a `snapshot #N` line per region.

### 6. Restart

```bash
pm2 restart backend --update-env    # --update-env is required to pick up .env changes
pm2 save
```

`--update-env` matters: without it PM2 reuses the old environment and
`ARCHIVE_DATABASE_URL` is silently ignored.

The boot sync fires ~5 s later (`SYNC_ON_STARTUP` defaults on), which produces the first
archived dumps. **That first run cannot be blocked** — a region with no accepted baseline
always passes the volume checks. Guarding only begins from the second run onward.

### 7. Schedule the prune

```bash
crontab -e
```

```
30 7 * * * cd /var/www/app/backend && /usr/bin/npm run archive:prune >> /var/log/rk-archive-prune.log 2>&1
45 7 * * * cd /var/www/app/backend && ./scripts/archive-backup.sh >> /var/log/rk-archive-backup.log 2>&1
```

Prune first, then dump — so the nightly file reflects the retained set rather than blobs
that are about to be cleared.

### Rolling back

Set `ARCHIVE_ENABLED=false` (or remove `ARCHIVE_DATABASE_URL`) and
`pm2 restart backend --update-env`. The feature goes fully inert and the sync reverts to
its previous behaviour. Nothing needs to be uninstalled, and the archived data stays put.

To keep archiving but stop it ever failing a sync, use `ARCHIVE_GUARD=warn` instead.

### A note on Vercel

The scheduler only runs under `src/index.ts` (the VPS entrypoint), but the route-triggered
syncs on Vercel go through the same code path. Leave `ARCHIVE_DATABASE_URL` **unset** in
the Vercel project unless the archive DB is reachable from there — a VPS-local Postgres on
`localhost` is not. Unset means inert, which is the correct default there.

## Verifying it works

### Immediately after the restart

```bash
pm2 logs backend --lines 80
```

Expect, per region:

```
[archive] snapshot #1 delhi: 46461 rows, 26.7MB → 2.9MB gzipped
[SYNC] Wiping and inserting data for googleSheetOfflineSale atomically inside transaction...
  - Archived as dump #1
```

Seeing `[archive] ARCHIVE_DATABASE_URL is not set` instead means step 3 or the
`--update-env` in step 6 didn't take.

### Confirm what was captured

```bash
npm run archive:list                 # every region should show verdict=accepted
npm run archive:list -- --snapshots  # restorable=yes, row counts matching the dashboard
npm run archive:list -- --stats      # storage totals and per-region last-accepted times
```

Cross-check one row count against the live dashboard. They should match exactly — the
snapshot is taken from the table, not from the sheet.

### Confirm the main DB is untouched

```bash
```bash
docker exec rk-archive-db psql -U rk_archive -d rk_archive -c "\dt"
```

Expect exactly three: `sheet_dumps`, `table_snapshots`, `restore_events`. Then confirm
they exist **only** there and not in the application database:

```bash
# against the application Postgres container (adjust the name/user to match docker ps)
docker exec <main-db-container> psql -U <user> -d rajkamal_db -c "
  SELECT table_name FROM information_schema.tables
   WHERE table_schema='public'
     AND table_name IN ('sheet_dumps','table_snapshots','restore_events');"
# expect: (0 rows)
```

### Confirm the guard actually guards

The honest test is a real rejection:

```bash
npm run archive:verify-guard                      # defaults to bookfair
npm run archive:verify-guard -- --region delhi
```

This feeds a deliberately corrupt export through the exact path a real sheet takes, then
checks that the guard refused it, that the live row count is unchanged, and that the bad
export was archived anyway:

```
Verifying the guard on "bookfair" (ARCHIVE_GUARD=block)

  live rows before: 500
[archive] REFUSING to import bookfair: not_an_html_error_page — ... no longer shared.
  live rows after:  500

  ✓ the guard rejected the corrupt export
  ✓ THE LIVE TABLE WAS NOT MODIFIED
  ✓ the corrupt export was archived anyway
  ✓ it is recorded as rejected
```

**Safe to run against production.** A rejected export throws before `deleteMany()` runs,
so the live table cannot be modified — and the command verifies that rather than assuming
it. The rejected dump never becomes a baseline, so it has no effect on later syncs and
there is nothing to clean up afterwards.

### Confirm a restore actually restores

The backup you have not tested is not a backup. On a quiet day:

```bash
npm run archive:list -- --snapshots --region bookfair
npm run archive:restore -- --snapshot <id> --dry-run
```

The dry run reports what it would write without touching anything. For a full rehearsal,
run it for real on the smallest region — the command prints the exact undo command, and
took a safety snapshot before writing.

### Ongoing

`/api/archive/status` (authenticated) reports `configured`, `guardMode`, storage totals
and per-region last-accepted timestamps. A region whose `last_accepted` stops advancing is
a region whose syncs are being rejected.

## Day-to-day

```bash
npm run archive:list                          # recent exports and their verdicts
npm run archive:list -- --region delhi
npm run archive:list -- --snapshots           # restore points
npm run archive:list -- --stats               # storage and coverage
```

Or over HTTP (authenticated):

```
GET  /api/archive/status
GET  /api/archive/dumps?region=delhi&limit=30
GET  /api/archive/snapshots?region=delhi
GET  /api/archive/dumps/:id/download          # the original CSV, as fetched
POST /api/archive/restore                     # admin only, needs confirm:true
```

## When the guard blocks a sync

The region's sync fails, the other five continue, and the failure appears in `sync_logs`
and on `/health`. The live table still holds yesterday's data — the dashboard keeps
working.

```
[archive] REFUSING to import delhi: row_count_stable — 12000 rows vs 100000 previously
          (floor 70000, 70% of baseline). Live table left untouched (baseline dump #41).
```

Then:

```bash
npm run archive:list -- --region delhi          # see the verdict and its checks
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/api/archive/dumps/42/download -o suspect.csv
```

If the sheet was genuinely broken, fix the sheet and re-run `npm run sync:delhi`.

If the export was actually correct — a real, legitimate collapse in the data — import it
explicitly:

```bash
npm run archive:approve -- --dump 42 --dry-run   # preview
npm run archive:approve -- --dump 42             # import it
```

## Restoring

```bash
npm run archive:list -- --snapshots --region delhi
npm run archive:restore -- --snapshot 137 --dry-run
npm run archive:restore -- --snapshot 137
```

Restoring from a **snapshot** replays the exact rows the table held — no re-parsing, no
dependency on the sheet still existing. This is the one to reach for.

Restoring from a **dump** re-parses an archived export through the live parser. Use it to
import a rejected export, or to rebuild from a point where no snapshot survives retention.

Both wipe and replace inside one transaction, and both snapshot the current contents
first — so a restore is itself undoable. The command prints the undo:

```
Safety snapshot of the previous contents: #204
Undo this restore:  npm run archive:restore -- --snapshot 204
```

## Retention

Metadata rows are kept forever; only the gzipped bodies age out, on a
grandfather-father-son ladder — every capture for 30 days, then one per week for 26 weeks,
then one per month indefinitely.

```bash
npm run archive:prune -- --dry-run
npm run archive:prune
```

Worth running from cron on the VPS:

```
30 7 * * * cd /path/to/backend && /usr/bin/npm run archive:prune >> /var/log/rk-archive-prune.log 2>&1
```

A dump whose bytes are borrowed by a deduped copy is never pruned out from under it.

## Tuning

Full list in `env.example`. The two that matter most:

- `ARCHIVE_GUARD` — `block` (default), `warn`, or `off`. Start at `block`.
- `ARCHIVE_GUARD_MIN_ROW_RATIO` / `ARCHIVE_GUARD_MIN_AMOUNT_RATIO` — default `0.7`. An
  export below 70% of the last accepted one is treated as corrupted. Loosen toward `0.5`
  if a region legitimately swings hard day to day. These are a catastrophe brake, not a
  data-quality linter — a day where sales genuinely halve must not block the sync.

If snapshot storage becomes a problem, `ARCHIVE_SNAPSHOT_ROWS=false` keeps summaries only.
Restores then depend on replaying an archived export rather than a direct row replay.

## What the guard checks

| Check | Catches |
|---|---|
| `non_empty_response` | Empty body |
| `not_an_html_error_page` | Sheet no longer shared — Google serves an HTML sign-in page with HTTP 200 |
| `export_is_readable` | The parser threw on the response (`Invalid HTML: could not find <table>`) |
| `has_headers` | No header row |
| `has_core_columns` | A column the parser depends on was renamed or removed upstream |
| `has_data_rows` | Headers but no data (sheet open mid-edit) |
| `row_count_stable` | Rows collapsed vs the last accepted export |
| `amount_stable` | Revenue collapsed while row count looked fine (blanked formula column) |

Every check — passing or failing — is recorded on the dump, so a verdict can be reviewed
after the fact. A region's first-ever sync has no baseline and always passes the last two.

## Notes

- Archive writes are best-effort. A broken archive degrades to "no backup taken", never to
  "sync broken". The one exception is a guard rejection, which is deliberate.
- The application database is only ever **read** by this feature (to snapshot a table
  before the sync wipes it) and written by an explicit restore. All archive tables live in
  the archive DB; none are created in the application DB.
- The first two checks run on the fetched bytes **before** the workbook is parsed, because
  `XLSX.read` throws outright on some malformed responses. Archiving first means even an
  export the parser refuses is preserved, and the operator sees "the sheet is probably no
  longer shared" instead of a parser stack trace.
- The scheduler runs only under `src/index.ts` (the VPS entrypoint). Vercel uses
  `api/index.ts` and never starts the cron — but route-triggered syncs there are archived
  and guarded too.
- `parseRows` is now called twice per sync: once by the guard to evaluate what *would* be
  written, once by `processData` to write it. Costs a few hundred ms on the largest region
  and keeps the guard measuring the real parser's output rather than a lookalike.
