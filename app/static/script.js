let ws;
function joinChat() {
  const username = document.getElementById("username").value.trim();
  if (!username) return alert("Ismingizni kiriting!");
  ws = new WebSocket(`ws://localhost:8000/ws/${username}`);

  ws.onopen = () => {
    document.getElementById("chat-box").classList.remove("hidden");
  };

  ws.onmessage = (event) => {
    const msgDiv = document.getElementById("messages");
    msgDiv.innerHTML += `<p>${event.data}</p>`;
    msgDiv.scrollTop = msgDiv.scrollHeight;
  };

  ws.onclose = () => alert("Aloqa uzildi!");
}

function sendMessage() {
  const input = document.getElementById("message");
  ws.send(input.value);
  input.value = "";
}
