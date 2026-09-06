import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types';
import { CreateReturnDto } from './dto/create-return.dto';
import { ReturnsService } from './returns.service';

@Controller('customers/:customerId')
export class ReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @Post('purchases/:purchaseId/returns')
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('customerId') customerId: string,
    @Param('purchaseId') purchaseId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.create(currentUser.tenantId, currentUser.userId, customerId, purchaseId, dto);
  }

  @Get('returns')
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Param('customerId') customerId: string) {
    return this.returnsService.findAllForCustomer(currentUser.tenantId, customerId);
  }
}
