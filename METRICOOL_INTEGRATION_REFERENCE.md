# Metricool Integration — Reference Doc

Written as a build reference for **Social Flow**, a separate white-label social
media dashboard for multiple clients. Everything below was verified against
the **live Metricool API** during a working integration on the Rajkamal
Prakashan Samuh account, not derived from documentation alone — metric names
in particular are frequently wrong or misleading in Metricool's own docs, so
treat the tables in this doc as the source of truth over anything else.

## 1. Core concept: one Metricool account, many "brands" = many clients

Metricool's data model already matches a white-label multi-client product:

- One Metricool **account** (one login, one API token) can hold many
  **brands** (Metricool's term; internally identified by a numeric `blogId`).
- Each brand has its own connected social profiles (Facebook Page, Instagram
  Business account, YouTube channel, etc.) and its own analytics.
- **All brands under one account share the same `userId` and API token.**
  Only `blogId` changes per brand. This was confirmed live: 4 brands on one
  account, all with the same `userId`, different `blogId`s.

**For Social Flow: each client = one Metricool brand.** The "brand switcher"
built in this integration (see §7) *is* the client switcher — build Social
Flow's client-switching UI directly on this pattern rather than reinventing
it.

## 2. Authentication model

Every Metricool API call needs three things:

| Value | Where it comes from | Scope |
|---|---|---|
| `userToken` | API token, generated in Metricool's UI (Settings → API), sent as header `X-Mc-Auth: <token>` | Whole account |
| `userId` | Numeric ID, same across all brands on the account | Whole account |
| `blogId` | Numeric ID, one per brand/client | Per client |

All three are passed as **query parameters** (`userId`, `blogId`,
`userToken`) *and* the token again as the `X-Mc-Auth` header — Metricool's
API wants both.

Base URL: `https://app.metricool.com`. All analytics endpoints live under
`/api/v2/analytics/*`; admin/brand-listing endpoints under `/api/admin/*`.

**Gotcha already hit in production:** the three credential values silently
drift out of sync between local `.env` and deployed environments (this repo
runs on both Vercel and a VPS, with per-environment `.env` files that don't
travel with `git push`). Build a startup self-check (§8) into Social Flow
from day one — this exact failure mode caused ~2 weeks of silently-broken
data with only a barely-visible "Sample data" badge as a symptom.

## 3. Key endpoints

| Purpose | Endpoint | Notes |
|---|---|---|
| List all brands (clients) on the account | `GET /api/admin/simpleProfiles?userId=X` | Returns array of `PublicBlog` objects — see §7 for shape. **Not** `/api/admin/profile` (singular) — that one is deprecated per Metricool's own OpenAPI spec, still works today but shouldn't be relied on. |
| Timeline metrics (time-series) | `GET /api/v2/analytics/timelines` | Query params: `metric`, `network`, `subject`, `from`, `to`, `timezone`, plus the 3 auth params |
| Distribution metrics (breakdowns/demographics) | `GET /api/v2/analytics/distribution` | Same param shape as timelines |
| Posts/content list | `GET /api/v2/analytics/posts/{network}` | Per-network; returns `[]` (not an error) for networks with no post-list support (YouTube) |
| Competitors list | `GET /api/v2/analytics/competitors/{network}` | Returns `[]` until competitor profiles are manually added for that brand inside Metricool's own UI — **not** an API-controllable toggle |

### The `subject` parameter — the #1 source of bugs in this integration

Both `timelines` and `distribution` require a `subject` (`account`, `posts`,
`reels`, `stories`, `competitors`). **Never auto-guess `subject` from the
metric name.** This codebase originally had a heuristic:

```js
if (metricName.includes("post")) subject = "posts";
```

This silently broke every metric whose name happens to *contain* the
substring "post" but is actually an **account-level** metric —
`postsTypes` (content-type breakdown) and `postsCount` (accurate post
count) both got misrouted to `subject=posts` and 500'd with `"Not
implemented metric"`. **Always pass `subject` explicitly**, never infer it.

## 4. Per-network metric reference (verified live, per network)

This is the expensive part to rediscover — Metricool's API will happily
return `200 OK` with an **empty array** for a metric name that simply isn't
populated for a given account, which looks identical to "not supported" but
usually means "there's a different, correct metric name." The only reliable
way to find the full valid list is to send a deliberately invalid metric
value — Metricool's own validation error message lists every valid enum
value for that endpoint+network combination. Do this for every new network
you integrate, don't guess from docs.

### Facebook

**Timeline metrics** — full valid enum (found via intentional bad-metric
probe): `likes, pageViews, pageImpressions, page_posts_impressions,
page_actions_post_reactions_total, pageFollows, Follows, Unfollows,
page_daily_follows_unique, page_daily_unfollows_unique, page_media_view,
page_website_clicks_logged_in_unique, ctaClicks, page_total_actions,
postsCount, postsInteractions, pageImpressions.M, pageImpressions.F,
pageImpressions.U, pageImpressions.13-17, pageImpressions.18-24, ... (age
brackets), pageImpressions.65+`

| Use case | Metric to use | Status |
|---|---|---|
| Followers | `pageFollows` | ✅ real |
| New followers | `page_daily_follows_unique` | ✅ real |
| Lost followers | `page_daily_unfollows_unique` | ✅ real |
| Reach | `page_posts_impressions` | ✅ real |
| "Clicks"/page views | `page_media_view` | ✅ real — **not** `page_total_actions`/`ctaClicks`/`page_website_clicks_logged_in_unique` (all permanently empty, Meta deprecated these click-tracking fields broadly) |
| Reactions | `page_actions_post_reactions_total` | ✅ real |
| Post interactions/engagement | `postsInteractions` | ✅ real |
| Accurate post count for a period | `postsCount` | ✅ real (don't derive "post count" from `len(posts_list)` — that's whatever page size you fetched, not the true period total) |
| Raw `likes` | `likes` | ❌ permanently empty on Meta's side |
| Raw `pageImpressions` (no suffix) | `pageImpressions` | ❌ empty — use `page_posts_impressions` instead |
| Age/gender breakdown | `pageImpressions.M` / `.F` / `.13-17` etc. | ❌ all empty — Meta deprecated Facebook Page age/gender demographics ~Sept 2024, confirmed dead on live account |

**Distribution metrics** — full valid enum: `followersByCountry,
followersByCity, postsTypes, page_follows_city, page_follows_country,
reachByLocale`

| Use case | Metric to use | Status |
|---|---|---|
| Followers by country | `page_follows_country` | ✅ real — **not** `followersByCountry` (accepted by the API, returns `[]`) |
| Followers by city | `page_follows_city` | ✅ real — **not** `followersByCity` |
| Content type breakdown | `postsTypes` | ✅ real (needs explicit `subject: "account"`, see §3) |
| `reachByLocale` | — | ❌ empty, genuine dead end |

### Instagram

**Timeline metrics** — full valid enum: `email_contacts,
get_directions_clicks, phone_call_clicks, text_message_clicks,
clicks_total, delta_followers, Followers, Friends, impressions, reach,
profile_views, postsCount, postsInteractions, website_clicks, views,
accounts_engaged`

| Use case | Metric to use | Status |
|---|---|---|
| Likes (proxy) | `postsInteractions` | ✅ real |
| Impressions | `impressions` | ✅ real |
| Profile views | `profile_views` | ✅ real |
| Followers | `followers` (lowercase) | ✅ real — `Followers` (capitalized) also works and returns identical values, but there's no reason to use it |
| New/lost followers | `delta_followers` (same metric used for both directions) | ✅ real |
| Reach | `reach` | ✅ real |
| Clicks | `website_clicks` | ✅ real |
| Accurate post count | `postsCount` | ✅ real — same fix as Facebook's, don't derive from a fetched page length |
| Distinct engaged accounts | `accounts_engaged` | ✅ real, meaningfully different from reach/impressions |
| `views` | — | ✅ real but overlaps heavily with `impressions`; not essential to surface separately |
| `Friends` | — | ✅ real but trivially small (single digits) on a business account, not useful |
| Contact-button clicks (`email_contacts`, `get_directions_clicks`, `phone_call_clicks`, `text_message_clicks`, `clicks_total`) | — | ❌ all empty — not tracked for a standard business account |

**Distribution metrics** — full valid enum: `gender, age, country, city,
postsTypes`

| Use case | Metric to use | Status |
|---|---|---|
| Gender split | `gender` | ✅ real (needs explicit `subject: "account"`) |
| Age brackets | `age` | ✅ real (same requirement) |
| Country | `country` | ✅ real |
| City | `city` | ✅ real |
| Content type breakdown | `postsTypes` | ✅ real (needs explicit `subject: "account"` — this is the one that hits the subject-guessing bug from §3) |

### YouTube

Much more limited than Facebook/Instagram — confirmed exhaustively:

**Timeline metrics** — this is the **entire** valid enum, no more exist:
`totalSubscribers, views, totalVideos, subscribersGained, subscribersLost`
— all five are real and usable.

**Distribution/demographics**: the endpoint returns `500 Internal Server
Error` with `"Not implemented metric ... at YouTubeAnalyticsExtractor"` —
Metricool genuinely does not support YouTube demographics at all, for any
metric value. Don't build a Demographics tab for YouTube.

**Post/video list**: `GET /api/v2/analytics/posts/youtube` always returns
`{"data":[]}` regardless of date range — Metricool doesn't expose a
per-video list through this endpoint for YouTube. No per-video table to
build.

**So a YouTube tab should be exactly one section**: Channel Overview
(subscribers, views-this-period, videos-published-this-period, a growth
chart, and a subscribers-gained-vs-lost balance chart). Nothing else is
available.

### Competitors (Facebook & Instagram)

`GET /api/v2/analytics/competitors/{network}` returns `200 OK` with `[]`
until competitor profiles are added for that specific brand **inside
Metricool's own dashboard UI**. Confirmed:
- Not a plan/tier restriction (checked the account's plan limits —
  `influencersRestrictions` allows up to 100 Facebook/Instagram competitor
  entries on even the base tier used here).
- Not a per-brand toggle in the brand's own settings object (checked the
  full `PublicBlog` schema — no such field exists).
- Metricool's API does have an add-competitor endpoint
  (`GET /stats/influencers/add`), but it's from an older, separately
  undocumented part of the API with no published parameters. Don't call it
  blindly — either reverse-engineer it by watching Metricool's own web UI's
  network requests, or just tell the client to add competitors themselves in
  Metricool's dashboard.

**UI implication**: build the Competitors tab to hide/disable itself
dynamically per-client based on a live presence check (see §9), not as a
permanently visible tab — most clients won't have this configured.

## 5. Getting the brand (client) list

```
GET /api/admin/simpleProfiles?userId={userId}
```
Header: `X-Mc-Auth: {token}`

Returns an array of `PublicBlog` objects. Relevant fields for a
multi-client dashboard:

```ts
type PublicBlog = {
  id: number;              // this is the blogId — the client identifier
  label: string | null;    // display name, e.g. "Rajkamal Prakashan Samuh"
  picture: string | null;  // logo URL
  facebook: string | null;       // Facebook Page ID if connected, else null
  facebookPageId: string | null;
  instagram: string | null;      // Instagram handle if connected
  youtube: string | null;        // YouTube channel ID if connected
  facebookAds: string | null;    // Meta Ads account if connected
  linkedinCompany: string | null;
  tiktok: string | null;
  twitter: string | null;
  threads: string | null;
  pinterest: string | null;
  gmb: string | null;            // Google My Business
  bluesky: string | null;
  // ...many more per-network fields (pictures, display names, token
  // expirations) — see Metricool's swagger.json for the full PublicBlog
  // schema if you need them.
};
```

**A network being connected is just "this field is non-null."** There is
no separate boolean flag — build your "which tabs does this client have"
logic on `Boolean(brand.facebook)`, `Boolean(brand.instagram)`, etc.

This one endpoint is the entire basis for a dynamic, per-client tab system
— see §9.

## 6. Backend architecture (as built)

```
backend/src/config/metricool.ts     — low-level HTTP client, rate-limit queue, health tracking
backend/src/services/metricoolService.ts — typed wrappers per Metricool concept (timeline/distribution/posts/competitors/brands)
backend/src/routes/metricool.ts     — Express routes, auth middleware, zod validation
```

### Env vars

```
METRICOOL_BASE_URL=https://app.metricool.com
METRICOOL_API_TOKEN=<token>
METRICOOL_USER_ID=<numeric userId>
METRICOOL_BLOG_ID=<numeric blogId of the DEFAULT client, used when no blogId is specified in a request>
METRICOOL_DEFAULT_TIMEZONE=Asia/Kolkata   # optional, defaults to this
```

For a true multi-client product, `METRICOOL_BLOG_ID` is really just a
fallback default — every real request should carry an explicit `blogId`
resolved from whichever client is currently selected in the UI (see §7).

### Rate limiting / caching (config/metricool.ts)

- A request queue batches up to 5 parallel requests every 300ms
  (`MAX_PARALLEL_REQUESTS` / `REQUEST_INTERVAL_MS`) before hitting Metricool.
- 429 responses trigger exponential backoff retry (up to 3 retries),
  respecting `Retry-After` if present.
- Successful GET responses are cached in-process for 5 minutes
  (`TtlCache`), keyed by full URL (including query params) — this means the
  brand-list call (`/admin/simpleProfiles`) and any per-brand lookup that
  reads from the same cached response are effectively free after the first
  call.
- **This is process-local, in-memory caching.** If Social Flow runs on
  serverless (Vercel-style), this cache resets on every cold start — fine
  for correctness, just don't expect it to survive across invocations. If
  clients scale beyond a handful, consider Redis instead for anything that
  needs to survive restarts/scale horizontally.

### Health/self-check pattern (config/metricool.ts, services/metricoolService.ts, index.ts)

Built specifically because a stale token failed silently for ~2 weeks with
no visible symptom besides a small "Sample data" badge. The pattern:

1. Every real Metricool HTTP call records success/failure into an
   in-memory `metricoolHealth` object (timestamp + status + error message)
   — **no extra network calls**, this piggybacks on real traffic.
2. At process boot, fire one deliberate call (`runMetricoolStartupCheck`)
   to `fetchConnectedNetworks()`/brand-list, and log a loud, unmissable
   console line either way:
   - Success: `[Metricool] OK — connected to brand "X" (blogId Y). Networks: facebook, instagram, youtube`
   - Failure: `[Metricool] STARTUP CHECK FAILED — token/userId/blogId may be wrong or expired. Status: 401. Message: ...`
3. `/health` exposes the accumulated state (`configured` /
   `lastSuccessAt` / `lastFailureAt` / derived `status`: `unconfigured` |
   `unknown` | `ok` | `failing`) so uptime monitoring can alert on it.

**Port this pattern into Social Flow verbatim.** For a multi-client
product it matters even more — a broken credential for one client
shouldn't be discovered by that client complaining; it should page you.

## 7. Frontend architecture (as built)

```
frontend/src/services/metricoolApi.ts — typed fetchers, in-memory 15-min cache + request de-dup, metric-name alias tables
frontend/src/components/SocialDashboard.tsx — brand/client switcher + top-level network tabs
frontend/src/components/FacebookView.tsx
frontend/src/components/InstagramView.tsx
frontend/src/components/YouTubeView.tsx
frontend/src/components/socialMockData.ts — sample-data fallbacks, always badged, never silent
frontend/src/lib/countryNames.ts — shared ISO country code → name lookup
```

### The brand/client switcher (SocialDashboard.tsx)

This is the piece that matters most for Social Flow — it's already the
client switcher:

1. `fetchBrands()` → `GET /api/metricool/brands` → full list of clients
   with logo/name/connected-network flags, fetched once on mount.
2. Selected client's `blogId` is kept in component state, **persisted to
   `localStorage`** so it survives reloads, and defaults to `brands[0]` if
   nothing stored or the stored id no longer exists on the account.
3. **Tab visibility (`headerTabs`) is derived synchronously from the
   already-loaded `brands` array** — `IMPLEMENTED_NETWORKS.filter(key =>
   selectedBrand[key])`. This is deliberate: an earlier version fetched a
   separate "connected networks" endpoint on every brand switch, which
   created a race — the previous tab stayed selected and mounted against
   the *new* `blogId` for one render before the async check caught up,
   firing real requests against a client that didn't support that network
   (real 500s were observed). Deriving synchronously from data already in
   memory eliminates the race entirely. **Don't reintroduce a
   fetch-per-switch for tab visibility in Social Flow — derive it from
   whatever client list you already loaded.**
4. `IMPLEMENTED_NETWORKS` is a hardcoded array of networks you've actually
   built a view for (`["facebook", "instagram", "youtube"]` here) —
   intersected with what the selected client has connected. A network
   being connected in Metricool does **not** mean a tab appears; a view
   must exist for it too. (Rajkamal has YouTube connected; the YouTube tab
   only appeared once `YouTubeView.tsx` was actually built.)
5. Rendering a tab for a network with no view built, or with genuinely no
   data (Competitors), was explicitly rejected in favor of hiding the
   tab/section entirely — **no "Coming Soon" placeholders anywhere in this
   product.** Recommend the same discipline for Social Flow: every visible
   tab must be backed by real, working data for that specific client.

### Dynamic Competitors visibility (FacebookView.tsx / InstagramView.tsx)

Independent of the main tab-switch effect, each view does a lightweight
presence check on mount/client-switch:

```ts
useEffect(() => {
  fetchFacebookCompetitors({ from, to, blogId })
    .then(res => setHasCompetitors(!listIsEmpty(res.data?.items)))
    .catch(() => setHasCompetitors(false));
}, [range, blogId]);
```
and the sub-tab list is built conditionally:
```ts
...(hasCompetitors ? [{ key: "competitors", label: "COMPETITORS" }] : [])
```
Reuse this pattern for any feature that's Metricool-connected-but-optional
per client (not just competitors) — sensible default for a white-label
product where different clients will have wildly different levels of
Metricool configuration.

### The empty-data detection bug (worth flagging explicitly)

`InstagramView.tsx` originally had:
```ts
const imp = container?.impressions?.values ?? container?.impressions;
```
`container.impressions` was actually a **plain array** (not `{values:
[...]}`). `array.values` in JS resolves to the built-in
`Array.prototype.values` iterator method — always truthy, never `undefined`
— so the `??` fallback never triggered, and `Array.isArray(imp)` was
always `false`. Net effect: Instagram's growth chart was **permanently
stuck showing fabricated sample data**, independent of any credential
issue, for as long as this code existed. Silent, no error thrown anywhere.

**Lesson for Social Flow:** when writing an "is this data empty" check
against a value that might be a plain array *or* an object with a
`.values` property, never chain `?.values ?? rawValue` — write an explicit
helper:
```ts
function asSeriesArray(candidate: any): any[] {
  if (Array.isArray(candidate)) return candidate;
  if (Array.isArray(candidate?.values)) return candidate.values;
  return [];
}
```
and unit-test it against both shapes. This class of bug produced zero
errors/warnings and was only caught by manually eyeballing a chart and
noticing the numbers didn't match a direct API call.

### Sample-data fallback philosophy

Every section that fetches live data falls back to hand-written mock data
(`socialMockData.ts`) on empty/failed response, **always paired with a
visible "Sample data" badge** (`SampleDataBadge` component) — never a
silent substitution. This exists so the UI never looks broken/empty during
demos or transient failures, while making it impossible to mistake mock
numbers for real ones. Keep this for Social Flow; it's cheap insurance
against an angry client who thinks their real follower count dropped to
the mock value.

## 8. Verification method (use this for every new network you add)

The single most valuable technique from this integration: **don't trust
metric names from Metricool's documentation or from other integrations you
find online — verify live, every time.**

1. Get valid metric names for `timelines`/`distribution` + a given network
   by sending a request with a **deliberately invalid** metric string.
   Metricool's `InvalidEnumBaseException` error message lists every valid
   value:
   ```
   GET /api/v2/analytics/timelines?...&metric=bogus_probe&network=facebook&subject=account
   → 400 "Invalid field 'bogus_probe'. Valid values are: [likes, pageViews, ...]"
   ```
2. For every metric name that looks plausible for your use case, fetch it
   directly and check whether `values`/`data` is actually populated —
   `200 OK` with `[]` is not the same as "this metric doesn't exist," it
   usually means "wrong name, try a sibling."
3. Only wire a metric into UI once you've seen real, non-empty data for it
   on a real account with that network connected.

This is how every "stale metric name" bug in this integration (Facebook
demographics, Facebook clicks, Instagram content types) was actually
found — not by reading docs, by testing live.

## 9. Checklist for building Social Flow from this reference

- [ ] One Metricool API token per agency/reseller account; `blogId` is the
      per-client selector — don't provision separate tokens per client
      unless clients bring their own Metricool accounts.
- [ ] Client switcher built directly on `GET /api/admin/simpleProfiles`,
      synchronous tab-visibility derivation (§7), `localStorage`-persisted
      selection.
- [ ] Backend `blogId` as an optional override param on every analytics
      route, defaulting to an env var only as a fallback.
- [ ] Startup self-check + `/health` endpoint wired in from day one (§6).
- [ ] Per-network metric tables from §4 ported as-is — re-verify against a
      test account before shipping, but expect them to hold.
- [ ] Explicit `subject` on every request — never infer from metric name.
- [ ] Competitors (and any other optional-per-client feature) hidden by
      default, shown only after a live presence check.
- [ ] No "Coming Soon" tabs — a tab exists only once there's a real view
      wired to real data for it.
- [ ] Sample-data fallback always visibly badged, never silent.
- [ ] Rate-limit queue + response caching ported from `config/metricool.ts`
      — Metricool's API will 429 aggressively otherwise, especially with N
      clients' dashboards polling concurrently.
