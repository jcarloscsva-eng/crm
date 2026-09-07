import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types';
import { ReportsService } from './reports.service';

@Roles('owner', 'admin')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('customers')
  customers(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.reportsService.customers(currentUser.tenantId);
  }

  @Get('products')
  products(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.reportsService.products(currentUser.tenantId);
  }
}
