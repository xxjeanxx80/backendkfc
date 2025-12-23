import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const req = context
      .switchToHttp()
      .getRequest<{ 
        user?: { role?: string; userId?: number; username?: string }; 
        headers?: { authorization?: string };
        method?: string;
        url?: string;
      }>();
    const role = req.user?.role;
    
    if (!req.user) {
      throw new ForbiddenException('Forbidden resource');
    }
    
    if (!role) {
      throw new ForbiddenException('Forbidden resource');
    }
    
    const hasAccess = requiredRoles.some((r) => r === role);
    if (!hasAccess) {
      throw new ForbiddenException('Forbidden resource');
    }
    
    return hasAccess;
  }
}
