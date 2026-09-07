import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminJwtStrategy } from './platform-admin-jwt.strategy';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [PassportModule, ConfigModule, JwtModule.register({})],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PlatformAdminJwtStrategy],
})
export class PlatformAdminModule {}
