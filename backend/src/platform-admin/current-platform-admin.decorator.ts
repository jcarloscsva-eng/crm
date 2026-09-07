import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedPlatformAdmin } from './platform-admin-jwt.strategy';

export const CurrentPlatformAdmin = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedPlatformAdmin => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
