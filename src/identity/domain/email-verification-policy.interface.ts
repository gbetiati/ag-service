export abstract class EmailVerificationPolicy {
  abstract isRequired(): boolean;
}
