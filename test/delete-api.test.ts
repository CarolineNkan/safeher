import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase client
const mockDelete = vi.fn();
const mockEq = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      delete: mockDelete.mockReturnValue({
        eq: mockEq
      })
    }))
  }))
}));

// Import after mocking
const { POST } = await import('../app/api/stories/delete/route');

describe('DELETE /api/stories/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ error: null });
  });

  it('should successfully delete a story with valid ID', async () => {
    const validId = '123e4567-e89b-12d3-a456-426614174000';
    const request = new NextRequest('http://localhost:3000/api/stories/delete', {
      method: 'POST',
      body: JSON.stringify({ id: validId })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it('should return error when story ID is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/stories/delete', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Story ID required' });
  });

  it('should return error when story ID is invalid format', async () => {
    const request = new NextRequest('http://localhost:3000/api/stories/delete', {
      method: 'POST',
      body: JSON.stringify({ id: 'invalid-uuid' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid story ID format' });
  });

  it('should handle database errors gracefully', async () => {
    const validId = '123e4567-e89b-12d3-a456-426614174000';
    
    // Mock database error
    mockEq.mockReturnValue({ error: { message: 'Database error' } });

    const request = new NextRequest('http://localhost:3000/api/stories/delete', {
      method: 'POST',
      body: JSON.stringify({ id: validId })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to delete story' });
  });
});