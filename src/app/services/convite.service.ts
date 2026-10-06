import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { Convite, ConviteRecebido, ConvitesRecebidos, VinculoPromotor } from '../models/promotor.model';

@Injectable({ providedIn: 'root' })
export class ConviteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly pendentes = signal(0);

  readonly totalPendentes = this.pendentes.asReadonly();

  convidar(marcaId: string, email: string): Observable<Convite> {
    return this.http.post<Convite>(this.urlDaMarca(marcaId), { email });
  }

  cancelar(marcaId: string, conviteId: string): Observable<void> {
    return this.http.delete<void>(`${this.urlDaMarca(marcaId)}/${encodeURIComponent(conviteId)}`);
  }

  consultar(token: string): Observable<ConviteRecebido> {
    return this.http.post<ConviteRecebido>(`${this.baseUrl}/convites/consultar`, { token });
  }

  aceitar(token: string): Observable<VinculoPromotor> {
    return this.http.post<VinculoPromotor>(`${this.baseUrl}/convites/aceitar`, { token });
  }

  recusar(token: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/convites/recusar`, { token });
  }

  recebidos(): Observable<ConvitesRecebidos> {
    return this.http
      .get<ConvitesRecebidos>(`${this.baseUrl}/convites/recebidos`)
      .pipe(tap((resposta) => this.pendentes.set(resposta.convites.length)));
  }

  aceitarPorId(conviteId: string): Observable<VinculoPromotor> {
    return this.http
      .post<VinculoPromotor>(`${this.baseUrl}/convites/${encodeURIComponent(conviteId)}/aceitar`, null)
      .pipe(tap(() => this.descontarPendente()));
  }

  recusarPorId(conviteId: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/convites/${encodeURIComponent(conviteId)}/recusar`, null)
      .pipe(tap(() => this.descontarPendente()));
  }

  private descontarPendente(): void {
    this.pendentes.update((total) => Math.max(0, total - 1));
  }

  private urlDaMarca(marcaId: string): string {
    return `${this.baseUrl}/marcas/${encodeURIComponent(marcaId)}/convites`;
  }
}
