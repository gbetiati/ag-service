export type StorageUploadPayload = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  directory: string;
};

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
