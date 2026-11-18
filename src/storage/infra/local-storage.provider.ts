import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import {
  StorageProvider,
  StorageUploadPayload,
  StorageUploadResult,
} from '../domain/storage-provider.interface.js';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor() {
    const root = path.resolve(
      process.cwd(),
      process.env.STORAGE_ROOT ?? './storage/uploads',
    );
    void fs.mkdir(root, { recursive: true });
  }

  async upload(payload: StorageUploadPayload): Promise<StorageUploadResult> {
    const root = path.resolve(
      process.cwd(),
      process.env.STORAGE_ROOT ?? './storage/uploads',
    );
    const safeDirectory = payload.directory
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');
    const targetDir = path.join(root, safeDirectory);
    await fs.mkdir(targetDir, { recursive: true });

    const ext =
      path.extname(payload.originalName) ||
      this.mapMimeTypeToExtension(payload.mimeType);
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(targetDir, fileName);

    try {
      if (payload.buffer) {
        await fs.writeFile(filePath, payload.buffer);
      } else {
        await pipeline(payload.stream, createWriteStream(filePath));
      }
    } catch (error) {
      await fs.unlink(filePath).catch(() => undefined);
      throw error;
    }

    const key = path.posix.join(safeDirectory, fileName).replace(/\\/g, '/');
    const stats = await fs.stat(filePath);

    return {
      key,
      url: `file://${filePath}`,
      mimeType: payload.mimeType,
      sizeBytes: stats.size,
    };
  }

  async download(key: string): Promise<Buffer> {
    const root = path.resolve(
      process.cwd(),
      process.env.STORAGE_ROOT ?? './storage/uploads',
    );
    const resolvedPath = path.join(root, key);
    return fs.readFile(resolvedPath);
  }

  async delete(key: string): Promise<void> {
    const root = path.resolve(
      process.cwd(),
      process.env.STORAGE_ROOT ?? './storage/uploads',
    );
    const resolvedPath = path.join(root, key);

    try {
      await fs.unlink(resolvedPath);
    } catch {
      // ignore missing files during cleanup
    }
  }

  private mapMimeTypeToExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'application/pdf': '.pdf',
    };

    return map[mimeType] ?? '.bin';
  }
}
