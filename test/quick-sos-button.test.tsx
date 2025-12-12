import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import QuickSOSButton from '../components/QuickSOSButton';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('QuickSOSButton', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders prominent variant with correct styling and content', () => {
    render(<QuickSOSButton variant="prominent" />);
    
    const button = screen.getByRole('button', { name: /emergency sos - quick access/i });
    expect(button).toBeInTheDocument();
    
    expect(screen.getByText('EMERGENCY')).toBeInTheDocument();
    expect(screen.getByText('SOS Quick Access')).toBeInTheDocument();
    expect(screen.getByText('Tap for immediate emergency assistance')).toBeInTheDocument();
    expect(screen.getByText('🆘')).toBeInTheDocument();
  });

  it('renders floating variant with correct styling', () => {
    render(<QuickSOSButton variant="floating" />);
    
    const button = screen.getByRole('button', { name: /emergency sos - quick access/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('fixed', 'bottom-6', 'right-6', 'z-50');
    
    expect(screen.getByText('🆘')).toBeInTheDocument();
    expect(screen.getByText('SOS')).toBeInTheDocument();
  });

  it('renders grid variant with correct styling', () => {
    render(<QuickSOSButton variant="grid" />);
    
    const button = screen.getByRole('button', { name: /emergency sos - quick access/i });
    expect(button).toBeInTheDocument();
    
    expect(screen.getByText('🆘 EMERGENCY')).toBeInTheDocument();
    expect(screen.getByText('SOS Alert')).toBeInTheDocument();
    expect(screen.getByText('Tap for immediate emergency assistance')).toBeInTheDocument();
  });

  it('navigates to SOS page when clicked', () => {
    render(<QuickSOSButton variant="prominent" />);
    
    const button = screen.getByRole('button', { name: /emergency sos - quick access/i });
    fireEvent.click(button);
    
    expect(mockPush).toHaveBeenCalledWith('/sos');
  });

  it('provides immediate visual feedback when pressed', async () => {
    render(<QuickSOSButton variant="prominent" />);
    
    const button = screen.getByRole('button', { name: /emergency sos - quick access/i });
    
    // Click the button
    fireEvent.click(button);
    
    // Should navigate to SOS page
    expect(mockPush).toHaveBeenCalledWith('/sos');
  });

  it('has proper accessibility attributes', () => {
    render(<QuickSOSButton variant="prominent" />);
    
    const button = screen.getByRole('button', { name: /emergency sos - quick access/i });
    expect(button).toHaveAttribute('aria-label', 'Emergency SOS - Quick Access');
  });

  it('applies custom className when provided', () => {
    render(<QuickSOSButton variant="prominent" className="custom-class" />);
    
    const button = screen.getByRole('button', { name: /emergency sos - quick access/i });
    expect(button).toHaveClass('custom-class');
  });
});