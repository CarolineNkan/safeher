// Simple Raindrop API client for SmartMemory operations
class RaindropClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: { apiKey: string; baseUrl?: string }) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://api.raindrop.ai';
  }

  get smartMemory() {
    return {
      write: async (key: string, data: any) => {
        try {
          const response = await fetch(`${this.baseUrl}/v1/smartmemory/${key}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            throw new Error(`SmartMemory write failed: ${response.status} ${response.statusText}`);
          }

          return await response.json();
        } catch (error) {
          console.error('SmartMemory write error:', error);
          throw error;
        }
      },

      read: async (key: string) => {
        try {
          const response = await fetch(`${this.baseUrl}/v1/smartmemory/${key}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              return null;
            }
            throw new Error(`SmartMemory read failed: ${response.status} ${response.statusText}`);
          }

          return await response.json();
        } catch (error) {
          console.error('SmartMemory read error:', error);
          throw error;
        }
      }
    };
  }
}

export const raindrop = new RaindropClient({
  apiKey: process.env.RAINDROP_API_KEY || 'dummy-key',
});