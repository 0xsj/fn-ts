import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import { IAuth, ISession, IToken } from '../interface/auth.interface';
import { AsyncResult, NotFoundError, ResponseBuilder, ValidationError } from '../../shared/response';
import { Session } from '../entities';
import { validators } from '../../shared/utils';

@injectable()
export class AuthService {
  constructor(
    @inject(TOKENS.AuthRepository) private authRepo: IAuth,
    @inject(TOKENS.AuthRepository) private sessionRepo: ISession,
    @inject(TOKENS.AuthRepository) private tokenRepo: IToken,
  ) {}

   async getSession(sessionId: string): AsyncResult<Session> {
    if (!validators.isValidUUID(sessionId)) {
      return new ValidationError(
        { sessionId: ['Invalid session ID format'] },
        undefined 
      );
    }

    const result = await this.sessionRepo.findSessionById(sessionId);
    if (!result.success) {
      return result;
    }

    const session = result.body().data;
    if (!session) {
      return new NotFoundError('Session not found');
    }

    // Business validation errors
    if (this.isSessionExpired(session)) {
      return new ValidationError(
        { session: ['Session has expired'] }
      );
    }

    if (!session.isActive) {
      return new ValidationError(
        { session: ['Session has been revoked'] }
      );
    }

    return ResponseBuilder.ok(session);
  }

  private isSessionExpired(session: Session): boolean {
    return session.expiresAt < new Date();
  }
}
