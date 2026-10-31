# Vegas Buddy

Happy hours, food deals, and free attractions across Las Vegas, on an interactive map.

## Tech Stack

- React 19.2, Vite 8.2, skateboard 5.6.0, skateboard-ui 5.1.0
- Leaflet 1.9.4 for interactive maps
- Zero-crate Rust backend, SQLite via libsqlite3
- Tailwind CSS v4

## Setup

```bash
npm install
npm run start          # Frontend :5173
cd backend && cargo run   # Backend :8000
```

## Scripts

- `npm run start` — Frontend dev server
- `npm run build` — Production frontend build
- `npm test` — Typecheck, build, and docs checks
- `cd backend && cargo run` — Rust API on :8000
- `cd backend && cargo test --locked` — Backend tests

## Routes

**Public:** `/`, `/terms`, `/privacy`, `/subs`, `/eula`
**Protected:** `/app/*` (authentication required)

## Deploy

The `Dockerfile` builds the frontend and backend into one image that serves on port 8000. Set `NODE_ENV=production`, `JWT_SECRET` (32+ characters), `CORS_ORIGINS`, and `FRONTEND_URL` in your host's environment. Stripe variables are optional because the app is free. See [docs/DEPLOY.md](docs/DEPLOY.md).

## Configuration

- `src/constants.json` holds the app name, tagline and site URL. `url` and `companyWebsite` ship as `example.com`; set your own domain before deploying (robots.txt, sitemap.xml and OpenGraph tags use it).
- Venue photos are optional and not included. Put a file in `public/images/` and set the venue's `image` field in `src/assets/*.json` to its file name. Venues without a photo show a text-only card.

## Map Tiles

Map tiles come from OpenStreetMap's public tile servers. Follow the [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) and the [attribution requirements](https://www.openstreetmap.org/copyright); the attribution must stay visible on the map. Heavy or production deployments should use their own tile server or a commercial tile provider.

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">
  Made with <a href="https://github.com/stevederico/skateboard">Skateboard</a> — a React boilerplate with auth and payments
</div>
