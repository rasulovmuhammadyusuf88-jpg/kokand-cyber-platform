import { useEffect, useRef, useState } from "react";
import "./AIAssistant.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function AIAssistant() {
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Salom! 👋 Men Kokand Cyber Campus AI Assistantman. Kiberxavfsizlik, networking, CTF, Linux, Windows va platformadagi topshiriqlar bo‘yicha yordam beraman.",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text || loading) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        text,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("kokand_token");

      if (!token) {
        throw new Error(
          "Sessiya topilmadi. Iltimos, qaytadan login qiling."
        );
      }

      const response = await fetch(`${API}/ai/chat`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          message: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "AI bilan bog‘lanib bo‘lmadi."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "ai",
          text:
            data.reply ||
            "AI javob qaytarmadi.",
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "ai",
          text: `❌ ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-page">
      <div className="ai-header">
        <div>
          <span>NEURAL CORE / AI ASSISTANT</span>

          <h1>Cyber AI</h1>

          <p>
            Kiberxavfsizlik fakulteti uchun AI yordamchi.
          </p>
        </div>

        <div className="ai-status">
          <i></i>
          AI ONLINE
        </div>
      </div>

      <div className="ai-card">
        <div className="ai-chat">
          {messages.map((item, index) => (
            <div
              key={index}
              className={
                item.role === "user"
                  ? "ai-message user"
                  : "ai-message assistant"
              }
            >
              <div className="ai-avatar">
                {item.role === "user"
                  ? "U"
                  : "AI"}
              </div>

              <div className="ai-bubble">
                {item.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="ai-message assistant">
              <div className="ai-avatar">
                AI
              </div>

              <div className="ai-bubble ai-thinking">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={chatEndRef}></div>
        </div>

        <form
          className="ai-input-area"
          onSubmit={sendMessage}
        >
          <input
            type="text"
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            placeholder="AI Assistant'dan savol so‘rang..."
            disabled={loading}
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={
              loading || !message.trim()
            }
            aria-label="Send message"
          >
            {loading ? "..." : "➤"}
          </button>
        </form>

        <div className="ai-hint">
          💡 Masalan: "OSPF nima?",
          "Mening guruhim nima?",
          "Menda qanday vazifalar bor?"
        </div>
      </div>
    </section>
  );
}

export default AIAssistant;

