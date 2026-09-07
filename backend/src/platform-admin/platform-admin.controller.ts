import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PlatformAdminLoginDto } from './dto/platform-admin-login.dto';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';

@Controller('platform-admin')
export class PlatformAdminController {
  constructor(private platformAdminService: PlatformAdminService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: PlatformAdminLoginDto) {
    return this.platformAdminService.login(dto);
  }

  // @Public() aquí neutraliza el guard global de tenants (que rechazaría
  // este token por no tener tenantId); PlatformAdminGuard es la protección
  // real de estas rutas.
  @Public()
  @UseGuards(PlatformAdminGuard)
  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.platformAdminService.createTenant(dto);
  }

  @Public()
  @UseGuards(PlatformAdminGuard)
  @Get('tenants')
  listTenants() {
    return this.platformAdminService.listTenants();
  }
}
