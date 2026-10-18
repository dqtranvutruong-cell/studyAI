
import express from "express";

const app = express();

app.use((req, res, next) => {
    res.setHeader(
        "Access-Control-Allow-Origin",
        "https://dqtranvutruong-cell.github.io"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.send("StudyAI backend is running!");
});

app.post("/chat", async (req, res) => {
    try {
        const messages = req.body?.messages;

        if (
            !Array.isArray(messages) ||
            messages.length === 0 ||
            !messages.every(message =>
                message &&
                ["user", "assistant"].includes(message.role) &&
                typeof message.content === "string"
            )
        ) {
            return res.status(400).json({
                error: "Dữ liệu hội thoại không hợp lệ."
            });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            console.error("Thiếu OPENROUTER_API_KEY.");

            return res.status(500).json({
                error: "Máy chủ chưa cài API key."
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer":
                        "https://dqtranvutruong-cell.github.io/studyAI/",
                    "X-Title": "StudyAI"
                },
                body: JSON.stringify({
                    model: "openrouter/free",
                    messages: [
                        {
                            role: "system",
                            content:
                                "Bạn là StudyAI, một gia sư AI thân thiện. " +
                                "Giải thích bằng tiếng Việt đơn giản, từng bước, " +
                                "phù hợp với học sinh. " +
                                "Hãy trả lời trực tiếp câu hỏi của người dùng. " +
                                "Không xuất các nhãn nội bộ như User Safety " +
                                "hoặc Response Safety làm nội dung câu trả lời."
                        },
                        ...messages
                    ]
                }),
                signal: AbortSignal.timeout(60000)
            }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            console.error(
                "OpenRouter error:",
                response.status,
                data?.error?.message || "Phản hồi không đọc được"
            );

            return res.status(502).json({
                error:
                    "OpenRouter đang bận hoặc hạn mức miễn phí đã hết. " +
                    "Bro hãy thử lại sau."
            });
        }

        const choice = data?.choices?.[0];
        const content = choice?.message?.content;

        // Từ chối phản hồi bị thiếu hoặc có cấu trúc không hợp lệ.
        if (
            choice?.finish_reason === "error" ||
            typeof content !== "string" ||
            !content.trim() ||
            /^(user safety|response safety)\s*:/i.test(content.trim())
        ) {
            console.error(
                "OpenRouter trả về nội dung không hợp lệ:",
                JSON.stringify({
                    finish_reason: choice?.finish_reason,
                    content_type: typeof content
                })
            );

            return res.status(502).json({
                error:
                    "AI trả về phản hồi không hợp lệ. " +
                    "Bro hãy nhấn Thử lại."
            });
        }

        return res.json({
            answer: content.trim()
        });

    } catch (error) {
        console.error(
            "Lỗi /chat:",
            error.name,
            error.message
        );

        const isTimeout = error.name === "TimeoutError";

        return res.status(isTimeout ? 504 : 500).json({
            error: isTimeout
                ? "AI phản hồi quá lâu. Bro hãy thử lại."
                : "Không kết nối được AI. Bro hãy thử lại sau."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyAI đang chạy tại cổng ${PORT}`);
});
