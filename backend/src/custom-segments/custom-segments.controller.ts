import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types';
import { CustomSegmentsService } from './custom-segments.service';
import { PreviewSegmentDto } from './dto/preview-segment.dto';
import { SaveSegmentDto } from './dto/save-segment.dto';

@Roles('owner', 'admin')
@Controller('custom-segments')
export class CustomSegmentsController {
  constructor(private customSegmentsService: CustomSegmentsService) {}

  @Get('fields')
  fields() {
    return this.customSegmentsService.fields();
  }

  @HttpCode(200)
  @Post('preview')
  preview(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: PreviewSegmentDto) {
    return this.customSegmentsService.preview(currentUser.tenantId, dto);
  }

  @Post()
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: SaveSegmentDto) {
    return this.customSegmentsService.create(currentUser.tenantId, currentUser.userId, dto);
  }

  @Get()
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.customSegmentsService.list(currentUser.tenantId);
  }

  @Get(':id/results')
  getResults(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.customSegmentsService.getResults(currentUser.tenantId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.customSegmentsService.remove(currentUser.tenantId, id);
  }
}
