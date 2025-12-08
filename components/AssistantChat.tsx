// components/AssistantChat.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: number;
  sender: "user" | "assistant";
  text: string;
};

const initialMessages: Message[] = [
  {
    id: 1,
    sender: "assistant",
    text:
      "Hey, I’m SafeHER. Tell me where you are or what’s worrying you, and I’ll help you plan your next safest step.",
  },
  {
    id: 2,
    sender: "user",
    text: "I feel uneasy walking home from my shift tonight.",
  },
  {
    id: 3,
    sender: "assistant",
    text:
      "Thanks for telling me. Are you walking, taking transit, or getting a ride? I can suggest safer options and ways to stay connected with someone you trust.",
  },
];

export default function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Fake assistant reply for now (no real AI wired yet)
    setTimeout(() => {
      const reply: Message = {
        id: Date.now() + 1,
        sender: "assistant",
        text:
          "I hear you. Start by moving towards a brighter, more open area if you can. " +
          "If you’d like, tell me your route or closest landmark and I’ll help you think through safer options.",
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 900);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white/95 rounded-3xl shadow-lg border border-purple-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50/80 to-purple-100/60">
        <div className="w-11 h-11 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
          <span className="text-xl" aria-hidden="true">
            💬
          </span>
          <span className="sr-only">SafeHER Assistant</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900">
            SafeHER AI Companion
          </h1>
          <p className="text-xs text-gray-600">
            Here to help you feel safer, one step at a time.
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 px-4 sm:px-5 py-4 space-y-3 overflow-y-auto bg-gradient-to-b from-purple-50/60 to-white">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? "bg-purple-600 text-white rounded-br-sm"
                    : "bg-white text-gray-900 border border-purple-50 rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-purple-100 px-3 py-1.5 text-xs text-gray-500 shadow-sm">
              <span className="inline-flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-200 animate-pulse [animation-delay:240ms]" />
              </span>
              <span>SafeHER is typing…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-purple-100 bg-white px-4 sm:px-5 py-3">
        <div className="text-[11px] text-gray-500 mb-2">
          SafeHER does not replace emergency services. If you feel in immediate
          danger, call your local emergency number first.
        </div>

        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-2xl border border-purple-100 bg-purple-50/50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell SafeHER what’s going on or where you’re heading…"
          />
          <button
            type="button"
            onClick={handleSend}
            className="inline-flex items-center justify-center rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
