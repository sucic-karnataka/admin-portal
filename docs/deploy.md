# Deploying Admin Portal to Cloudflare Pages

Deployment is automated via GitHub Actions. Every push to `main` builds and deploys to Cloudflare Pages.

**Live URL:** `https://admin-portal-93k.pages.dev`  
**Workflow file:** `.github/workflows/deploy.yml`

---

## One-time Setup

### Step 1 — Create the Cloudflare Pages project

Run once from your local machine (must be logged in via `wrangler login`):

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx wrangler pages project create admin-portal --production-branch=main
```

> Note the assigned URL — it will look like `https://admin-portal-93k.pages.dev`.  
> If you are behind a corporate proxy (Zscaler etc.), prefix all `npx wrangler` commands with `NODE_TLS_REJECT_UNAUTHORIZED=0`.

---

### Step 2 — Update ADMIN_URL in all workers

Open each `wrangler.toml` and ensure `ADMIN_URL` matches the Pages URL:

```
cms-backend/cloudflare-membership-worker/wrangler.toml
cms-backend/cloudflare-books-worker/wrangler.toml
cms-backend/cloudflare-events-worker/wrangler.toml
```

```toml
ADMIN_URL = "https://admin-portal-93k.pages.dev"
```

Redeploy all three workers after changing:

```bash
cd cms-backend/cloudflare-membership-worker && NODE_TLS_REJECT_UNAUTHORIZED=0 npx wrangler deploy
cd ../cloudflare-books-worker               && NODE_TLS_REJECT_UNAUTHORIZED=0 npx wrangler deploy
cd ../cloudflare-events-worker              && NODE_TLS_REJECT_UNAUTHORIZED=0 npx wrangler deploy
```

---

### Step 3 — Create a Cloudflare API token

1. Go to `dash.cloudflare.com` → **My Profile** → **API Tokens** → **Create Token**
2. Choose **Custom Token**
3. Set the following permissions:

| Permission | Resource | Level |
|---|---|---|
| Cloudflare Pages | Account | Edit |
| User Details | User | Read |

4. Set **Account Resources** to your account. Leave Zone Resources as default.
5. Click **Create Token** and copy the value immediately — it is shown only once.

---

### Step 4 — Find your Cloudflare Account ID

`dash.cloudflare.com` → **Workers & Pages** — the Account ID is shown in the right-hand sidebar.

---

### Step 5 — Add GitHub repository secrets

Go to `github.com/anand-raj/admin-portal` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token from Step 3 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from Step 4 |

Use **Repository secrets** (not Environment secrets).

---

### Step 6 — Seed the first admin in the database

After the workers are deployed, add your GitHub login to the `admins` table in the `cms` D1 database:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx wrangler d1 execute cms --remote \
  --command "INSERT INTO admins (github_login, role, added_at) VALUES ('anand-raj', 'owner', datetime('now'))"
```

This is required to log in to the admin portal.

---

## Ongoing Deployments

Every `git push` to `main` automatically:

1. Runs `npm ci` — installs dependencies
2. Runs `npm run build` — outputs to `dist/`
3. Deploys `dist/` to Cloudflare Pages via `wrangler pages deploy`

Monitor runs at: `https://github.com/anand-raj/admin-portal/actions`

---

## Environment Variables

The portal reads these at build time (prefix with `VITE_` for Vite to expose them):

| Variable | Default (hardcoded fallback) | Purpose |
|---|---|---|
| `VITE_WORKER_URL` | `https://cms-membership.e-anandraj.workers.dev` | Membership worker |
| `VITE_BOOKS_WORKER_URL` | `https://cms-books.e-anandraj.workers.dev` | Books worker |
| `VITE_EVENTS_WORKER_URL` | `https://cms-events.e-anandraj.workers.dev` | Events worker |
| `VITE_OAUTH_URL` | `https://sveltia-cms-auth.e-anandraj.workers.dev` | GitHub OAuth proxy |
| `VITE_OAUTH_SITE_ID` | `anand-raj.github.io` | OAuth site identifier |

Set these in Cloudflare Pages → **Settings** → **Environment variables** only if the worker URLs differ from the defaults.

---

## Local Development

```bash
cd admin-portal
npm install
npm run dev   # http://localhost:5173
```

Worker CORS allows `localhost:5173` and `localhost:4173` for local testing.
