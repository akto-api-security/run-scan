const core = require('@actions/core');
const axios = require("axios")

async function run() {
  let AKTO_START_TEST_ENDPOINT = ""
  let AKTO_GITHUB_CHECK_ENDPOINT = ""

  const AKTO_DASHBOARD_URL = core.getInput('AKTO_DASHBOARD_URL')
  const AKTO_API_KEY = core.getInput('AKTO_API_KEY')
  const AKTO_TEST_ID = core.getInput('AKTO_TEST_ID')
  const START_TIME_DELAY = core.getInput('START_TIME_DELAY')
  const GITHUB_COMMIT_ID = core.getInput('GITHUB_COMMIT_ID')
  
  let startTimestamp = 0;
  if(START_TIME_DELAY!=''){
    let delay = parseInt(START_TIME_DELAY);
    if(!isNaN(delay)){
      startTimestamp = Date.now()/1000 + delay;
    }
  }

  if (AKTO_DASHBOARD_URL.endsWith("/")) {
    AKTO_START_TEST_ENDPOINT = AKTO_DASHBOARD_URL + "api/startTest"
    AKTO_GITHUB_CHECK_ENDPOINT = AKTO_DASHBOARD_URL + "api/updateGithubStatus"
  } else {
    AKTO_START_TEST_ENDPOINT = AKTO_DASHBOARD_URL + "/api/startTest"
    AKTO_GITHUB_CHECK_ENDPOINT = AKTO_DASHBOARD_URL + "/api/updateGithubStatus"
  }

   const data = {
    "testingRunHexId": AKTO_TEST_ID,
    "startTimestamp" : startTimestamp,
    "metadata": {
      "platform": "Github Actions",
      "repository": process.env.GITHUB_REPOSITORY,
      "repository_url": process.env.GITHUB_SERVER_URL + "/" + process.env.GITHUB_REPOSITORY, 
      "branch": process.env.GITHUB_REF_NAME,
      "commit_sha": process.env.GITHUB_SHA,
      "pull_request_id" : process.env.GITHUB_REF,
      "commit_sha_head": GITHUB_COMMIT_ID
    }
  }

  const config = {
    method: 'post',
    url: AKTO_START_TEST_ENDPOINT,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': AKTO_API_KEY,
    },
    data: data
  }

  const triggerGithubCheck = {
    method: 'post',
    url: AKTO_GITHUB_CHECK_ENDPOINT,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': AKTO_API_KEY,
    }
  }

  try {
    res = await axios(config)
    console.log("Akto CI/CD test started")
    await res.json()
    console.log(JSON.stringify(res.json()))
    let response = res.json()
    let testingRunSummaryHexId = response["testingRunResultSummaryHexId"]
    console.log("Testing run summary hexId:" + testingRunSummaryHexId)
    if (testingRunSummaryHexId) {
      triggerGithubCheck["data"] = { "testingRunSummaryHexId" : testingRunSummaryHexId} 
    }
    res1 = await axios(triggerGithubCheck)
    console.log("Akto CI/CD github check triggered")
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
