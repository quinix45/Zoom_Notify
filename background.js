chrome.runtime.onMessage.addListener((request) => {

	if (request.action !== "notify")
		return;

	// console.log(`Sending message: ${request.text}`);

	chrome.notifications.create({
		type: "basic",
		iconUrl: "icon.png",
		title: "Message from Tester",
		message: request.text
	}, (notificationId) => {
		// Wait some time, then call clear
		setTimeout(() => { chrome.notifications.clear(notificationId) }, 5000);
	});
});