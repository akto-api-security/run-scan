# run-scan
## Akto CI/CD Github Action

### Example usage

```yaml
- uses: akto-api-security/run-scan@v1.0.3
    with:
      AKTO_DASHBOARD_URL: ${{secrets.AKTO_DASHBOARD_URL}}
      AKTO_API_KEY: ${{secrets.AKTO_API_KEY}}
      AKTO_TEST_ID: ${{secrets.AKTO_TEST_ID}}
      START_TIME_DELAY: 180 # Delay in seconds after which testing run is started, optional, default is 0 
```

### Example docker run

```bash
docker run -e AKTO_DASHBOARD_URL='https://app.akto.io' -e AKTO_API_KEY='<AKTO_API_KEY>' -e AKTO_TEST_ID='<AKTO_TEST_ID>' -e WAIT_TIME_FOR_RESULT=0 -e CICD_PLATFORM="Jenkins" aktosecurity/akto-testing-scan:latest
```

## Configuration Options

The following environment variables can be used to configure test runs, matching the options available in the Akto dashboard's "Configure test" modal:

### Basic Configuration

- `AKTO_DASHBOARD_URL`: URL of your Akto dashboard (default: `https://app.akto.io/`)
- `AKTO_API_KEY`: Your Akto API key
- `AKTO_TEST_ID`: Test run ID (for existing test runs)
- `API_GROUP_NAME`: API collection name (when using collection-based testing)
- `TEST_SUITE_NAME`: Test suite name (when using collection-based testing)
- `WAIT_TIME_FOR_RESULT`: Maximum time to wait for test results in seconds (default: 0, meaning don't wait)

### Schedule Configuration

- `AKTO_START_DATE`: Start date in YYYY-MM-DD format (e.g., `2025-12-11`)
- `AKTO_START_TIME`: Start time in HH:MM format or "Now" (default: `Now`)
- `AKTO_START_TIMESTAMP`: Unix timestamp in seconds (alternative to date/time)
- `AKTO_RECURRING_DAILY`: Set to `true` for daily recurring tests
- `AKTO_RECURRING_WEEKLY`: Set to `true` for weekly recurring tests
- `AKTO_RECURRING_MONTHLY`: Set to `true` for monthly recurring tests

### Test Run Configuration

- `AKTO_TEST_RUN_TIME`: Test run duration in minutes (e.g., `30`, `60`, `120`). Default: `30` minutes
- `AKTO_TEST_ROLE_ID`: Test role ID to use for testing (empty for no test role)
- `AKTO_MAX_CONCURRENT_REQUESTS`: Maximum concurrent requests (default: `100`)
- `OVERRIDDEN_TEST_APP_URL`: Override target URL for testing (for "Use different target for testing" option)

### Integration Options

- `AKTO_SEND_SLACK_ALERT`: Set to `true` to enable Slack integration
- `AKTO_SEND_MS_TEAMS_ALERT`: Set to `true` to enable Microsoft Teams integration
- `AKTO_SLACK_WEBHOOK_ID`: Slack webhook ID (required if Slack alerts are enabled)
- `AKTO_MINI_TESTING_SERVICE_NAME`: Mini testing service name

### Auto-Ticketing

- `AKTO_AUTO_TICKETING_DETAILS`: JSON string with auto-ticketing configuration. Example:
  ```json
  {"enabled": true, "provider": "jira", "projectId": "PROJ-123"}
  ```

### Advanced Configurations

- `AKTO_TEST_CONFIGS_ADVANCED_SETTINGS`: JSON string with advanced test configurations. This allows you to add/modify/delete headers, body params, or URL params during test execution. Example:
  ```json
  [
    {
      "operatorType": "ADD_HEADER",
      "operationsGroupList": [
        {
          "key": "X-Custom-Header",
          "value": "custom-value"
        }
      ]
    },
    {
      "operatorType": "MODIFY_BODY_PARAM",
      "operationsGroupList": [
        {
          "key": "param1",
          "value": "new-value"
        }
      ]
    }
  ]
  ```
  
  Supported operator types:
  - `ADD_HEADER`: Add a new header to requests
  - `ADD_BODY_PARAM`: Add a new body parameter
  - `MODIFY_HEADER`: Modify an existing header
  - `MODIFY_BODY_PARAM`: Modify an existing body parameter
  - `DELETE_HEADER`: Delete a header
  - `DELETE_BODY_PARAM`: Delete a body parameter
  - `ADD_URL_PARAM`: Add a URL parameter (requires `urlsList` and `position` in operationsGroupList)
  - `MODIFY_URL_PARAM`: Modify a URL parameter (requires `urlsList` and `position` in operationsGroupList)
  
  For URL parameter operations, include `urlsList` (array of URLs like `["GET /api/users"]`) and `position` (string) in the operationsGroupList items.

### Advanced Options

- `AKTO_CLEANUP_TESTING_RESOURCES`: Set to `true` to clean up testing resources after completion
- `AKTO_DO_NOT_MARK_ISSUES_AS_FIXED`: Set to `true` to prevent marking issues as fixed if they don't show up again. 
  - When the "Mark issues as fixed" checkbox is checked in the UI, this value is `false` (default)
  - When unchecked, this value is `true`

### Example with all options

```bash
docker run \
  -e AKTO_DASHBOARD_URL='https://app.akto.io' \
  -e AKTO_API_KEY='<AKTO_API_KEY>' \
  -e API_GROUP_NAME='My API Collection' \
  -e TEST_SUITE_NAME='Security Tests' \
  -e AKTO_START_DATE='2025-12-11' \
  -e AKTO_START_TIME='14:30' \
  -e AKTO_TEST_RUN_TIME='30' \
  -e AKTO_TEST_ROLE_ID='role_12345' \
  -e AKTO_MAX_CONCURRENT_REQUESTS='50' \
  -e OVERRIDDEN_TEST_APP_URL='https://staging.example.com' \
  -e AKTO_SEND_SLACK_ALERT='true' \
  -e AKTO_SLACK_WEBHOOK_ID='12345' \
  -e AKTO_SEND_MS_TEAMS_ALERT='true' \
  -e AKTO_AUTO_TICKETING_DETAILS='{"enabled": true, "provider": "jira", "projectId": "PROJ-123"}' \
  -e AKTO_TEST_CONFIGS_ADVANCED_SETTINGS='[{"operatorType":"ADD_HEADER","operationsGroupList":[{"key":"X-Custom-Header","value":"custom-value"}]},{"operatorType":"MODIFY_BODY_PARAM","operationsGroupList":[{"key":"param1","value":"new-value"}]}]' \
  -e AKTO_DO_NOT_MARK_ISSUES_AS_FIXED='false' \
  -e WAIT_TIME_FOR_RESULT='1800' \
  aktosecurity/akto-testing-scan:latest
```

### Example with advanced configurations (multi-line JSON)

For better readability, you can use a here-document or environment file for complex JSON:

```bash
# Using environment file
cat > .env << 'EOF'
AKTO_DASHBOARD_URL=https://app.akto.io
AKTO_API_KEY=<AKTO_API_KEY>
API_GROUP_NAME=My API Collection
TEST_SUITE_NAME=Security Tests
AKTO_START_DATE=2025-12-11
AKTO_START_TIME=14:30
AKTO_TEST_RUN_TIME=30
AKTO_MAX_CONCURRENT_REQUESTS=50
AKTO_SEND_SLACK_ALERT=true
AKTO_SLACK_WEBHOOK_ID=12345
AKTO_TEST_CONFIGS_ADVANCED_SETTINGS=[{"operatorType":"ADD_HEADER","operationsGroupList":[{"key":"X-API-Key","value":"secret-key"}]},{"operatorType":"MODIFY_BODY_PARAM","operationsGroupList":[{"key":"userId","value":"test-user-123"}]},{"operatorType":"ADD_URL_PARAM","operationsGroupList":[{"key":"debug","value":"true","urlsList":["GET /api/users","POST /api/users"],"position":"1"}]}]
EOF

docker run --env-file .env aktosecurity/akto-testing-scan:latest
```

### Example with URL parameter operations

```bash
docker run \
  -e AKTO_DASHBOARD_URL='https://app.akto.io' \
  -e AKTO_API_KEY='<AKTO_API_KEY>' \
  -e API_GROUP_NAME='My API Collection' \
  -e TEST_SUITE_NAME='Security Tests' \
  -e AKTO_TEST_CONFIGS_ADVANCED_SETTINGS='[{"operatorType":"ADD_URL_PARAM","operationsGroupList":[{"key":"version","value":"v2","urlsList":["GET /api/users","GET /api/products"],"position":"1"}]}]' \
  aktosecurity/akto-testing-scan:latest
```