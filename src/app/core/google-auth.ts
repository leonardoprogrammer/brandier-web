import { InjectionToken } from '@angular/core';

import { environment } from '../../environments/environment';

export const CLIENT_ID_DO_GOOGLE = new InjectionToken<string>('CLIENT_ID_DO_GOOGLE', {
  providedIn: 'root',
  factory: () => environment.googleClientId,
});
