import { IsIn } from 'class-validator';

export class UpdateCompanyApprovalModeDto {
  @IsIn(['MANUAL', 'AUTOMATIC'])
  approvalMode!: 'MANUAL' | 'AUTOMATIC';
}
