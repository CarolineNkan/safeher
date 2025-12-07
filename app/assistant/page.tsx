"use client";
import { useState, useEffect, useRef } from "react";
import MessageBubble from "@/components/MessageBubble";
import TypingIndicator from "@/components/TypingIndicator";

// Message interface as per design document
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  isRetryable?: boolean;
  originalMessageId?: string; // For retry functionality
}

// Generate unique message ID using timestamp-based approach
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default function AssistantTest() {
  // State management using React hooks
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Ref for input field to manage focus
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  async function sendMessage(retryMessageId?: string) {
    if (!input.trim() && !retryMessageId) return;

    let userMessage: Message;
    
    if (retryMessageId) {
      // Find the original user message for retry
      const originalMessage = messages.find(m => m.id === retryMessageId);
      if (!originalMessage) return;
      
      // Remove the error message associated with this retry
      setMessages(prev => prev.filter(m => m.originalMessageId !== retryMessageId));
      
      userMessage = originalMessage;
    } else {
      // Create new user message
      userMessage = {
        id: generateMessageId(),
        role: 'user',
        content: input,
        timestamp: new Date()
      };

      // Add user message to messages array
      setMessages(prev => [...prev, userMessage]);
      setInput("");
    }

    setIsLoading(true);

    try {
      // Set up timeout for API call (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.content }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!res.ok) {
        let errorMessage = "Assistant is temporarily unavailable. Please try again.";
        
        if (res.status === 500) {
          errorMessage = "Assistant encountered an error. Please try again.";
        } else if (res.status === 503) {
          errorMessage = "Assistant is currently unavailable. Please try again later.";
        } else if (res.status >= 400 && res.status < 500) {
          errorMessage = "Unable to process your request. Please try again.";
        }

        throw new Error(errorMessage);
      }

      const data = await res.json();

      // Validate response structure
      if (!data || typeof data.reply !== 'string') {
        throw new Error("Received an unexpected response. Please try again.");
      }

      // Create assistant message
      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      };

      // Add assistant message to messages array
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Determine error message based on error type
      let errorMessage = "Unable to reach SafeHER assistant. Please check your connection.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Response took too long. Please try again.";
        } else if (error.message.includes("Assistant")) {
          // Use the specific error message from API error handling
          errorMessage = error.message;
        } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          errorMessage = "Unable to reach SafeHER assistant. Please check your connection.";
        }
      }

      // Add error message to chat with retry capability
      const errorMsg: Message = {
        id: generateMessageId(),
        role: 'error',
        content: errorMessage,
        timestamp: new Date(),
        isRetryable: true,
        originalMessageId: userMessage.id
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      // Return focus to input after sending
      inputRef.current?.focus();
    }
  }

  // Handle keyboard interactions
  function handleKeyPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter key sends message (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default newline insertion
      sendMessage(); // Call without parameters for new message
    }
    // Shift+Enter allows line break (default behavior, no action needed)
  }

  return (
    <main className="flex flex-col h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header with refined spacing and subtle border */}
      <header className="bg-white border-b border-purple-100 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold px-4 sm:px-6 py-4 sm:py-5 text-gray-900">
          SafeHER AI Assistant
        </h1>
      </header>

      {/* Scrollable chat history container with refined padding */}
      {/* aria-live region for screen reader announcements of new messages */}
      <section 
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-32 sm:pb-28 scroll-smooth"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Chat conversation"
      >
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              onRetry={(messageId) => sendMessage(messageId)}
            />
          ))}
          {isLoading && <TypingIndicator />}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* Fixed input area at bottom with enhanced shadow and border */}
      <section 
        className="fixed bottom-0 left-0 right-0 p-4 sm:p-5 bg-white border-t border-purple-100 shadow-[0_-4px_12px_rgba(147,51,234,0.08)]"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        aria-label="Message input"
      >
        <form 
          className="max-w-4xl mx-auto flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <textarea
            ref={inputRef}
            className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 hover:border-purple-300 hover:shadow-sm transition-all duration-200 min-h-[48px] max-h-[200px] text-base shadow-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            aria-label="Message input field"
            style={{
              height: 'auto',
              minHeight: '48px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 200) + 'px';
            }}
          />

          <button 
            type="submit"
            className="bg-[#9333ea] hover:bg-[#7e22ce] active:bg-[#6b21a8] text-white font-semibold px-5 sm:px-7 py-3.5 rounded-xl transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 disabled:shadow-none min-w-[70px] sm:min-w-[90px] min-h-[48px] text-base shadow-md hover:shadow-lg disabled:hover:shadow-none"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
