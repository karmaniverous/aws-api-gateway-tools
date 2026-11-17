# AGENTS.md

Standing rules for every pull request in this repository.

## Source of truth

- For planned work, the approved product spec and its recorded decisions are the source of truth. Do not reverse an owner decision in code. If the implementation and spec conflict, stop and report it.

## Gates before every push

Run from the repository root with zero errors and zero warnings:

```bash
npx prettier --check .
npm run lint
npm run typecheck
npm test -- --coverage
npm run build
npm run knip
npm run docs
npm run verify:bundle
npm run verify:package
npm run verify:types
npm run verify:mutations
npm run verify:smoke
npm run pack:dry
npm audit --omit=dev
```

- CI must be green on the pushed head on Ubuntu and Windows, including the npm pack check.
- Never weaken lint, typecheck, knip, coverage, packaging, or documentation checks. Production code may not use `eslint-disable`, `@ts-ignore`, or `@ts-expect-error`. A test-only `eslint-disable-next-line` requires an inline reason and disclosure in the PR body.
- AWS smoke tests use a gitignored local `smoke/.env.local`; never commit it or generated smoke artifacts.

## Tests and design

- Every behavior change needs a regression test that fails without it. Avoid trivial tests that only repeat constants or mocks.
- Check coverage per touched source file. Coverage must not fall; target at least 90% branch coverage for new logic or explain the remaining path in the PR body.
- Mutation-check each new decision or error path, restore every changed file, and leave the built output clean.
- Review the complete diff for SOLID and DRY before requesting review: one responsibility per module, shared logic in one place, and no copy-paste implementation.

## Packaging and docs

- Prove the packed runtime and strict packed TypeScript consumer, including operation without optional peers where required.
- Update the README, guides, public TSDoc, package exports, and generated TypeDoc entry points together.
- Never bump the package version unless the issue explicitly requires it. Never publish, tag, release, or merge; those are the owner's actions.

## Git and pull requests

- Use a permitted conventional branch prefix (`feature/`, `bugfix/`, `chore/`, `docs/`, or `hotfix/`; no dots) and Conventional Commits.
- Immediately before every push, run `gh pr list --head <branch> --repo karmaniverous/aws-api-gateway-tools --state all --json number,state`. If the newest PR is `MERGED` or `CLOSED`, stop and report.
- Push after every commit. Request review from `karmaniverous`. Keep the PR draft until the approved plan says otherwise and all finishing evidence is recorded.
