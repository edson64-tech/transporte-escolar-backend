import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { StorageService } from './storage.service';
import type { StorageProvider } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly svc: StorageService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get('active')
  getActive() {
    return this.svc.getActiveConfig();
  }

  @Post()
  add(@Body() body: {
    provider: StorageProvider;
    cloud_name?: string;
    api_key?: string;
    api_secret?: string;
    bucket_name?: string;
    base_folder?: string;
  }) {
    return this.svc.addConfig(body);
  }

  @Put('active')
  setActive(@Body('provider') provider: StorageProvider) {
    return this.svc.setActive(provider);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<{
      cloud_name: string;
      api_key: string;
      api_secret: string;
      bucket_name: string;
      base_folder: string;
      is_active: boolean;
    }>,
  ) {
    return this.svc.update(id, body);
  }
}
