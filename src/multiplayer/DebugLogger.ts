// src/multiplayer/DebugLogger.ts
// Multiplayer debug logger with timestamps, sequence numbers, and role labels
// Includes auto-persistence and file download capabilities

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type Role = 'HOST' | 'GUEST' | 'SYSTEM';

interface LogEntry {
  seq: number;
  timestamp: number;
  elapsed: string;
  role: Role;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

interface SessionInfo {
  sessionId: string;
  roomCode: string | null;
  role: Role;
  startTime: number;
}

const STORAGE_KEY = 'mplog_session';
const AUTO_SAVE_INTERVAL = 5000; // Save to localStorage every 5 seconds
const AUTO_SAVE_THRESHOLD = 10; // Also save every 10 new logs

class MultiplayerDebugLogger {
  private logs: LogEntry[] = [];
  private sequence: number = 0;
  private startTime: number = Date.now();
  private enabled: boolean = true;
  private maxLogs: number = 2000;
  private role: Role = 'SYSTEM';
  private roomCode: string | null = null;
  private sessionId: string;
  private lastSaveSeq: number = 0;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private keyboardListenerAttached: boolean = false;

  // Console color codes for each role
  private readonly roleColors: Record<Role, string> = {
    HOST: '\x1b[32m',   // Green
    GUEST: '\x1b[34m',  // Blue
    SYSTEM: '\x1b[33m', // Yellow
  };

  private readonly levelColors: Record<LogLevel, string> = {
    debug: '\x1b[90m',  // Gray
    info: '\x1b[37m',   // White
    warn: '\x1b[33m',   // Yellow
    error: '\x1b[31m',  // Red
  };

  private readonly colorReset = '\x1b[0m';

  constructor() {
    // Generate unique session ID
    this.sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Start auto-save timer
    this.startAutoSave();

    // Set up keyboard shortcut
    this.setupKeyboardShortcut();

    // Save on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.saveToStorage());
    }
  }

  private startAutoSave(): void {
    if (typeof window === 'undefined') return;

    this.autoSaveTimer = setInterval(() => {
      this.saveToStorage();
    }, AUTO_SAVE_INTERVAL);
  }

  private setupKeyboardShortcut(): void {
    if (typeof window === 'undefined' || this.keyboardListenerAttached) return;

    window.addEventListener('keydown', (e) => {
      // Ctrl+Shift+L to download logs
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.downloadLogs();
      }
    });

    this.keyboardListenerAttached = true;
  }

  setRole(role: Role): void {
    this.role = role;
    this.log('info', 'Logger', `Role set to ${role}`);
    this.saveToStorage();
  }

  getRole(): Role {
    return this.role;
  }

  setRoomCode(code: string): void {
    this.roomCode = code;
    this.log('info', 'Logger', `Room code set to ${code}`);
    this.saveToStorage();
  }

  getRoomCode(): string | null {
    return this.roomCode;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  reset(): void {
    this.logs = [];
    this.sequence = 0;
    this.startTime = Date.now();
    this.lastSaveSeq = 0;
    this.sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.clearStorage();
  }

  private formatElapsed(timestamp: number): string {
    const elapsed = timestamp - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const ms = elapsed % 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  private log(level: LogLevel, category: string, message: string, data?: unknown): void {
    if (!this.enabled) return;

    const now = Date.now();
    const entry: LogEntry = {
      seq: this.sequence++,
      timestamp: now,
      elapsed: this.formatElapsed(now),
      role: this.role,
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);

    // Trim old logs if over limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Auto-save after threshold
    if (this.sequence - this.lastSaveSeq >= AUTO_SAVE_THRESHOLD) {
      this.saveToStorage();
    }

    // Format console output
    const roleColor = this.roleColors[this.role];
    const levelColor = this.levelColors[level];
    const seqStr = entry.seq.toString().padStart(4, '0');
    const prefix = `${roleColor}[${entry.role}]${this.colorReset} ${entry.elapsed} #${seqStr}`;
    const catStr = `[${category}]`;
    const msgStr = `${levelColor}${message}${this.colorReset}`;

    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

    if (data !== undefined) {
      consoleFn(`${prefix} ${catStr} ${msgStr}`, data);
    } else {
      consoleFn(`${prefix} ${catStr} ${msgStr}`);
    }
  }

  // Convenience methods
  debug(category: string, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  // Message-specific logging
  msgSent(type: string, data?: unknown): void {
    this.log('debug', 'MSG-OUT', `-> ${type}`, data);
  }

  msgReceived(type: string, peerId?: string, data?: unknown): void {
    const from = peerId ? ` from ${peerId.substring(0, 8)}` : '';
    this.log('debug', 'MSG-IN', `<- ${type}${from}`, data);
  }

  // State change logging
  stateChange(category: string, from: string, to: string): void {
    this.log('info', category, `${from} -> ${to}`);
  }

  // Get all logs for export
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Get session info
  getSessionInfo(): SessionInfo {
    return {
      sessionId: this.sessionId,
      roomCode: this.roomCode,
      role: this.role,
      startTime: this.startTime,
    };
  }

  // Export logs as formatted string
  exportLogs(): string {
    const header = [
      '='.repeat(60),
      `Multiplayer Debug Log`,
      `Session: ${this.sessionId}`,
      `Role: ${this.role}`,
      `Room Code: ${this.roomCode || 'N/A'}`,
      `Started: ${new Date(this.startTime).toISOString()}`,
      `Exported: ${new Date().toISOString()}`,
      `Total Entries: ${this.logs.length}`,
      '='.repeat(60),
      '',
    ].join('\n');

    const logLines = this.logs.map(entry => {
      const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
      return `${entry.elapsed} #${entry.seq.toString().padStart(4, '0')} [${entry.role}] [${entry.level.toUpperCase().padEnd(5)}] [${entry.category}] ${entry.message}${dataStr}`;
    }).join('\n');

    return header + logLines;
  }

  // Download logs as a file
  downloadLogs(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('[mpLog] Download only available in browser');
      return;
    }

    const content = this.exportLogs();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Generate filename: mplog_ROOMCODE_ROLE_TIMESTAMP.txt
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const roomPart = this.roomCode || 'NOROOMCODE';
    const filename = `mplog_${roomPart}_${this.role}_${timestamp}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.log('info', 'Logger', `Downloaded logs to ${filename}`);
  }

  // Save to localStorage
  saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = {
        sessionId: this.sessionId,
        roomCode: this.roomCode,
        role: this.role,
        startTime: this.startTime,
        logs: this.logs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.lastSaveSeq = this.sequence;
    } catch (e) {
      // Storage full or unavailable - trim logs and retry
      if (this.logs.length > 500) {
        this.logs = this.logs.slice(-500);
        try {
          const data = {
            sessionId: this.sessionId,
            roomCode: this.roomCode,
            role: this.role,
            startTime: this.startTime,
            logs: this.logs,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          // Give up silently
        }
      }
    }
  }

  // Load from localStorage (for viewing previous session)
  loadFromStorage(): boolean {
    if (typeof localStorage === 'undefined') return false;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;

      const data = JSON.parse(stored);
      return data;
    } catch {
      return false;
    }
  }

  // Clear localStorage
  clearStorage(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }

  // Get stored logs from previous session (without loading into current)
  getStoredLogs(): string | null {
    if (typeof localStorage === 'undefined') return null;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      const header = [
        '='.repeat(60),
        `Multiplayer Debug Log (from localStorage)`,
        `Session: ${data.sessionId}`,
        `Role: ${data.role}`,
        `Room Code: ${data.roomCode || 'N/A'}`,
        `Started: ${new Date(data.startTime).toISOString()}`,
        `Total Entries: ${data.logs.length}`,
        '='.repeat(60),
        '',
      ].join('\n');

      const logLines = data.logs.map((entry: LogEntry) => {
        const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
        return `${entry.elapsed} #${entry.seq.toString().padStart(4, '0')} [${entry.role}] [${entry.level.toUpperCase().padEnd(5)}] [${entry.category}] ${entry.message}${dataStr}`;
      }).join('\n');

      return header + logLines;
    } catch {
      return null;
    }
  }

  // Download stored logs from localStorage
  downloadStoredLogs(): void {
    const content = this.getStoredLogs();
    if (!content) {
      console.warn('[mpLog] No stored logs found');
      return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `mplog_stored_${timestamp}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Print summary of message types
  printSummary(): void {
    const msgCounts: Record<string, number> = {};
    this.logs.forEach(entry => {
      if (entry.category === 'MSG-IN' || entry.category === 'MSG-OUT') {
        const type = entry.message.replace(/^(<-|->)\s*/, '').split(' ')[0];
        msgCounts[type] = (msgCounts[type] || 0) + 1;
      }
    });
    console.log('\n--- Message Summary ---');
    Object.entries(msgCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    console.log('------------------------\n');
  }

  // Auto-download on disconnect (call from NetworkManager)
  onDisconnect(): void {
    this.log('warn', 'Logger', 'Disconnect detected - auto-saving logs');
    this.saveToStorage();
    // Auto-download on disconnect for debugging
    this.downloadLogs();
  }

  // Cleanup
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.saveToStorage();
  }
}

// Singleton instance
export const mpLog = new MultiplayerDebugLogger();

// Expose to window for debugging in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { mpLog: MultiplayerDebugLogger }).mpLog = mpLog;

  // Log keyboard shortcut hint on load
  console.log('%c[mpLog] Press Ctrl+Shift+L to download logs', 'color: #888; font-style: italic;');
}
