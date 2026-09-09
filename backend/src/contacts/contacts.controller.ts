import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types';
import { ContactsService } from './contacts.service';
import { ContactCategoryValue, CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Post()
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateContactDto) {
    return this.contactsService.create(currentUser.tenantId, currentUser.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query('category') category?: ContactCategoryValue) {
    return this.contactsService.findAll(currentUser.tenantId, category);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.findOne(currentUser.tenantId, id);
  }

  @Patch(':id')
  update(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(currentUser.tenantId, id, dto);
  }

  @Roles('owner', 'admin')
  @Delete(':id')
  remove(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.remove(currentUser.tenantId, id);
  }
}
