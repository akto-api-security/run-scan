function createInitPayload(testingRunHexId) {
  const AKTO_DASHBOARD_URL = process.env['AKTO_DASHBOARD_URL'] || '';
  const AKTO_API_KEY = process.env['AKTO_API_KEY'] || '';
  const START_TIME_DELAY = process.env['START_TIME_DELAY'] || '';
  const OVERRIDDEN_TEST_APP_URL = process.env['OVERRIDDEN_TEST_APP_URL'] || '';
  const CICD_PLATFORM = process.env['CICD_PLATFORM'] || '';
  const GITHUB_REPOSITORY = process.env['GITHUB_REPOSITORY'] || '';
  const GITHUB_SERVER_URL = process.env['GITHUB_SERVER_URL'] || '';
  const GITHUB_REF_NAME = process.env['GITHUB_REF_NAME'] || '';
  const GITHUB_SHA = process.env['GITHUB_SHA'] || '';
  const GITHUB_REF = process.env['GITHUB_REF'] || '';
  const GITHUB_COMMIT_ID = process.env['GITHUB_COMMIT_ID'] || '';

  let startTimestamp = 0;
  let AKTO_START_TEST_ENDPOINT = AKTO_DASHBOARD_URL.endsWith('/')
    ? AKTO_DASHBOARD_URL + 'api/startTest'
    : AKTO_DASHBOARD_URL + '/api/startTest';

  if (START_TIME_DELAY !== '') {
    const delay = parseInt(START_TIME_DELAY);
    if (!isNaN(delay)) {
      startTimestamp = Date.now() / 1000 + delay;
    }
  }

  const metadata = {
    platform: CICD_PLATFORM || 'Github Actions'
  };

  if (GITHUB_REPOSITORY) metadata.repository = GITHUB_REPOSITORY;
  if (GITHUB_SERVER_URL && GITHUB_REPOSITORY)
    metadata.repository_url = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}`;
  if (GITHUB_REF_NAME) metadata.branch = GITHUB_REF_NAME;
  if (GITHUB_SHA) metadata.commit_sha = GITHUB_SHA;
  if (GITHUB_REF) metadata.pull_request_id = GITHUB_REF;
  if (GITHUB_COMMIT_ID) metadata.commit_sha_head = GITHUB_COMMIT_ID;

  const data = {
    testingRunHexId,
    startTimestamp,
    metadata
  };

  if (OVERRIDDEN_TEST_APP_URL) {
    data.overriddenTestAppUrl = OVERRIDDEN_TEST_APP_URL;
  }

  return {
    method: 'post',
    url: AKTO_START_TEST_ENDPOINT,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': AKTO_API_KEY,
    },
    data: data
  };
}

module.exports = { createInitPayload };
