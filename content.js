(function () {

	// Initial execution stuff
	console.log("🕵️ Zoom Chat Logger Active...");

	window.sentMessageIds ??= new Set();

	// Setup test if on the test page
	if (window.location.href.endsWith("Tester.html")) {
		setupTestButton();
	}
	
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

	// Test Entry Point
	function setupTestButton() {
		document.getElementById("test-button").addEventListener("click", () => {

			// First, grab the content of the input text thing
			const inputText = document.getElementById("test-input").value;

			console.log(`button clicked! Text: ${inputText}`);

			chrome.runtime.sendMessage({
				action: "notify",
				text: JSON.stringify(new Message("Tester", "Everyone", inputText))
			});
		});
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
				text: JSON.stringify(message)
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

		const text = extractTextWithEmojis(tooltipContainer.querySelector("._rtfEditor_1n3rs_1"));

		return new Message(sender, receiver, text);//, 99, "tooltip", false);
	}

	// node should be a div with ._rtfEditor_1n3rs_1 class.
	function extractTextWithEmojis(node) {
		let text = "";

		// Every child should be a p tag
		node.childNodes.forEach(child => {
			if (child.tagName != 'P')
			{
				console.warn("P tag??? WTF??");
				return;
			}

			text += extractTextFromPTag(child) + "\n";
		});

		return text.trimEnd();
	}

	function extractTextFromPTag(ptag) {
		let result = "";

		ptag.childNodes.forEach(node => {
			if (node.nodeType === Node.TEXT_NODE) {
				// If it's text, append it directly
				result += node.textContent;
			} else if (node.nodeName === 'SPAN' && node.hasAttribute('data-emoji')) {
				// If it's a span with a data-emoji attribute, append the emoji from the attribute
				result += node.getAttribute('data-emoji');
			} else if (node.nodeName === 'IMG' && node.hasAttribute('data-emoji')) {
				// If it's an img with a data-emoji attribute, append the emoji from the attribute
				result += node.getAttribute('data-emoji');
			}
		});

		return result;
	}
})();