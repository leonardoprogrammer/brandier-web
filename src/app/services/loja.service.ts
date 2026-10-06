import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { DadosLoja, Loja, LojasDaMarca } from '../models/loja.model';

@Injectable({ providedIn: 'root' })
export class LojaService {
  private readonly http = inject(HttpClient);

  listar(marcaId: string): Observable<LojasDaMarca> {
    return this.http.get<LojasDaMarca>(this.url(marcaId));
  }

  buscar(marcaId: string, id: string): Observable<Loja> {
    return this.http.get<Loja>(`${this.url(marcaId)}/${encodeURIComponent(id)}`);
  }

  criar(marcaId: string, dados: DadosLoja): Observable<Loja> {
    return this.http.post<Loja>(this.url(marcaId), dados);
  }

  atualizar(marcaId: string, id: string, dados: DadosLoja): Observable<Loja> {
    return this.http.put<Loja>(`${this.url(marcaId)}/${encodeURIComponent(id)}`, dados);
  }

  excluir(marcaId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.url(marcaId)}/${encodeURIComponent(id)}`);
  }

  private url(marcaId: string): string {
    return `${environment.apiUrl}/marcas/${encodeURIComponent(marcaId)}/lojas`;
  }
}
