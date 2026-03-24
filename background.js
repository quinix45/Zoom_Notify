
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "notify") {
    // This connects to the python script
    const port = chrome.runtime.connectNative('com.zoom.logger');
    port.postMessage({ text: request.text });
  }
});