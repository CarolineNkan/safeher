import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SOSPage from '../app/sos/page';

// Mock Web Audio API
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
    type: 'square',
    onended: null,
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn((success) => {
    success({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
      },
    });
  }),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

describe('Alarm System', () => {
  beforeEach(() => {
    // Mock Web Audio API
    global.AudioContext = vi.fn(() => mockAudioContext);
    (global as any).webkitAudioContext = vi.fn(() => mockAudioContext);
    
    // Mock geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock permissions API
    Object.defineProperty(global.navigator, 'permissions', {
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display alarm toggle switch', () => {
    render(<SOSPage />);
    
    expect(screen.getByText('Audible Alarm')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should save alarm preference to localStorage when toggled', async () => {
    render(<SOSPage />);
    
    const alarmToggle = screen.getByRole('checkbox');
    
    // Toggle alarm on
    fireEvent.click(alarmToggle);
    
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('safeher-alarm-enabled', 'true');
    });
  });

  it('should show test button when alarm is enabled', async () => {
    // Mock localStorage to return alarm enabled
    (localStorage.getItem as any).mockReturnValue('true');
    
    render(<SOSPage />);
    
    await waitFor(() => {
      expect(screen.getByText('🔊 Test')).toBeInTheDocument();
    });
  });

  it('should initialize audio context when test button is clicked', async () => {
    // Mock localStorage to return alarm enabled
    (localStorage.getItem as any).mockReturnValue('true');
    
    render(<SOSPage />);
    
    await waitFor(() => {
      const testButton = screen.getByText('🔊 Test');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      expect(global.AudioContext).toHaveBeenCalled();
    });
  });

  it('should show appropriate feedback when alarm is enabled vs disabled', () => {
    render(<SOSPage />);
    
    // Initially disabled
    expect(screen.getByText('🔇 No alarm will sound during SOS')).toBeInTheDocument();
    
    // Enable alarm
    const alarmToggle = screen.getByRole('checkbox');
    fireEvent.click(alarmToggle);
    
    expect(screen.getByText('✅ Alarm will sound when SOS is activated')).toBeInTheDocument();
    expect(screen.getByText('🔊 Uses maximum device volume')).toBeInTheDocument();
    expect(screen.getByText('⚠️ May be loud - test in safe environment')).toBeInTheDocument();
  });

  it('should handle audio context initialization failure gracefully', async () => {
    // Mock AudioContext to throw error
    global.AudioContext = vi.fn(() => {
      throw new Error('Audio not supported');
    });
    
    // Mock localStorage to return alarm enabled
    (localStorage.getItem as any).mockReturnValue('true');
    
    render(<SOSPage />);
    
    await waitFor(() => {
      const testButton = screen.getByText('🔊 Test');
      fireEvent.click(testButton);
    });

    // Should show error feedback
    await waitFor(() => {
      expect(screen.getByText(/Audio test failed/)).toBeInTheDocument();
    });
  });
});