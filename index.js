
const form = document.getElementById("chatForm");
const input = document.getElementById("question");
const messages = document.getElementById("messages");

let history = [];
let busy = false;

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const question = input.value.trim();

    if (!question || busy) return;

    history.push({
        role: "user",
        content: question
    });

    const userMessage = document.createElement("p");
    userMessage.className = "message";
    userMessage.textContent = "🧑 " + question;
    messages.appendChild(userMessage);

    input.value = "";
    busy = true;

    const answer = document.createElement("p");
    answer.className = "message";
    answer.textContent = "🤖 StudyAI đang suy nghĩ...";
    messages.appendChild(answer);

    try {
        
const response = await fetch("https://studyai-5s0o.onrender.com/chat", {

            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: history
            })
        });

        
const responseText = await response.text();

console.log("HTTP status:", response.status);
console.log("Response URL:", response.url);
console.log("Response:", responseText);

let data;

try {
    data = JSON.parse(responseText);
} catch {
    throw new Error(
        "Máy chủ trả về HTML thay vì JSON. Mở F12 > Console để xem chi tiết."
    );
}

if (!response.ok) {
    throw new Error(data.error || "Đã xảy ra lỗi.");
}

        answer.textContent = "🤖 " + data.answer;

        history.push({
            role: "assistant",
            content: data.answer
        });

    } catch (error) {
        answer.textContent = "⚠️ " + error.message;
    } finally {
        busy = false;
        messages.scrollTop = messages.scrollHeight;
    }
});
