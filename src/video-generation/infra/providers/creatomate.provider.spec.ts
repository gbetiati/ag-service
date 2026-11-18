import { afterEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { CreatomateProvider } from './creatomate.provider.js';

const createProvider = () =>
  new CreatomateProvider({
    get: vi.fn().mockReturnValue('creatomate-test-key'),
  } as any);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CreatomateProvider', () => {
  it('creates a render from the supplied image URLs and maps the queued response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 'render-1', status: 'planned' }]), {
        status: 201,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createProvider().createRenderJob({
      companyId: 'company-1',
      contentId: 'content-1',
      title: 'Product launch',
      script: 'Show our product',
      sourceMediaUrls: [
        'https://api.example.com/media-assets/asset-1/public?signature=signed',
      ],
      outputFormat: 'mp4',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(init.body as string);
    const requestHeaders = new Headers(init.headers);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.creatomate.com/v1/renders',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(requestHeaders.get('authorization')).toMatch(/^Bearer /);
    expect(requestBody.source).toMatchObject({
      output_format: 'mp4',
      width: 1080,
      height: 1920,
      elements: expect.arrayContaining([
        expect.objectContaining({
          type: 'image',
          source:
            'https://api.example.com/media-assets/asset-1/public?signature=signed',
        }),
        expect.objectContaining({ type: 'text', text: 'Product launch' }),
      ]),
    });
    expect(result).toMatchObject({ renderJobId: 'render-1', status: 'QUEUED' });
  });

  it('maps render completion and downloads the returned video URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'render-1',
            status: 'succeeded',
            url: 'https://cdn.example.com/video.mp4',
          }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'render-1',
            status: 'succeeded',
            url: 'https://cdn.example.com/video.mp4',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from('video-file'), {
          status: 200,
          headers: { 'content-type': 'video/mp4' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const provider = createProvider();

    await expect(provider.getRenderStatus('render-1')).resolves.toMatchObject({
      status: 'READY',
      finalUrl: 'https://cdn.example.com/video.mp4',
    });
    const videoStream = await provider.fetchFinalVideo('render-1');
    expect(videoStream).toBeInstanceOf(Readable);
    const chunks: Buffer[] = [];
    for await (const chunk of videoStream) {
      chunks.push(Buffer.from(chunk));
    }
    expect(Buffer.concat(chunks)).toEqual(Buffer.from('video-file'));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('surfaces provider errors instead of fabricating render success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 })),
    );

    await expect(
      createProvider().createRenderJob({
        companyId: 'company-1',
        contentId: 'content-1',
        title: 'Product launch',
        sourceMediaUrls: ['https://api.example.com/image.jpg'],
      }),
    ).rejects.toThrow('Creatomate API request failed (HTTP 401).');
  });
});
