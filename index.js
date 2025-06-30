const axios = require('axios');
const { runForGroup } = require('./utils.js');

const AKTO_DASHBOARD_URL = process.env['AKTO_DASHBOARD_URL']
const AKTO_API_KEY = process.env['AKTO_API_KEY']
const AKTO_TEST_ID = process.env['AKTO_TEST_ID']
const START_TIME_DELAY = process.env['START_TIME_DELAY']
const OVERRIDDEN_TEST_APP_URL = process.env['OVERRIDDEN_TEST_APP_URL']
const WAIT_TIME_FOR_RESULT = process.env['WAIT_TIME_FOR_RESULT']
const BLOCK_LEVEL = process.env['BLOCK_LEVEL'] || "HIGH"
const GITHUB_COMMIT_ID = process.env['GITHUB_COMMIT_ID']
const CICD_PLATFORM = process.env.CICD_PLATFORM
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY
const GITHUB_SERVER_URL = process.env.GITHUB_SERVER_URL
const GITHUB_REF_NAME = process.env.GITHUB_REF_NAME
const GITHUB_SHA = process.env.GITHUB_SHA
const GITHUB_REF = process.env.GITHUB_REF
const POLL_INTERVAL = process.env.POLL_INTERVAL
const PERCENTAGE_INTERVAL = process.env.PERCENTAGE_INTERVAL
const API_GROUP_NAME = process.env.API_GROUP_NAME || "";
const TEST_SUITE_NAME = process.env.TEST_SUITE_NAME || "";

// Default poll interval
let pollInterval = 5000;

if (POLL_INTERVAL && POLL_INTERVAL.length > 0 && !isNaN(POLL_INTERVAL)) {
  try {
    pollInterval = parseInt(POLL_INTERVAL) * 1000
    console.log("Using polling interval of " + pollInterval / 1000 + " seconds")
  } catch (e) {
    console.log("Using default polling interval of " + pollInterval / 1000 + " seconds")
  }
}

// Default percentage show interval
let percentageInterval = 3;
if (PERCENTAGE_INTERVAL && PERCENTAGE_INTERVAL.length > 0 && !isNaN(PERCENTAGE_INTERVAL)) {
  try {
    percentageInterval = parseInt(PERCENTAGE_INTERVAL)
  } catch (e) {
    console.log("Using default percentage interval of " + percentageInterval + " seconds")
  }
}

async function logGithubStepSummary(message) {
  console.log(`${message}`);
}

function toInt(a) {
  if (a === '') return 0;

  let ret = parseInt(a);

  if (isNaN(ret)) return 0;

  return ret;
}

let isFirst = true;

async function fetchTestingRunResultSummary(testingRunResultSummaryHexId) {
  try {
    if (isFirst) {
      console.log("testingRunResultSummaryHexId: ", testingRunResultSummaryHexId);
      isFirst = false
    }
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
  if (blockLevel <= resultLevel) console.log("Found vulnerabilties");
}

function parseBlockLevel(BLOCK_LEVEL) {
 if (BLOCK_LEVEL === '') return 10;

 if (BLOCK_LEVEL === 'CRITICAL') return 3;
 if (BLOCK_LEVEL === 'HIGH') return 3;
 if (BLOCK_LEVEL === 'MEDIUM') return 2;
 if (BLOCK_LEVEL === 'LOW') return 1;

 return 10;

}

function calcPercentage(num, dom) {
  if (dom == 0) {
    return 0;
  }
  return Math.round((num * 100) / dom)
}

async function waitTillComplete(testDetails, maxWaitTime) {
  let testingRunResultSummaryHexId = testDetails.testingRunResultSummaryHexId
  if (!testingRunResultSummaryHexId) return;

  const pollStartTime = Math.floor(Date.now() / 1000);
  let lastPercentage = -10;

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

      let { testInitiatedCount, testResultsCount, totalApis, countIssues } = response.testingRunResultSummaries[0];
      let { CRITICAL, HIGH, MEDIUM, LOW } = countIssues;
      if (!CRITICAL) {
        CRITICAL = 0
      }
      if (!HIGH) {
        HIGH = 0
      }
      if (!MEDIUM) {
        MEDIUM = 0
      }
      if (!LOW) {
        LOW = 0
      }
      if (!testInitiatedCount) {
        testInitiatedCount = 0;
      }
      if (!testResultsCount) {
        testResultsCount = 0;
      }
      if (!totalApis) {
        totalApis = 0;
      }
      if (state === 'COMPLETED') {
        if (lastPercentage != 100) {
          logGithubStepSummary("Test progress: 100%")
        }
        logGithubStepSummary(`[Results](${AKTO_DASHBOARD_URL}/dashboard/testing/${AKTO_TEST_ID}/results)`);
        logGithubStepSummary(`CRITICAL: ${CRITICAL}`);
        logGithubStepSummary(`HIGH: ${HIGH}`);
        logGithubStepSummary(`MEDIUM: ${MEDIUM}`);
        logGithubStepSummary(`LOW: ${LOW}`);

        if (CRITICAL > 0 || HIGH > 0 || MEDIUM > 0 || LOW > 0) {
          logGithubStepSummary(`Vulnerabilities found!!`);

          let blockLevel = parseBlockLevel(BLOCK_LEVEL)
          exitIfBlockLevelBreached((CRITICAL > 0 || HIGH > 0) ? 3 : (MEDIUM > 0 ? 2 : (LOW > 0 ? 1 : -10)));
        }

        break;
      } else if (state === 'STOPPED') {
        logGithubStepSummary(`Test stopped`);
        break;
      } else if (state === 'RUNNING') {

        let tempPercentage = calcPercentage(testResultsCount, testInitiatedCount * totalApis);
        if ((tempPercentage - lastPercentage) > percentageInterval) {
          lastPercentage = tempPercentage;
          logGithubStepSummary("Test progress: " + lastPercentage + "%")
          logGithubStepSummary("Issues found till now: " + "CRITICAL: " + CRITICAL + " HIGH: " + HIGH + " MEDIUM: " + MEDIUM + " LOW: " + LOW)
        }

      } else {
        logGithubStepSummary('Waiting for akto test to be completed...');
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } else {
      break;
    }
  }
}

function createInitPayload(testingRunHexId){
  let startTimestamp = 0;
  let AKTO_START_TEST_ENDPOINT = ""
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

  let cicdPlatform = "Github Actions"
  if(CICD_PLATFORM){
    cicdPlatform = CICD_PLATFORM
  }

   const data = {
    "testingRunHexId": testingRunHexId,
    "startTimestamp" : startTimestamp,
    "metadata": {
      "platform": cicdPlatform,
    }
  }
  
  if(GITHUB_REPOSITORY){
    data["metadata"]["repository"] = GITHUB_REPOSITORY
  }

  if(GITHUB_SERVER_URL && GITHUB_REPOSITORY){
    data["metadata"]["repository_url"] = GITHUB_SERVER_URL + "/" + GITHUB_REPOSITORY
  }

  if(GITHUB_REF_NAME){
    data["metadata"]["branch"] = GITHUB_REF_NAME
  }

  if(GITHUB_SHA){
    data["metadata"]["commit_sha"] = GITHUB_SHA
  }

  if(GITHUB_REF){
    data["metadata"]["pull_request_id"] = GITHUB_REF
  }

  if (OVERRIDDEN_TEST_APP_URL) {
    data["overriddenTestAppUrl"] = OVERRIDDEN_TEST_APP_URL
  }

  if (GITHUB_COMMIT_ID) {
    data["metadata"]["commit_sha_head"] = GITHUB_COMMIT_ID
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

  return config;
}

async function run() {
  console.log(AKTO_DASHBOARD_URL, AKTO_TEST_ID, START_TIME_DELAY, OVERRIDDEN_TEST_APP_URL, WAIT_TIME_FOR_RESULT, BLOCK_LEVEL, API_GROUP_NAME, TEST_SUITE_NAME)
  const config = createInitPayload(AKTO_TEST_ID);

  try {
    let res = {}
    if(API_GROUP_NAME.length > 0 && TEST_SUITE_NAME.length > 0) {
      res = await runForGroup(API_GROUP_NAME, TEST_SUITE_NAME, config, WAIT_TIME_FOR_RESULT)
    }else{
      res = await axios(config)
    }
    
    console.log("Akto CI/CD test started")

    let waitTimeForResult = toInt(WAIT_TIME_FOR_RESULT)
    waitTillComplete(res.data, waitTimeForResult);

  } catch (error) {
    console.error(error.message);
  }
}

run();

export {createInitPayload}