import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles('owner', 'admin')
  @Post()
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(currentUser.tenantId, dto);
  }

  @Roles('owner', 'admin')
  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.findAll(currentUser.tenantId);
  }
}
