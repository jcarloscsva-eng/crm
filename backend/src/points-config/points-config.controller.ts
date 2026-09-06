import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types';
import { UpdatePointsConfigDto } from './dto/update-points-config.dto';
import { PointsConfigService } from './points-config.service';

@Controller('points-config')
export class PointsConfigController {
  constructor(private pointsConfigService: PointsConfigService) {}

  @Get()
  findOne(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.pointsConfigService.findOne(currentUser.tenantId);
  }

  @Roles('owner', 'admin')
  @Patch()
  update(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: UpdatePointsConfigDto) {
    return this.pointsConfigService.update(currentUser.tenantId, dto);
  }
}
