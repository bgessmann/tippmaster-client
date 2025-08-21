import io from 'socket.io-client';
import { reactive } from 'vue';

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  serverUrl: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketType = any;

class SocketService {
  private socket: SocketType = null;

  // Reactive connection state
  public connectionState = reactive<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    serverUrl: null
  });

  /**
   * Connect to Socket.IO server
   * @param serverUrl - Server URL (e.g., http://192.168.0.10:3000)
   */
  async connect(serverUrl: string): Promise<void> {
    if (this.socket && this.socket.connected) {
      this.disconnect();
    }

    this.connectionState.isConnecting = true;
    this.connectionState.error = null;
    this.connectionState.serverUrl = serverUrl;

    try {
      this.socket = io(serverUrl, {
        timeout: 5000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Set up event listeners
      this.setupEventListeners();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket.on('connect_error', (error: unknown) => {
          clearTimeout(timeout);
          reject(new Error(error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : 'Connection error'));
        });
      });

    } catch (error) {
      this.connectionState.isConnecting = false;
      this.connectionState.error = error instanceof Error ? error.message : 'Connection failed';
      throw error;
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState.isConnected = false;
    this.connectionState.isConnecting = false;
    this.connectionState.serverUrl = null;
  }

  /**
   * Send event to server
   */
  emit(event: string, data?: unknown): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Not connected to server');
    }

    this.socket.emit(event, data);
  }

  /**
   * Listen for events from server
   */
  on(event: string, callback: (data: unknown) => void): void {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (data: unknown) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Get current connection status
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Set up internal event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.connectionState.isConnected = true;
      this.connectionState.isConnecting = false;
      this.connectionState.error = null;
      console.log('Connected to server:', this.connectionState.serverUrl);
    });

    this.socket.on('disconnect', (reason: unknown) => {
      this.connectionState.isConnected = false;
      this.connectionState.isConnecting = false;
      console.log('Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error: unknown) => {
      this.connectionState.isConnecting = false;
      this.connectionState.error = error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : 'Connection error';
      console.error('Connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber: unknown) => {
      console.log('Reconnected to server after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_attempt', (attemptNumber: unknown) => {
      console.log('Reconnection attempt', attemptNumber);
      this.connectionState.isConnecting = true;
    });

    this.socket.on('reconnect_failed', () => {
      this.connectionState.error = 'Failed to reconnect to server';
      this.connectionState.isConnecting = false;
      console.error('Failed to reconnect to server');
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();
