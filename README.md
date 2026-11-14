# TAMJ IPTV Pro V18 — GitHub + Vercel

**Built from the supplied V17 TAMJ pages and original Vercel IPTV source.**

## Pages
- `/` Live TV (TAMJ V17 UI, Vercel API)
- `/movies.html` Movies & Series
- `/radio.html` Radio
- `/admin.html` Admin editor
- `/legacy-player.html` Original working IPTV player, preserved unmodified

## Deployment
1. Create a **private** GitHub repository and upload the contents of this folder (not its enclosing folder).
2. Import the repository in Vercel as an **Other** project, no build command.
3. Configure Vercel environment variables: `GITHUB_REPO=owner/repository`, `GITHUB_BRANCH=main`, `GITHUB_TOKEN=<fine-grained token with Contents Read and Write for this repository>`, `ADMIN_USER=admin`, `ADMIN_PASSWORD=admin` (temporary test credentials only), and `ADMIN_SECRET=<long random secret>`. Redeploy after adding them.
4. Visit `/admin.html` to add channels, movies and radio. Saving commits the data JSON to your GitHub repository.

**Important:** Without `GITHUB_REPO` and `GITHUB_TOKEN`, viewers can read bundled data, but the admin cannot save. A token is never placed in public HTML. Changing the JSON in GitHub triggers a Vercel redeploy; the API also fetches live data from GitHub. Do not commit sensitive keys or license credentials to a public repository. Use only streams and keys you are authorized to distribute.

## Playback
The original player is retained at `/legacy-player.html` and still uses the existing Koyeb gateway. The TAMJ pages also use the existing Koyeb gateway for HTTP DASH/HLS requests; this gateway is an external dependency and may not support every host. DASH/Shaka, HLS, TS/FLV, MP4 and audio support depend on codec, browser, network and provider authorization. Widevine requires an authorized license server.

## Known limitations
- This is a source migration with static checks, not an end-to-end verified production release.
- TMDB discovery is not wired to an API key; manually saved movie library works.
- Analytics returns 0 until a persistent viewer tracking backend is configured.
- The default `admin/admin` credentials are **unsafe for a public deployment**. Set a strong password before enabling public access.
- GitHub JSON writes are low-volume admin storage, not a high-concurrency database; simultaneous edits may conflict.
- Public channel JSON contains playback settings; do not store confidential credentials in public data.

## V19 channel import fix
- Bundled `data/channels.json` now contains **155** unique channels from the original `channels.json`, with the previously edited V8 channels taking precedence by name.
- `data/categories.json` is populated from the channel categories.
- When remote GitHub `data/channels.json` is empty, the API temporarily uses the bundled list. The first admin save commits the combined list to GitHub.
- **Important:** Admin saving requires `GITHUB_REPO`, `GITHUB_TOKEN`, `GITHUB_BRANCH` and the three admin authentication variables configured in Vercel. `ADMIN_USER`, `ADMIN_PASSWORD` and `ADMIN_SECRET` are now mandatory; no insecure fallback credentials.
- After deploying, open `/api/data` and check that `channels` contains the imported list, then log in at `/admin.html` and test a harmless edit.
- The original IPTV `channels.json`, `channels.m3u`, `legacy-player.html`, and `iptv/` are preserved. Imported stream URLs may expire, require provider permission, or fail because of DRM/CORS; importing does not guarantee playback.
