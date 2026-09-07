import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PlatformAdminGuard extends AuthGuard('platform-admin-jwt') {}
