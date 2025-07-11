interface StorageService {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  getKeys(prefix?: string): Promise<string[]>;
}

class LocalStorageService implements StorageService {
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async getKeys(prefix?: string): Promise<string[]> {
    const keys = Object.keys(localStorage);
    return prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
  }
}

class DatabaseService implements StorageService {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async setItem(key: string, value: string): Promise<void> {
    await fetch(`${this.apiUrl}/storage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
  }

  async getItem(key: string): Promise<string | null> {
    const response = await fetch(`${this.apiUrl}/storage/${key}`);
    if (response.ok) {
      const data = await response.json();
      return data.value;
    }
    return null;
  }

  async removeItem(key: string): Promise<void> {
    await fetch(`${this.apiUrl}/storage/${key}`, {
      method: 'DELETE'
    });
  }

async getKeys(prefix?: string): Promise<string[]> {
  try {
    const url = prefix ? `${this.apiUrl}/storage/keys?prefix=${prefix}` : `${this.apiUrl}/storage/keys`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('API response not ok:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    console.log('API returned data:', data); // Debug log
    
    return data.keys || [];
  } catch (error) {
    console.error('Error fetching keys:', error);
    return [];
  }
}
}

export function createStorageService(): StorageService {
  // Check if we're running locally and can access the API
  const isLocalhost = false; //window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // Try to use database service when running locally
    return new DatabaseService('http://localhost:3001/api');
  } else {
    // Use localStorage when deployed (GitHub Pages, etc.)
    return new LocalStorageService();
  }
}

export const storage = createStorageService();