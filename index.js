const axios = require("axios")
const fs = require('fs');

const AKTO_DASHBOARD_URL = process.env.AKTO_DASHBOARD_URL
const AKTO_API_KEY = process.env.AKTO_API_KEY
const AKTO_TEST_ID = process.env.AKTO_TEST_ID
const START_TIME_DELAY = process.env.START_TIME_DELAY
const OVERRIDEN_TEST_APP_URL = process.env.OVERRIDEN_TEST_APP_URL
const WAIT_TIME_FOR_RESULT = process.env.WAIT_TIME_FOR_RESULT
const BLOCK_LEVEL = process.env.BLOCK_LEVEL || "HIGH"
const GITHUB_STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY

function logGithubStepSummary(message) {
  fs.appendFileSync(GITHUB_STEP_SUMMARY, `${message}\n`);
}

function toInt(a) {
  if (a === '') return 0;

  let ret = parseInt(a);
  
  if (isNaN(ret)) return 0;

  return ret;
}

async function fetchTestingRunResultSummary(testingRunResultSummaryHexId) {
  try {
    console.log("testingRunResultSummaryHexId: ", testingRunResultSummaryHexId);
    const result = await axios.post(`${AKTO_DASHBOARD_URL}/api/fetchTestingRunResultSummary`, {
      testingRunResultSummaryHexId
    }, {
      headers: {
        'content-type': 'application/json',
        'X-API-KEY': AKTO_API_KEY
      }
    });

    return result.data;
  } catch (error) {
    console.error('Error fetching testing run result summaries:', error);
    return null;
  }
}

function exitIfBlockLevelBreached(resultLevel, blockLevel) {
  if (blockLevel <= resultLevel) process.exit(1);
  else process.exit(0);
}

function parseBlockLevel(BLOCK_LEVEL) {
 if (BLOCK_LEVEL === '') return 10;
 
 if (BLOCK_LEVEL === 'HIGH') return 3;
 if (BLOCK_LEVEL === 'MEDIUM') return 2;
 if (BLOCK_LEVEL === 'LOW') return 1;

 return 10;

}


async function waitTillComplete(testDetails, maxWaitTime) {
  let testingRunResultSummaryHexId = testDetails.testingRunResultSummaryHexId
  if (!testingRunResultSummaryHexId) return;   
  
  const pollStartTime = Math.floor(Date.now() / 1000);
  while (true) {
    pollCurrentTime = Math.floor(Date.now() / 1000);
    elapsed = pollCurrentTime - pollStartTime;

    if (elapsed >= maxWaitTime) {
      console.log('Max poll interval reached. Exiting.');
      break;
    }

    response = await fetchTestingRunResultSummary(testingRunResultSummaryHexId);
    if (response) {
      state = response.testingRunResultSummaries[0]?.state;

      if (state === 'COMPLETED') {
        const { countIssues } = response.testingRunResultSummaries[0];
        const { HIGH, MEDIUM, LOW } = countIssues;

        logGithubStepSummary(`[Results](${AKTO_DASHBOARD_URL}/dashboard/testing/${AKTO_TEST_ID}/results)`);
        logGithubStepSummary(`HIGH: ${HIGH}`);
        logGithubStepSummary(`MEDIUM: ${MEDIUM}`);
        logGithubStepSummary(`LOW: ${LOW}`);

        if (HIGH > 0 || MEDIUM > 0 || LOW > 0) {
          logGithubStepSummary(`Vulnerabilities found!!`);

          let blockLevel = parseBlockLevel(BLOCK_LEVEL)
          exitIfBlockLevelBreached(HIGH > 0 ? 3 : (MEDIUM > 0 ? 2 : (LOW > 0 ? 1 : -10)));
        }

        break;
      } else if (state === 'STOPPED') {
        logGithubStepSummary(`Test stopped`);
        process.exit(0);
        break;
      } else {
        console.log('Waiting for akto test to be completed...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
      }
    } else {
      break;
    }
  }
}

async function run() {
  let AKTO_START_TEST_ENDPOINT = ""
  let startTimestamp = 0;
  if(START_TIME_DELAY!=''){
    let delay = parseInt(START_TIME_DELAY);
    if(!isNaN(delay)){
      startTimestamp = Date.now()/1000 + delay;
    }
  }

  if (AKTO_DASHBOARD_URL.endsWith("/")) {
    AKTO_START_TEST_ENDPOINT = AKTO_DASHBOARD_URL + "api/startTest"
  } else {
    AKTO_START_TEST_ENDPOINT = AKTO_DASHBOARD_URL + "/api/startTest"
  }

   const data = {
    "testingRunHexId": AKTO_TEST_ID,
    "startTimestamp" : startTimestamp,
    "metadata": {
      "platform": "Github Actions",
      "repository": process.env.GITHUB_REPOSITORY,
      "repository_url": process.env.GITHUB_SERVER_URL + "/" + process.env.GITHUB_REPOSITORY, 
      "branch": process.env.GITHUB_REF_NAME,
      "commit_sha": process.env.GITHUB_SHA
    }
  }

  if (OVERRIDEN_TEST_APP_URL) {
    data["overriddenTestAppUrl"] = OVERRIDEN_TEST_APP_URL
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

  try {
    res = await axios(config)
    console.log("Akto CI/CD test started")

    let waitTimeForResult = toInt(WAIT_TIME_FOR_RESULT)
    waitTillComplete(res.data, waitTimeForResult);  

  } catch (error) {
    console.log(error.message);
  }
}

run();
