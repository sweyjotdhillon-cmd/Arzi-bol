# Arzi-bol Project Rules & Engineering Standards

These rules are mandatory for all changes in `https://github.com/sweyjotdhillon-cmd/Arzi-bol`.

## 1. Git, Sync & Pull Request Workflow

- **Always sync before working**: Before starting any task or editing files, fetch and pull the latest changes from `origin/main` so work is always based on up-to-date files with zero merge conflicts.
- **Push all changes**: All code changes must be committed and pushed to GitHub.
- **Automated PR creation ("You create a PR")**:
  1. Run the local `gateway` quality-gate script (`./scripts/gateway.sh` on Linux/macOS/Docker or `./scripts/gateway.ps1` on Windows) and ensure it passes with zero errors.
  2. Push the feature branch to `origin`.
  3. Create the PR via GitHub CLI (`gh pr create`).
  4. Monitor and verify that all GitHub CLI / GitHub Actions checks (`gh pr checks`) pass before reporting completion. Never leave a failing build undetected.

## 2. Mandatory End-to-End Gateway Verification

At the end of **every** change, run the `gateway` script (`scripts/gateway.sh` or `scripts/gateway.ps1`):
- Confirms zero git conflict markers or trailing-whitespace/merge issues.
- Scans for leaked secrets, credentials, `.env` files, or private keys.
- Runs linting, typechecking, unit/integration tests, and production build checks.
- Validates Docker/CLI/cross-platform readiness when applicable.
- Confirms `gh` CLI and GitHub Actions status when creating/updating PRs.

## 3. Security & Credential Hygiene (Zero-Tolerance)

This project integrates multiple external APIs and credentials. Every change must be free of security vulnerabilities, bugs, technical flaws, and logical flaws:
- **No secrets in code or client bundles**: Never hardcode API keys, tokens, passwords, or database credentials in source files. Never expose secret keys in client-side env prefixes (`NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`).
- **`.env` protection**: Keep `.env` files gitignored. Provide `.env.example` with placeholder values only.
- **Auth & Authorization**: Every protected API route must authenticate before handling requests (`401` if unauthenticated) and verify resource ownership (`403` if unauthorized).
- **Input/Output & Injection**: Validate all user input server-side. Use parameterized queries only. Sanitize any rendered HTML. Validate file uploads by magic bytes and store safely.
- **SSRF, CORS, CSRF, Headers, Rate Limiting**: Enforce strict CORS allowlists (never `*` with credentials), CSP, `HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and rate limiting on auth/sensitive endpoints.
- **Safe Error Handling**: Never leak stack traces, SQL errors, or internal paths in API responses; log details server-side only.

## 4. Cross-Platform, Cross-Browser & Adaptive UI Standards

All web UI, CLI, and container components must be responsive, adaptive, and verified across environments:
- **Screen Sizes, Ratios & Devices**: Fluid, adaptive layouts for mobile phones (including iOS Safari notches/safe areas and `100dvh` viewport units), tablets, laptops, desktops, and ultrawide displays across portrait and landscape aspect ratios. No horizontal overflow, clipped controls, or overlapping elements.
- **Browsers**: Full compatibility with **Safari** (macOS & iOS WebKit quirks, flex/grid sizing, backdrop-filter, audio/voice APIs), **Chrome**, and **Brave** (strict privacy/shield defaults, storage/cookie handling).
- **Operating Systems & Runtimes**: All scripts, CLIs, paths, line endings, and containers must work cleanly across **Docker**, **Linux**, **Windows**, **macOS**, and **iOS** (web/PWA). Avoid OS-specific shell assumptions without cross-platform equivalents.
