import { ContentScene } from './content-scene.entity.js';

export abstract class ContentSceneRepository {
  abstract create(scene: ContentScene): Promise<ContentScene>;
  abstract findByContent(contentId: string): Promise<ContentScene[]>;
}
