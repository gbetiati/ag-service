import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AudioTranscript, AudioTranscriptionService } from '../../domain/audio-transcription.service.interface.js';

const execFileAsync = promisify(execFile);

@Injectable()
export class AudioTranscriptionServiceImpl extends AudioTranscriptionService {
  async transcribe(videoPath: string): Promise<AudioTranscript> {
    try {
      const streams = await execFileAsync('ffprobe', [
        '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', videoPath,
      ], { timeout: 15_000 });
      if (!streams.stdout.trim()) return { transcript: '', confidence: 0, source: 'no-audio' };

      const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', videoPath]);
      const duration = Number.parseFloat(stdout.trim());
      if (Number.isNaN(duration) || duration <= 0) {
        return { transcript: '', confidence: 0, source: 'unavailable' };
      }

      return {
        transcript: 'Audio stream detected; transcription requires external speech model configuration.',
        confidence: 0.25,
        source: 'ffmpeg',
      };
    } catch {
      return { transcript: '', confidence: 0, source: 'unavailable' };
    }
  }
}
