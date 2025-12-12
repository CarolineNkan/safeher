import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StoryCard from '@/components/StoryCard';

describe('StoryCard Three-Dot Menu', () => {
  const mockStory = {
    id: 'test-story-1',
    message: 'Test story message',
    created_at: '2024-01-01T00:00:00Z',
    user_id: 'user-123',
    likes: 5,
    helpful: 3,
    noted: 2,
  };

  const mockHandlers = {
    onReact: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show three-dot menu for story owner', () => {
    render(
      <StoryCard
        {...mockStory}
        currentUserId="user-123"
        {...mockHandlers}
      />
    );

    const menuButton = screen.getByLabelText('Story options');
    expect(menuButton).toBeInTheDocument();
  });

  it('should hide three-dot menu for non-owners', () => {
    render(
      <StoryCard
        {...mockStory}
        currentUserId="different-user"
        {...mockHandlers}
      />
    );

    const menuButton = screen.queryByLabelText('Story options');
    expect(menuButton).not.toBeInTheDocument();
  });

  it('should hide three-dot menu when no currentUserId provided', () => {
    render(
      <StoryCard
        {...mockStory}
        {...mockHandlers}
      />
    );

    const menuButton = screen.queryByLabelText('Story options');
    expect(menuButton).not.toBeInTheDocument();
  });

  it('should show menu dropdown when three-dot button is clicked', () => {
    render(
      <StoryCard
        {...mockStory}
        currentUserId="user-123"
        {...mockHandlers}
      />
    );

    const menuButton = screen.getByLabelText('Story options');
    fireEvent.click(menuButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    render(
      <StoryCard
        {...mockStory}
        currentUserId="user-123"
        {...mockHandlers}
      />
    );

    const menuButton = screen.getByLabelText('Story options');
    fireEvent.click(menuButton);

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(mockHandlers.onEdit).toHaveBeenCalledWith('test-story-1', 'Test story message');
  });

  it('should call onDelete when delete button is clicked and confirmed', () => {
    // Mock window.confirm to return true
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(
      <StoryCard
        {...mockStory}
        currentUserId="user-123"
        {...mockHandlers}
      />
    );

    const menuButton = screen.getByLabelText('Story options');
    fireEvent.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockHandlers.onDelete).toHaveBeenCalledWith('test-story-1');

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should not call onDelete when delete is cancelled', () => {
    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);

    render(
      <StoryCard
        {...mockStory}
        currentUserId="user-123"
        {...mockHandlers}
      />
    );

    const menuButton = screen.getByLabelText('Story options');
    fireEvent.click(menuButton);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockHandlers.onDelete).not.toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should close menu when clicking outside', () => {
    render(
      <div>
        <StoryCard
          {...mockStory}
          currentUserId="user-123"
          {...mockHandlers}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    const menuButton = screen.getByLabelText('Story options');
    fireEvent.click(menuButton);

    // Menu should be open
    expect(screen.getByText('Edit')).toBeInTheDocument();

    // Click outside
    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    // Menu should be closed
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});