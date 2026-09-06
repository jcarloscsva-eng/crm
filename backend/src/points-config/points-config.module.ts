import { Module } from '@nestjs/common';
import { PointsConfigController } from './points-config.controller';
import { PointsConfigService } from './points-config.service';

@Module({
  controllers: [PointsConfigController],
  providers: [PointsConfigService],
  exports: [PointsConfigService],
})
export class PointsConfigModule {}
