import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

const ROTAS_SEM_RENOVACAO = [
  '/usuario/login',
  '/usuario/refresh-token',
  '/usuario/logout',
  '/usuario',
  '/usuario/verificar-email',
  '/usuario/reenviar-verificacao',
];

function ehRotaSemRenovacao(url: string): boolean {
  const caminho = url.split('?')[0];
  return ROTAS_SEM_RENOVACAO.some((rota) => caminho.endsWith(rota));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((erro: unknown) => {
      if (!(erro instanceof HttpErrorResponse) || erro.status !== 401 || ehRotaSemRenovacao(req.url)) {
        return throwError(() => erro);
      }

      const estavaAutenticado = auth.autenticado();
      return auth.renovarSessao().pipe(
        switchMap(() => next(req)),
        catchError((erroRenovacao: unknown) => {
          auth.encerrarSessaoLocal();
          if (estavaAutenticado) {
            void router.navigate(['/entrar'], { queryParams: { sessaoExpirada: true } });
          }
          return throwError(() => erroRenovacao);
        }),
      );
    }),
  );
};
