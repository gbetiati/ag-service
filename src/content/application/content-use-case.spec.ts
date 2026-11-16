import { describe, expect, it, vi } from 'vitest';
import { CreateContentUseCase } from './create-content.use-case.js';
import { GetContentDetailsUseCase } from './get-content-details.use-case.js';
import { Content } from '../domain/content.entity.js';
import { ContentScene } from '../domain/content-scene.entity.js';
import { ContentAsset } from '../domain/content-asset.entity.js';
import { ContentHistory } from '../domain/content-history.entity.js';

describe('content use cases', () => {
  it('creates a content item with validation and history', async () => {
    const companyRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'company-1', name: 'Acme', slug: 'acme' }),
    };

    const brandRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'brand-1', companyId: 'company-1', slug: 'acme-brand' }),
    };

    const productRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'product-1', companyId: 'company-1', slug: 'mug' }),
    };

    const contentRepo = {
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn(async (content: Content) => content),
    };

    const historyRepo = {
      create: vi.fn().mockResolvedValue({ id: 'history-1' }),
    };

    const useCase = new CreateContentUseCase(
      companyRepo as any,
      brandRepo as any,
      productRepo as any,
      contentRepo as any,
      historyRepo as any,
    );

    const result = await useCase.execute({
      companyId: 'company-1',
      brandId: 'brand-1',
      productId: 'product-1',
      title: 'Launch video',
      slug: 'launch-video',
      brief: 'Intro to the product launch',
    });

    expect(result.title).toBe('Launch video');
    expect(contentRepo.create).toHaveBeenCalledTimes(1);
    expect(historyRepo.create).toHaveBeenCalledTimes(1);
  });

  it('returns the content details enriched with scenes, assets and history', async () => {
    const content = new Content(
      'content-1',
      'company-1',
      'brand-1',
      'product-1',
      'Launch video',
      'launch-video',
      'DRAFT',
      'Script here',
      'brief',
      { campaign: 'summer' },
      null,
      new Date(),
      new Date(),
    );

    const contentRepo = {
      findById: vi.fn().mockResolvedValue(content),
    };
    const sceneRepo = {
      findByContent: vi.fn().mockResolvedValue([
        new ContentScene('scene-1', 'content-1', 0, 'Intro', 'A shot list', 'Warm product shot', 12, new Date(), new Date()),
      ]),
    };
    const assetRepo = {
      findByContent: vi.fn().mockResolvedValue([
        new ContentAsset('asset-1', 'content-1', 'media-1', 'hero', new Date(), new Date()),
      ]),
    };
    const historyRepo = {
      findByContent: vi.fn().mockResolvedValue([
        new ContentHistory('history-1', 'content-1', 'created', null, { title: 'Launch video' }, new Date()),
      ]),
    };

    const useCase = new GetContentDetailsUseCase(
      contentRepo as any,
      sceneRepo as any,
      assetRepo as any,
      historyRepo as any,
    );

    const result = await useCase.execute({ companyId: 'company-1', contentId: 'content-1' });

    expect(result.content.id).toBe('content-1');
    expect(result.scenes[0].sceneIndex).toBe(0);
    expect(result.assets[0].role).toBe('hero');
    expect(result.history[0].action).toBe('created');
  });
});
