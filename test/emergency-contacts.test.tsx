import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmergencyContactsPage from '@/app/emergency-contacts/page';

// Mock fetch globally
global.fetch = vi.fn();

describe('Emergency Contacts Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful contacts fetch by default
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        contacts: []
      })
    });
  });

  it('should render the page title and description', async () => {
    render(<EmergencyContactsPage />);
    
    expect(screen.getByText('Emergency Contacts')).toBeInTheDocument();
    expect(screen.getByText('Manage your trusted contacts for SOS notifications')).toBeInTheDocument();
  });

  it('should show add contact button when no form is displayed', async () => {
    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Emergency Contact')).toBeInTheDocument();
    });
  });

  it('should show empty state when no contacts exist', async () => {
    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No Emergency Contacts Yet')).toBeInTheDocument();
      expect(screen.getByText('Add trusted contacts who will be notified when you activate SOS')).toBeInTheDocument();
    });
  });

  it('should display contact form when add button is clicked', async () => {
    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Emergency Contact');
      fireEvent.click(addButton);
    });

    expect(screen.getByText('Add Emergency Contact')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number *')).toBeInTheDocument();
    expect(screen.getByLabelText('Relationship (Optional)')).toBeInTheDocument();
  });

  it('should validate required fields in contact form', async () => {
    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Emergency Contact');
      fireEvent.click(addButton);
    });

    const submitButton = screen.getByText('Add Contact');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    });
  });

  it('should validate phone number format', async () => {
    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Emergency Contact');
      fireEvent.click(addButton);
    });

    const nameInput = screen.getByLabelText('Full Name *');
    const phoneInput = screen.getByLabelText('Phone Number *');
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(phoneInput, { target: { value: '123' } }); // Invalid phone

    const submitButton = screen.getByText('Add Contact');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Phone number must be 10-15 digits')).toBeInTheDocument();
    });
  });

  it('should display contacts when they exist', async () => {
    const mockContacts = [
      {
        id: '1',
        user_id: 'user-1',
        name: 'John Doe',
        phone: '5551234567',
        relationship: 'Friend',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        contacts: mockContacts
      })
    });

    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
      expect(screen.getByText('Friend')).toBeInTheDocument();
    });
  });

  it('should show edit form when edit button is clicked', async () => {
    const mockContacts = [
      {
        id: '1',
        user_id: 'user-1',
        name: 'John Doe',
        phone: '5551234567',
        relationship: 'Friend',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        contacts: mockContacts
      })
    });

    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      const editButton = screen.getByTitle('Edit contact');
      fireEvent.click(editButton);
    });

    expect(screen.getByText('Edit Emergency Contact')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5551234567')).toBeInTheDocument();
  });

  it('should show delete confirmation when delete button is clicked', async () => {
    const mockContacts = [
      {
        id: '1',
        user_id: 'user-1',
        name: 'John Doe',
        phone: '5551234567',
        relationship: 'Friend',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        contacts: mockContacts
      })
    });

    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      const deleteButton = screen.getByTitle('Delete contact');
      fireEvent.click(deleteButton);
    });

    expect(screen.getByText('⚠️ Confirm Deletion')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete John Doe/)).toBeInTheDocument();
  });

  it('should format phone numbers correctly', async () => {
    const mockContacts = [
      {
        id: '1',
        user_id: 'user-1',
        name: 'John Doe',
        phone: '5551234567',
        relationship: 'Friend',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        contacts: mockContacts
      })
    });

    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      // Should format 10-digit number as (555) 123-4567
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
    });
  });

  it('should display error message when API call fails', async () => {
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        message: 'Failed to load contacts'
      })
    });

    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load contacts')).toBeInTheDocument();
    });
  });

  it('should show information section about how emergency contacts work', async () => {
    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('How Emergency Contacts Work')).toBeInTheDocument();
      expect(screen.getByText(/When you activate SOS, all your emergency contacts will receive notifications/)).toBeInTheDocument();
      expect(screen.getByText(/Notifications include your location and a link to Google Maps/)).toBeInTheDocument();
    });
  });

  it('should have navigation links to SOS and Home', async () => {
    render(<EmergencyContactsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Go to SOS')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });
});