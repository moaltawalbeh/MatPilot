"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I can help you analyze XRD data, identify phases, and understand your results. What would you like to know?",
  timestamp: new Date(),
};

const STATIC_RESPONSES: Record<string, string> = {
  default:
    "Thanks for your question! The AI assistant is in preview mode. Full integration with XRD analysis will be available soon.",
  xrd: "XRD (X-Ray Diffraction) analysis helps identify crystalline phases in your material. Upload a .xy, .csv, or .dif file and MatPilot will preprocess and analyze it automatically.",
  phase:
    "Phase identification compares your experimental diffraction pattern against reference databases (COD, ICDD). The algorithm uses peak matching, cosine similarity, and figure-of-merit scoring.",
  rietveld:
    "Rietveld refinement fits a theoretical diffraction pattern to your experimental data using least-squares optimization. It refines lattice parameters, phase fractions, and profile coefficients.",
  upload:
    "To upload data, go to any project and use the file upload area. Supported formats include .xy, .csv, .dif, .raw, and other common XRD data formats.",
  sample:
    "Samples represent the material you're studying. Create a sample with its name, formula, and crystal system, then attach measurements to it.",
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("xrd") || lower.includes("diffraction")) return STATIC_RESPONSES.xrd;
  if (lower.includes("phase")) return STATIC_RESPONSES.phase;
  if (lower.includes("rietveld") || lower.includes("refinement")) return STATIC_RESPONSES.rietveld;
  if (lower.includes("upload") || lower.includes("file")) return STATIC_RESPONSES.upload;
  if (lower.includes("sample")) return STATIC_RESPONSES.sample;
  return STATIC_RESPONSES.default;
}

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: getResponse(text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 400);
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
          boxShadow: isOpen ? "var(--shadow-md)" : "0 4px 16px rgba(249, 115, 22, 0.4)",
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
            width: 380,
            maxWidth: "calc(100vw - 48px)",
            height: 500,
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
              padding: "14px 18px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
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
                <Sparkles size={14} style={{ color: "var(--accent-orange)" }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>AI Assistant</span>
            </div>
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

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
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
                    background: msg.role === "user" ? "var(--accent-orange)" : "var(--surface-3)",
                    color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px 18px",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
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
                placeholder="Ask about XRD analysis..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  outline: "none",
                  padding: "6px 0",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                aria-label="Send message"
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  background: input.trim() ? "var(--accent-orange)" : "var(--surface-3)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  color: input.trim() ? "#fff" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                <Send size={14} />
              </button>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, textAlign: "center" }}>
              Press Enter to send · AI assistant in preview
            </div>
          </div>
        </div>
      )}
    </>
  );
}
