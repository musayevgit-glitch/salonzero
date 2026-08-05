import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './types';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  serializeUser(user: AuthenticatedUser, done: (err: Error | null, id: string) => void) {
    done(null, user.id);
  }

  async deserializeUser(
    id: string,
    done: (err: Error | null, user: AuthenticatedUser | false) => void,
  ) {
    // Re-checked on every request, not cached in the session payload: a suspended account stops
    // working on its very next request, not just its next login (docs/security/authentication.md).
    const user = await this.authService.findAuthenticatedUserById(id);
    done(null, user ?? false);
  }
}
