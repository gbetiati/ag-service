import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { StorageProvider, StorageUploadPayload, StorageUploadResult } from '../domain/storage-provider.interface.js';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor() {
    const root = path.resolve(process.cwd(), process.env.STORAGE_ROOT ?? './storage/uploads');
    void fs.mkdir(root, { recursive: true });
  }

  async upload({ buffer, originalName, mimeType, directory }: StorageUploadPayload): Promise<StorageUploadResult> {
    const root = path.resolve(process.cwd(), process.env.STORAGE_ROOT ?? './storage/uploads');
    const safeDirectory = directory.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const targetDir = path.join(root, safeDirectory);
    await fs.mkdir(targetDir, { recursive: true });

    const ext = path.extname(originalName) || this.mapMimeTypeToExtension(mimeType);
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(targetDir, fileName);

    await fs.writeFile(filePath, buffer);

    const key = path.posix.join(safeDirectory, fileName).replace(/\\/g, '/');

    return {
      key,
      url: `file://${filePath}`,
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  async download(key: string): Promise<Buffer> {
    const root = path.resolve(process.cwd(), process.env.STORAGE_ROOT ?? './storage/uploads');
    const resolvedPath = path.join(root, key);
    return fs.readFile(resolvedPath);
  }

  async delete(key: string): Promise<void> {
    const root = path.resolve(process.cwd(), process.env.STORAGE_ROOT ?? './storage/uploads');
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
