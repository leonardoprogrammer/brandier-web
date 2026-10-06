import { InjectionToken } from '@angular/core';

import { environment } from '../../environments/environment';

export const CHAVE_DO_TURNSTILE = new InjectionToken<string>('CHAVE_DO_TURNSTILE', {
  providedIn: 'root',
  factory: () => environment.turnstileSiteKey,
});
