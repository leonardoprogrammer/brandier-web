import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Convite, ConviteRecebido, VinculoPromotor } from '../models/promotor.model';

@Injectable({ providedIn: 'root' })
export class ConviteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

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

  private urlDaMarca(marcaId: string): string {
    return `${this.baseUrl}/marcas/${encodeURIComponent(marcaId)}/convites`;
  }
}
