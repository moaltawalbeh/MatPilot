"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, Trash2, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api-client";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const SUGGESTED_QUESTIONS = [
  "What is Rietveld refinement?",
  "Explain Rwp and Rp values",
  "How does phase identification work?",
  "What techniques does MatPilot support?",
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm your MatPilot AI assistant. I can help you understand materials characterization, explain analysis results, and answer crystallography questions. What would you like to know?",
  timestamp: new Date(),
};

function renderMarkdown(text: string): string {
  let html = text;

  // Escape HTML entities to prevent XSS
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers: ### h3, ## h2, # h1
  html = html.replace(
    /^### (.+)$/gm,
    '<strong style="font-size:1.05em;display:block;margin:6px 0 2px;">$1</strong>'
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<strong style="font-size:1.1em;display:block;margin:8px 0 3px;">$1</strong>'
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<strong style="font-size:1.15em;display:block;margin:8px 0 3px;">$1</strong>'
  );

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");

  // Inline code: `text`
  html = html.replace(
    /`([^`]+?)`/g,
    '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.9em;">$1</code>'
  );

  // Numbered lists: 1. item, 2. item, etc.
  html = html.replace(
    /^(\d+)\. (.+)$/gm,
    '<div style="padding-left:16px;margin:2px 0;"><span style="font-weight:600;margin-right:4px;">$1.</span>$2</div>'
  );

  // Bullet lists: - item or * item
  html = html.replace(
    /^[\-\*] (.+)$/gm,
    '<div style="padding-left:16px;margin:2px 0;"><span style="margin-right:6px;">•</span>$1</div>'
  );

  // Line breaks
  html = html.replace(/\n/g, "<br/>");

  return html;
}

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendToAPI = useCallback(
    async (userText: string, history: Message[]) => {
      setIsLoading(true);

      const conversationHistory = history
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`${API_URL}/chat/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            conversation_history: conversationHistory,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const msg =
            body?.error?.message ||
            body?.detail ||
            `Request failed (${res.status})`;
          throw new Error(msg);
        }

        const data = await res.json();
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        const errorMessage: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I couldn't process your request right now. Please try again in a moment.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  const sendMessage = useCallback(
    (text?: string) => {
      const trimmed = (text || input).trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      sendToAPI(trimmed, updatedMessages);
    },
    [input, isLoading, messages, sendToAPI]
  );

  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([
      {
        ...WELCOME_MESSAGE,
        timestamp: new Date(),
      },
    ]);
    setIsLoading(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: isOpen ? "var(--bg-elevated)" : "var(--accent-orange)",
          border: isOpen ? "1px solid var(--border-default)" : "none",
          color: isOpen ? "var(--text-primary)" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: isOpen
            ? "var(--shadow-md)"
            : "0 4px 16px rgba(249, 115, 22, 0.4)",
          transition: "all 0.2s ease",
        }}
      >
        {isOpen ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 84,
            right: 24,
            zIndex: 999,
            width: 400,
            maxWidth: "calc(100vw - 48px)",
            height: 540,
            maxHeight: "calc(100vh - 120px)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-xl)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slide-up 0.25s var(--ease-out)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent-orange-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles
                  size={14}
                  style={{ color: "var(--accent-orange)" }}
                />
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                AI Assistant
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                onClick={clearChat}
                aria-label="Clear chat"
                title="Clear conversation"
                style={{
                  width: 28,
                  height: 28,
                  border: "none",
                  background: "transparent",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  transition: "all 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Assistant"
                style={{
                  width: 28,
                  height: 28,
                  border: "none",
                  background: "transparent",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  transition: "all 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  animation: "fade-in 0.2s ease-out",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user"
                        ? "var(--radius-md) var(--radius-md) 4px var(--radius-md)"
                        : "var(--radius-md) var(--radius-md) var(--radius-md) 4px",
                    background:
                      msg.role === "user"
                        ? "var(--accent-orange)"
                        : "var(--surface-3)",
                    color:
                      msg.role === "user" ? "#fff" : "var(--text-primary)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.role === "assistant" ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(msg.content),
                      }}
                    />
                  ) : (
                    msg.content
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginTop: 3,
                    paddingLeft: msg.role === "user" ? 0 : 4,
                    paddingRight: msg.role === "user" ? 4 : 0,
                    alignSelf:
                      msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  animation: "fade-in 0.2s ease-out",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius:
                      "var(--radius-md) var(--radius-md) var(--radius-md) 4px",
                    background: "var(--surface-3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    className="typing-dot"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--text-muted)",
                      animation: "typing-bounce 1.2s ease-in-out infinite",
                      animationDelay: "0s",
                    }}
                  />
                  <span
                    className="typing-dot"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--text-muted)",
                      animation: "typing-bounce 1.2s ease-in-out infinite",
                      animationDelay: "0.2s",
                    }}
                  />
                  <span
                    className="typing-dot"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--text-muted)",
                      animation: "typing-bounce 1.2s ease-in-out infinite",
                      animationDelay: "0.4s",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {messages.length === 1 && !isLoading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  Suggested questions
                </span>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--accent-orange)",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      lineHeight: 1.4,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--accent-orange-bg)";
                      e.currentTarget.style.borderColor =
                        "var(--accent-orange)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "var(--bg-elevated)";
                      e.currentTarget.style.borderColor =
                        "var(--border-subtle)";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px 14px",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--surface-1)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "4px 4px 4px 12px",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about materials characterization..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  outline: "none",
                  padding: "6px 0",
                  opacity: isLoading ? 0.6 : 1,
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  background:
                    input.trim() && !isLoading
                      ? "var(--accent-orange)"
                      : "var(--surface-3)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor:
                    input.trim() && !isLoading ? "pointer" : "not-allowed",
                  color:
                    input.trim() && !isLoading
                      ? "#fff"
                      : "var(--text-muted)",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                {isLoading ? (
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                marginTop: 6,
                textAlign: "center",
              }}
            >
              Press Enter to send · AI powered by Groq
            </div>
          </div>
        </div>
      )}

      {/* Keyframe Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes typing-bounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
