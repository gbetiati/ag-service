import { describe, expect, it, vi } from 'vitest';
import { ApplyValidationApprovalUseCase } from './application/apply-validation-approval.use-case.js';

describe('apply validation approval', () => {
  it('approves content only when the company enables automatic approval and validation passed', async () => {
    const content = {
      companyId: 'company-1',
      status: 'DRAFT',
      approve: vi.fn(function (this: { status: string }) {
        this.status = 'APPROVED';
      }),
    };
    const companyRepository = {
      findById: vi.fn().mockResolvedValue({ id: 'company-1', approvalMode: 'AUTOMATIC' }),
    };
    const contentRepository = {
      findById: vi.fn().mockResolvedValue(content),
      update: vi.fn().mockResolvedValue(content),
    };
    const useCase = new ApplyValidationApprovalUseCase(companyRepository as any, contentRepository as any);

    await useCase.execute({ companyId: 'company-1', contentId: 'content-1', validationStatus: 'APPROVED' });

    expect(content.approve).toHaveBeenCalledOnce();
    expect(contentRepository.update).toHaveBeenCalledOnce();
  });

  it('does not auto-approve when manual approval is configured', async () => {
    const content = { companyId: 'company-1', status: 'DRAFT', approve: vi.fn() };
    const contentRepository = {
      findById: vi.fn().mockResolvedValue(content),
      update: vi.fn(),
    };
    const useCase = new ApplyValidationApprovalUseCase(
      { findById: vi.fn().mockResolvedValue({ id: 'company-1', approvalMode: 'MANUAL' }) } as any,
      contentRepository as any,
    );

    await useCase.execute({ companyId: 'company-1', contentId: 'content-1', validationStatus: 'APPROVED' });

    expect(content.approve).not.toHaveBeenCalled();
    expect(contentRepository.update).not.toHaveBeenCalled();
  });

  it('never auto-approves an inconclusive validation', async () => {
    const companyRepository = { findById: vi.fn() };
    const contentRepository = { findById: vi.fn(), update: vi.fn() };
    const useCase = new ApplyValidationApprovalUseCase(companyRepository as any, contentRepository as any);

    await useCase.execute({ companyId: 'company-1', contentId: 'content-1', validationStatus: 'INCONCLUSIVE' });

    expect(companyRepository.findById).not.toHaveBeenCalled();
    expect(contentRepository.update).not.toHaveBeenCalled();
  });
});
