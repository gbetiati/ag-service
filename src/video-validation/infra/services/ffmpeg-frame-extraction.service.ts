import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { FrameExtractionService } from '../../domain/frame-extraction.service.interface.js';

const execFileAsync = promisify(execFile);

@Injectable()
export class FfmpegFrameExtractionService extends FrameExtractionService {
  async extractRepresentativeFrames(videoPath: string, outputDir: string): Promise<string[]> {
    await fs.mkdir(outputDir, { recursive: true });

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', videoPath,
        '-vf', 'fps=1/3,scale=1280:720:force_original_aspect_ratio=decrease',
        '-q:v', '2',
        path.join(outputDir, 'frame-%03d.jpg'),
      ]);
    } catch {
      return [];
    }

    const files = await fs.readdir(outputDir);
    return files.filter((file) => file.endsWith('.jpg')).sort().map((file) => path.join(outputDir, file));
  }
}
