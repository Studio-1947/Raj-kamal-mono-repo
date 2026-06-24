# Raj-Kamal Project — Final Deployment Documentation

**Status:** ✅ Live and working
**Frontend:** https://dashboard-rk.duckdns.org
**Backend API:** https://dashboard-rk.duckdns.org/api/...
**Server:** Hostinger KVM 2, Debian 13, IP `187.127.185.82`
**Repo:** https://github.com/Studio-1947/Raj-kamal-mono-repo (public)

---

# PART A — CODE CHANGES NEEDED (do these in your codebase, then redeploy)

This is the checklist of things to fix **in your actual code**, not just on the server. Go through each one.

## A1. Frontend — Fix the API base URL

Your frontend must call the backend through the live domain, not `localhost`.

**Find** anywhere in `frontend/src` that has something like:
```js
const API_BASE_URL = "http://localhost:4000";
```
or hardcoded `http://localhost:4000/api/...` inside fetch/axios calls.

**Replace with an environment-based URL:**
```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
```

Then create `frontend/.env.production`:
```
VITE_API_BASE_URL=/api
```

Using the **relative path `/api`** (not the full domain) is best practice — it means your frontend will always hit whatever domain it's currently served from. This also means if the client buys a real domain later, you don't need to touch this again.

> Rebuild after this change: `npm run build`

## A2. Backend — Fix CORS to allow your real domain

Find your CORS setup in the backend (usually in `app.js`/`index.js`/`server.ts`, something like):
```js
app.use(cors());
```
or
```js
app.use(cors({ origin: "http://localhost:5173" }));
```

**Replace with:**
```js
const allowedOrigins = [
  "https://dashboard-rk.duckdns.org",
  "http://localhost:5173",   // keep for local dev
  "http://localhost:3000"    // keep for local dev
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
```

> If the client later buys a real domain, add that domain to `allowedOrigins` and redeploy.

## A3. Backend — Set production environment

In `/var/www/app/backend/.env` on the server (not committed to GitHub):
```
NODE_ENV=production
PORT=4000
```

Confirm code in `index.js`/`server.ts` reads `process.env.PORT` instead of a hardcoded port — search for `app.listen(` and check it uses `process.env.PORT || 4000`.

## A4. Backend — Double check your `.env` has everything production needs

Things commonly missed:
- Database connection string pointing to production DB (not local DB)
- Google Sheets API credentials/service account JSON path
- JWT secret / session secret
- Any third-party API keys

## A5. Frontend — Reduce bundle size (performance, not breaking, but important)

Current build outputs a **21MB JS bundle** (5.5MB gzipped). In `frontend/vite.config.ts`, add:

```ts
export default defineConfig({
  // ...existing config
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          // add other large dependencies you import a lot, e.g.:
          // dnd: ['@dnd-kit/core'],
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

Rebuild and redeploy after this — should noticeably reduce load time further.

## A6. `.gitignore` — make sure these are excluded

Check `backend/.gitignore` and `frontend/.gitignore` contain:
```
.env
.env.production
node_modules/
dist/
error.log
```

---

# PART B — SERVER ARCHITECTURE (what's actually running)

```
Internet
   │
   ▼
https://dashboard-rk.duckdns.org  (DuckDNS → 187.127.185.82)
   │
   ▼
Nginx (port 80/443, SSL via Let's Encrypt)
   │
   ├── /api/*  → proxy → localhost:4000 (Node/Express backend, via PM2)
   │
   └── /*      → serves static files directly from
                 /var/www/app/frontend/dist  (Vite build output)
```

**Key decision:** Frontend is served as **static files by Nginx directly** — no PM2/Node process needed for it, since Vite builds to plain HTML/CSS/JS. Only the backend runs under PM2.

---

# PART C — FULL DEPLOYMENT STEPS (what was actually done)

## C1. Server prep
```bash
apt update && apt upgrade -y
apt install -y curl git ufw nginx
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## C2. Node.js + PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## C3. Clone repo (public — HTTPS, no key needed)
```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/Studio-1947/Raj-kamal-mono-repo.git app
```

## C4. Backend setup
```bash
cd /var/www/app/backend
npm install
nano .env              # add PORT=4000, NODE_ENV=production, DB creds, etc.
npm run build           # compiles TypeScript → dist/src/index.js
```

> ⚠️ **Known quirk:** `tsconfig.json` has `rootDir: "./"`, so compiled output lands at `dist/src/index.js`, NOT `dist/index.js`. The `start` script in `package.json` was corrected to:
> ```json
> "start": "node dist/src/index.js"
> ```

```bash
pm2 start npm --name "backend" --cwd /var/www/app/backend -- run start
pm2 save
pm2 startup              # run the command it prints
```

## C5. Frontend setup (static build, no PM2 needed)
```bash
cd /var/www/app/frontend
npm install
npm run build             # outputs to dist/
```

## C6. DuckDNS (free domain, no purchase needed)
1. Created subdomain at https://www.duckdns.org → `dashboard-rk.duckdns.org`
2. Pointed it to server IP: `187.127.185.82`

> Note: DuckDNS domains should be "refreshed" periodically or they can expire. Since the IP is static, consider a cron job hitting the DuckDNS update URL weekly (optional, low priority since this is a temporary/testing domain — see Part D).

## C7. Nginx config
```bash
sudo tee /etc/nginx/sites-available/dashboard-rk.duckdns.org > /dev/null << 'EOF'
server {
    listen 80;
    server_name dashboard-rk.duckdns.org;

    root /var/www/app/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/dashboard-rk.duckdns.org /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

> ⚠️ **Gotcha hit during setup:** an old config file named `yourdomain.com` was still symlinked in `sites-enabled/`, silently overriding the new config and causing persistent 502 errors. It was removed:
> ```bash
> sudo rm /etc/nginx/sites-enabled/yourdomain.com
> sudo rm /etc/nginx/sites-available/yourdomain.com
> ```
> **Lesson:** only one config file should exist per site in `sites-enabled/`. Always check `ls -la /etc/nginx/sites-enabled/` if changes don't seem to take effect.

## C8. Gzip compression (performance)
Edited `/etc/nginx/nginx.conf`, uncommented and confirmed these lines exist inside the `http {}` block:
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_buffers 16 8k;
gzip_http_version 1.1;
gzip_types text/plain text/css application/json application/javascript application/x-javascript text/javascript text/xml application/xml application/xml+rss;
```
```bash
sudo nginx -t
sudo systemctl restart nginx
```
**Result:** main JS bundle dropped from 21.3MB → 5.5MB over the wire.

## C9. HTTPS via Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard-rk.duckdns.org
```
- Certificate valid until **2026-09-22**
- Auto-renewal already scheduled by Certbot (no action needed)
- Nginx config automatically updated to redirect HTTP → HTTPS

---

# PART D — THINGS STILL TO DO / KEEP IN MIND

| Item | Why it matters | Priority |
|---|---|---|
| Apply Part A code changes (CORS, API base URL, NODE_ENV) and redeploy | Without this, things may break for real users even though the server itself works | **High** |
| Code-split frontend bundle (Part A5) | 21MB bundle is still large even gzipped; slows first load | Medium |
| Move to a real domain when client decides | DuckDNS is fine for testing/sharing now, but a real domain is better long-term (no expiry risk, better branding) | Medium — whenever client is ready |
| Set up GitHub Actions auto-deploy | Currently every update requires manually SSHing in, `git pull`, rebuilding, restarting | Low — convenience only |
| Confirm `.env` has production DB/API keys, not local/dev ones | Easy to miss; check before treating this as "production-ready" | High |
| Consider DuckDNS keep-alive cron (optional) | Prevents the free subdomain from going stale | Low |

---

# PART E — UPDATING CODE GOING FORWARD (deploy checklist)

Every time you push new code to GitHub:

```bash
cd /var/www/app
git pull

cd backend
npm install
npm run build
pm2 restart backend

cd ../frontend
npm install
npm run build
# no restart needed — Nginx serves the new dist/ files immediately
```

---

# PART F — PM2 COMMAND REFERENCE

## Status & Monitoring
```bash
pm2 list                      # table: id, name, status, cpu, memory, restarts
pm2 show backend               # detailed info on one process
pm2 monit                      # live CPU/memory dashboard
```

## Logs
```bash
pm2 logs                       # live logs, all processes
pm2 logs backend                # live logs, one process
pm2 logs backend --lines 50     # last 50 lines, no streaming
pm2 logs backend --err          # only error logs
pm2 flush                       # clear all log files
```

## Start / Stop / Restart / Delete
```bash
pm2 start npm --name "backend" --cwd /var/www/app/backend -- run start
pm2 restart backend
pm2 stop backend
pm2 delete backend
pm2 restart all
pm2 delete all                  # use carefully
```

## Persistence
```bash
pm2 save                        # snapshot current process list
pm2 startup                     # enable PM2 auto-start on reboot
pm2 resurrect                   # reload last saved snapshot manually
```

## Diagnostics
```bash
pm2 list                        # check restart count — climbing fast = crash loop
pm2 describe backend             # full JSON: exec path, args, env vars, restarts
pm2 env 0                        # environment variables for process id 0
```

---

# PART G — HEALTH CHECK COMMANDS (run anytime to verify everything is alive)

```bash
pm2 list                                              # backend online, low restarts?
curl -I https://dashboard-rk.duckdns.org              # frontend → 200 OK?
curl https://dashboard-rk.duckdns.org/api/health      # backend → {"status":"OK"}?
sudo nginx -t                                          # Nginx config still valid?
df -h                                                   # disk space okay?
sudo certbot certificates                              # SSL cert still valid/not expiring soon?
```

---

# PART I — CI/CD: AUTO-DEPLOY ON PUSH TO `main`

This sets up **GitHub Actions** so that every `git push` to `main` automatically SSHes into the VPS, pulls the latest code, rebuilds both apps, and restarts the backend — no manual server login needed ever again.

## I1. Generate a dedicated deploy key (on the server)

Don't reuse your personal SSH key. Create one just for GitHub Actions:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
cat ~/.ssh/github_actions_deploy.pub
```

Add that **public** key to the server's authorized keys so GitHub Actions is allowed to log in:

```bash
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
```

Now get the **private** key (you'll paste this into GitHub, never into your code):

```bash
cat ~/.ssh/github_actions_deploy
```

Copy the entire output, including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines.

## I2. Add GitHub repository secrets

On GitHub: go to your repo → **Settings → Secrets and variables → Actions → New repository secret**. Add these four:

| Secret name | Value |
|---|---|
| `VPS_HOST` | `187.127.185.82` |
| `VPS_USERNAME` | `deploy` |
| `VPS_SSH_KEY` | (paste the entire private key from step I1) |
| `VPS_PORT` | `22` (default SSH port, unless changed) |

## I3. Create the workflow file

In your repo, create the file **`.github/workflows/deploy.yml`** with this content:

```yaml
name: Deploy to VPS

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: |
            cd /var/www/app
            git pull origin main

            cd backend
            npm install
            npm run build
            pm2 restart backend

            cd ../frontend
            npm install
            npm run build

            echo "Deployment completed successfully"
```

Commit and push this file to `main` (or via a PR merged into `main`).

## I4. Test it

Make any small change locally, then:

```bash
git add .
git commit -m "test: trigger auto deploy"
git push origin main
```

Go to your GitHub repo → **Actions** tab. You should see a workflow run start automatically, named "Deploy to VPS." Click into it to watch each step run live — clone, build, restart.

If it succeeds, your app on `https://dashboard-rk.duckdns.org` is now updated automatically, with zero manual server work.

## I5. What this does NOT do (good to know)

- It does **not** run on pull requests or other branches — only direct pushes/merges to `main`
- It does **not** roll back automatically if a build fails midway — if `npm run build` fails, `pm2 restart backend` won't run, but whatever was already running stays online (it won't take the site down, but also won't apply your broken change)
- It does **not** notify you anywhere by default — GitHub will show a ❌ on the Actions tab and on the commit, but won't email/Slack you unless you add that separately

## I6. Optional safety upgrade (later, not urgent)

Right now any push to `main` deploys instantly. If you want a manual approval step before production deploys (recommended once the client is actively using this), GitHub Actions supports **environments with required reviewers** — ask if you want this added later.

---

# PART H — ERRORS HIT DURING SETUP (reference log)

| Error | Root Cause | Fix Applied |
|---|---|---|
| `Permission denied (publickey)` on `git clone` | Used SSH URL on a public repo | Switched to HTTPS clone URL |
| `MODULE_NOT_FOUND: dist/index.js` | `tsconfig.json` mirrors folder structure into `dist/`, real file at `dist/src/index.js` | Fixed `start` script path in `package.json` |
| `EADDRINUSE: address already in use :::4000` | Duplicate PM2 processes bound to same port from repeated restarts | `pm2 delete all`, restarted clean |
| `Missing script: "start"` (frontend) | Vite projects don't have a `start` script by default (assumed Next.js convention incorrectly) | Switched to static file serving via Nginx instead of PM2/Node for frontend |
| `502 Bad Gateway` (persisted after fix) | Old Nginx config file (`yourdomain.com`) still active in `sites-enabled/`, overriding the corrected one | Removed the stale config file and symlink |
| Slow page load | Unminified gzip config (`gzip_types` commented out) + 21MB JS bundle | Enabled full gzip config; bundle splitting still pending (Part A5) |
| `"environment":"development"` in health check | `.env` missing/incorrect `NODE_ENV` | Set `NODE_ENV=production` |
