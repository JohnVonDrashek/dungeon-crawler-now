// src/multiplayer/NetworkManager.ts

import { joinRoom, Room, selfId } from 'trystero';
import { SyncMessage } from './SyncMessages';
import { validateRoomCode } from './MessageValidator';

export type ConnectionState = 'disconnected' | 'connecting' | 'waiting' | 'connected' | 'reconnecting';

export class NetworkManager {
  private static instance: NetworkManager | null = null;
  private static readonly APP_ID = 'infernal-ascent-coop';

  private room: Room | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendMessage: ((data: Record<string, any>, peerId?: string) => void) | null = null;

  private _isHost: boolean = false;
  private _isConnected: boolean = false;
  private _connectionState: ConnectionState = 'disconnected';
  private _peerId: string | null = null;
  private _roomCode: string | null = null;

  private onPeerJoinCallback: ((peerId: string) => void) | null = null;
  private onPeerLeaveCallback: ((peerId: string) => void) | null = null;
  private messageListeners: Map<string, (message: SyncMessage, peerId: string) => void> = new Map();
  private listenerIdCounter: number = 0;
  private onConnectionStateChangeCallback: ((state: ConnectionState) => void) | null = null;

  // Reconnection state
  private intentionalDisconnect: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY_MS = 2000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  get isHost(): boolean {
    return this._isHost;
  }

  get isGuest(): boolean {
    return !this._isHost && this._isConnected;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get isMultiplayer(): boolean {
    return this.room !== null;
  }

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  get peerId(): string | null {
    return this._peerId;
  }

  get roomCode(): string | null {
    return this._roomCode;
  }

  private setConnectionState(state: ConnectionState): void {
    this._connectionState = state;
    this.onConnectionStateChangeCallback?.(state);
  }

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private setupRoomHandlers(): void {
    if (!this.room) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [sendMessage, getMessage] = this.room.makeAction<Record<string, any>>('sync');
    this.sendMessage = sendMessage;

    getMessage((data, peerId) => {
      const message = data as SyncMessage;
      this.messageListeners.forEach(callback => {
        try {
          callback(message, peerId);
        } catch (error) {
          console.error('Message handler error:', error);
        }
      });
    });

    this.room.onPeerLeave((peerId) => {
      this._isConnected = false;

      // If this was an intentional disconnect, don't try to reconnect
      if (this.intentionalDisconnect) {
        this.setConnectionState('disconnected');
        this.onPeerLeaveCallback?.(peerId);
        return;
      }

      // Host waits for guest to reconnect, guest attempts to reconnect
      if (this._isHost) {
        console.log('[NetworkManager] Guest disconnected, waiting for reconnect...');
        this.setConnectionState('waiting');
        this.onPeerLeaveCallback?.(peerId);
      } else {
        console.log('[NetworkManager] Disconnected from host, attempting reconnect...');
        this.attemptReconnect();
      }
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (!this._roomCode || this.intentionalDisconnect) {
      this.setConnectionState('disconnected');
      return;
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.log('[NetworkManager] Max reconnect attempts reached, giving up');
      this.setConnectionState('disconnected');
      this.onPeerLeaveCallback?.('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');
    console.log(`[NetworkManager] Reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);

    // Wait before attempting reconnect
    await new Promise(resolve => setTimeout(resolve, this.RECONNECT_DELAY_MS));

    // Check if we were intentionally disconnected while waiting
    if (this.intentionalDisconnect) {
      this.setConnectionState('disconnected');
      return;
    }

    try {
      // Leave old room if it exists
      if (this.room) {
        try {
          this.room.leave();
        } catch (e) {
          // Ignore errors from leaving already-left room
        }
      }

      // Rejoin the room
      this.room = joinRoom({ appId: NetworkManager.APP_ID }, this._roomCode);
      this._peerId = selfId;
      this.setupRoomHandlers();

      // Wait for host with timeout
      const reconnectPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Reconnect timeout'));
        }, 10000);

        // Safe check for room existence
        if (!this.room) {
          clearTimeout(timeout);
          reject(new Error('Room not available'));
          return;
        }

        this.room.onPeerJoin((peerId) => {
          clearTimeout(timeout);
          this._isConnected = true;
          this.reconnectAttempts = 0; // Reset on success
          this.setConnectionState('connected');
          console.log('[NetworkManager] Reconnected successfully!');
          this.onPeerJoinCallback?.(peerId);
          resolve();
        });
      });

      await reconnectPromise;
    } catch (error) {
      console.log('[NetworkManager] Reconnect attempt failed:', error);
      // Try again
      this.attemptReconnect();
    }
  }

  async hostGame(): Promise<string> {
    this._roomCode = this.generateRoomCode();
    this._isHost = true;
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.setConnectionState('connecting');

    try {
      this.room = joinRoom({ appId: NetworkManager.APP_ID }, this._roomCode);
      this._peerId = selfId;

      this.setupRoomHandlers();

      this.room.onPeerJoin((peerId) => {
        this._isConnected = true;
        this.setConnectionState('connected');
        this.onPeerJoinCallback?.(peerId);
      });

      this.setConnectionState('waiting');
      return this._roomCode;
    } catch (error) {
      this.setConnectionState('disconnected');
      throw error;
    }
  }

  async joinGame(roomCode: string): Promise<void> {
    const normalizedCode = roomCode.toUpperCase();

    // Validate room code format
    const validation = validateRoomCode(normalizedCode);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid room code');
    }

    this._roomCode = normalizedCode;
    this._isHost = false;
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.setConnectionState('connecting');

    try {
      this.room = joinRoom({ appId: NetworkManager.APP_ID }, this._roomCode);
      this._peerId = selfId;

      this.setupRoomHandlers();

      // Single onPeerJoin handler that handles both connection state and promise resolution
      let connectionResolved = false;
      const resolveConnection = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 15000);

        // Safe check for room existence
        if (!this.room) {
          clearTimeout(timeout);
          reject(new Error('Room not available'));
          return;
        }

        this.room.onPeerJoin((peerId) => {
          if (!connectionResolved) {
            connectionResolved = true;
            clearTimeout(timeout);
            this._isConnected = true;
            this.setConnectionState('connected');
            this.onPeerJoinCallback?.(peerId);
            resolve();
          }
        });
      });

      await resolveConnection;
    } catch (error) {
      this.setConnectionState('disconnected');
      this.disconnect();
      throw error;
    }
  }

  send(message: SyncMessage, targetPeerId?: string): void {
    if (this.sendMessage && this.room) {
      this.sendMessage(message, targetPeerId);
    }
  }

  broadcast(message: SyncMessage): void {
    this.send(message);
  }

  onPeerJoin(callback: (peerId: string) => void): void {
    this.onPeerJoinCallback = callback;
  }

  /**
   * Clear the onPeerJoin callback.
   */
  clearOnPeerJoin(): void {
    this.onPeerJoinCallback = null;
  }

  onPeerLeave(callback: (peerId: string) => void): void {
    this.onPeerLeaveCallback = callback;
  }

  /**
   * Clear the onPeerLeave callback.
   */
  clearOnPeerLeave(): void {
    this.onPeerLeaveCallback = null;
  }

  /**
   * Register a message handler.
   * @returns Listener ID for removal
   */
  onMessage(callback: (message: SyncMessage, peerId: string) => void): string {
    const id = `listener_${++this.listenerIdCounter}`;
    this.messageListeners.set(id, callback);
    return id;
  }

  /**
   * Remove a message handler by ID.
   */
  offMessage(listenerId: string): void {
    this.messageListeners.delete(listenerId);
  }

  /**
   * Clear all message handlers.
   */
  clearMessageListeners(): void {
    this.messageListeners.clear();
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  offConnectionStateChange(): void {
    this.onConnectionStateChangeCallback = null;
  }

  disconnect(): void {
    // Mark as intentional so reconnect logic doesn't trigger
    this.intentionalDisconnect = true;

    // Cancel any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.room) {
      try {
        this.room.leave();
      } catch (e) {
        // Ignore errors from leaving already-left room
      }
      this.room = null;
    }
    this.sendMessage = null;
    this._isHost = false;
    this._isConnected = false;
    this._peerId = null;
    this._roomCode = null;
    this.messageListeners.clear();
    this.reconnectAttempts = 0;

    // Clear all callbacks to prevent ghost handlers
    this.onPeerJoinCallback = null;
    this.onPeerLeaveCallback = null;
    this.onConnectionStateChangeCallback = null;

    this.setConnectionState('disconnected');
  }

  static reset(): void {
    if (NetworkManager.instance) {
      NetworkManager.instance.disconnect();
      NetworkManager.instance = null;
    }
  }
}

export const networkManager = NetworkManager.getInstance();
