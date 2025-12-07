import React from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  isRetryable?: boolean;
  originalMessageId?: string;
}

interface MessageBubbleProps {
  message: Message;
  onRetry?: (messageId: string) => void;
}

export default function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeInUp`}
      data-testid="message-bubble"
      data-role={message.role}
      data-timestamp={message.timestamp.toISOString()}
    >
      <div
        className={`
          max-w-[85%] sm:max-w-[75%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm
          ${isUser 
            ? 'bg-[#9333ea] text-white rounded-br-md shadow-purple-200' 
            : isError
            ? 'bg-red-50 text-red-900 border-2 border-red-200 rounded-bl-md'
            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
          }
        `}
      >
        <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        
        {/* Retry button for error messages */}
        {isError && message.isRetryable && message.originalMessageId && onRetry && (
          <button
            onClick={() => onRetry(message.originalMessageId!)}
            className="mt-3 text-sm font-semibold text-red-700 hover:text-red-900 underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md px-2 py-1 transition-colors duration-200"
            aria-label="Retry sending message"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
