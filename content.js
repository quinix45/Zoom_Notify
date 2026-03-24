(function() {
    console.log("🕵️ Zoom Logger: Tooltip-Aware Sync Active...");

    if (!window.loggedMessages) {
        window.loggedMessages = new Set();
    }
    
    // Track processed elements to avoid re-processing
    if (!window.processedElements) {
        window.processedElements = new WeakSet();
    }
    
    // Track how many tooltip messages we've seen to skip them in the main list
    if (window.tooltipSkipCount === undefined) {
        window.tooltipSkipCount = 0;
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

    function isOwnMessage(msgElement) {
        // Check if this message is from "You"
        
        // const senderElement = msgElement.closest('.chat-item')?.querySelector('.chat-item__sender');

        const allSenderElements = document.querySelectorAll('.chat-item__sender');
        const lastSenderElement = allSenderElements[allSenderElements.length - 1];

        if (lastSenderElement) {
            const senderText = lastSenderElement.title || lastSenderElement.innerText || lastSenderElement.textContent;
            // Check if the sender is "You" or has data-name="You"
            if (senderText === "You") {
                return true;
            }
        }
        
        // Also check tooltip messages
        const tooltipContainer = msgElement.closest('.last-chat-message-tip__container');
        if (tooltipContainer) {
            const tooltipHeader = tooltipContainer.querySelector('.last-chat-message-tip__from-to');
            if (tooltipHeader) {
                const senderText = tooltipHeader.innerText.split(/\s+to\s+/i)[0];
                if (senderText === "You" || senderText === "You (Host)") {
                    return true;
                }
            }
        }
        
        return false;
    }


    // function getSenderNameOfMostRecentMessage(messageElement)
    // {

    // }


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

    // Initial scan to mark existing messages without notifying
    // let initialScanDone = false;
    
    // function initialScan() {
    //     if (initialScanDone) return;
        
    //     console.log("📝 Running initial scan to mark existing messages...");
        
    //     // Temporarily disable notifications
    //     const originalSendMessage = chrome.runtime.sendMessage;
    //     chrome.runtime.sendMessage = function() {
    //         // Do nothing during initial scan
    //         console.log("🚫 Suppressed notification during initial scan");
    //     };
        
    //     // Run the scan
    //     scanForMessages();
        
    //     // Restore original sendMessage
    //     setTimeout(() => {
    //         chrome.runtime.sendMessage = originalSendMessage;
    //         initialScanDone = true;
    //         console.log("✅ Initial scan complete - now monitoring for new messages");
    //     }, 100);
    // }
    
    // Run initial scan after a delay
    // setTimeout(initialScan, 3000);
    
    // Regular scanning
    // setInterval(scanForMessages, 2000);
    
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