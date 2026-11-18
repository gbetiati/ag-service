import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import {
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoProvider,
  VideoRenderRequestError,
} from '../../domain/video-provider.interface.js';

const API_URL = 'https://api.creatomate.com/v1';
const REQUEST_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 180_000;

type CreatomateRender = {
  id?: unknown;
  status?: unknown;
  url?: unknown;
  error_message?: unknown;
};

@Injectable()
export class CreatomateProvider extends VideoProvider {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async createRenderJob(
    request: VideoGenerationRequest,
  ): Promise<VideoGenerationResult> {
    const source = this.createSource(request);
    const response = await this.requestJson('/renders', {
      method: 'POST',
      body: JSON.stringify({ source }),
    });
    const render = this.firstRender(response);
    if (typeof render.id !== 'string' || render.id.length === 0) {
      throw new Error('Creatomate did not return a render ID.');
    }

    return this.mapRender(render);
  }

  async getRenderStatus(jobId: string): Promise<VideoGenerationResult> {
    const response = await this.requestJson(
      `/renders/${encodeURIComponent(jobId)}`,
      { method: 'GET' },
    );
    return this.mapRender(this.firstRender(response, jobId));
  }

  async fetchFinalVideo(jobId: string): Promise<Readable> {
    const render = await this.getRenderStatus(jobId);
    if (render.status !== 'READY' || !render.finalUrl) {
      throw new Error(`Creatomate render ${jobId} is not ready for download.`);
    }

    const finalUrl = new URL(render.finalUrl);
    if (finalUrl.protocol !== 'https:') {
      throw new Error('Creatomate returned an unsupported video URL.');
    }

    const response = await fetch(finalUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(
        `Unable to download the Creatomate render (HTTP ${response.status}).`,
      );
    }

    const contentType = response.headers
      .get('content-type')
      ?.split(';')[0]
      ?.trim();
    if (
      contentType &&
      !contentType.startsWith('video/') &&
      contentType !== 'application/octet-stream'
    ) {
      throw new Error(
        `Creatomate returned an unexpected video content type: ${contentType}.`,
      );
    }

    if (!response.body) {
      throw new Error('Creatomate returned a video response without a body.');
    }
    return Readable.fromWeb(
      response.body as import('node:stream/web').ReadableStream<Uint8Array>,
    );
  }

  private createSource(
    request: VideoGenerationRequest,
  ): Record<string, unknown> {
    const imageUrls = request.sourceMediaUrls ?? [];
    if (
      imageUrls.length === 0 ||
      imageUrls.some((url) => new URL(url).protocol !== 'https:')
    ) {
      throw new VideoRenderRequestError(
        'Creatomate requires at least one publicly reachable HTTPS product image.',
      );
    }

    const clipDuration = 4;
    const duration = imageUrls.length * clipDuration;
    const script = request.script?.trim().slice(0, 240) ?? '';
    const elements = [
      ...imageUrls.map((url, index) => ({
        type: 'image',
        track: 1,
        time: index * clipDuration,
        duration: clipDuration,
        source: url,
        fit: 'cover',
      })),
      {
        type: 'text',
        track: 2,
        time: 0,
        duration,
        text: request.title,
        x: 54,
        y: 1450,
        width: 972,
        height: 190,
        font_family: 'Arial',
        font_size: 64,
        font_weight: 700,
        fill_color: '#FFFFFF',
        horizontal_alignment: 'center',
        vertical_alignment: 'middle',
      },
      ...(script
        ? [
            {
              type: 'text',
              track: 3,
              time: 0,
              duration,
              text: script,
              x: 80,
              y: 1640,
              width: 920,
              height: 200,
              font_family: 'Arial',
              font_size: 34,
              fill_color: '#FFFFFF',
              horizontal_alignment: 'center',
              vertical_alignment: 'middle',
            },
          ]
        : []),
    ];

    return {
      output_format: request.outputFormat ?? 'mp4',
      width: 1080,
      height: 1920,
      frame_rate: 30,
      elements,
    };
  }

  private async requestJson(path: string, init: RequestInit): Promise<unknown> {
    const apiKey = this.configService.get<string>('CREATOMATE_API_KEY');
    if (!apiKey) {
      throw new VideoRenderRequestError('CREATOMATE_API_KEY is not configured.');
    }

    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${apiKey}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const message = `Creatomate API request failed (HTTP ${response.status}).`;
      if (response.status >= 400 && response.status < 500 && response.status !== 408) {
        throw new VideoRenderRequestError(message, response.status === 429);
      }
      throw new Error(message);
    }

    try {
      return await response.json();
    } catch {
      throw new Error('Creatomate API returned an invalid JSON response.');
    }
  }

  private firstRender(
    response: unknown,
    fallbackId?: string,
  ): CreatomateRender {
    const value = Array.isArray(response) ? response[0] : response;
    if (!value || typeof value !== 'object') {
      throw new Error('Creatomate API returned an invalid render response.');
    }
    const render = value as CreatomateRender;
    return fallbackId && typeof render.id !== 'string'
      ? { ...render, id: fallbackId }
      : render;
  }

  private mapRender(render: CreatomateRender): VideoGenerationResult {
    if (typeof render.id !== 'string' || typeof render.status !== 'string') {
      throw new Error(
        'Creatomate API returned a render without an ID or status.',
      );
    }

    const status = render.status.toLowerCase();
    const common = {
      renderJobId: render.id,
      metadata: { provider: 'creatomate', providerStatus: render.status },
    };
    if (status === 'succeeded' || status === 'completed') {
      if (typeof render.url !== 'string' || render.url.length === 0) {
        throw new Error(
          'Creatomate completed the render without returning a video URL.',
        );
      }
      return { ...common, status: 'READY', finalUrl: render.url };
    }
    if (status === 'failed') {
      return {
        ...common,
        status: 'FAILED',
        errorMessage:
          typeof render.error_message === 'string'
            ? render.error_message
            : 'Creatomate render failed.',
      };
    }
    if (['planned', 'waiting', 'queued', 'pending'].includes(status)) {
      return { ...common, status: 'QUEUED' };
    }
    if (['transcribing', 'rendering', 'processing'].includes(status)) {
      return { ...common, status: 'RENDERING' };
    }

    throw new Error(
      `Creatomate returned an unsupported render status: ${render.status}.`,
    );
  }
}
