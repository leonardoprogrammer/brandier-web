import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { MensagemResposta, NovoCadastro, Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuario`;
  private readonly usuarioAtual = signal<Usuario | null>(null);
  private renovacaoEmAndamento$: Observable<void> | null = null;

  readonly usuario = this.usuarioAtual.asReadonly();
  readonly autenticado = computed(() => this.usuarioAtual() !== null);

  carregarSessao(): Observable<Usuario | null> {
    return this.http.get<Usuario>(`${this.baseUrl}/eu`).pipe(
      tap((usuario) => this.usuarioAtual.set(usuario)),
      catchError(() => {
        this.usuarioAtual.set(null);
        return of(null);
      }),
    );
  }

  entrar(email: string, senha: string): Observable<Usuario> {
    return this.http
      .post<Usuario>(`${this.baseUrl}/login`, { email, senha })
      .pipe(tap((usuario) => this.usuarioAtual.set(usuario)));
  }

  cadastrar(dados: NovoCadastro): Observable<MensagemResposta> {
    return this.http.post<MensagemResposta>(this.baseUrl, dados);
  }

  verificarEmail(token: string): Observable<MensagemResposta> {
    return this.http.post<MensagemResposta>(`${this.baseUrl}/verificar-email`, { token });
  }

  reenviarVerificacao(email: string): Observable<MensagemResposta> {
    return this.http.post<MensagemResposta>(`${this.baseUrl}/reenviar-verificacao`, { email });
  }

  solicitarRedefinicaoSenha(email: string): Observable<MensagemResposta> {
    return this.http.post<MensagemResposta>(`${this.baseUrl}/esqueci-senha`, { email });
  }

  redefinirSenha(token: string, senha: string): Observable<MensagemResposta> {
    return this.http
      .post<MensagemResposta>(`${this.baseUrl}/redefinir-senha`, { token, senha })
      .pipe(tap(() => this.usuarioAtual.set(null)));
  }

  sair(): Observable<MensagemResposta> {
    return this.http
      .post<MensagemResposta>(`${this.baseUrl}/logout`, null)
      .pipe(finalize(() => this.usuarioAtual.set(null)));
  }

  renovarSessao(): Observable<void> {
    if (this.renovacaoEmAndamento$ === null) {
      this.renovacaoEmAndamento$ = this.http.post<void>(`${this.baseUrl}/refresh-token`, null).pipe(
        map(() => undefined),
        finalize(() => (this.renovacaoEmAndamento$ = null)),
        shareReplay(1),
      );
    }
    return this.renovacaoEmAndamento$;
  }

  encerrarSessaoLocal(): void {
    this.usuarioAtual.set(null);
  }
}
