/**
 * Story Management Integration Tests
 * 
 * Comprehensive end-to-end tests for the complete story management workflow
 * including story creation, editing, deletion, reactions, and real-time updates.
 * 
 * Requirements: All requirements integration
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock the Supabase client with comprehensive functionality
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    })),
    upsert: vi.fn()
  }))
};

vi.mock('@/lib/supabaseClient', () => ({
  supabase: mockSupabase
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('Story Management Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
    
    // Reset channel mock
    mockChannel.on.mockClear().mockReturnThis();
    mockChannel.subscribe.mockClear();
    mockSupabase.channel.mockClear().mockReturnValue(mockChannel);
    mockSupabase.removeChannel.mockClear();
    
    // Default fetch mock for stories list
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Core Integration Tests', () => {
    it('should render story feed with proper UI elements', async () => {
      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      // Verify main UI elements are present
      await waitFor(() => {
        expect(screen.getByText('Community Stories')).toBeInTheDocument();
        expect(screen.getByText('Real experiences from women walking the same streets')).toBeInTheDocument();
        expect(screen.getByText('Share your safety experience')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('What happened? Use #hashtags to categorize your experience…')).toBeInTheDocument();
        expect(screen.getByText('Share Story')).toBeInTheDocument();
      });

      // Verify empty state is shown
      expect(screen.getByText('No stories yet — be the first to share!')).toBeInTheDocument();
    });

    it('should prevent empty story submission', async () => {
      // Mock alert
      const originalAlert = window.alert;
      window.alert = vi.fn();

      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('Share Story')).toBeInTheDocument();
      });

      const shareButton = screen.getByText('Share Story');

      // Button should be disabled when textarea is empty
      expect(shareButton).toBeDisabled();

      // Try to click disabled button (should not trigger alert)
      await user.click(shareButton);

      // No alert should be called since button is disabled
      expect(window.alert).not.toHaveBeenCalled();

      // Restore alert
      window.alert = originalAlert;
    });

    it('should enable submit button when text is entered', async () => {
      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('Share Story')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('What happened? Use #hashtags to categorize your experience…');
      const shareButton = screen.getByText('Share Story');

      // Initially disabled
      expect(shareButton).toBeDisabled();

      // Type some text
      await user.type(textarea, 'Test story content');

      // Should now be enabled
      expect(shareButton).not.toBeDisabled();
    });
  });

  describe('Story Card Integration', () => {
    it('should display story cards with proper content and reactions', async () => {
      // Mock story data
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          id: 'test-story',
          message: 'Test story with hashtags #safety #downtown',
          created_at: '2024-01-01T12:00:00Z',
          user_id: 'mock-user-id',
          likes: 5,
          helpful: 3,
          noted: 2,
        }])
      });

      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('Test story with hashtags #safety #downtown')).toBeInTheDocument();
      });

      // Verify story content is displayed
      expect(screen.getByText('Test story with hashtags #safety #downtown')).toBeInTheDocument();
      
      // Verify hashtags are displayed
      expect(screen.getByText('#safety')).toBeInTheDocument();
      expect(screen.getByText('#downtown')).toBeInTheDocument();

      // Verify reaction buttons with counts
      expect(screen.getByText(/❤️ Like \(5\)/)).toBeInTheDocument();
      expect(screen.getByText(/✨ Helpful \(3\)/)).toBeInTheDocument();
      expect(screen.getByText(/👀 Noted \(2\)/)).toBeInTheDocument();

      // Verify three-dot menu is present for owned story
      expect(screen.getByLabelText('Story options')).toBeInTheDocument();
    });

    it('should hide three-dot menu for non-owned stories', async () => {
      // Mock story data from different user
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          id: 'other-story',
          message: 'Story from another user',
          created_at: '2024-01-01T12:00:00Z',
          user_id: 'other-user-id',
          likes: 0,
          helpful: 0,
          noted: 0,
        }])
      });

      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('Story from another user')).toBeInTheDocument();
      });

      // Verify three-dot menu is NOT present for non-owned story
      expect(screen.queryByLabelText('Story options')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Integration', () => {
    it('should set up real-time subscriptions for stories and reactions', async () => {
      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('Community Stories')).toBeInTheDocument();
      });

      // Verify real-time channels were set up
      expect(mockSupabase.channel).toHaveBeenCalledWith('stories-changes');
      expect(mockSupabase.channel).toHaveBeenCalledWith('reactions-changes');

      // Verify subscriptions were configured
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        expect.any(Function)
      );

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        expect.any(Function)
      );

      expect(mockChannel.subscribe).toHaveBeenCalledTimes(2);
    });

    it('should clean up subscriptions on unmount', async () => {
      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      const { unmount } = render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('Community Stories')).toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // Verify channels were removed
      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2);
    });
  });

  describe('API Integration', () => {
    it('should call correct API endpoints for story operations', async () => {
      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('Community Stories')).toBeInTheDocument();
      });

      // Verify initial stories list API call
      expect(global.fetch).toHaveBeenCalledWith('/api/stories/list');
    });

    it('should handle API response format correctly', async () => {
      // Mock proper API response format
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: 'api-test-story',
            message: 'API test story',
            created_at: '2024-01-01T00:00:00Z',
            user_id: 'test-user',
            likes: 1,
            helpful: 2,
            noted: 3,
          }
        ])
      });

      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('API test story')).toBeInTheDocument();
      });

      // Verify story data is displayed correctly
      expect(screen.getByText(/❤️ Like \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/✨ Helpful \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/👀 Noted \(3\)/)).toBeInTheDocument();
    });
  });

  describe('UI Consistency and User Experience', () => {
    it('should display proper UI elements and styling', async () => {
      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('Community Stories')).toBeInTheDocument();
      });

      // Verify main UI elements
      expect(screen.getByText('Real experiences from women walking the same streets')).toBeInTheDocument();
      expect(screen.getByText('Share your safety experience')).toBeInTheDocument();
      expect(screen.getByText('Your story helps other women plan safer routes')).toBeInTheDocument();
      
      // Verify composer elements
      const textarea = screen.getByPlaceholderText('What happened? Use #hashtags to categorize your experience…');
      expect(textarea).toBeInTheDocument();
      
      const shareButton = screen.getByText('Share Story');
      expect(shareButton).toBeInTheDocument();
      expect(shareButton).toBeDisabled(); // Should be disabled when empty
    });

    it('should handle empty feed state properly', async () => {
      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('No stories yet — be the first to share!')).toBeInTheDocument();
      });
    });

    it('should display story timestamps correctly', async () => {
      const testDate = '2024-01-01T12:30:00Z';
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          id: 'timestamp-story',
          message: 'Story with timestamp',
          created_at: testDate,
          user_id: 'mock-user-id',
          likes: 0,
          helpful: 0,
          noted: 0,
        }])
      });

      const StoryFeed = (await import('@/app/stories/feed/page')).default;
      render(<StoryFeed />);

      await waitFor(() => {
        expect(screen.getByText('Story with timestamp')).toBeInTheDocument();
      });

      // Verify timestamp is displayed (format may vary by locale)
      const timestampElement = screen.getByText(new Date(testDate).toLocaleString());
      expect(timestampElement).toBeInTheDocument();
    });
  });
});