interface ConversationMessage {
  type: 'input' | 'output';
  content: string;
  typewriter?: boolean;
  timestamp: number;
}

interface StoredConversation {
  id: string;
  messages: ConversationMessage[];
  lastUpdated: number;
}

class ConversationStorage {
  private dbName = 'TerminalConversations';
  private version = 1;
  private storeName = 'conversations';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }
      };
    });
  }

  async saveConversation(messages: Array<{ type: 'input' | 'output'; content: string; typewriter?: boolean }>): Promise<void> {
    if (!this.db) await this.init();
    
    const conversation: StoredConversation = {
      id: 'main', // Single conversation for now
      messages: messages.map(msg => ({
        ...msg,
        timestamp: Date.now()
      })),
      lastUpdated: Date.now()
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(conversation);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async loadConversation(): Promise<Array<{ type: 'input' | 'output'; content: string; typewriter?: boolean }> | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get('main');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as StoredConversation | undefined;
        if (result) {
          resolve(result.messages.map(({ timestamp, ...msg }) => {
            void timestamp;
            return msg;
          }));
        } else {
          resolve(null);
        }
      };
    });
  }

  async clearConversation(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete('main');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async hasConversation(): Promise<boolean> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result > 0);
    });
  }
}

export const conversationStorage = new ConversationStorage();