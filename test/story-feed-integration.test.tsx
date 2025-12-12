import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client
vi.mock('@/lib/supabaseClient', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  };
  
  return {
    supabase: {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('StoryFeed Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('should handle edit action by populating composer', async () => {
    // Mock successful API responses
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve([
          {
            id: 'story-1',
            message: 'Original story content',
            created_at: '2024-01-01T00:00:00Z',
            user_id: 'mock-user-id',
            likes: 0,
            helpful: 0,
            noted: 0,
          }
        ])
      });

    // Dynamically import the component to ensure mocks are applied
    const StoryFeed = (await import('@/app/stories/feed/page')).default;
    
    render(<StoryFeed />);

    // Wait for stories to load
    await waitFor(() => {
      expect(screen.getByText('Original story content')).toBeInTheDocument();
    });

    // Find and click the three-dot menu
    const menuButton = screen.getByLabelText('Story options');
    fireEvent.click(menuButton);

    // Click edit
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    // Check that the composer is populated with the story content
    const textarea = screen.getByPlaceholderText('What happened? Use #hashtags to categorize your experience…');
    expect(textarea).toHaveValue('Original story content');

    // Check that the composer shows edit mode
    expect(screen.getByText('Edit your story')).toBeInTheDocument();
    expect(screen.getByText('Update Story')).toBeInTheDocument();
  });

  it('should handle delete action by removing story from feed', async () => {
    // Mock successful API responses
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve([
          {
            id: 'story-1',
            message: 'Story to be deleted',
            created_at: '2024-01-01T00:00:00Z',
            user_id: 'mock-user-id',
            likes: 0,
            helpful: 0,
            noted: 0,
          }
        ])
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true })
      });

    // Mock window.confirm to return true
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    // Dynamically import the component to ensure mocks are applied
    const StoryFeed = (await import('@/app/stories/feed/page')).default;
    
    render(<StoryFeed />);

    // Wait for stories to load
    await waitFor(() => {
      expect(screen.getByText('Story to be deleted')).toBeInTheDocument();
    });

    // Find and click the three-dot menu
    const menuButton = screen.getByLabelText('Story options');
    fireEvent.click(menuButton);

    // Click delete
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Wait for the story to be removed from the feed
    await waitFor(() => {
      expect(screen.queryByText('Story to be deleted')).not.toBeInTheDocument();
    });

    // Verify delete API was called
    expect(global.fetch).toHaveBeenCalledWith('/api/stories/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'story-1' }),
    });

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should show cancel button in edit mode', async () => {
    // Mock successful API responses
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve([
          {
            id: 'story-1',
            message: 'Story content',
            created_at: '2024-01-01T00:00:00Z',
            user_id: 'mock-user-id',
            likes: 0,
            helpful: 0,
            noted: 0,
          }
        ])
      });

    // Dynamically import the component to ensure mocks are applied
    const StoryFeed = (await import('@/app/stories/feed/page')).default;
    
    render(<StoryFeed />);

    // Wait for stories to load
    await waitFor(() => {
      expect(screen.getByText('Story content')).toBeInTheDocument();
    });

    // Find and click the three-dot menu
    const menuButton = screen.getByLabelText('Story options');
    fireEvent.click(menuButton);

    // Click edit
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    // Check that cancel button appears
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();

    // Click cancel
    fireEvent.click(cancelButton);

    // Check that edit mode is exited
    expect(screen.getByText('Share your safety experience')).toBeInTheDocument();
    expect(screen.getByText('Share Story')).toBeInTheDocument();
    
    // Check that textarea is cleared
    const textarea = screen.getByPlaceholderText('What happened? Use #hashtags to categorize your experience…');
    expect(textarea).toHaveValue('');
  });
});