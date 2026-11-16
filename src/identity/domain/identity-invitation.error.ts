export class IdentityInvitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityInvitationError';
  }
}
