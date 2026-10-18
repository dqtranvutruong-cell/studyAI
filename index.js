
const form = document.getElementById("chatForm");
const input = document.getElementById("question");
const messages = document.getElementById("messages");

const newChatBtn = document.getElementById("newChatBtn");
const menuBtn = document.getElementById("menuBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const STORAGE_KEY = "studyAI_chats_v1";
const API_URL = "https://studyai-5s0o.onrender.com/chat";

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

        if (!Array.isArray(saved)) return [];

        return saved
            .filter(chat =>
                chat &&
                typeof chat.id === "string" &&
                Array.isArray(chat.messages)
            )
            .map(chat => ({
                ...chat,
                title: chat.title || "Cuộc trò chuyện mới",
                updatedAt: chat.updatedAt || Date.now(),
                messages: chat.messages
                    .filter(message =>
                        message &&
                        ["user", "assistant"].includes(message.role) &&
                        typeof message.content === "string"
                    )
                    .map(message => ({
                        role: message.role,
                        content: message.content,
                        ...(message.role === "user" && message.failed
                            ? { failed: true }
                            : {})
                    }))
            }));
    } catch (error) {
        console.error("Không thể đọc lịch sử chat:", error);
        return [];
    }
}

function saveChats() {
    try {
        // Chỉ lưu dữ liệu cần thiết, không lưu phần tử HTML.
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

        if (message.role === "assistant") {
            addCopyButton(element, message.content);
        }

        if (message.role === "user" && message.failed) {
            const errorText = document.createElement("p");
            errorText.className = "retry-error";
            errorText.textContent = "⚠️ Chưa nhận được câu trả lời.";
            element.appendChild(errorText);

            addRetryButton(element, chat, message);
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
    text.textContent =
        (role === "user" ? "🧑 " : "🤖 ") + content;

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

function addRetryButton(element, chat, userMessage) {
    // Không tạo nút thử lại trùng nhau.
    if (element.querySelector(".retry-button")) return;

    const button = document.createElement("button");

    button.type = "button";
    button.className = "message-action retry-button";
    button.textContent = "↻ Thử lại";
    button.title = "Gửi lại câu hỏi này";

    button.addEventListener("click", async () => {
        if (busy) return;

        // Chỉ thử lại nếu câu hỏi vẫn nằm trong cuộc trò chuyện.
        if (
            chat.id !== currentChatId ||
            !chat.messages.includes(userMessage) ||
            !userMessage.failed
        ) {
            return;
        }

        await retryQuestion(chat, userMessage);
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
    // Không gửi lại các câu hỏi đã thất bại.
    const apiMessages = chat.messages
        .filter(message => !message.failed)
        .map(message => ({
            role: message.role,
            content: message.content
        }));

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: apiMessages
        })
    });

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

    if (
        typeof data.answer !== "string" ||
        !data.answer.trim()
    ) {
        throw new Error("AI chưa trả về câu trả lời.");
    }

    return data.answer;
}

async function sendQuestion(chat, userMessage) {
    if (busy) return;

    busy = true;
    userMessage.failed = false;

    const answerElement = addMessageToScreen(
        "assistant",
        "StudyAI đang suy nghĩ..."
    );

    saveChats();
    renderChatList();

    try {
        const answer = await requestAnswer(chat);

        // Thay nội dung trạng thái bằng câu trả lời.
        answerElement.querySelector(".message-text").textContent =
            "🤖 " + answer;

        addCopyButton(answerElement, answer);

        chat.messages.push({
            role: "assistant",
            content: answer
        });

        chat.updatedAt = Date.now();
        saveChats();

    } catch (error) {
        // Không lưu lỗi thành tin nhắn assistant.
        // Câu hỏi được đánh dấu để có thể thử lại.
        userMessage.failed = true;

        answerElement.remove();

        saveChats();
        renderChat();
    } finally {
        busy = false;
        renderChatList();
        messages.scrollTop = messages.scrollHeight;
    }
}

async function retryQuestion(chat, userMessage) {
    if (busy || chat.id !== currentChatId) return;

    if (
        !chat.messages.includes(userMessage) ||
        !userMessage.failed
    ) {
        return;
    }

    // Giữ nguyên toàn bộ lịch sử; chỉ bỏ cờ lỗi của câu hỏi này.
    // requestAnswer sẽ gửi câu hỏi lại cùng ngữ cảnh hợp lệ.
    await sendQuestion(chat, userMessage);
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

    addMessageToScreen("user", question);
    input.value = "";

    saveChats();
    renderChatList();
    messages.scrollTop = messages.scrollHeight;

    await sendQuestion(chat, userMessage);
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

// Khôi phục cuộc trò chuyện gần nhất sau khi tải lại trang.
if (chats.length > 0) {
    currentChatId = chats[0].id;
}

renderChat();
renderChatList();
