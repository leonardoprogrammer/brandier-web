import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { DadosProduto, Produto, ProdutosDaMarca } from '../models/produto.model';

@Injectable({ providedIn: 'root' })
export class ProdutoService {
  private readonly http = inject(HttpClient);

  listar(marcaId: string): Observable<ProdutosDaMarca> {
    return this.http.get<ProdutosDaMarca>(this.url(marcaId));
  }

  buscar(marcaId: string, id: string): Observable<Produto> {
    return this.http.get<Produto>(`${this.url(marcaId)}/${encodeURIComponent(id)}`);
  }

  criar(marcaId: string, dados: DadosProduto): Observable<Produto> {
    return this.http.post<Produto>(this.url(marcaId), dados);
  }

  atualizar(marcaId: string, id: string, dados: DadosProduto): Observable<Produto> {
    return this.http.put<Produto>(`${this.url(marcaId)}/${encodeURIComponent(id)}`, dados);
  }

  excluir(marcaId: string, id: string): Observable<Produto | null> {
    return this.http.delete<Produto | null>(`${this.url(marcaId)}/${encodeURIComponent(id)}`);
  }

  private url(marcaId: string): string {
    return `${environment.apiUrl}/marcas/${encodeURIComponent(marcaId)}/produtos`;
  }
}
