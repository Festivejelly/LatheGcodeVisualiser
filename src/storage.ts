interface StorageService {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  getKeys(prefix?: string): Promise<string[]>;
}

class LocalStorageService implements StorageService {
  async setItem(key: string, value: string): Promise<void> {
    console.log(`[LocalStorageService] Saving record - Key: "${key}", Value length: ${value.length} characters`);
    try {
      localStorage.setItem(key, value);
      console.log(`[LocalStorageService] Successfully saved record with key: "${key}"`);
    } catch (error) {
      console.error(`[LocalStorageService] Error saving record - Key: "${key}", Error:`, error);
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    console.log(`[LocalStorageService] Retrieving record with key: "${key}"`);
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        console.log(`[LocalStorageService] Successfully retrieved record - Key: "${key}", Value length: ${value.length} characters`);
      } else {
        console.log(`[LocalStorageService] Record not found - Key: "${key}"`);
      }
      return value;
    } catch (error) {
      console.error(`[LocalStorageService] Error retrieving record - Key: "${key}", Error:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    console.log(`[LocalStorageService] Deleting record with key: "${key}"`);
    try {
      localStorage.removeItem(key);
      console.log(`[LocalStorageService] Successfully deleted record with key: "${key}"`);
    } catch (error) {
      console.error(`[LocalStorageService] Error deleting record - Key: "${key}", Error:`, error);
      throw error;
    }
  }

  async getKeys(prefix?: string): Promise<string[]> {
    const logPrefix = prefix ? `with prefix "${prefix}"` : 'all keys';
    console.log(`[LocalStorageService] Retrieving keys ${logPrefix}`);
    
    try {
      const keys = Object.keys(localStorage);
      const filteredKeys = prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
      console.log(`[LocalStorageService] Successfully retrieved ${filteredKeys.length} keys ${logPrefix}:`, filteredKeys);
      return filteredKeys;
    } catch (error) {
      console.error(`[LocalStorageService] Error retrieving keys ${logPrefix}:`, error);
      return [];
    }
  }
}

class DatabaseService implements StorageService {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async setItem(key: string, value: string): Promise<void> {
    console.log(`[DatabaseService] Saving record - Key: "${key}", Value length: ${value.length} characters`);
    try {
      const response = await fetch(`${this.apiUrl}/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      
      if (response.ok) {
        console.log(`[DatabaseService] Successfully saved record with key: "${key}"`);
      } else {
        console.error(`[DatabaseService] Failed to save record - Key: "${key}", Status: ${response.status}`);
      }
    } catch (error) {
      console.error(`[DatabaseService] Error saving record - Key: "${key}", Error:`, error);
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    console.log(`[DatabaseService] Retrieving record with key: "${key}"`);
    try {
      const response = await fetch(`${this.apiUrl}/storage/${key}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[DatabaseService] Successfully retrieved record - Key: "${key}", Value length: ${data.value?.length || 0} characters`);
        return data.value;
      } else {
        console.log(`[DatabaseService] Record not found - Key: "${key}", Status: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error(`[DatabaseService] Error retrieving record - Key: "${key}", Error:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    console.log(`[DatabaseService] Deleting record with key: "${key}"`);
    try {
      const response = await fetch(`${this.apiUrl}/storage/${key}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log(`[DatabaseService] Successfully deleted record with key: "${key}"`);
      } else {
        console.error(`[DatabaseService] Failed to delete record - Key: "${key}", Status: ${response.status}`);
      }
    } catch (error) {
      console.error(`[DatabaseService] Error deleting record - Key: "${key}", Error:`, error);
      throw error;
    }
  }

  async getKeys(prefix?: string): Promise<string[]> {
    const logPrefix = prefix ? `with prefix "${prefix}"` : 'all keys';
    console.log(`[DatabaseService] Retrieving keys ${logPrefix}`);
    
    try {
      const url = prefix ? `${this.apiUrl}/storage/keys?prefix=${prefix}` : `${this.apiUrl}/storage/keys`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[DatabaseService] Failed to retrieve keys - Status: ${response.status}, ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const keys = data.keys || [];
      console.log(`[DatabaseService] Successfully retrieved ${keys.length} keys ${logPrefix}:`, keys);

      return keys;
    } catch (error) {
      console.error(`[DatabaseService] Error retrieving keys ${logPrefix}:`, error);
      return [];
    }
  }
}

export function createStorageService(): StorageService {
  // Check if we're running on the local network and can access the API
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isDebug = true;
  const isLocalNetwork = hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');

  if (isDebug) {
    return new DatabaseService('http://192.168.0.127:3001/api'); // Change this to your debug API URL
  }
  else if (isLocalhost) {
    // Running directly on the garage computer
    return new DatabaseService('http://localhost:3001/api');
  } else if (isLocalNetwork) {
    // Running from office computer, connecting to garage computer
    // Use the same hostname/IP but port 3001 for the API
    return new DatabaseService(`http://${hostname}:3001/api`);
  } else {
    // Use localStorage when deployed (GitHub Pages, etc.)
    return new LocalStorageService();
  }
}

export const storage = createStorageService();