import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ContentScene } from '../../domain/content-scene.entity.js';
import { ContentSceneRepository } from '../../domain/content-scene.repository.interface.js';

@Injectable()
export class PrismaContentSceneRepository implements ContentSceneRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(scene: ContentScene): Promise<ContentScene> {
    const created = await this.prisma.contentScene.create({
      data: {
        id: scene.id,
        contentId: scene.contentId,
        sceneIndex: scene.sceneIndex,
        heading: scene.heading,
        shotList: scene.shotList,
        visualNotes: scene.visualNotes,
        durationSeconds: scene.durationSeconds,
      },
    });

    return this.toEntity(created);
  }

  async findByContent(contentId: string): Promise<ContentScene[]> {
    const records = await this.prisma.contentScene.findMany({
      where: { contentId },
      orderBy: { sceneIndex: 'asc' },
    });

    return records.map(record => this.toEntity(record));
  }

  private toEntity(record: {
    id: string;
    contentId: string;
    sceneIndex: number;
    heading: string | null;
    shotList: string | null;
    visualNotes: string | null;
    durationSeconds: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContentScene {
    return new ContentScene(
      record.id,
      record.contentId,
      record.sceneIndex,
      record.heading,
      record.shotList,
      record.visualNotes,
      record.durationSeconds,
      record.createdAt,
      record.updatedAt,
    );
  }
}
