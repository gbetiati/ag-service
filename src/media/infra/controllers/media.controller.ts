import { Body, Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { UploadedMediaFile } from '../../application/upload-media-asset.use-case.js';
import { UploadMediaAssetUseCase } from '../../application/upload-media-asset.use-case.js';
import { CreateMediaAssetDto } from '../dto/create-media-asset.dto.js';

@Controller('companies/:companyId')
export class MediaController {
  constructor(private readonly uploadMediaAssetUseCase: UploadMediaAssetUseCase) {}

  @Post('products/:productId/media')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('companyId') companyId: string,
    @Param('productId') productId: string,
    @UploadedFile() file: UploadedMediaFile,
    @Body() body: CreateMediaAssetDto,
  ) {
    return this.uploadMediaAssetUseCase.execute({
      companyId,
      productId,
      file,
      kind: body.kind,
    });
  }
}
