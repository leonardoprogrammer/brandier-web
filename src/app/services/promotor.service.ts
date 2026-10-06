import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { MeusVinculos, PromotoresDaMarca } from '../models/promotor.model';

@Injectable({ providedIn: 'root' })
export class PromotorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listar(marcaId: string): Observable<PromotoresDaMarca> {
    return this.http.get<PromotoresDaMarca>(this.urlDaMarca(marcaId));
  }

  remover(marcaId: string, promotorId: string): Observable<void> {
    return this.http.delete<void>(`${this.urlDaMarca(marcaId)}/${encodeURIComponent(promotorId)}`);
  }

  meusVinculos(): Observable<MeusVinculos> {
    return this.http.get<MeusVinculos>(`${this.baseUrl}/promotores/eu`);
  }

  sair(marcaId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/promotores/eu/${encodeURIComponent(marcaId)}`);
  }

  private urlDaMarca(marcaId: string): string {
    return `${this.baseUrl}/marcas/${encodeURIComponent(marcaId)}/promotores`;
  }
}
