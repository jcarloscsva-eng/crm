import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { InteractionsService } from './interactions.service';

@Controller('customers/:customerId/interactions')
export class InteractionsController {
  constructor(private interactionsService: InteractionsService) {}

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('customerId') customerId: string,
    @Body() dto: CreateInteractionDto,
  ) {
    return this.interactionsService.create(currentUser.tenantId, currentUser.userId, customerId, dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Param('customerId') customerId: string) {
    return this.interactionsService.findAllForCustomer(currentUser.tenantId, customerId);
  }
}
