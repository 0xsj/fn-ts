// src/infrastructure/monitoring/logging/transports/file.transport.ts
import { BaseTransport } from './base.transport';
import { LogEntry, LogLevel } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const appendFile = promisify(fs.appendFile);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const rename = promisify(fs.rename);

export interface FileTransportOptions {
  level?: LogLevel;
  dirname?: string;
  filename?: string;
  maxSize?: number; // Max file size in bytes
  maxFiles?: number; // Number of files to keep
  datePattern?: boolean; // Use date in filename
}

export class FileTransport extends BaseTransport {
  private readonly dirname: string;
  private readonly filename: string;
  private readonly maxSize: number;
  private readonly maxFiles: number;
  private readonly datePattern: boolean;
  private currentFile: string;
  private writeStream?: fs.WriteStream;

  constructor(options: FileTransportOptions = {}) {
    super('file', options.level || 'info');
    
    this.dirname = options.dirname || path.join(process.cwd(), 'logs');
    this.filename = options.filename || 'app.log';
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    this.maxFiles = options.maxFiles || 5;
    this.datePattern = options.datePattern ?? true;
    
    this.currentFile = this.getLogFilePath();
    this.ensureLogDirectory();
  }

  isReady(): boolean {
    return true;
  }

  protected async writeLog(entry: LogEntry): Promise<void> {
    const logLine = this.formatLogLine(entry);
    
    try {
      // Check if rotation is needed
      await this.rotateIfNeeded();
      
      // Append to file
      await appendFile(this.currentFile, logLine + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
      // Fallback to console
      console.error(logLine);
    }
  }

  protected async writeBatch(entries: LogEntry[]): Promise<void> {
    const logLines = entries.map(entry => this.formatLogLine(entry)).join('\n');
    
    try {
      await this.rotateIfNeeded();
      await appendFile(this.currentFile, logLines + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write batch to log file:', error);
      // Fallback to console
      entries.forEach(entry => console.error(this.formatLogLine(entry)));
    }
  }

  private formatLogLine(entry: LogEntry): string {
    const log = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      ...entry.context,
      data: entry.data,
      error: entry.error,
    };

    return JSON.stringify(log);
  }

  private getLogFilePath(): string {
    if (this.datePattern) {
      const date = new Date().toISOString().split('T')[0];
      const nameParts = this.filename.split('.');
      const ext = nameParts.pop();
      const baseName = nameParts.join('.');
      return path.join(this.dirname, `${baseName}-${date}.${ext}`);
    }
    return path.join(this.dirname, this.filename);
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await mkdir(this.dirname, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await stat(this.currentFile).catch(() => null);
      
      if (stats && stats.size >= this.maxSize) {
        await this.rotate();
      }

      // Check if date has changed (for date pattern)
      if (this.datePattern) {
        const newFile = this.getLogFilePath();
        if (newFile !== this.currentFile) {
          this.currentFile = newFile;
        }
      }
    } catch (error) {
      console.error('Error checking rotation:', error);
    }
  }

  private async rotate(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const rotatedName = this.currentFile.replace(/\.log$/, `-${timestamp}.log`);
    
    try {
      await rename(this.currentFile, rotatedName);
      
      // Clean up old files
      await this.cleanOldFiles();
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private async cleanOldFiles(): Promise<void> {
    try {
      const files = await promisify(fs.readdir)(this.dirname);
      const logFiles = files
        .filter(f => f.includes(this.filename.replace('.log', '')))
        .sort()
        .reverse();

      // Keep only maxFiles
      const filesToDelete = logFiles.slice(this.maxFiles);
      
      for (const file of filesToDelete) {
        await promisify(fs.unlink)(path.join(this.dirname, file)).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to clean old log files:', error);
    }
  }

  async close(): Promise<void> {
    await super.close();
    if (this.writeStream) {
      this.writeStream.end();
    }
  }
}