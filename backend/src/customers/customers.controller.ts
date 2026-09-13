import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(currentUser.tenantId, currentUser.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query('q') q?: string) {
    return this.customersService.findAll(currentUser.tenantId, q);
  }

  // Debe declararse antes de ':id': si no, Nest la trataría como
  // GET /customers/:id con id="deleted".
  @Roles('owner', 'admin')
  @Get('deleted')
  findAllDeleted(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.customersService.findAllDeleted(currentUser.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.customersService.findOne(currentUser.tenantId, id);
  }

  @Roles('owner', 'admin')
  @Get(':id/export')
  exportData(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.customersService.exportData(currentUser.tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(currentUser.tenantId, currentUser.userId, id, dto);
  }

  @Roles('owner', 'admin')
  @Delete(':id')
  remove(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.customersService.softDelete(currentUser.tenantId, currentUser.userId, id);
  }

  @Roles('owner', 'admin')
  @Delete(':id/purge')
  purge(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.customersService.purge(currentUser.tenantId, currentUser.userId, id);
  }
}
