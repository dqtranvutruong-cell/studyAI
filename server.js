
import express from "express";

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
    try {
        const messages = req.body.messages;

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: "Dữ liệu câu hỏi không hợp lệ."
            });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
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
                    "HTTP-Referer": "https://dqtranvutruong-cell.github.io/studyAI/",
                    "X-Title": "StudyAI"
                },
                body: JSON.stringify({
                    model: "meta-llama/llama-3.3-70b-instruct:free",
                    messages: [
                        {
                            role: "system",
                            content: "Bạn là StudyAI, gia sư thân thiện. Giải thích bằng tiếng Việt đơn giản, từng bước, phù hợp với học sinh."
                        },
                        ...messages
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenRouter error:", data);

            return res.status(response.status).json({
                error: data.error?.message || "AI đang bận hoặc đã hết hạn mức miễn phí."
            });
        }

        res.json({
            answer: data.choices?.[0]?.message?.content || "AI chưa trả lời được."
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Không kết nối được AI. Hãy thử lại sau."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyAI đang chạy tại cổng ${PORT}`);
});
