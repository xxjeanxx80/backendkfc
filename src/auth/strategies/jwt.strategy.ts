import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { jwtConstants } from '../constants';

interface JwtPayload {
  sub: number;
  username: string;
  role: string;
  storeId?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  validate(payload: JwtPayload) {
    if (!payload || !payload.sub || !payload.role) {
      return null;
    }
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      storeId: payload.storeId,
    };
  }
}
