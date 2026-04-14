chrome.runtime.onMessage.addListener((request) => {

	if (request.action !== "notify")
		return;

	const message = JSON.parse(request.text);
	showPopup(message.sender, message.text);
});

async function showPopup(sender, text) {

	const WIDTH  = 340;
	const HEIGHT = 90;
	const MARGIN = 16;

	// Get screen dimensions so we can position in the top-right corner
	const displays = await chrome.system.display.getInfo();
	const screen = displays[0];
	const left = screen.workArea.left + screen.workArea.width  - WIDTH  - MARGIN;
	const top  = screen.workArea.top  + MARGIN;

	// Grab the currently focused window so we can restore focus after the popup steals it
	const focused = await chrome.windows.getLastFocused();

	const url = chrome.runtime.getURL("notification.html")
		+ `?sender=${encodeURIComponent(sender)}&text=${encodeURIComponent(text)}`;

	await chrome.windows.create({
		url,
		type:   "popup",
		width:  WIDTH,
		height: HEIGHT,
		left,
		top,
	});

	// Give focus back to wherever the user was
	if (focused?.id) {
		chrome.windows.update(focused.id, { focused: true });
	}
}
