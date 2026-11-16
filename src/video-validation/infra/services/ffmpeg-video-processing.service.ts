import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { StorageProvider } from '../../../storage/domain/storage-provider.interface.js';
import { VideoIntegrityReport, VideoProcessingService } from '../../domain/video-processing.service.interface.js';

const execFileAsync = promisify(execFile);

@Injectable()
export class FfmpegVideoProcessingService extends VideoProcessingService {
  constructor(private readonly storageProvider: StorageProvider) {
    super();
  }

  async downloadVideo(storageKey: string): Promise<{ path: string; sizeBytes: number; mimeType?: string }> {
    const buffer = await this.storageProvider.download(storageKey);
    const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'ag-video-'));
    const target = path.join(tempDir, path.basename(storageKey) || 'video.mp4');
    await fs.writeFile(target, buffer);

    return { path: target, sizeBytes: buffer.length, mimeType: 'video/mp4' };
  }

  async validateVideoIntegrity(path: string): Promise<VideoIntegrityReport> {
    try {
      const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', path]);
      const info = JSON.parse(stdout) as { format?: { duration?: string; size?: string } };
      const durationSeconds = Number(info?.format?.duration ?? 0);
      const fileSize = Number(info?.format?.size ?? 0);

      if (!durationSeconds || !fileSize) {
        return { isValid: false, reason: 'Video file is incomplete or unreadable' };
      }

      return {
        isValid: true,
        reason: 'Video file integrity verified',
        sizeBytes: fileSize,
        technicalMetadata: {
          durationSeconds,
          fileSize,
          format: 'mp4',
        },
      };
    } catch {
      return { isValid: false, reason: 'ffprobe could not read the video file' };
    }
  }

  async collectTechnicalMetadata(path: string): Promise<Record<string, unknown>> {
    try {
      const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,codec_name,avg_frame_rate', '-of', 'json', path]);
      const result = JSON.parse(stdout) as { streams?: Array<{ width?: number; height?: number; codec_name?: string; avg_frame_rate?: string }> };
      const stream = result.streams?.[0] ?? {};
      return {
        codecName: stream.codec_name ?? 'unknown',
        width: stream.width ?? null,
        height: stream.height ?? null,
        frameRate: stream.avg_frame_rate ?? 'unknown',
      };
    } catch {
      return { codecName: 'unknown', width: null, height: null, frameRate: 'unknown' };
    }
  }
}
