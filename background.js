chrome.runtime.onMessage.addListener((request) => {

	if (request.action !== "notify")
		return;

	const platform = navigator.userAgentData.platform;

	// Handle windows notification
	if (platform == "Windows") {
		// This uses chrome.notifications.create
		console.log(`Sending message: ${request.text}`);
		chrome.notifications.create({
			type: "basic",
			iconUrl: "icon.png",
			title: "Message from Tester",
			message: request.text
		});
		// Uncomment this for extra diagnostics if the messages don't come through.
		// }, (notificationId) => {
		// 	console.log("Notification created:", notificationId);
		// 	console.log("Last error:", chrome.runtime.lastError);
		// });
	}
	// Handle Linux/Arch/Omarchy notification using `notify-send`
	else {
		// This connects to the python script for linux notify-send
		const port = chrome.runtime.connectNative('com.zoom.logger');
		port.postMessage({ text: request.text });
	}
	// TODO, add proper else if for checking linux? Also check mac?
});