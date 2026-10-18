
const form = document.getElementById("chatForm");
const input = document.getElementById("question");
const messages = document.getElementById("messages");

const newChatBtn = document.getElementById("newChatBtn");
const menuBtn = document.getElementById("menuBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const STORAGE_KEY = "studyAI_chats_v1";

let chats = loadChats();
let currentChatId = null;
let busy = false;

function makeId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}

function loadChats() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveChats() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (error) {
        console.error("Không thể lưu lịch sử chat:", error);
    }
}

function getCurrentChat() {
    return chats.find(chat => chat.id === currentChatId);
}

function createChat() {
    const chat = {
        id: makeId(),
        title: "Cuộc trò chuyện mới",
        messages: [],
        updatedAt: Date.now()
    };

    chats.unshift(chat);
    currentChatId = chat.id;
    saveChats();
    renderChat();
    renderChatList();
    input.focus();
}

function closeSidebar() {
    document.body.classList.remove("sidebar-open");
}

function renderChatList() {
    let list = document.getElementById("chatHistory");

    if (!list) {
        list = document.createElement("div");
        list.id = "chatHistory";
        list.className = "chat-history";

        const sidebarTop = document.querySelector(".sidebar-top");
        if (!sidebarTop) return;
        sidebarTop.appendChild(list);
    }

    list.innerHTML = "";

    if (chats.length === 0) {
        const empty = document.createElement("p");
        empty.className = "history-empty";
        empty.textContent = "Các cuộc trò chuyện sẽ hiện ở đây";
        list.appendChild(empty);
        return;
    }

    const heading = document.createElement("p");
    heading.className = "history-heading";
    heading.textContent = "Gần đây";
    list.appendChild(heading);

    for (const chat of chats) {
        const row = document.createElement("div");
        row.className = "history-row";

        if (chat.id === currentChatId) {
            row.classList.add("active");
        }

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "history-open";
        openButton.textContent = chat.title;
        openButton.title = chat.title;

        openButton.addEventListener("click", () => {
            if (busy) return;
            currentChatId = chat.id;
            renderChat();
            renderChatList();
            closeSidebar();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "history-delete";
        deleteButton.textContent = "×";
        deleteButton.title = "Xóa cuộc trò chuyện";
        deleteButton.setAttribute("aria-label", "Xóa " + chat.title);

        deleteButton.addEventListener("click", event => {
            event.stopPropagation();

            if (busy && chat.id === currentChatId) return;

            chats = chats.filter(item => item.id !== chat.id);

            if (currentChatId === chat.id) {
                currentChatId = null;
                renderChat();
            }

            saveChats();
            renderChatList();
        });

        row.append(openButton, deleteButton);
        list.appendChild(row);
    }
}

function renderChat() {
    messages.innerHTML = "";

    const chat = getCurrentChat();

    if (!chat || chat.messages.length === 0) {
        const welcome = document.createElement("div");
        welcome.className = "welcome";

        const icon = document.createElement("div");
        icon.className = "welcome-icon";
        icon.textContent = "✳";

        const title = document.createElement("h1");
        title.textContent = "Hôm nay bro muốn học gì?";

        const subtitle = document.createElement("p");
        subtitle.textContent =
            "Hỏi bài, giải thích kiến thức hoặc cùng StudyAI luyện tập nhé.";

        welcome.append(icon, title, subtitle);
        messages.appendChild(welcome);
        return;
    }

    for (const message of chat.messages) {
        const element = addMessageToScreen(
            message.role,
            message.content
        );

        if (message.role === "assistant" && message.content) {
            addCopyButton(element, message.content);
        }

        if (message.role === "user" && message.failed) {
            addRetryButton(element, message.content);
        }
    }

    messages.scrollTop = messages.scrollHeight;
}

function addMessageToScreen(role, content) {
    const element = document.createElement("div");
    element.className = "message " +
        (role === "user" ? "user-message" : "assistant-message");

    const text = document.createElement("p");
    text.className = "message-text";
    text.textContent = (role === "user" ? "🧑 " : "🤖 ") + content;

    element.appendChild(text);
    messages.appendChild(element);

    return element;
}

function addCopyButton(element, content) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "message-action";
    button.textContent = "📋 Sao chép";

    button.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(content);
            button.textContent = "✓ Đã sao chép";
        } catch {
            button.textContent = "Không sao chép được";
        }

        setTimeout(() => {
            button.textContent = "📋 Sao chép";
        }, 1800);
    });

    element.appendChild(button);
}

function addRetryButton(element, question) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "message-action retry-button";
    button.textContent = "↻ Thử lại";

    button.addEventListener("click", () => {
        if (busy) return;

        const chat = getCurrentChat();
        if (!chat) return;

        const questionIndex = chat.messages.findIndex(
            message => message.role === "user" &&
                message.content === question &&
                message.failed
        );

        if (questionIndex === -1) return;

        retryQuestion(chat, questionIndex);
    });

    element.appendChild(button);
}

function updateChatTitle(chat, question) {
    if (chat.title !== "Cuộc trò chuyện mới") return;

    chat.title = question.length > 35
        ? question.slice(0, 35) + "…"
        : question;
}

async function requestAnswer(chat) {
    const apiMessages = chat.messages
        .filter(message => !message.failed)
        .map(message => ({
            role: message.role,
            content: message.content
        }));

    const response = await fetch(
        "https://studyai-5s0o.onrender.com/chat",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages: apiMessages })
        }
    );

    const responseText = await response.text();

    let data;
    try {
        data = JSON.parse(responseText);
    } catch {
        throw new Error(
            "Máy chủ trả về dữ liệu không hợp lệ. Hãy thử lại sau."
        );
    }

    if (!response.ok) {
        throw new Error(data.error || "Đã xảy ra lỗi.");
    }

    if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("AI chưa trả về câu trả lời.");
    }

    return data.answer;
}

async function sendQuestion(chat, question, userMessage, answerElement) {
    if (busy) return;
    busy = true;

    userMessage.failed = false;
    answerElement.textContent = "🤖 StudyAI đang suy nghĩ...";

    const retryButton = userMessage.element?.querySelector(".retry-button");
    retryButton?.remove();

    saveChats();

    try {
        const answer = await requestAnswer(chat);

        answerElement.textContent = "🤖 " + answer;

        chat.messages.push({
            role: "assistant",
            content: answer
        });

        addCopyButton(answerElement.parentElement || answerElement, answer);
        chat.updatedAt = Date.now();
        saveChats();

    } catch (error) {
        userMessage.failed = true;

        answerElement.textContent = "⚠️ " + error.message;

        const userElement = userMessage.element;
        if (userElement) {
            addRetryButton(userElement, userMessage.content);
        }

        saveChats();
    } finally {
        busy = false;
        renderChatList();
        messages.scrollTop = messages.scrollHeight;
    }
}

async function retryQuestion(chat, questionIndex) {
    if (busy || chat.id !== currentChatId) return;

    const userMessage = chat.messages[questionIndex];
    if (!userMessage || !userMessage.failed) return;

    // Xóa các câu trả lời lỗi hoặc câu hỏi phát sinh sau câu cần thử lại.
    chat.messages = chat.messages.slice(0, questionIndex + 1);
    userMessage.failed = false;

    renderChat();

    const userElements = messages.querySelectorAll(".user-message");
    const userElement = userElements[userElements.length - 1];

    const answerElement = addMessageToScreen(
        "assistant",
        "StudyAI đang suy nghĩ..."
    );

    userMessage.element = userElement;

    await sendQuestion(chat, userMessage.content, userMessage, answerElement);
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const question = input.value.trim();
    if (!question || busy) return;

    if (!currentChatId) createChat();

    const chat = getCurrentChat();
    if (!chat) return;

    const userMessage = {
        role: "user",
        content: question,
        failed: false
    };

    chat.messages.push(userMessage);
    updateChatTitle(chat, question);
    chat.updatedAt = Date.now();

    const userElement = addMessageToScreen("user", question);
    userMessage.element = userElement;

    input.value = "";

    const answerElement = addMessageToScreen(
        "assistant",
        "StudyAI đang suy nghĩ..."
    );

    saveChats();
    renderChatList();
    messages.scrollTop = messages.scrollHeight;

    await sendQuestion(chat, question, userMessage, answerElement);
});

newChatBtn?.addEventListener("click", () => {
    if (busy) return;
    createChat();
    closeSidebar();
});

menuBtn?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
});

sidebarOverlay?.addEventListener("click", closeSidebar);

// Khôi phục lịch sử sau khi tải lại trang.
if (chats.length > 0) {
    currentChatId = chats[0].id;
}

renderChat();
renderChatList();
