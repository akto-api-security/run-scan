const axios = require('axios');
const { createInitPayload } = require('./helpers.js');


const GET_ALL_COLLECTIONS = 'api/getAllCollections';
const RUN_TEST = 'api/startTest';
const ALL_TEST_SUITES = 'api/fetchAllTestSuites';
const ALL_TEST_RUNS = 'api/retrieveAllCollectionTests';
const AKTO_DASHBOARD_URL = process.env['AKTO_DASHBOARD_URL'] ? process.env['AKTO_DASHBOARD_URL'].endsWith('/') ? process.env['AKTO_DASHBOARD_URL'] : process.env['AKTO_DASHBOARD_URL'] + '/' : 'https://app.akto.io/';
const headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': process.env['AKTO_API_KEY'] || '',
}
async function getAllCollections() {
    try {
        const response = await axios.post(`${AKTO_DASHBOARD_URL}${GET_ALL_COLLECTIONS}`, {}, { headers });
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch collections. Status: ${error.response?.status}`);
        return null;
    }
}

async function getCollectionId(collectionName) {
    const result = await getAllCollections();
    if (!result) return null;

    const collections = {};
    result.apiCollections.forEach(c => {
        collections[c.displayName] = c.id;
    });

    return collections[collectionName] || null;
}

async function getTestSuiteId(testSuiteName) {
    try {
        const response = await axios.post(`${AKTO_DASHBOARD_URL}${ALL_TEST_SUITES}`, {}, { headers });
        const testSuites = response.data.testSuiteList || [];
        for (const suite of testSuites) {
            if (suite.name === testSuiteName) {
                return suite.hexId;
            }
        }
    } catch (error) {
        console.error(`Failed to fetch test suites. Status: ${error.response?.status}`);
    }
    return null;
}

async function sendRequestForInit(apiCollectionId, apiGroupName, testSuiteId, testRoleId, overriddenTestAppUrl, testSuiteName, waitTimeForResult, metaData) {
    const timeNow = Math.floor(Date.now() / 1000);

    const data = {
        apiCollectionId: apiCollectionId,
        type: "COLLECTION_WISE",
        startTimestamp: timeNow,
        recurringDaily: false,
        recurringWeekly: false,
        recurringMonthly: false,
        selectedTests: [],
        testName: `${apiGroupName}_${testSuiteName}`,
        testRunTime: waitTimeForResult.toString(),
        maxConcurrentRequests: "100",
        overriddenTestAppUrl: overriddenTestAppUrl,
        testRoleId: testRoleId,
        continuousTesting: false,
        sendSlackAlert: false,
        sendMsTeamsAlert: false,
        testConfigsAdvancedSettings: [],
        cleanUpTestingResources: false,
        testSuiteIds: [testSuiteId],
        autoTicketingDetails: null,
        metaData: metaData
    };

    try {
        const response = await axios.post(`${AKTO_DASHBOARD_URL}${RUN_TEST}`, data, { headers });
        return response.data;
    } catch (error) {
        console.error(`Failed to trigger test for ${apiGroupName}. Status: ${error.response?.status}`);
    }
}

async function checkIfTestRunExists(testRunName) {
    const endTs = Math.floor(new Date().getTime() / 1000);
    const payload = {
        "searchString": testRunName,
        "skip": 0,
        "limit": 1,
        "testingRunType": "CI_CD",
        "startTimestamp": 0,
        "endTimestamp": endTs,
    }
    try {
        const response = await axios.post(`${AKTO_DASHBOARD_URL}${ALL_TEST_RUNS}`, payload, { headers });
        return response?.data?.testingRuns?.length > 0 ? response.data.testingRuns[0].hexId : "";
    } catch (error) {
        console.log(`Failed to check if test run exists for ${testRunName}. Status: ${error.response?.status}`);
      return "";
    }
}

async function runForGroup(apiGroupName, testSuiteName, configObj, waitTimeForResult = 0) {

    const testRunName = `${apiGroupName}_${testSuiteName}`;
    let runTime = waitTimeForResult > 0 ? waitTimeForResult : 1800; // Default to 30 minutes if no wait time is specified

    const testRunID = await checkIfTestRunExists(testRunName);
    if (testRunID.length > 0){
        configObj.data["testingRunHexId"] = testRunID;
        return await axios(configObj);
    }
    const apiCollectionId = await getCollectionId(apiGroupName);
    if (!apiCollectionId) {
        console.error(`API collection '${apiGroupName}' not found.`);
        return;
    }
    const testSuiteId = await getTestSuiteId(testSuiteName);
    if (!testSuiteId) {
        console.error(`Test suite '${testSuiteName}' not found.`);
        return;
    }

    const configObjNew = createInitPayload("");

    const response = await sendRequestForInit(apiCollectionId, apiGroupName, testSuiteId, "", configObj?.overriddenTestAppUrl || "", testSuiteName, runTime, configObjNew.data.metadata);
}
module.exports = { runForGroup };