import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CustomersModule } from './customers/customers.module';
import { CustomSegmentsModule } from './custom-segments/custom-segments.module';
import { InteractionsModule } from './interactions/interactions.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { PointsConfigModule } from './points-config/points-config.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ReportsModule } from './reports/reports.module';
import { ReturnsModule } from './returns/returns.module';
import { SegmentsModule } from './segments/segments.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    InteractionsModule,
    ProductsModule,
    PurchasesModule,
    ReturnsModule,
    PointsConfigModule,
    SegmentsModule,
    ReportsModule,
    PlatformAdminModule,
    CustomSegmentsModule,
  ],
  providers: [
    // Guards globales: por defecto TODA ruta exige JWT válido + rol autorizado.
    // Las rutas públicas (login de negocio, login/rutas de platform-admin)
    // se marcan con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
