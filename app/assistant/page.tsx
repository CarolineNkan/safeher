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
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  communityDataUsed?: boolean;
}

// Generate unique message ID
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number; address?: string} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get user location for contextual safety advice
  useEffect(() => {
    if (showLocationPrompt) {
      setTimeout(() => {
        requestLocation();
      }, 1000);
    }
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // Try to get address from coordinates
        let locationWithAddress = { ...location, address: undefined as string | undefined };
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
          );
          const data = await response.json();
          if (data.features?.[0]) {
            locationWithAddress.address = data.features[0].place_name;
          }
        } catch (error) {
          console.error("Failed to get address:", error);
        }

        setUserLocation(locationWithAddress);
        setLocationLoading(false);
        setShowLocationPrompt(false);
        
        // Add welcome message with location context
        const welcomeMessage: Message = {
          id: generateMessageId(),
          role: "assistant",
          content: `Hi! I'm SafeHER Assistant. I can see you're ${locationWithAddress.address ? `near ${locationWithAddress.address}` : 'in your current area'}. I'm here to help with any safety questions or concerns you might have. Feel free to ask about walking routes, area safety, or any precautions you should take.`,
          timestamp: new Date(),
          location: locationWithAddress,
          communityDataUsed: false
        };
        
        setMessages([welcomeMessage]);
      },
      (error) => {
        console.error("Location error:", error);
        setLocationLoading(false);
        setShowLocationPrompt(false);
        
        // Add welcome message without location
        const welcomeMessage: Message = {
          id: generateMessageId(),
          role: "assistant", 
          content: "Hi! I'm SafeHER Assistant. I'm here to help with any safety questions or concerns you might have. You can ask me about walking routes, area safety, precautions to take, or any other safety-related topics. How can I help you today?",
          timestamp: new Date()
        };
        
        setMessages([welcomeMessage]);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

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
        body: JSON.stringify({ 
          message: userMessage.content,
          location: userLocation,
          context: {
            previousMessages: messages.slice(-3).map(m => ({ role: m.role, content: m.content }))
          }
        }),
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
      if (!data || typeof data.message !== "string") {
        throw new Error("Unexpected response from assistant.");
      }

      const assistantMessage: Message = {
        id: generateMessageId(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        location: data.location,
        communityDataUsed: data.communityDataUsed
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
          {/* Location Status */}
          {locationLoading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-purple-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span>Getting your location for better safety advice...</span>
            </div>
          )}

          {userLocation && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Location-aware safety guidance enabled</span>
            </div>
          )}

          {showLocationPrompt && !locationLoading && !userLocation && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 max-w-md mx-auto">
              <p className="mb-2">Enable location for personalized safety advice based on your area's community data.</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={requestLocation}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-xs"
                >
                  Enable Location
                </button>
                <button
                  onClick={() => setShowLocationPrompt(false)}
                  className="px-3 py-1 text-blue-600 hover:text-blue-800 transition text-xs"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
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
          {/* Suggested questions when no messages */}
          {messages.length === 0 && !isLoading && (
            <div className="space-y-4 mb-6">
              <div className="text-center text-gray-500 text-sm mb-4">
                Try asking me about:
              </div>
              <div className="grid gap-2">
                {[
                  "Is it safe to walk here at night?",
                  "What precautions should I take?", 
                  "Is this area safe for students?",
                  "How can I stay safer while walking alone?"
                ].map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(question)}
                    className="text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-sm text-gray-700 transition border border-purple-100"
                  >
                    💬 {question}
                  </button>
                ))}
              </div>
            </div>
          )}

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
            aria-label="Send message"
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
