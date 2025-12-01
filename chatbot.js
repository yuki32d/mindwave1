// MINDWAVE Gemini Chatbot
// This script injects a floating chat button and handles the chat interface

(function () {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --chat-primary: #0f62fe;
            --chat-bg: #1c1f26;
            --chat-header-bg: #0f62fe;
            --chat-text: #f5f7ff;
            --chat-input-bg: #0b0d15;
            --chat-user-msg-bg: #0f62fe;
            --chat-bot-msg-bg: #2a2e39;
            --chat-radius: 16px;
            --chat-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            --chat-font: "Inter", system-ui, -apple-system, sans-serif;
        }

        .mw-chat-widget {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            font-family: var(--chat-font);
        }

        .mw-chat-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: var(--chat-primary);
            border: none;
            box-shadow: 0 4px 12px rgba(15, 98, 254, 0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
        }

        .mw-chat-button:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(15, 98, 254, 0.5);
        }

        .mw-chat-button svg {
            width: 32px;
            height: 32px;
            fill: white;
        }

        .mw-chat-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 380px;
            height: 600px;
            max-height: calc(100vh - 120px);
            background: var(--chat-bg);
            border-radius: var(--chat-radius);
            box-shadow: var(--chat-shadow);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
            transition: opacity 0.3s, transform 0.3s;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .mw-chat-window.open {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: all;
        }

        .mw-chat-header {
            background: var(--chat-header-bg);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: white;
        }

        .mw-chat-title {
            font-weight: 600;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .mw-chat-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            font-size: 20px;
            padding: 4px;
            border-radius: 50%;
            transition: background 0.2s;
        }

        .mw-chat-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .mw-chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
            scroll-behavior: smooth;
        }

        .mw-message {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.5;
            position: relative;
            word-wrap: break-word;
        }

        .mw-message.user {
            align-self: flex-end;
            background: var(--chat-user-msg-bg);
            color: white;
            border-bottom-right-radius: 4px;
        }

        .mw-message.bot {
            align-self: flex-start;
            background: var(--chat-bot-msg-bg);
            color: var(--chat-text);
            border-bottom-left-radius: 4px;
        }

        .mw-message code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 4px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
        }

        .mw-message pre {
            background: rgba(0, 0, 0, 0.3);
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 8px 0;
        }

        .mw-chat-input-area {
            padding: 16px;
            background: rgba(0, 0, 0, 0.2);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            gap: 10px;
        }

        .mw-chat-input {
            flex: 1;
            background: var(--chat-input-bg);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 12px 16px;
            color: white;
            font-family: inherit;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }

        .mw-chat-input:focus {
            border-color: var(--chat-primary);
        }

        .mw-chat-send {
            background: var(--chat-primary);
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .mw-chat-send:hover {
            transform: scale(1.05);
        }

        .mw-chat-send:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .mw-typing-indicator {
            display: flex;
            gap: 4px;
            padding: 4px 8px;
            align-items: center;
        }

        .mw-typing-dot {
            width: 6px;
            height: 6px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            animation: mw-bounce 1.4s infinite ease-in-out both;
        }

        .mw-typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .mw-typing-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes mw-bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }

        /* Markdown Styles */
        .mw-message p { margin: 0 0 8px 0; }
        .mw-message p:last-child { margin: 0; }
        .mw-message ul, .mw-message ol { margin: 0 0 8px 20px; padding: 0; }
        .mw-message li { margin-bottom: 4px; }
        .mw-message strong { font-weight: 600; color: #fff; }
        
        @media (max-width: 480px) {
            .mw-chat-window {
                width: calc(100vw - 32px);
                bottom: 90px;
                right: 16px;
                height: 500px;
            }
            .mw-chat-widget {
                right: 16px;
                bottom: 16px;
            }
        }
    `;
    document.head.appendChild(style);

    // Create Widget
    const widget = document.createElement('div');
    widget.className = 'mw-chat-widget';
    widget.innerHTML = `
        <div class="mw-chat-window" id="mwChatWindow">
            <div class="mw-chat-header">
                <div class="mw-chat-title">
                    <span>✨</span> Mindwave AI
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="mw-chat-close" id="mwChatNew" title="New Chat">🔄</button>
                    <button class="mw-chat-close" id="mwChatClose" title="Close">&times;</button>
                </div>
            </div>
            <div class="mw-chat-messages" id="mwChatMessages">
                <div class="mw-message bot">
                    Hello! I'm your Mindwave AI assistant. How can I help you with your studies today? 🚀
                </div>
            </div>
            <div class="mw-chat-input-area">
                <input type="text" class="mw-chat-input" id="mwChatInput" placeholder="Ask anything..." autocomplete="off">
                <button class="mw-chat-send" id="mwChatSend">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                </button>
            </div>
        </div>
        <button class="mw-chat-button" id="mwChatToggle">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"></path></svg>
        </button>
    `;
    document.body.appendChild(widget);

    // Elements
    const windowEl = document.getElementById('mwChatWindow');
    const toggleBtn = document.getElementById('mwChatToggle');
    const closeBtn = document.getElementById('mwChatClose');
    const newChatBtn = document.getElementById('mwChatNew');
    const inputEl = document.getElementById('mwChatInput');
    const sendBtn = document.getElementById('mwChatSend');
    const messagesEl = document.getElementById('mwChatMessages');

    // State
    let isOpen = false;
    let isTyping = false;
    let chatHistory = []; // Store history for context

    // Toggle Chat
    function toggleChat() {
        isOpen = !isOpen;
        if (isOpen) {
            windowEl.classList.add('open');
            inputEl.focus();
        } else {
            windowEl.classList.remove('open');
        }
    }

    // New Chat
    function startNewChat() {
        chatHistory = [];
        messagesEl.innerHTML = `
            <div class="mw-message bot">
                Hello! I'm your Mindwave AI assistant. How can I help you with your studies today? 🚀
            </div>
        `;
    }

    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    newChatBtn.addEventListener('click', startNewChat);

    // Send Message
    async function sendMessage() {
        const text = inputEl.value.trim();
        if (!text || isTyping) return;

        // Add User Message
        addMessage(text, 'user');
        inputEl.value = '';

        // Show Typing Indicator
        isTyping = true;
        const typingId = addTypingIndicator();
        messagesEl.scrollTop = messagesEl.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: chatHistory
                })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Remove Typing Indicator
            removeMessage(typingId);
            isTyping = false;

            if (data.ok) {
                addMessage(data.reply, 'bot');
                // Update history
                chatHistory.push({ role: 'user', parts: [{ text: text }] });
                chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });
            } else {
                addMessage("Sorry, I'm having trouble connecting right now. Please try again.", 'bot');
                console.error('API Error:', data);
            }

        } catch (error) {
            console.error('Chat error:', error);
            removeMessage(typingId);
            isTyping = false;
            addMessage(`Network error: ${error.message}. Please check your connection.`, 'bot');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Helper: Add Message
    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `mw-message ${type}`;

        // Simple Markdown Parsing
        let html = text
            .replace(/```(\w*)([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>') // Code blocks
            .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\n/g, '<br>'); // Newlines

        div.innerHTML = html;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return div.id = 'msg-' + Date.now();
    }

    // Helper: Typing Indicator
    function addTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'mw-message bot';
        div.innerHTML = `
            <div class="mw-typing-indicator">
                <div class="mw-typing-dot"></div>
                <div class="mw-typing-dot"></div>
                <div class="mw-typing-dot"></div>
            </div>
        `;
        const id = 'typing-' + Date.now();
        div.id = id;
        messagesEl.appendChild(div);
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

})();
