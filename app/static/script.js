// Global variables
let ws = null;
let typingTimer = null;
let typingDebounceTimer = null;
let isTyping = false;
const messageSound = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAEAAABVgANTU1NTU1Q0NDQ0NDUFBQUFBQXl5eXl5ea2tra2tra3l5eXl5eYaGhoaGhpSUlJSUlKGhoaGhoaGvr6+vr6+8vLy8vLzKysrKysrY2NjY2Njm5ubm5ub09PT09PT///////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAABVjMmLsL/+RYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxHYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxLEAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");

// Utility functions
function showError(message, type = "error") {
    console.log(`Showing ${type}:`, message);
    const error = document.createElement("div");
    error.className = `message-popup ${type}`;
    error.textContent = message;
    document.body.appendChild(error);

    setTimeout(() => {
        error.style.animation = "fadeOut 0.5s ease forwards";
        setTimeout(() => {
            error.remove();
        }, 500);
    }, 3000);
}

function shakeElement(element) {
    if (!element) return;
    element.style.animation = "shake 0.5s ease";
    setTimeout(() => {
        element.style.animation = "";
    }, 500);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Open image in modal
function openImageModal(imageSrc) {
    const modal = document.createElement("div");
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    const img = document.createElement("img");
    img.src = imageSrc;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 10px;
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    modal.addEventListener("click", () => {
        document.body.removeChild(modal);
    });
}

// Auth functions
async function registerUser() {
    console.log("Register function called");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    
    if (!usernameInput || !passwordInput) {
        showError("Login yoki parol maydonlari topilmadi");
        return;
    }
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
        shakeElement(usernameInput);
        showError("Iltimos, login va parolni kiriting");
        return;
    }
    
    try {
        // Check password length before sending to server
        if (new TextEncoder().encode(password).length > 72) {
            showError("Parol juda uzun - 72 baytdan kam bolishi kerak");
            return;
        }

        const res = await fetch("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.detail || "Royxatdan otishda xatolik");
        }
        
        showError("Royxatdan muvaffaqiyatli otdingiz. Endi kirishingiz mumkin.", "success");
        passwordInput.value = "";
    } catch (e) {
        showError(e.message || "Xatolik yuz berdi");
    }
}

async function loginUser() {
    console.log("Login function called");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    
    if (!usernameInput || !passwordInput) {
        showError("Login yoki parol maydonlari topilmadi");
        return;
    }
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
        shakeElement(usernameInput);
        showError("Iltimos, login va parolni kiriting");
        return;
    }
    
    try {
        const res = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.detail || "Kirishda xatolik");
        }

        localStorage.setItem("access_token", data.access_token);
        connectWebSocket(username);
    } catch (e) {
        showError(e.message || "Xatolik yuz berdi");
    }
}

// Chat functions
function connectWebSocket(username) {
    console.log("Connecting WebSocket for user:", username);
    const chatContainer = document.getElementById("chat-box");
    const loginContainer = document.getElementById("login-container");
    const messagesContainer = document.getElementById("messages");
    const messageInput = document.getElementById("message");
    const onlineUsers = document.getElementById("online-users");
    const typingIndicator = document.getElementById("typing-indicator");

    if (!chatContainer || !loginContainer || !messagesContainer || !messageInput || !onlineUsers || !typingIndicator) {
        showError("Chat elementlari topilmadi");
        return;
    }

    // Show chat, hide login
    chatContainer.classList.remove("hidden");
    loginContainer.classList.add("hidden");

    // Initialize sticker and emoji pickers after chat is visible
    setTimeout(() => {
        console.log("Initializing pickers after chat opened...");
        const testBtn = document.getElementById("sticker-btn");
        const testPicker = document.getElementById("sticker-picker");
        console.log("Test elements:", { testBtn, testPicker });
        
        if (testBtn && testPicker) {
            initStickerPicker();
            initEmojiPicker();
            console.log("Pickers initialized successfully");
        } else {
            console.error("Elements not found, retrying...");
            setTimeout(() => {
                initStickerPicker();
                initEmojiPicker();
            }, 200);
        }
    }, 100);

    // Connect to WebSocket
    const token = localStorage.getItem("access_token");
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/${token}`);

    let pingInterval;

    ws.onopen = () => {
        console.log("WebSocket ulanish o'rnatildi");
        showError("Chatga ulandingiz!", "success");
        
        // Start sending ping messages every 30 seconds
        pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "ping" }));
            }
        }, 30000);
    };

    ws.onclose = () => {
        console.log("WebSocket ulanish uzildi");
        showError("Chat bilan aloqa uzildi");
        chatContainer.classList.add("hidden");
        loginContainer.classList.remove("hidden");
        
        // Clear ping interval
        if (pingInterval) {
            clearInterval(pingInterval);
        }
        
        // Try to reconnect after 5 seconds
        setTimeout(() => {
            if (document.visibilityState === "visible") {
                connectWebSocket(username);
            }
        }, 5000);
    };

    ws.onerror = (error) => {
        console.error("WebSocket xato:", error);
        showError("Chatga ulanishda xatolik yuz berdi");
    };

    ws.onmessage = (event) => {
        console.log("Raw message received:", event.data);
        try {
            const data = JSON.parse(event.data);
            console.log("Parsed message:", data);

            switch (data.type) {
                case "ping":
                    ws.send(JSON.stringify({ type: "pong" }));
                    break;
                
                case "message":
                    console.log("Message received:", data);
                    const messageDiv = document.createElement("div");
                    messageDiv.className = `message ${data.username === username ? "sent" : "received"}`;
                    
                    let messageHTML = `
                        <div class="message-content">
                            <span class="username">${data.username}</span>
                    `;
                    
                    // Add image if present
                    if (data.image) {
                        messageHTML += `<img src="${data.image}" alt="Rasm" class="message-image" onclick="openImageModal('${data.image}')" />`;
                    }
                    
                    // Add sticker if present (display larger)
                    if (data.isSticker && data.message) {
                        messageHTML += `<div class="message-sticker">${data.message}</div>`;
                    } else if (data.message) {
                        // Add regular message text
                        messageHTML += `<p>${escapeHtml(data.message)}</p>`;
                    }
                    
                    messageHTML += `
                            <span class="time">${new Date(data.timestamp).toLocaleTimeString()}</span>
                        </div>
                    `;
                    
                    messageDiv.innerHTML = messageHTML;
                    messagesContainer.appendChild(messageDiv);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    if (data.username !== username) {
                        messageSound.play().catch(console.error);
                    }
                    break;

                case "online_users":
                    onlineUsers.innerHTML = data.users
                        .filter(user => user !== username)
                        .map(user => `<span class="online-user"> ${user}</span>`)
                        .join("");
                    break;

                case "typing":
                    // Only show typing indicator for other users, not for current user
                    if (data.username && data.username !== username) {
                        if (data.is_typing) {
                            typingIndicator.textContent = `${data.username} yozmoqda...`;
                            clearTimeout(typingTimer);
                            typingTimer = setTimeout(() => {
                                typingIndicator.textContent = "";
                            }, 3000); // Show for 3 seconds
                        } else {
                            // Clear typing indicator when user stops typing
                            typingIndicator.textContent = "";
                            clearTimeout(typingTimer);
                        }
                    }
                    break;
                    
                default:
                    console.log("Unknown message type:", data.type);
                    break;
            }
        } catch (e) {
            console.error("Message parsing error:", e);
            // Try to handle text messages
            const messageDiv = document.createElement("div");
            messageDiv.className = "message received";
            messageDiv.innerHTML = `
                <div class="message-content">
                    <span class="username">System</span>
                    <p>${event.data}</p>
                    <span class="time">${new Date().toLocaleTimeString()}</span>
                </div>
            `;
            messagesContainer.appendChild(messageDiv);
        }
    };

    // Message input handler
    messageInput.onkeyup = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            // Stop typing indicator when sending message
            if (isTyping) {
                ws.send(JSON.stringify({ type: "typing", typing: false }));
                isTyping = false;
            }
            if (typingDebounceTimer) {
                clearTimeout(typingDebounceTimer);
                typingDebounceTimer = null;
            }
            sendMessage();
        } else {
            // Send typing status with debounce
            if (!isTyping) {
                ws.send(JSON.stringify({ type: "typing", typing: true }));
                isTyping = true;
            }
            
            // Clear existing debounce timer
            if (typingDebounceTimer) {
                clearTimeout(typingDebounceTimer);
            }
            
            // Set new debounce timer - stop typing after 2 seconds of inactivity
            typingDebounceTimer = setTimeout(() => {
                if (isTyping) {
                    ws.send(JSON.stringify({ type: "typing", typing: false }));
                    isTyping = false;
                }
            }, 2000);
        }
    };
}

function sendMessage() {
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        // Check if message is a single emoji (sticker)
        // Emoji characters are typically in the range 0x1F300-0x1F9FF or other emoji ranges
        const isSticker = message.length === 1 && (
            /[\u{1F300}-\u{1F9FF}]/u.test(message) || 
            /[\u{2600}-\u{26FF}]/u.test(message) ||
            /[\u{2700}-\u{27BF}]/u.test(message) ||
            /[\u{1F600}-\u{1F64F}]/u.test(message) ||
            /[\u{1F680}-\u{1F6FF}]/u.test(message) ||
            /[\u{1F1E0}-\u{1F1FF}]/u.test(message) ||
            /[\u{1F900}-\u{1F9FF}]/u.test(message) ||
            /[\u{1FA00}-\u{1FAFF}]/u.test(message)
        );
        
        ws.send(JSON.stringify({ 
            type: "message", 
            message: message,
            isSticker: isSticker
        }));
        messageInput.value = "";
        
        // Stop typing indicator
        if (isTyping) {
            ws.send(JSON.stringify({ type: "typing", typing: false }));
            isTyping = false;
        }
        if (typingDebounceTimer) {
            clearTimeout(typingDebounceTimer);
            typingDebounceTimer = null;
        }
    } else {
        showError("Chat bilan aloqa yo'q");
    }
}

// Sticker data (Telegram-style large emoji stickers)
const stickerCategories = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
    love: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️', '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓️', '🆔', '⚛️', '🉑', '☢️', '☣️'],
    celebration: ['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🥳', '🎆', '🎇', '✨', '🌟', '⭐', '💫', '🌠', '🎃', '🎄', '🎅', '🤶', '🎄', '🎁', '🎀', '🎊', '🎉', '🎈', '🎂', '🍰', '🧁', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🥳'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛'],
    food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪'],
    gestures: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃']
};

// Emoji data
const emojiCategories = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
    gestures: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '👨‍🦱', '👩‍🦰', '👨‍🦰', '👱', '👩‍🦳', '👨‍🦳', '👩‍🦲', '👨‍🦲', '🧔', '👵', '🧓', '👴', '👲', '👳', '👮', '👷', '💂', '🕵️', '👩‍⚕️', '👨‍⚕️', '👩‍🌾', '👨‍🌾', '👩‍🍳', '👨‍🍳', '👩‍🎓', '👨‍🎓', '👩‍🎤', '👨‍🎤', '👩‍🏫', '👨‍🏫', '👩‍🏭', '👨‍🏭', '👩‍💻', '👨‍💻', '👩‍💼', '👨‍💼', '👩‍🔧', '👨‍🔧', '👩‍🔬', '👨‍🔬', '👩‍🎨', '👨‍🎨', '👩‍🚒', '👨‍🚒', '👩‍✈️', '👨‍✈️', '👩‍🚀', '👨‍🚀', '👩‍⚖️', '👨‍⚖️', '🤶', '🎅', '👸', '🤴', '👰', '🤵', '👼', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🏃', '💃', '🕺', '🕴', '👯', '🧘', '🧗', '🤺', '🏇', '⛷', '🏂', '🏌', '🏄', '🚣', '🏊', '⛹', '🏋', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧗', '🧘', '🛀', '🛌', '👭', '👫', '👬', '💏', '💑', '👪', '👨‍👩‍👧', '👨‍👩‍👧‍👦', '👨‍👩‍👦‍👦', '👨‍👩‍👧‍👧', '👩‍👩‍👦', '👩‍👩‍👧', '👩‍👩‍👧‍👦', '👩‍👩‍👦‍👦', '👩‍👩‍👧‍👧', '👨‍👨‍👦', '👨‍👨‍👧', '👨‍👨‍👧‍👦', '👨‍👨‍👦‍👦', '👨‍👨‍👧‍👧', '👩‍👦', '👩‍👧', '👩‍👧‍👦', '👩‍👦‍👦', '👩‍👧‍👧', '👨‍👦', '👨‍👧', '👨‍👧‍👦', '👨‍👦‍👦', '👨‍👧‍👧', '🧶', '🧵', '🧥', '🥼', '🦺', '👚', '👕', '👖', '🩲', '🩳', '👔', '👗', '👙', '👘', '🥻', '🩱', '👠', '👡', '👢', '👞', '👟', '🥾', '🥿', '🧦', '🧤', '🧣', '🎩', '🧢', '👒', '🎓', '⛑', '🪖', '💄', '💍', '💼'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔', '🐾', '🐉', '🐲'],
    food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧃', '🧉', '🧊', '🥄', '🍴', '🍽', '🥣', '🥡', '🥢'],
    travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛫', '🛬', '🛩', '💺', '🚀', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚟', '🚠', '🚡', '⛱', '🎢', '🎡', '🎠', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛫', '🛬', '🛩', '💺', '🚀', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚟', '🚠', '🚡', '⛱', '🎢', '🎡', '🎠', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩'],
    objects: ['⌚️', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '⏱', '⏲', '⏰', '🕰', '⌛️', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒', '🛠', '⛏', '🔩', '⚙️', '🧱', '⛓', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🧺', '🧻', '🚽', '🚿', '🛁', '🛀', '🧼', '🪒', '🧽', '🧴', '🛎', '🔑', '🗝', '🚪', '🪑', '🛋', '🛏', '🛌', '🧸', '🪆', '🖼', '🪞', '🪟', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🪡', '🧵', '🪢', '👓', '🕶', '🥽', '🥼', '🦺', '👔', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛', '👜', '👝', '🛍', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '👑', '👒', '🎩', '🎓', '🧢', '⛑', '🪖', '💄', '💍', '💼']
};

// Initialize sticker picker
let stickerPickerInitialized = false;
function initStickerPicker() {
    const stickerBtn = document.getElementById("sticker-btn");
    const stickerPicker = document.getElementById("sticker-picker");
    const closeSticker = document.getElementById("close-sticker");
    const stickerGrid = document.getElementById("sticker-grid");
    const categoryButtons = document.querySelectorAll(".sticker-category");
    
    console.log("Initializing sticker picker...", { stickerBtn, stickerPicker, stickerGrid });
    
    if (!stickerBtn || !stickerPicker) {
        console.error("Sticker button or picker not found!");
        return;
    }
    
    // Prevent multiple initializations
    if (stickerPickerInitialized) {
        console.log("Sticker picker already initialized");
        return;
    }
    stickerPickerInitialized = true;
    
    // Toggle sticker picker
    stickerBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Sticker button clicked!");
        
        // Close emoji picker if open
        const emojiPicker = document.getElementById("emoji-picker");
        if (emojiPicker && !emojiPicker.classList.contains("hidden")) {
            emojiPicker.classList.add("hidden");
        }
        
        const isHidden = stickerPicker.classList.contains("hidden");
        console.log("Sticker picker is hidden:", isHidden);
        
        stickerPicker.classList.toggle("hidden");
        
        if (!stickerPicker.classList.contains("hidden")) {
            console.log("Loading smileys category...");
            loadStickerCategory("smileys");
        }
    };
    
    // Close sticker picker
    if (closeSticker) {
        closeSticker.addEventListener("click", () => {
            stickerPicker.classList.add("hidden");
        });
    }
    
    // Category switching
    categoryButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            categoryButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const category = btn.getAttribute("data-category");
            loadStickerCategory(category);
        });
    });
    
    // Load sticker category
    function loadStickerCategory(category) {
        if (!stickerGrid) {
            console.error("Sticker grid not found!");
            return;
        }
        console.log("Loading sticker category:", category);
        stickerGrid.innerHTML = "";
        const stickers = stickerCategories[category] || [];
        console.log("Found stickers:", stickers.length);
        
        if (stickers.length === 0) {
            console.warn("No stickers found for category:", category);
        }
        
        stickers.forEach(sticker => {
            const stickerItem = document.createElement("div");
            stickerItem.className = "sticker-item";
            stickerItem.textContent = sticker;
            stickerItem.title = sticker;
            stickerItem.addEventListener("click", () => {
                console.log("Sticker clicked:", sticker);
                // Add sticker to input instead of sending immediately
                insertStickerToInput(sticker);
                stickerPicker.classList.add("hidden");
            });
            stickerGrid.appendChild(stickerItem);
        });
        
        console.log("Stickers loaded:", stickerGrid.children.length);
    }
    
    // Insert sticker to input field
    function insertStickerToInput(sticker) {
        const messageInput = document.getElementById("message");
        if (messageInput) {
            const cursorPos = messageInput.selectionStart;
            const textBefore = messageInput.value.substring(0, cursorPos);
            const textAfter = messageInput.value.substring(messageInput.selectionEnd);
            messageInput.value = textBefore + sticker + textAfter;
            messageInput.focus();
            // Move cursor after the inserted sticker
            const newPos = cursorPos + sticker.length;
            messageInput.setSelectionRange(newPos, newPos);
        }
    }
}

// Initialize emoji picker
let emojiPickerInitialized = false;
function initEmojiPicker() {
    const emojiBtn = document.getElementById("emoji-btn");
    const emojiPicker = document.getElementById("emoji-picker");
    const closeEmoji = document.getElementById("close-emoji");
    const emojiGrid = document.getElementById("emoji-grid");
    const categoryButtons = document.querySelectorAll(".emoji-category");
    
    if (!emojiBtn || !emojiPicker) return;
    
    // Prevent multiple initializations
    if (emojiPickerInitialized) {
        console.log("Emoji picker already initialized");
        return;
    }
    emojiPickerInitialized = true;
    
    // Toggle emoji picker
    emojiBtn.addEventListener("click", () => {
        // Close sticker picker if open
        const stickerPicker = document.getElementById("sticker-picker");
        if (stickerPicker && !stickerPicker.classList.contains("hidden")) {
            stickerPicker.classList.add("hidden");
        }
        
        emojiPicker.classList.toggle("hidden");
        if (!emojiPicker.classList.contains("hidden")) {
            loadEmojiCategory("smileys");
        }
    });
    
    // Close emoji picker
    if (closeEmoji) {
        closeEmoji.addEventListener("click", () => {
            emojiPicker.classList.add("hidden");
        });
    }
    
    // Category switching
    categoryButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            categoryButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const category = btn.getAttribute("data-category");
            loadEmojiCategory(category);
        });
    });
    
    // Load emoji category
    function loadEmojiCategory(category) {
        if (!emojiGrid) return;
        emojiGrid.innerHTML = "";
        const emojis = emojiCategories[category] || [];
        emojis.forEach(emoji => {
            const emojiItem = document.createElement("div");
            emojiItem.className = "emoji-item";
            emojiItem.textContent = emoji;
            emojiItem.addEventListener("click", () => {
                insertEmoji(emoji);
            });
            emojiGrid.appendChild(emojiItem);
        });
    }
    
    // Insert emoji into message input
    function insertEmoji(emoji) {
        const messageInput = document.getElementById("message");
        if (messageInput) {
            const cursorPos = messageInput.selectionStart;
            const textBefore = messageInput.value.substring(0, cursorPos);
            const textAfter = messageInput.value.substring(messageInput.selectionEnd);
            messageInput.value = textBefore + emoji + textAfter;
            messageInput.focus();
            messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
        }
    }
}

// File upload handler
function initFileUpload() {
    const fileBtn = document.getElementById("file-btn");
    const fileInput = document.getElementById("file-input");
    
    if (!fileBtn || !fileInput) return;
    
    fileBtn.addEventListener("click", () => {
        fileInput.click();
    });
    
    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check if it's an image
        if (!file.type.startsWith("image/")) {
            showError("Faqat rasm fayllari qabul qilinadi");
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showError("Rasm hajmi 5MB dan kichik bo'lishi kerak");
            return;
        }
        
        // Convert to base64
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Image = event.target.result;
            // Send image as message
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "message",
                    message: "",
                    image: base64Image
                }));
                fileInput.value = ""; // Reset input
            }
        };
        reader.readAsDataURL(file);
    });
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded");
    
    // Register button
    const registerBtn = document.getElementById("registerBtn");
    if (registerBtn) {
        console.log("Register button found");
        registerBtn.onclick = registerUser;
    } else {
        console.log("Register button not found");
    }

    // Login button
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        console.log("Login button found");
        loginBtn.onclick = loginUser;
    } else {
        console.log("Login button not found");
    }
    
    // Initialize sticker picker, emoji picker and file upload
    initStickerPicker();
    initEmojiPicker();
    initFileUpload();
});
