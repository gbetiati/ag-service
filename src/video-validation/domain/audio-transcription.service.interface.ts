export type AudioTranscript = {
  transcript: string;
  confidence: number;
  source: 'ffmpeg' | 'unavailable';
};

export abstract class AudioTranscriptionService {
  abstract transcribe(videoPath: string): Promise<AudioTranscript>;
}
