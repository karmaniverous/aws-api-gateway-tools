# Smoke tests (AWS account required)

These opt-in end-to-end tests hit a real AWS account and exercise:

- CLI-flag driven execution (no config overlay)
- config overlay discovery and plugin config interpolation
- `aws api-gateway flush-cache`
- `aws api-gateway pull-keys`, including template bootstrap for dotenv edits

## Configure

Safe defaults are committed in `smoke/.env` (`SMOKE_KEEP_ARTIFACTS=0`).

1. Copy `smoke/.env.local.template` to `smoke/.env.local`.
2. Set `SMOKE_AWS_PROFILE` to an authenticated profile.
3. Set `SMOKE_APIGW=1`, an `API_ID` or `API_NAME`, `STAGE_NAME`, and space-delimited `API_KEY_NAMES`.

The local file is gitignored and must never be committed.

## Run

```bash
npm run smoke:flags
npm run smoke:overlay
```

Set `SMOKE_VERBOSE=1` for captured child output. The scripts delete the generated `smoke/fixtures/aws-api-gateway/.env.local` by default; set `SMOKE_KEEP_ARTIFACTS=1` to retain it.
