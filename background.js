;let problemList = [];
let problemsLoaded = false;

// Load problems from JSON file
fetch(browser.runtime.getURL('problems.json'))
  .then(response => response.json())
  .then(data => {
    problemList = data.problems;
    problemsLoaded = true;
    console.log('Loaded', problemList.length, 'problems');
  })
  .catch(error => {
    console.error('Failed to load problems:', error);
  });

const allowedDomains = [
  "leetcode.com",
  "neetcode.io",
  "neetcode.com",
  "developer.mozilla.org",
  "stackoverflow.com",
  "github.com",
  "geeksforgeeks.org"
];

function isAllowedUrl(url) {
  try {
    const urlObj = new URL(url);
    return allowedDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

function isTodayComplete() {
  return browser.storage.local.get(['lastCompleted', 'timerExpired']).then(data => {
    const today = new Date().toDateString();
    const lastCompleted = data.lastCompleted || '';
    const timerExpired = data.timerExpired || '';
    
    return lastCompleted === today || timerExpired === today;
  });
}

function getTodaysProblem() {
  return browser.storage.local.get(['currentProblemIndex']).then(data => {
    const index = data.currentProblemIndex || 0;
    
    // Wait for problems to load if not ready
    if (!problemsLoaded || problemList.length === 0) {
      return {
        id: 0,
        name: "Loading problems...",
        url: "https://leetcode.com"
      };
    }
    
    return problemList[index % problemList.length];
  });
}

// Block requests
browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.tabId === -1) return;
    
    const complete = await isTodayComplete();
    if (complete) return;
    
    if (isAllowedUrl(details.url)) return;
    
    return {
      redirectUrl: browser.runtime.getURL("blocked.html")
    };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Listen for completion message
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "markComplete") {
    const today = new Date().toDateString();
    browser.storage.local.get(['currentProblemIndex']).then(data => {
      const newIndex = (data.currentProblemIndex || 0) + 1;
      browser.storage.local.set({
        lastCompleted: today,
        currentProblemIndex: newIndex,
        timerExpired: ''
      });
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  } else if (message.action === "startTimer") {
    browser.storage.local.set({ timerStarted: Date.now() });
    sendResponse({ success: true });
  } else if (message.action === "skipWithTimer") {
    const today = new Date().toDateString();
    browser.storage.local.get(['currentProblemIndex']).then(data => {
      const newIndex = (data.currentProblemIndex || 0) + 1;
      browser.storage.local.set({ 
        timerExpired: today,
        currentProblemIndex: newIndex
      });
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === "getStatus") {
    // Wait for problems to load
    const waitForProblems = () => {
      if (problemsLoaded && problemList.length > 0) {
        Promise.all([isTodayComplete(), getTodaysProblem()]).then(([complete, problem]) => {
          browser.storage.local.get(['timerStarted']).then(data => {
            sendResponse({ 
              complete, 
              problem,
              timerStarted: data.timerStarted || null
            });
          });
        });
      } else {
        setTimeout(waitForProblems, 100);
      }
    };
    waitForProblems();
    return true; // Keep channel open for async response
  }
});
