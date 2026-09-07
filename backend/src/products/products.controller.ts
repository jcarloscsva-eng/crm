import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/types';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Roles('owner', 'admin')
  @Post()
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(currentUser.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query('includeInactive') includeInactive?: string) {
    return this.productsService.findAll(currentUser.tenantId, includeInactive === 'true');
  }

  @Get('categories')
  categories(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.productsService.categories(currentUser.tenantId);
  }

  @Roles('owner', 'admin')
  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(currentUser.tenantId, id, dto);
  }
}
