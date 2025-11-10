// Global variables
let ws = null;
let typingTimer = null;
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
                    messageDiv.innerHTML = `
                        <div class="message-content">
                            <span class="username">${data.username}</span>
                            <p>${data.message}</p>
                            <span class="time">${new Date(data.timestamp).toLocaleTimeString()}</span>
                        </div>
                    `;
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
                    if (data.username !== username) {
                        typingIndicator.textContent = `${data.username} yozmoqda...`;
                        clearTimeout(typingTimer);
                        typingTimer = setTimeout(() => {
                            typingIndicator.textContent = "";
                        }, 1000);
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
            sendMessage();
        } else {
            ws.send(JSON.stringify({ type: "typing", typing: true }));
        }
    };
}

function sendMessage() {
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "message", message }));
        messageInput.value = "";
    } else {
        showError("Chat bilan aloqa yo'q");
    }
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
});
