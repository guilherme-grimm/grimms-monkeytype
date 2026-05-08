# Security Policy

## Supported versions

Only the `main` branch is supported. There are no LTS or backport branches — fixes land on `main` and roll out via the next deploy to [typer.grimm0.dev](https://typer.grimm0.dev).

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email **guilher.c.rodrigues@gmail.com** with:

- A short description of the issue
- Steps to reproduce (or a proof-of-concept)
- The impact you believe it has
- Any suggested remediation, if you have one

You can expect:

- An acknowledgement within ~72 hours (best effort — this is a side project, not a staffed product)
- A follow-up with triage status and a rough timeline
- Credit in the fix commit / release notes if you want it (let us know your preference)

There is **no bounty program**. This is an open-source project maintained in spare time.

## Areas worth extra scrutiny

If you're auditing the codebase, the surfaces most worth a careful look are:

- **Authentication** — better-auth v1.6 with GitHub OAuth (`src/server/auth*`)
- **Score submission & validation** — server recomputes/validates submitted scores; sanity-check level only, not heavy anti-cheat (`src/server/scores*`, `src/server/leaderboard*`)
- **Static asset routing** — `server.ts` restricts static serving to `/assets/*`, favicons, manifest, and robots; everything else falls through to SSR
- **SQLite persistence** — DB lives at `/app/data/app.db` in Docker; migrations run automatically on boot
