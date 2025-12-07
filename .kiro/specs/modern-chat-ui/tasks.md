# Implementation Plan

- [x] 1. Set up testing infrastructure





  - Install and configure Vitest, React Testing Library, and fast-check
  - Create test utilities and custom generators for Message objects
  - Set up test scripts in package.json
  - _Requirements: All (testing foundation)_

- [x] 2. Implement core message data structures and state management





  - Define TypeScript interfaces for Message and ChatState
  - Set up React state hooks (messages, input, isLoading) in assistant page
  - Implement message ID generation (timestamp-based or UUID)
  - _Requirements: 1.1, 1.2, 1.4_

- [ ]* 2.1 Write property test for message ordering
  - **Property 2: Chronological message ordering**
  - **Validates: Requirements 1.4**

- [x] 3. Create message bubble component with styling





  - Build MessageBubble component with role-based styling
  - Implement right-aligned purple bubbles for user messages
  - Implement left-aligned neutral bubbles for assistant messages
  - Add rounded corners, padding, and spacing
  - Apply SafeHER purple theme colors (#9333ea for user, gray for assistant)
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 6.1, 6.2_

- [ ]* 3.1 Write property test for message styling differentiation
  - **Property 1: Message styling differentiation**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ]* 3.2 Write property test for theme color consistency
  - **Property 11: Theme color consistency**
  - **Validates: Requirements 6.1, 6.2**

- [ ]* 3.3 Write property test for accessibility contrast
  - **Property 12: Accessibility contrast compliance**
  - **Validates: Requirements 6.5**
-

- [x] 4. Implement typing indicator component




  - Create TypingIndicator component with three animated dots
  - Style with purple colors (#a855f7)
  - Add bouncing animation with staggered timing
  - Position like an assistant message in the flow
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.4_

- [ ]* 4.1 Write property test for typing indicator lifecycle
  - **Property 5: Typing indicator lifecycle**
  - **Validates: Requirements 3.1, 3.2**

- [x] 5. Build scrollable chat history container





  - Create scrollable message list container with overflow-y-auto
  - Reserve space at bottom for fixed input box
  - Implement auto-scroll to bottom on new messages using useEffect and scrollIntoView
  - Add smooth scrolling behavior
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.2_

- [ ]* 5.1 Write property test for auto-scroll behavior
  - **Property 3: Auto-scroll on new message**
  - **Validates: Requirements 2.2**

- [ ]* 5.2 Write property test for scroll position persistence
  - **Property 4: Scroll position persistence**
  - **Validates: Requirements 2.3**

- [x] 6. Create fixed input area at bottom





  - Build input container with fixed positioning at viewport bottom
  - Implement textarea with auto-expanding height for multi-line text
  - Add send button with purple styling
  - Disable send button when input is empty or whitespace-only
  - Style with purple focus states
  - _Requirements: 4.1, 4.2, 4.5, 6.3_

- [ ]* 6.1 Write property test for input expansion
  - **Property 6: Input expansion for multi-line text**
  - **Validates: Requirements 4.2**

- [ ]* 6.2 Write property test for empty input handling
  - **Property 9: Empty input disables send**
  - **Validates: Requirements 4.5**
-

- [x] 7. Implement keyboard interactions




  - Add Enter key handler to send message and clear input
  - Add Shift+Enter handler to insert line break without sending
  - Ensure focus returns to input after sending
  - _Requirements: 4.3, 4.4_

- [ ]* 7.1 Write property test for Enter key behavior
  - **Property 7: Enter key sends message**
  - **Validates: Requirements 4.3**

- [ ]* 7.2 Write property test for Shift+Enter behavior
  - **Property 8: Shift+Enter adds line break**
  - **Validates: Requirements 4.4**
-

- [x] 8. Implement message send and API integration




  - Create sendMessage function that adds user message to state
  - Set isLoading to true and show typing indicator
  - Call /api/assistant with fetch
  - Add assistant response to messages array
  - Set isLoading to false and hide typing indicator
  - Clear input field after successful send
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [ ]* 8.1 Write unit tests for API integration
  - Mock /api/assistant endpoint
  - Test successful message send/receive flow
  - Test error handling scenarios

- [x] 9. Add message entrance animations





  - Apply fade-in or slide-in animation to new message bubbles
  - Use Tailwind animation utilities or custom CSS
  - Ensure animations complete within 300ms
  - _Requirements: 7.1, 7.5_

- [ ]* 9.1 Write property test for animation presence
  - **Property 13: Message entrance animation**
  - **Validates: Requirements 7.1**

- [ ]* 9.2 Write property test for transition timing
  - **Property 15: Transition timing performance**
  - **Validates: Requirements 7.5**
-

- [x] 10. Implement hover states and interactive feedback




  - Add hover effects to send button (color/opacity change)
  - Add hover effects to input field
  - Ensure all transitions are smooth and within 300ms
  - _Requirements: 7.4, 7.5_

- [ ]* 10.1 Write property test for hover feedback
  - **Property 14: Hover feedback on interactive elements**
  - **Validates: Requirements 7.4**
-

- [x] 11. Add responsive design for mobile




  - Add Tailwind responsive classes (sm:, md:, lg:) for different breakpoints
  - Adjust message bubble widths for screens below 768px
  - Ensure input box remains accessible on mobile
  - Test touch target sizes (minimum 44x44px)
  - Add safe area insets for iOS devices
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 11.1 Write property test for responsive layout
  - **Property 10: Responsive layout adaptation**
  - **Validates: Requirements 5.1, 5.2**
-

- [x] 12. Implement error handling




  - Add try-catch around API calls
  - Display user-friendly error messages in chat for network failures
  - Keep user's message visible on error
  - Add retry capability or allow resending
  - Handle API timeout and 500 errors gracefully
  - _Requirements: All (error resilience)_

- [ ]* 12.1 Write unit tests for error scenarios
  - Test network failure handling
  - Test API error responses
  - Test timeout handling

- [x] 13. Add accessibility features





  - Add semantic HTML elements (main, section, form)
  - Add aria-label to send button
  - Add aria-live region for new messages (screen reader support)
  - Ensure keyboard navigation works for all interactive elements
  - Verify focus management after message send
  - _Requirements: 6.5, 7.4_

- [ ]* 13.1 Write unit tests for accessibility
  - Test ARIA attributes presence
  - Test keyboard navigation
  - Test focus management

- [x] 14. Polish and final styling touches





  - Fine-tune spacing, padding, and margins
  - Ensure consistent purple theme throughout
  - Add subtle shadows or borders for depth
  - Verify all colors meet contrast requirements
  - Test on multiple screen sizes
  - _Requirements: 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 15. Final checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
