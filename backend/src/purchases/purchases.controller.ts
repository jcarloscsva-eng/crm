import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';

@Controller('customers/:customerId/purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('customerId') customerId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(currentUser.tenantId, currentUser.userId, customerId, dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Param('customerId') customerId: string) {
    return this.purchasesService.findAllForCustomer(currentUser.tenantId, customerId);
  }
}
