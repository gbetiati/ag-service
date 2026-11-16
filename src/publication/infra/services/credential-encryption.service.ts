import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

@Injectable()
export class CredentialEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey = createHash('sha256')
    .update(process.env.CREDENTIAL_ENCRYPTION_KEY ?? 'local-dev-secret-change-me')
    .digest();

  encrypt(plainText: string): { encryptedValue: string; initializationVector: string } {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      encryptedValue: Buffer.concat([encrypted, tag]).toString('base64'),
      initializationVector: iv.toString('base64'),
    };
  }

  decrypt(encryptedValue: string, initializationVector: string): string {
    const buffer = Buffer.from(encryptedValue, 'base64');
    const iv = Buffer.from(initializationVector, 'base64');
    const tagLength = 16;
    const encrypted = buffer.subarray(0, buffer.length - tagLength);
    const tag = buffer.subarray(buffer.length - tagLength);
    const decipher = createDecipheriv(this.algorithm, this.secretKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
