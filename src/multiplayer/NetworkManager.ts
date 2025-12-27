// src/multiplayer/NetworkManager.ts

import { joinRoom, Room, selfId } from 'trystero';
import { SyncMessage } from './SyncMessages';

export type ConnectionState = 'disconnected' | 'connecting' | 'waiting' | 'connected';

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
  private onMessageCallback: ((message: SyncMessage, peerId: string) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: ConnectionState) => void) | null = null;

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
      this.onMessageCallback?.(data as SyncMessage, peerId);
    });

    this.room.onPeerLeave((peerId) => {
      this._isConnected = false;
      this.setConnectionState(this._isHost ? 'waiting' : 'disconnected');
      this.onPeerLeaveCallback?.(peerId);
    });
  }

  async hostGame(): Promise<string> {
    this._roomCode = this.generateRoomCode();
    this._isHost = true;
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
    this._roomCode = roomCode.toUpperCase();
    this._isHost = false;
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

        this.room!.onPeerJoin((peerId) => {
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

  onPeerLeave(callback: (peerId: string) => void): void {
    this.onPeerLeaveCallback = callback;
  }

  onMessage(callback: (message: SyncMessage, peerId: string) => void): void {
    this.onMessageCallback = callback;
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.sendMessage = null;
    this._isHost = false;
    this._isConnected = false;
    this._peerId = null;
    this._roomCode = null;
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
