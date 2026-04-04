chrome.runtime.onMessage.addListener((request) => {
	if (request.action === "notify") {

		console.log(navigator.userAgentData.platform);

		// This connects to the python script for linux notify-send
		// const port = chrome.runtime.connectNative('com.zoom.logger');
		// port.postMessage({ text: request.text });

		// This uses chrome.notifications.create
		console.log(`Sending message: ${request.text}`);
		chrome.notifications.create({
			type: "basic",
			iconUrl: "icon.png",
			title: "Hello",
			message: `Windows notfication??? Text: ${request.text}`
		}, (notificationId) => {
			console.log("Notification created:", notificationId);
			console.log("Last error:", chrome.runtime.lastError);
		});



		// chrome.runtime.sendMessage({
		// 	type: "showNotification",
		// 	title: "Hello"
		// });
	}
});