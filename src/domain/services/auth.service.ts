import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import { IAuth, ISession, IToken } from '../interface/auth.interface';
import { AsyncResult, NotFoundError, ResponseBuilder } from '../../shared/response';
import { Session } from '../entities';

@injectable()
export class AuthService {
  constructor(
    @inject(TOKENS.AuthRepository) private authRepo: IAuth,
    @inject(TOKENS.AuthRepository) private sessionRepo: ISession,
    @inject(TOKENS.AuthRepository) private tokenRepo: IToken,
  ) {}

  async getSession(sessionId: string): AsyncResult<Session> {
    const result = await this.sessionRepo.findSessionById(sessionId);

    if (!result.success) {
      return result;
    }

    const session = result.body().data;
    if (!session) {
      return new NotFoundError('Session not found');
    }

    return ResponseBuilder.ok(session);
  }
}
