import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { PasswordHasher } from '../../domain/password-hasher.interface.js';

@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return argon2.verify(passwordHash, password);
  }

  async verifyUnknownPassword(password: string): Promise<void> {
    this.dummyHash ??= argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });
    await argon2.verify(await this.dummyHash, password);
  }
}
