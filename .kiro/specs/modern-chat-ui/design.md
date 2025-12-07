# Design Document

## Overview

The modern chat UI refactoring transforms the SafeHER AI Assistant from a basic test interface into a production-ready conversational experience. The design leverages React hooks for state management, Tailwind CSS for styling, and modern web APIs for smooth interactions. The interface follows contemporary chat UI patterns seen in applications like WhatsApp and iMessage, adapted to the SafeHER purple brand identity.

## Architecture

The chat UI follows a component-based architecture with clear separation of concerns:

```
app/assistant/page.tsx (Container)
    ├── State Management (messages, input, loading)
    ├── API Communication (fetch to /api/assistant)
    └── UI Rendering
        ├── Chat Header
        ├── Message List (scrollable)
        │   ├── Message Bubbles (user/assistant)
        │   └── Typing Indicator
        └── Input Area (fixed bottom)
            ├── Text Input
            └── Send Button
```

The design maintains the existing API route structure (`/api/assistant`) and focuses purely on enhancing the frontend presentation layer.

## Components and Interfaces

### Main Page Component (`app/assistant/page.tsx`)

**State:**
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState<string>("");
const [isLoading, setIsLoading] = useState<boolean>(false);
```

**Key Functions:**
- `sendMessage()`: Handles message submission, API calls, and state updates
- `handleKeyPress()`: Manages Enter/Shift+Enter keyboard interactions
- `scrollToBottom()`: Auto-scrolls to latest message

### Message Bubble Component

**Props:**
```typescript
interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
}
```

**Styling Logic:**
- User messages: right-aligned, purple background (#9333ea), white text
- Assistant messages: left-aligned, light gray background, dark text
- Rounded corners with tail-like styling
- Smooth fade-in animation on mount

### Typing Indicator Component

**Visual Design:**
- Three animated dots
- Purple color (#a855f7)
- Bouncing animation with staggered timing
- Positioned like an assistant message

## Data Models

### Message Model
```typescript
interface Message {
  id: string;           // Unique identifier (UUID or timestamp-based)
  role: 'user' | 'assistant';  // Message sender
  content: string;      // Message text content
  timestamp: Date;      // When message was created
}
```

### Chat State
```typescript
interface ChatState {
  messages: Message[];  // Conversation history
  input: string;        // Current input value
  isLoading: boolean;   // Whether assistant is responding
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

Before defining properties, let's identify redundancies:

- Properties 1.1, 1.2, and 1.3 all test message styling - these can be combined into a single comprehensive property about message differentiation
- Properties 3.1 and 3.2 both test typing indicator lifecycle - can be combined
- Properties 6.1 and 6.2 both test color application - can be combined into theme consistency property
- Property 7.1 is subsumed by testing that animation classes exist on messages

After reflection, here are the unique, non-redundant properties:

Property 1: Message styling differentiation
*For any* message in the chat history, user messages should have right-aligned purple styling and assistant messages should have left-aligned neutral styling, ensuring visual distinction between message types.
**Validates: Requirements 1.1, 1.2, 1.3**

Property 2: Chronological message ordering
*For any* set of messages with timestamps, the rendered order in the chat history should match chronological order from oldest to newest.
**Validates: Requirements 1.4**

Property 3: Auto-scroll on new message
*For any* new message added to the chat, the scroll position should automatically move to show the latest message at the bottom.
**Validates: Requirements 2.2**

Property 4: Scroll position persistence
*For any* manual scroll action by the user, the scroll position should remain unchanged until a new message arrives.
**Validates: Requirements 2.3**

Property 5: Typing indicator lifecycle
*For any* message send action, a typing indicator should appear immediately and be removed when the assistant response is received, replaced by the message content.
**Validates: Requirements 3.1, 3.2**

Property 6: Input expansion for multi-line text
*For any* text input containing newline characters, the input field height should expand to accommodate all lines.
**Validates: Requirements 4.2**

Property 7: Enter key sends message
*For any* non-empty input value, pressing Enter should trigger message send and clear the input field.
**Validates: Requirements 4.3**

Property 8: Shift+Enter adds line break
*For any* input state, pressing Shift+Enter should insert a newline character without triggering message send.
**Validates: Requirements 4.4**

Property 9: Empty input disables send
*For any* empty or whitespace-only input value, the send button should be disabled or visually indicated as inactive.
**Validates: Requirements 4.5**

Property 10: Responsive layout adaptation
*For any* viewport width below 768px, the chat UI should apply mobile-specific layout classes and adjust message bubble widths.
**Validates: Requirements 5.1, 5.2**

Property 11: Theme color consistency
*For any* message bubble rendered, user messages should use SafeHER purple (#9333ea) background and assistant messages should use neutral gray, maintaining brand consistency.
**Validates: Requirements 6.1, 6.2**

Property 12: Accessibility contrast compliance
*For any* text element in the chat UI, the contrast ratio between text and background should meet WCAG AA standards (minimum 4.5:1 for normal text).
**Validates: Requirements 6.5**

Property 13: Message entrance animation
*For any* new message added to the chat, the message bubble should have fade-in or slide-in animation classes applied.
**Validates: Requirements 7.1**

Property 14: Hover feedback on interactive elements
*For any* interactive element (send button, input field), hover states should provide visual feedback through color or opacity changes.
**Validates: Requirements 7.4**

Property 15: Transition timing performance
*For any* CSS transition or animation in the chat UI, the duration should not exceed 300 milliseconds to maintain responsiveness.
**Validates: Requirements 7.5**

## Error Handling

### API Communication Errors

**Network Failures:**
- Display user-friendly error message in chat: "Unable to reach SafeHER assistant. Please check your connection."
- Keep user's message visible in chat history
- Provide retry button or allow user to resend

**API Response Errors:**
- Handle 500 errors: "Assistant is temporarily unavailable. Please try again."
- Handle timeout: "Response took too long. Please try again."
- Log errors to console for debugging

**Invalid Responses:**
- Validate API response structure before displaying
- Fallback message: "Received an unexpected response. Please try again."

### Input Validation

**Empty Messages:**
- Prevent sending empty or whitespace-only messages
- Disable send button when input is invalid
- No error message needed (preventive design)

**Message Length:**
- Consider maximum message length (e.g., 2000 characters)
- Display character count near limit
- Prevent submission beyond limit

### State Management Errors

**Scroll Failures:**
- Gracefully handle scroll errors (e.g., element not found)
- Don't block message display if auto-scroll fails
- Log errors for debugging

**Storage Errors:**
- If implementing message persistence, handle localStorage quota errors
- Gracefully degrade to session-only storage

## Testing Strategy

### Unit Testing

The chat UI will use **Vitest** and **React Testing Library** for unit testing, focusing on:

**Component Rendering:**
- Message bubbles render with correct styling based on role
- Typing indicator appears and disappears correctly
- Input box renders with proper attributes

**User Interactions:**
- Send button click triggers message send
- Enter key sends message
- Shift+Enter adds line break
- Input clears after sending

**State Management:**
- Messages array updates correctly
- Loading state toggles appropriately
- Input value updates on change

**Edge Cases:**
- Empty input handling
- Very long messages
- Rapid message sending
- API error scenarios

### Property-Based Testing

The chat UI will use **fast-check** for property-based testing to verify universal properties:

**Configuration:**
- Each property test will run minimum 100 iterations
- Tests will use fast-check's built-in generators for strings, arrays, and objects
- Custom generators for Message objects with valid roles and content

**Test Tagging:**
- Each property test will include a comment: `// Feature: modern-chat-ui, Property X: [property description]`
- This links tests directly to design properties

**Property Test Coverage:**
- Message ordering (Property 2)
- Input validation (Properties 7, 8, 9)
- Theme consistency (Property 11)
- Responsive behavior (Property 10)
- Animation timing (Property 15)

**Example Property Test Structure:**
```typescript
// Feature: modern-chat-ui, Property 2: Chronological message ordering
it('should display messages in chronological order', () => {
  fc.assert(
    fc.property(
      fc.array(messageGenerator(), { minLength: 2, maxLength: 20 }),
      (messages) => {
        const shuffled = [...messages].sort(() => Math.random() - 0.5);
        render(<ChatUI initialMessages={shuffled} />);
        const renderedMessages = screen.getAllByTestId('message-bubble');
        const renderedTimestamps = renderedMessages.map(
          el => new Date(el.dataset.timestamp)
        );
        expect(renderedTimestamps).toEqual(
          [...renderedTimestamps].sort((a, b) => a.getTime() - b.getTime())
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**API Integration:**
- Mock `/api/assistant` endpoint
- Test full message send/receive flow
- Verify error handling with failed API calls

**Scroll Behavior:**
- Test auto-scroll after message addition
- Verify scroll position persistence
- Test scroll with varying message counts

### Visual Regression Testing

**Responsive Design:**
- Screenshot tests at mobile (375px), tablet (768px), and desktop (1024px) widths
- Verify message bubble layouts
- Check input box positioning

**Theme Application:**
- Verify purple colors are correctly applied
- Check contrast ratios
- Validate hover and focus states

## Implementation Notes

### Technology Stack

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript for type safety
- **Styling:** Tailwind CSS for utility-first styling
- **State Management:** React useState hooks (no external state library needed)
- **Testing:** Vitest + React Testing Library + fast-check

### Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "next": "^14.x"
  },
  "devDependencies": {
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/user-event": "^14.x",
    "fast-check": "^3.x"
  }
}
```

### Styling Approach

**Tailwind Classes:**
- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`)
- Custom purple shades: `bg-purple-600`, `bg-purple-700`, `text-purple-600`
- Animation utilities: `animate-pulse`, `transition-all`, `duration-300`

**Custom CSS (if needed):**
- Typing indicator dot animation
- Custom scroll behavior
- Message bubble tail styling

### Accessibility Considerations

- Semantic HTML: Use `<main>`, `<section>`, `<form>` appropriately
- ARIA labels: `aria-label` on send button, `aria-live` for new messages
- Keyboard navigation: Ensure all interactive elements are keyboard accessible
- Focus management: Maintain focus on input after sending
- Screen reader support: Announce new messages appropriately

### Performance Optimizations

- **Message Virtualization:** For very long conversations (>100 messages), consider react-window for virtual scrolling
- **Debounced Auto-Scroll:** Prevent excessive scroll calculations
- **Memoization:** Use React.memo for message bubbles to prevent unnecessary re-renders
- **Lazy Loading:** Load chat history incrementally if implementing persistence

### Mobile Considerations

- **Viewport Units:** Use `vh` carefully; consider `dvh` (dynamic viewport height) for mobile browsers
- **Touch Targets:** Ensure buttons are at least 44x44px for touch accessibility
- **Keyboard Handling:** Handle mobile keyboard appearance/disappearance
- **Safe Areas:** Respect iOS safe areas with `env(safe-area-inset-bottom)`

## Future Enhancements

- Message timestamps display
- Message editing/deletion
- Conversation persistence (localStorage or database)
- Multiple conversation threads
- Voice input support
- File/image sharing
- Markdown rendering in messages
- Message reactions/feedback
- Conversation export
