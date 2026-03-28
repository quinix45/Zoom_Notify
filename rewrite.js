(function() {
    console.log("🕵️ Zoom Logger: Tooltip-Aware Sync Active...");

	// Message Class
	class Message {
		
		constructor(sender, receiver, text) {//}, msg_index, element_origin, notified = false) {
			// message sender
			this.sender = sender;
			// message receiver (either everyone or Private)
			this.receiver = receiver;
			// text of the message
			this.text = text;


			this.id = sender + receiver + text;

			// // Order of message
			// this.msg_index = msg_index;
			// // whether the message comes form the tooltip, floating chat, column chat
			// this.element_origin = element_origin;
			// // Whether the notification for the message has already been sent
			// this.notified = notified;
		}
	}

	// Initial execution stuff
	window.sentMessageIds ??= new Set();


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

    function isOwnMessage(msgElement) {
        // Check if this message is from "You"
        
        const allSenderElements = document.querySelectorAll('.chat-item__sender');
        const lastSenderElement = allSenderElements[allSenderElements.length - 1];

        if (lastSenderElement) {
            const senderText = lastSenderElement.title || lastSenderElement.innerText || lastSenderElement.textContent;
            // Check if the sender is "You" or has data-name="You"
            if (senderText === "You") {
                return true;
            }
        }
                
        return false;
    }

	function handleMostRecentChatMessage() {

		let message;

		// checks if chat is open in column mode
		if (document.getElementsByClassName("chat-header__header").length > 0) {
			message = handleMessageInChat();
		}
		// checks if chat is open in floating mode
		else if (document.getElementById("chat-window") != null) {
			message = handleMessageInChat();
		}
		// checks if tooltip exists
		else if (document.getElementsByClassName("last-chat-message-tip__container").length > 0) {
			message = handleMessageFromToolTip();
		}

		// Now send it (if we didn't already)
		if (!window.sentMessageIds.has(message.id))
		{
			window.sentMessageIds.add(message.id);
			console.log(message);
		}
		else
			console.log("Skipped");
	}

	function getLatestMessageInChat() {
		// CONTINUE HERE: find last with 
		// <div class="new-chat-message__container" id="chat-message-content-5" aria-label="test to Everyone, 09:50 AM, hi" role="row"></div>

		const nodeList = document.querySelectorAll(".new-chat-message__container");

		const chatMessageContainer = nodeList[nodeList.length - 1];

		// Fabio Setti to Everyone, 09:20 PM, ball
		const fromAndTo = chatMessageContainer.getAttribute("aria-label");
		const senderAndReceiver = fromAndTo.match(/^(.+?)\s+to\s+([^,]+)/);
		const sender = senderAndReceiver[1];
		const receiver = senderAndReceiver[2];

		const text = extractTextWithEmojis(chatMessageContainer);

		// id="chat-message-content-5"
		// const msg_index = chatMessageContainer.getAttribute("id").match(/([0-9]+)$/);

		return new Message(sender, receiver, text);//, msg_index, "chat", false);
	}

	function getLatestMessageFromToolTip() {
		const tooltipContainer = document.querySelector(".last-chat-message-tip__container");

		const fromAndTo = tooltipContainer.querySelector(".last-chat-message-tip__from-to").innerText;
		const senderAndReceiver = fromAndTo.match(/^(.+?)\s+To\s+([^,]+)/);	// dodgy regex
		const sender = senderAndReceiver[1];
		const receiver = senderAndReceiver[2];

		const text = extractTextWithEmojis(tooltipContainer.querySelector(".last-chat-message-tip__content-html"));

		return new Message(sender, receiver, text);//, 99, "tooltip", false);
	}



    // Ideally, there should only be 1 new message every time this runs
    function scanForMessages() {
        // if breaks, check that this is the same
        // Class name for the message body
        const selector = '._rtfEditor_1n3rs_1';
        
        // Find all chat messages?
        function findInShadows(root) {
            let allChatMessages = Array.from(root.querySelectorAll(selector));

            // This could be a big performance problem
            // You could probably just loop over each chat message and check shadow roots?
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot)
                    allChatMessages = allChatMessages.concat(findInShadows(el.shadowRoot));
            });

            return allChatMessages;
        }

        const allPotentialMessages = findInShadows(document);

        allPotentialMessages.forEach(msg => {

            // Skip if we've already processed this exact DOM element
            if (window.processedElements.has(msg)) {
                return;
            }

            const combinedText = extractTextWithEmojis(msg).trim();

            // Skip if there's no text
            if (!combinedText || combinedText === "no message")
                return;

            // Skip if this is your own message
            if (isOwnMessage(msg)) {
                window.processedElements.add(msg);
                console.log("🚫 Skipped own message");
                return;
            }

            const tooltipContainer = msg.closest('.last-chat-message-tip__container');
            const tooltipHeader = tooltipContainer?.querySelector('.last-chat-message-tip__from-to');
            
            let rawSender = "Unknown";
            let isTooltip = false;

            if (tooltipHeader) {
                rawSender = tooltipHeader.innerText.split(/\s+to\s+/i)[0];
                isTooltip = true;
            } else {
                const elements = document.querySelectorAll('.chat-item__sender.chat-item__chat-info-header--can-select');
                if (elements.length > 0) {
                    rawSender = elements[elements.length - 1].title || elements[elements.length - 1].innerText;
                }
            }

            const cleanSender = rawSender.replace(/\(Host\)/gi, "").trim();
            const messageKey = `${cleanSender}:${combinedText}`.toLowerCase().replace(/\s+/g, '');

            // --- SKIP LOGIC ---
            // If this is a main chat message and we have pending tooltip skips, skip it
            if (!isTooltip && window.tooltipSkipCount > 0 && !window.loggedMessages.has(messageKey)) {
                window.tooltipSkipCount--;
                window.loggedMessages.add(messageKey);
                window.processedElements.add(msg);
                console.log("⏭️ Skipped main chat duplicate (already notified via Tooltip)");
                return;
            }

            // Only notify if we haven't seen this message before
            if (!window.loggedMessages.has(messageKey)) {
                window.loggedMessages.add(messageKey);
                window.processedElements.add(msg);

                // If this came from a tooltip, increment our skip counter for the main list
                if (isTooltip) {
                    window.tooltipSkipCount++;
                }

                chrome.runtime.sendMessage({ 
                    action: "notify", 
                    text: `<b>${cleanSender}:</b> ${combinedText}` 
                });

                console.log(`✅ Notified: ${cleanSender}`);

                // Clean up old messages to prevent memory bloat
                if (window.loggedMessages.size > 200) {
                    const toDelete = Array.from(window.loggedMessages).slice(0, 50);
                    toDelete.forEach(key => window.loggedMessages.delete(key));
                }
            }
        });
    }

    // Optional: Mutation observer for faster detection
    function observeChatChanges() {
        const observer = new MutationObserver(() => {
            // setTimeout(scanForMessages, 100);
            scanForMessages();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    observeChatChanges();
})();