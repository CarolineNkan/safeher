import React from 'react';

export default function TypingIndicator() {
  return (
    <div
      className="flex justify-start mb-4 animate-fadeInUp"
      data-testid="typing-indicator"
      role="status"
      aria-label="Assistant is typing"
    >
      <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 bg-[#a855f7] rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span
            className="w-2.5 h-2.5 bg-[#a855f7] rounded-full animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          />
          <span
            className="w-2.5 h-2.5 bg-[#a855f7] rounded-full animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          />
        </div>
      </div>
    </div>
  );
}
