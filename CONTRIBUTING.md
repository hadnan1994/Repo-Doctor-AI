# Contributing

Thanks for helping improve Repo Doctor AI.

## Local Setup

```bash
pnpm install
pnpm test
pnpm build
```

## Development Workflow

- Keep scanner logic deterministic and easy to explain.
- Add focused tests for new checks, scoring changes, reporters, and templates.
- Avoid broad rewrites unless the change directly supports the MVP architecture.
- Keep CLI output readable without color.

## Useful Commands

```bash
pnpm lint
pnpm test
pnpm build
node dist/cli.js scan
```

## Pull Requests

Please include:

- A short summary of the change
- Tests or a note explaining why tests were not needed
- CLI output examples when changing user-facing behavior

Small, focused pull requests are easiest to review.
