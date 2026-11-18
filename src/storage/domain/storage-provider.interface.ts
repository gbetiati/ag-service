import { Readable } from 'node:stream';

export type StorageUploadPayload = {
  originalName: string;
  mimeType: string;
  directory: string;
} & ({ buffer: Buffer; stream?: never } | { stream: Readable; buffer?: never });

export type StorageUploadResult = {
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export abstract class StorageProvider {
  abstract upload(payload: StorageUploadPayload): Promise<StorageUploadResult>;
  abstract download(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
}
