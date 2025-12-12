const axios = require('axios');
const { createInitPayload } = require('./helpers.js');
// import axios from 'axios';
// import { createInitPayload } from './helpers.js';


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

/**
 * Parse date string (YYYY-MM-DD) and time string to Unix timestamp
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time string like "Now", "HH:MM", or empty
 * @returns {number} Unix timestamp in seconds
 */
function parseStartTimestamp(dateStr, timeStr) {
    if (!dateStr) {
        return Math.floor(Date.now() / 1000);
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateStr}. Using current time.`);
        return Math.floor(Date.now() / 1000);
    }

    if (timeStr && timeStr.toLowerCase() !== 'now') {
        // Parse time string (e.g., "14:30")
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
            date.setHours(hours, minutes || 0, 0, 0);
        }
    }

    return Math.floor(date.getTime() / 1000);
}

/**
 * Parse test run time from minutes to seconds
 * @param {string|number} testRunTime - Number of minutes (e.g., 30, 60, 120)
 * @returns {string} Time in seconds as string
 */
function parseTestRunTime(testRunTime) {
    if (!testRunTime) {
        return "1800"; // Default 30 minutes
    }

    // Parse as number (in minutes) and convert to seconds
    const minutes = parseInt(testRunTime);
    if (!isNaN(minutes) && minutes > 0) {
        return (minutes * 60).toString();
    }

    return "1800"; // Default fallback (30 minutes)
}

async function sendRequestForInit(apiCollectionId, apiGroupName, testSuiteId, testRoleId, overriddenTestAppUrl, testSuiteName, waitTimeForResult, metaData, options = {}) {
    // Calculate startTimestamp from date and time options
    let startTimestamp = Math.floor(Date.now() / 1000);
    if (options.startDate || options.startTime) {
        startTimestamp = parseStartTimestamp(options.startDate, options.startTime);
    } else if (options.startTimestamp) {
        startTimestamp = options.startTimestamp;
    }

    // Parse test run time
    const testRunTime = options.testRunTime ? parseTestRunTime(options.testRunTime) : (waitTimeForResult > 0 ? waitTimeForResult.toString() : "1800");

    // Parse max concurrent requests
    const maxConcurrentRequests = options.maxConcurrentRequests || options.maxConcurrentRequests === 0 
        ? options.maxConcurrentRequests.toString() 
        : "100";

    // Determine recurring schedule
    const recurringDaily = options.recurringDaily === true;
    const recurringWeekly = options.recurringWeekly === true;
    const recurringMonthly = options.recurringMonthly === true;

    // Parse autoTicketingDetails
    let autoTicketingDetails = null;
    if (options.autoTicketingDetails) {
        if (typeof options.autoTicketingDetails === 'object') {
            autoTicketingDetails = options.autoTicketingDetails;
        } else if (typeof options.autoTicketingDetails === 'string') {
            try {
                autoTicketingDetails = JSON.parse(options.autoTicketingDetails);
            } catch (e) {
                console.warn('Failed to parse autoTicketingDetails JSON:', e);
            }
        }
    }

    // Parse testConfigsAdvancedSettings
    let testConfigsAdvancedSettings = [];
    if (options.testConfigsAdvancedSettings) {
        if (Array.isArray(options.testConfigsAdvancedSettings)) {
            testConfigsAdvancedSettings = options.testConfigsAdvancedSettings;
        } else if (typeof options.testConfigsAdvancedSettings === 'string') {
            try {
                testConfigsAdvancedSettings = JSON.parse(options.testConfigsAdvancedSettings);
                if (!Array.isArray(testConfigsAdvancedSettings)) {
                    console.warn('testConfigsAdvancedSettings must be an array. Using empty array.');
                    testConfigsAdvancedSettings = [];
                }
            } catch (e) {
                console.warn('Failed to parse testConfigsAdvancedSettings JSON:', e);
                testConfigsAdvancedSettings = [];
            }
        }
    }

    const data = {
        apiCollectionId: apiCollectionId,
        type: "COLLECTION_WISE",
        startTimestamp: startTimestamp,
        recurringDaily: recurringDaily,
        recurringWeekly: recurringWeekly,
        recurringMonthly: recurringMonthly,
        selectedTests: options.selectedTests || [],
        testName: options.testName || `${apiGroupName}_${testSuiteName}`,
        testRunTime: testRunTime,
        maxConcurrentRequests: maxConcurrentRequests,
        overriddenTestAppUrl: overriddenTestAppUrl || options.overriddenTestAppUrl || "",
        testRoleId: testRoleId || options.testRoleId || "",
        continuousTesting: false,
        sendSlackAlert: options.sendSlackAlert === true,
        sendMsTeamsAlert: options.sendMsTeamsAlert === true,
        testConfigsAdvancedSettings: testConfigsAdvancedSettings,
        cleanUpTestingResources: false,
        testSuiteIds: options.testSuiteIds || [testSuiteId],
        autoTicketingDetails: autoTicketingDetails,
        selectedMiniTestingServiceName: options.selectedMiniTestingServiceName || null,
        selectedSlackWebhook: options.selectedSlackWebhook || null,
        doNotMarkIssuesAsFixed: options.doNotMarkIssuesAsFixed === true, // Note: checked in UI means false here
        metadata: metaData
    };

    try {
        const response = await axios.post(`${AKTO_DASHBOARD_URL}${RUN_TEST}`, data, { headers });
        return response;
    } catch (error) {
        console.error(`Failed to trigger test for ${apiGroupName}. Status: ${error.response?.status}`);
        throw error;
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
    
    // Extract options from configObj or environment variables
    const options = {
        // Date and time options
        startDate: configObj?.startDate || process.env['AKTO_START_DATE'],
        startTime: configObj?.startTime || process.env['AKTO_START_TIME'] || 'Now',
        startTimestamp: configObj?.startTimestamp,
        
        // Test run configuration
        testRunTime: configObj?.testRunTime || process.env['AKTO_TEST_RUN_TIME'] || runTime.toString(),
        testName: configObj?.testName,
        
        // Test role
        testRoleId: configObj?.testRoleId || process.env['AKTO_TEST_ROLE_ID'] || "",
        
        // Concurrency
        maxConcurrentRequests: configObj?.maxConcurrentRequests || process.env['AKTO_MAX_CONCURRENT_REQUESTS'] || "100",
        
        // Recurring schedule
        recurringDaily: configObj?.recurringDaily === true || process.env['AKTO_RECURRING_DAILY'] === 'true',
        recurringWeekly: configObj?.recurringWeekly === true || process.env['AKTO_RECURRING_WEEKLY'] === 'true',
        recurringMonthly: configObj?.recurringMonthly === true || process.env['AKTO_RECURRING_MONTHLY'] === 'true',
        
        // Integration options
        sendSlackAlert: configObj?.sendSlackAlert === true || process.env['AKTO_SEND_SLACK_ALERT'] === 'true',
        sendMsTeamsAlert: configObj?.sendMsTeamsAlert === true || process.env['AKTO_SEND_MS_TEAMS_ALERT'] === 'true',
        selectedSlackWebhook: configObj?.selectedSlackWebhook || process.env['AKTO_SLACK_WEBHOOK_ID'],
        selectedMiniTestingServiceName: configObj?.selectedMiniTestingServiceName || process.env['AKTO_MINI_TESTING_SERVICE_NAME'],
        
        // Auto-ticketing
        autoTicketingDetails: configObj?.autoTicketingDetails || process.env['AKTO_AUTO_TICKETING_DETAILS'],
        
        // Advanced configurations
        testConfigsAdvancedSettings: configObj?.testConfigsAdvancedSettings || process.env['AKTO_TEST_CONFIGS_ADVANCED_SETTINGS'],
        
        // Other options
        overriddenTestAppUrl: configObj?.overriddenTestAppUrl || process.env['OVERRIDDEN_TEST_APP_URL'] || "",
        doNotMarkIssuesAsFixed: configObj?.doNotMarkIssuesAsFixed === true || process.env['AKTO_DO_NOT_MARK_ISSUES_AS_FIXED'] === 'true',
        selectedTests: configObj?.selectedTests || [],
        testSuiteIds: configObj?.testSuiteIds
    };

    const response = await sendRequestForInit(
        apiCollectionId, 
        apiGroupName, 
        testSuiteId, 
        options.testRoleId, 
        options.overriddenTestAppUrl, 
        testSuiteName, 
        runTime, 
        configObjNew.data.metadata,
        options
    );
    return response;
}
module.exports = { runForGroup };
// export { runForGroup }