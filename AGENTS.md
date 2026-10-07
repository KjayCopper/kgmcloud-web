# Working Agreement — kgmcloud-web (Cosmos build)

## Layout
- Frontend: this repo (`C:\Opencode\kgmcloud-web`), Vue 3 + TS + Vite. Builds to GHCR (`ghcr.io/kjaycopper/kgmcloud-web`), deployed as Cosmos ServApp `kgmcloud-web`.
- Backend: repo `KjayCopper/kgmcloud-api`, local `C:\Opencode\kgmcloud-api` (Express + MySQL), image `ghcr.io/kjaycopper/kgmcloud-api`, Cosmos ServApp `kgmcloud-api`.
- Database: `kgmcloud` schema inside the `kgm-mysqli` ServApp container.
- FALLBACK: the original `KGMCloud` repo + `C:\Opencode\kgmcloud` (VPS deploy) stay untouched. Never push to them without being asked.

## Rules
1. Commit and push this repo automatically.
2. Backend changes: commit + push `kgmcloud-api` too, and TELL the user — they also sync server.js to the VPS fallback manually.
3. Database schema changes: NEVER put migrations in server.js. Give the user SQL and they run it in phpMyAdmin. Say clearly when SQL is required.
4. `scripts/` folder is deleted; do not recreate helper scripts there.
5. Container names are load-bearing: nginx proxies to hostname `kgmcloud-api`, API connects to `kgm-mysqli`. Never rename without updating nginx.conf/env.
