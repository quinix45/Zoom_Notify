chrome.runtime.onMessage.addListener((request) => {

	if (request.action !== "notify")
		return;

	// console.log(`Sending message: ${request.text}`);
	const message = JSON.parse(request.text);

	chrome.notifications.create({
		type: "basic",
		iconUrl: "icon512.png",
		title: message.sender,
		message: message.text
	}, (notificationId) => {
		// Wait some time, then call clear
		setTimeout(() => { chrome.notifications.clear(notificationId) }, 5000);
	});
});