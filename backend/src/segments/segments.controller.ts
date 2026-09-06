import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types';
import { SegmentsService } from './segments.service';

@Roles('owner', 'admin')
@Controller('segments')
export class SegmentsController {
  constructor(private segmentsService: SegmentsService) {}

  @Get()
  compute(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.segmentsService.compute(currentUser.tenantId);
  }
}
