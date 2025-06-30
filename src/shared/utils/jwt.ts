// src/shared/utils/jwt.ts
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../core/config';
import { AccessTokenPayload, RefreshTokenPayload } from '../../domain/entities';

export const jwtUtils = {
  generateAccessToken(payload: AccessTokenPayload): string {
    const secret = config.app.security.jwtSecret;
    const options: SignOptions = {
      expiresIn: '15m' as const,
    };

    return jwt.sign(payload, secret, options);
  },

  generateRefreshToken(payload: RefreshTokenPayload): string {
    const secret = config.app.security.jwtSecret;
    const options: SignOptions = {
      expiresIn: config.app.security.refreshTokenExpiresIn as any,
    };

    return jwt.sign(payload, secret, options);
  },

  verifyAccessToken(token: string): AccessTokenPayload {
    const secret = config.app.security.jwtSecret;
    return jwt.verify(token, secret) as AccessTokenPayload;
  },

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const secret = config.app.security.jwtSecret;
    return jwt.verify(token, secret) as RefreshTokenPayload;
  },

  generateTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },
};
