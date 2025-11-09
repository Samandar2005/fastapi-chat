let ws;
const messageSound = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAEAAABVgANTU1NTU1Q0NDQ0NDUFBQUFBQXl5eXl5ea2tra2tra3l5eXl5eYaGhoaGhpSUlJSUlKGhoaGhoaGvr6+vr6+8vLy8vLzKysrKysrY2NjY2Njm5ubm5ub09PT09PT///////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAABVjMmLsL/+RYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxHYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxLEAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');

// Enter tugmasi bilan xabar yuborish
document.getElementById('message').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Username input uchun Enter tugmasi
document.getElementById('username').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        joinChat();
    }
});

function joinChat() {
    const loginContainer = document.getElementById('login-container');
    const username = document.getElementById('username').value.trim();
    if (!username) {
        shakeElement(document.getElementById('username'));
        return;
    }

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

window.onload = () => {
    document.getElementById('username').focus();
};
