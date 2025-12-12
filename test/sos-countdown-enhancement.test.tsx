/**
 * Test for enhanced countdown system with cancellation
 * Task 2.1: Implement enhanced countdown system with cancellation
 * Requirements: 1.1, 1.5, 2.1, 2.2, 2.5
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SOSPage from '../app/sos/page';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

// Mock navigator permissions
const mockPermissions = {
  query: vi.fn(),
};

// Mock fetch
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  // Setup geolocation mock
  Object.defineProperty(global.navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
  });
  
  // Setup permissions mock
  Object.defineProperty(global.navigator, 'permissions', {
    value: mockPermissions,
    writable: true,
  });
  
  // Mock successful location response
  mockGeolocation.getCurrentPosition.mockImplementation((success) => {
    success({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
      },
    });
  });
  
  // Mock permissions response
  mockPermissions.query.mockResolvedValue({
    state: 'granted',
    addEventListener: vi.fn(),
  });
  
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => 'false'),
      setItem: vi.fn(),
    },
    writable: true,
  });
  
  // Mock online/offline events
  Object.defineProperty(window, 'addEventListener', {
    value: vi.fn(),
    writable: true,
  });
  
  Object.defineProperty(window, 'removeEventListener', {
    value: vi.fn(),
    writable: true,
  });
});

describe('Enhanced Countdown System', () => {
  it('should provide immediate visual feedback when SOS button is pressed', async () => {
    render(<SOSPage />);
    
    // Wait for location to be obtained
    await waitFor(() => {
      expect(screen.getByText('SOS')).toBeInTheDocument();
    });
    
    const sosButton = screen.getByRole('button', { name: /SOS/i });
    
    // Click the SOS button
    fireEvent.click(sosButton);
    
    // Should show countdown overlay immediately
    await waitFor(() => {
      expect(screen.getByText('🚨 SOS Activating')).toBeInTheDocument();
    });
    
    // Should show countdown timer - use getAllByText since there are multiple "5"s
    const countdownElements = screen.getAllByText('5');
    expect(countdownElements.length).toBeGreaterThan(0);
  });

  it('should display prominent cancel option during countdown', async () => {
    render(<SOSPage />);
    
    // Wait for location and start countdown
    await waitFor(() => {
      expect(screen.getByText('SOS')).toBeInTheDocument();
    });
    
    const sosButton = screen.getByRole('button', { name: /SOS/i });
    fireEvent.click(sosButton);
    
    // Should show cancel button prominently
    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /Cancel SOS/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveClass('w-full'); // Full width for prominence
    });
    
    // Should show tap outside to cancel instruction
    expect(screen.getByText('Tap anywhere outside to cancel')).toBeInTheDocument();
  });

  it('should cancel countdown when cancel button is clicked', async () => {
    render(<SOSPage />);
    
    // Wait for location and start countdown
    await waitFor(() => {
      expect(screen.getByText('SOS')).toBeInTheDocument();
    });
    
    const sosButton = screen.getByRole('button', { name: /SOS/i });
    fireEvent.click(sosButton);
    
    // Wait for countdown to appear
    await waitFor(() => {
      expect(screen.getByText('🚨 SOS Activating')).toBeInTheDocument();
    });
    
    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /Cancel SOS/i });
    fireEvent.click(cancelButton);
    
    // Should show cancel confirmation
    await waitFor(() => {
      expect(screen.getByText('SOS Cancelled')).toBeInTheDocument();
    });
    
    // Should show confirmation message
    expect(screen.getByText('Emergency alert has been successfully cancelled')).toBeInTheDocument();
  });

  it('should provide confirmation feedback when SOS is cancelled', async () => {
    render(<SOSPage />);
    
    // Wait for location and start countdown
    await waitFor(() => {
      expect(screen.getByText('SOS')).toBeInTheDocument();
    });
    
    const sosButton = screen.getByRole('button', { name: /SOS/i });
    fireEvent.click(sosButton);
    
    // Wait for countdown and cancel
    await waitFor(() => {
      expect(screen.getByText('🚨 SOS Activating')).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByRole('button', { name: /Cancel SOS/i });
    fireEvent.click(cancelButton);
    
    // Should show success confirmation with checkmark
    await waitFor(() => {
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('SOS Cancelled')).toBeInTheDocument();
    });
    
    // Should show detailed confirmation message
    expect(screen.getByText('You are now back to safety mode. The SOS system is ready for use again.')).toBeInTheDocument();
  });

  it('should enhance visual feedback during final countdown seconds', async () => {
    render(<SOSPage />);
    
    // Wait for location and start countdown
    await waitFor(() => {
      expect(screen.getByText('SOS')).toBeInTheDocument();
    });
    
    const sosButton = screen.getByRole('button', { name: /SOS/i });
    fireEvent.click(sosButton);
    
    // Wait for countdown to start
    await waitFor(() => {
      expect(screen.getByText('🚨 SOS Activating')).toBeInTheDocument();
    });
    
    // Wait for countdown to progress to final seconds (wait 3.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 3500));
    
    // Should show enhanced urgency warning when countdown reaches 2 seconds or less
    await waitFor(() => {
      expect(screen.getByText('⚠️ Activating soon! Cancel now!')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Cancel to prevent actual SOS activation
    const cancelButton = screen.getByRole('button', { name: /Cancel SOS/i });
    fireEvent.click(cancelButton);
  });

  it('should allow cancellation by clicking outside the countdown modal', async () => {
    render(<SOSPage />);
    
    // Wait for location and start countdown
    await waitFor(() => {
      expect(screen.getByText('SOS')).toBeInTheDocument();
    });
    
    const sosButton = screen.getByRole('button', { name: /SOS/i });
    fireEvent.click(sosButton);
    
    // Wait for countdown overlay
    await waitFor(() => {
      expect(screen.getByText('🚨 SOS Activating')).toBeInTheDocument();
    });
    
    // Find the overlay by its class and click it
    const overlayElement = screen.getByText('🚨 SOS Activating').closest('[class*="fixed"]');
    expect(overlayElement).toBeInTheDocument();
    
    // Click on the overlay background (this should trigger cancelCountdown)
    fireEvent.click(overlayElement!);
    
    // Should show cancel confirmation
    await waitFor(() => {
      expect(screen.getByText('SOS Cancelled')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});