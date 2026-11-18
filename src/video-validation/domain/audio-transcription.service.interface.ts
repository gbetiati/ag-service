export type AudioTranscript = {
  transcript: string;
  confidence: number;
  source: 'ffmpeg' | 'unavailable' | 'no-audio' | 'transcription';
};

export abstract class AudioTranscriptionService {
  abstract transcribe(videoPath: string): Promise<AudioTranscript>;
}
