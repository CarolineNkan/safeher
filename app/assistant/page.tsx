"use client";
import { useState, useEffect, useRef } from "react";
import MessageBubble from "@/components/MessageBubble";
import TypingIndicator from "@/components/TypingIndicator";

// Message interface as per design document
interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
  isRetryable?: boolean;
  originalMessageId?: string;
}

// Generate unique message ID
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --------------------------
  // SEND MESSAGE
  // --------------------------
  async function sendMessage(retryMessageId?: string) {
    if (!input.trim() && !retryMessageId) return;

    let userMessage: Message;

    if (retryMessageId) {
      const original = messages.find((m) => m.id === retryMessageId);
      if (!original) return;

      setMessages((prev) =>
        prev.filter((m) => m.originalMessageId !== retryMessageId)
      );

      userMessage = original;
    } else {
      userMessage = {
        id: generateMessageId(),
        role: "user",
        content: input,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
    }

    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        let msg = "Assistant is temporarily unavailable. Please try again.";

        if (res.status === 500) msg = "Assistant encountered an error.";
        if (res.status === 503) msg = "Assistant is unavailable right now.";
        if (res.status >= 400 && res.status < 500)
          msg = "Unable to process your request.";

        throw new Error(msg);
      }

      const data = await res.json();
      if (!data || typeof data.reply !== "string") {
        throw new Error("Unexpected response from assistant.");
      }

      const assistantMessage: Message = {
        id: generateMessageId(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      let msg =
        "Unable to reach SafeHER assistant. Please check your connection.";

      if (error?.name === "AbortError")
        msg = "Response took too long. Please try again.";

      const errorMsg: Message = {
        id: generateMessageId(),
        role: "error",
        content: msg,
        timestamp: new Date(),
        isRetryable: true,
        originalMessageId: userMessage.id,
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  // Keyboard enter-to-send
  function handleKeyPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-purple-50 via-white to-purple-100/60">

      {/* HEADER — Soft SafeHER aesthetic */}
      <header className="px-6 py-6 border-b border-purple-100 bg-white/90 backdrop-blur">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-500 font-semibold">
            SafeHER Assistant
          </p>

          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">
            Talk it out, safely.
          </h1>

          <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">
            Share what you’re feeling, where you're going, or what’s worrying you.
            SafeHER will help you think through safer options.
          </p>
        </div>
      </header>

      {/* CHAT HISTORY */}
      <section
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-40 scroll-smooth"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Chat conversation"
      >
        <div className="max-w-2xl mx-auto space-y-2">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onRetry={(id) => sendMessage(id)}
            />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* INPUT BAR — SafeHER themed */}
      <section
        className="fixed bottom-0 left-0 right-0 p-4 sm:p-5 bg-white border-t border-purple-100 shadow-[0_-6px_25px_rgba(147,51,234,0.12)]"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <form
          className="max-w-2xl mx-auto flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <textarea
            ref={inputRef}
            className="flex-1 border border-purple-200 bg-purple-50/60 backdrop-blur rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm shadow-sm min-h-[48px] max-h-[200px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Tell SafeHER what’s going on…"
            rows={1}
            aria-label="Message input field"
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 200) + "px";
            }}
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold px-6 py-3 rounded-2xl shadow-md hover:shadow-lg disabled:bg-gray-300 transition-all"
          >
            Send
          </button>
        </form>

        <p className="mt-2 text-[11px] text-gray-500 max-w-2xl mx-auto">
          SafeHER is here to guide you, but does not replace emergency services.
          If you're in immediate danger, call emergency services first.
        </p>
      </section>
    </main>
  );
}
