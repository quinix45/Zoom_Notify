(function () {

	// Initial execution stuff
	console.log("🕵️ Zoom Chat Logger Active...");

	window.sentMessageIds ??= new Set();

	observeChatChanges();

	// Message Class
	class Message {

		constructor(sender, receiver, text) {
			// message sender
			this.sender = sender;
			// message receiver (either everyone or Private)
			this.receiver = receiver;
			// text of the message
			this.text = text;
			// message ID
			this.id = sender + receiver + text;
		}
	}

	// Entry point, check for DOM changes
	function observeChatChanges() {
		const observer = new MutationObserver(handleMostRecentChatMessage);

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	function handleMostRecentChatMessage() {

		let message;

		// checks if chat is open in column mode
		if (document.getElementsByClassName("chat-header__header").length > 0) {
			message = getLatestMessageInChat();
		}
		// checks if chat is open in floating mode
		else if (document.getElementById("chat-window") != null) {
			message = getLatestMessageInChat();
		}
		// checks if tooltip exists
		else if (document.getElementsByClassName("last-chat-message-tip__container").length > 0) {
			message = getLatestMessageFromToolTip();
		}

		if (!message)
			return;

		// Skips
		if (message.receiver != "Everyone" || message.sender == "You" || window.sentMessageIds.has(message.id)) {
			// console.log("Skipping:");
			// console.log(message);
			return;
		}
		// Send it
		else {
			window.sentMessageIds.add(message.id);
			// console.log("Sending");
			// console.log(message);

			chrome.runtime.sendMessage({
				action: "notify",
				text: `<b>${message.sender}:</b> ${message.text}`
			});
		}
	}

	function getLatestMessageInChat() {
		const nodeList = document.querySelectorAll(".new-chat-message__container");

		if (nodeList.length == 0)
			return;

		const chatMessageContainer = nodeList[nodeList.length - 1];

		if (!chatMessageContainer)
			return;

		// Fabio Setti to Everyone, 09:20 PM, ball
		const fromAndTo = chatMessageContainer.getAttribute("aria-label");
		const senderAndReceiver = fromAndTo.match(/^(.+?)\s+to\s+([^,]+)/);
		const sender = senderAndReceiver[1];
		const receiver = senderAndReceiver[2];

		const text = extractTextWithEmojis(chatMessageContainer.querySelector("._rtfEditor_1n3rs_1"));

		return new Message(sender, receiver, text);
	}

	function getLatestMessageFromToolTip() {
		const tooltipContainer = document.querySelector(".last-chat-message-tip__container");

		if (!tooltipContainer)
			return;

		const fromAndTo = tooltipContainer.querySelector(".last-chat-message-tip__from-to").innerText;
		const senderAndReceiver = fromAndTo.match(/^(.+?)\s+To\s+([^,]+)/);	// dodgy regex
		const sender = senderAndReceiver[1];
		const receiver = senderAndReceiver[2];

		const text = extractTextWithEmojis(tooltipContainer.querySelector(".last-chat-message-tip__content-html"));

		return new Message(sender, receiver, text);//, 99, "tooltip", false);
	}

	function extractTextWithEmojis(node) {
		let text = "";
		node.childNodes.forEach(child => {
			if (child.nodeType === Node.TEXT_NODE) {
				text += child.textContent;
			} else if (child.nodeType === Node.ELEMENT_NODE) {
				if (child.tagName === "IMG" && (child.dataset.emoji || child.alt)) {
					text += child.dataset.emoji || child.alt;
				} else {
					text += extractTextWithEmojis(child);
				}
			}
		});
		return text;
	}
})();