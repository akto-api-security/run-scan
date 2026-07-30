# Akto testing scan

Starts a new collection-wise test.

## Required

| Variable | Description |
|----------|-------------|
| `AKTO_API_KEY` | Akto API token |
| `API_GROUP_NAME` | API collection display name (exact match) [ Name of the Postman or OpenAPI collection ] |
| `TEST_SUITE_NAME` | Test suite name (exact match) |

## Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `AKTO_DASHBOARD_URL` | `https://app.akto.io` | Dashboard base URL |
| `WAIT_TIME_FOR_RESULT` | `0` | Max wait for results (seconds). Use `0` to trigger and exit |
| `CICD_PLATFORM` | `External` | Platform label in metadata |
| `OVERRIDDEN_TEST_APP_URL` | — | Override target host for testing |
| `AKTO_TEST_ROLE_ID` | — | Test role name |
| `AKTO_MAX_CONCURRENT_REQUESTS` | `100` | Max concurrent requests |
| `AKTO_MINI_TESTING_SERVICE_NAME` | — | Mini testing module name |
| `AKTO_TEST_RUN_TIME` | `30` | Test duration (minutes) |
| `BLOCK_LEVEL` | `HIGH` | Only relevant if waiting: `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` |
---

## Commands to trigger scan

```bash
docker run \
  -e AKTO_DASHBOARD_URL='https://app.akto.io' \
  -e AKTO_API_KEY="$AKTO_API_KEY" \
  -e API_GROUP_NAME='$API_COLLECTION_NAME' \
  -e TEST_SUITE_NAME='$TEST_SUITE_NAME' \
  -e WAIT_TIME_FOR_RESULT='0' \
  -e CICD_PLATFORM='External' \
  -e AKTO_MAX_CONCURRENT_REQUESTS='500' \
  aktosecurity/akto-testing-scan:latest
```

---

## Notes

- `API_GROUP_NAME` / `TEST_SUITE_NAME` must match dashboard names exactly.
- A Test suite needs to be created on the dashboard before it can be used
