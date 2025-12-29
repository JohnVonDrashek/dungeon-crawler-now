// src/multiplayer/DebugLogger.ts
// Multiplayer debug logger with timestamps, sequence numbers, and role labels

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

class MultiplayerDebugLogger {
  private logs: LogEntry[] = [];
  private sequence: number = 0;
  private startTime: number = Date.now();
  private enabled: boolean = true;
  private maxLogs: number = 1000;
  private role: Role = 'SYSTEM';

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

  setRole(role: Role): void {
    this.role = role;
    this.log('info', 'Logger', `Role set to ${role}`);
  }

  getRole(): Role {
    return this.role;
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

  // Export logs as formatted string
  exportLogs(): string {
    return this.logs.map(entry => {
      const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
      return `${entry.elapsed} #${entry.seq.toString().padStart(4, '0')} [${entry.role}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}${dataStr}`;
    }).join('\n');
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
}

// Singleton instance
export const mpLog = new MultiplayerDebugLogger();

// Expose to window for debugging in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { mpLog: MultiplayerDebugLogger }).mpLog = mpLog;
}
