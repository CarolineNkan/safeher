"use client";

import { useState } from "react";
import Link from "next/link";

type Msg = {
  role: "assistant" | "user";
  text: string;
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: `Hi, I’m Winnie.

I’m here to help you stay calm and think through your next safest step.
If you’re in immediate danger, please open SOS Mode.`,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: Msg = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        context: {
          time: new Date().toISOString(),
          note: "Use calm safety guidance",
        },
      }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: data.reply },
    ]);

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-purple-50 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-purple-600 hover:underline">
          ← Back home
        </Link>

        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-purple-600 font-semibold">
              Assistant
            </p>
            <h1 className="text-3xl font-semibold">Winnie</h1>
            <p className="text-gray-600 mt-1">
              Calm, step-by-step safety support for the moment.
            </p>
          </div>

          <Link
            href="/sos"
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700"
          >
            SOS Mode
          </Link>
        </div>

        {/* Chat */}
        <div className="mt-6 bg-white border rounded-3xl p-6 h-[420px] overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-4 ${
                m.role === "assistant" ? "text-left" : "text-right"
              }`}
            >
              <div
                className={`inline-block px-4 py-3 rounded-2xl text-sm max-w-[85%] ${
                  m.role === "assistant"
                    ? "bg-purple-50 text-gray-900"
                    : "bg-purple-600 text-white"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            "I think someone is following me",
            "I feel unsafe walking right now",
            "What should I do if I’m being watched?",
            "Help me pick a safer route",
          ].map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="px-4 py-2 rounded-full bg-white border text-sm hover:bg-purple-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-3 mt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type what’s happening…"
            className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

