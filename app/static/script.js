let ws;
const messageSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAEAAABVgANTU1NTU1Q0NDQ0NDUFBQUFBQXl5eXl5ea2tra2tra3l5eXl5eYaGhoaGhpSUlJSUlKGhoaGhoaGvr6+vr6+8vLy8vLzKysrKysrY2NjY2Njm5ubm5ub09PT09PT///////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAABVjMmLsL/+RYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxHYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxLEAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');

// Enter tugmasi bilan xabar yuborish
document.getElementById('message').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Sahifadagi inputlar uchun Enter tugmasi (username/password)
document.getElementById('username').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loginUser();
    }
});
document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loginUser();
    }
});

async function registerUser() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) {
        shakeElement(document.getElementById('username'));
        return;
    }
    
    // Check password length before sending to server
    if (new TextEncoder().encode(password).length > 72) {
        showError('Parol juda uzun - 72 baytdan kam bo\'lishi kerak');
        return;
    }

    try {
        const res = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Ro\'yxatdan o\'tishda xatolik');
        }
        showError('Ro\'yxatdan muvaffaqiyatli o\'tdingiz. Endi kirishingiz mumkin.', 'success');
    } catch (e) {
        showError(e.message || 'Xatolik');
    }
}

async function loginUser() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) {
        shakeElement(document.getElementById('username'));
        return;
    }
    
    // Check password length before sending to server
    if (new TextEncoder().encode(password).length > 72) {
        showError('Parol juda uzun - 72 baytdan kam bo\'lishi kerak');
        return;
    }

    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Kirishda xatolik');
        }
        const data = await res.json();
        // Saqlash (keyinchalik kerak bo'lsa)
        localStorage.setItem('access_token', data.access_token);
        connectWebSocket(username);
    } catch (e) {
        showError(e.message || 'Xatolik');
    }
}

function connectWebSocket(username) {
    const loginContainer = document.getElementById('login-container');
    ws = new WebSocket(`ws://localhost:8000/ws/${username}`);

    ws.onopen = () => {
        loginContainer.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => {
            loginContainer.classList.add('hidden');
            document.getElementById('chat-box').classList.remove('hidden');
            document.getElementById('message').focus();
        }, 500);
    };

    ws.onmessage = (event) => {
        // Online foydalanuvchilar ro'yxatini yangilash
        if (event.data.startsWith('ONLINE_USERS:')) {
            const onlineUsers = event.data.substring(12).split(',');
            updateOnlineUsers(onlineUsers);
            return;
        }
        
        const msgDiv = document.getElementById('messages');
        const newMessage = document.createElement('p');
        newMessage.textContent = event.data;
        
        // Animatsiya effekti
        newMessage.style.opacity = '0';
        newMessage.style.transform = 'translateY(20px)';
        msgDiv.appendChild(newMessage);
        
        // Force reflow
        newMessage.offsetHeight;
        
        newMessage.style.transition = 'all 0.3s ease';
        newMessage.style.opacity = '1';
        newMessage.style.transform = 'translateY(0)';
        
        msgDiv.scrollTop = msgDiv.scrollHeight;
        
        // Xabar kelganda ovoz
        if (!event.data.includes(username)) {
            messageSound.play();
        }
    };

    ws.onclose = () => {
        document.getElementById('online-status').innerHTML = '🔴 Offline';
        showError('Aloqa uzildi! Sahifani yangilang.');
    };
}

function sendMessage() {
    const input = document.getElementById('message');
    const message = input.value.trim();
    
    if (!message) {
        shakeElement(input);
        return;
    }

    if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        input.value = '';
    } else {
        showError('Xabar yuborilmadi. Internet aloqasini tekshiring.');
    }
}

function shakeElement(element) {
    element.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

function showError(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    document.body.appendChild(error);

    setTimeout(() => {
        error.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => {
            error.remove();
        }, 500);
    }, 3000);
}

function updateOnlineUsers(users) {
    const onlineUsersDiv = document.getElementById('online-users');
    onlineUsersDiv.innerHTML = '';
    users.forEach(user => {
        const userSpan = document.createElement('span');
        userSpan.className = 'online-user';
        userSpan.textContent = user;
        onlineUsersDiv.appendChild(userSpan);
    });
    document.getElementById('online-status').innerHTML = 
        `🟢 Online (${users.length})`;
}

window.onload = () => {
    document.getElementById('username').focus();
};
