import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStageDto } from './dto/update-lead-stage.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(currentUser.tenantId, currentUser.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.leadsService.findAll(currentUser.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.leadsService.findOne(currentUser.tenantId, id);
  }

  @Patch(':id')
  update(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(currentUser.tenantId, id, dto);
  }

  @Patch(':id/stage')
  updateStage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStageDto,
  ) {
    return this.leadsService.updateStage(currentUser.tenantId, id, dto);
  }

  @Post(':id/convert-to-customer')
  convertToCustomer(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.leadsService.convertToCustomer(currentUser.tenantId, currentUser.userId, id);
  }

  @Roles('owner', 'admin')
  @Delete(':id')
  remove(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.leadsService.remove(currentUser.tenantId, id);
  }
}
