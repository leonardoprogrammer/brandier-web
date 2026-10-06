import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { DadosReposicao, Pagina, Reposicao } from '../models/reposicao.model';

@Injectable({ providedIn: 'root' })
export class ReposicaoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listarMinhas(pagina: number, tamanho: number): Observable<Pagina<Reposicao>> {
    return this.http.get<Pagina<Reposicao>>(`${this.baseUrl}/reposicoes`, { params: this.paginacao(pagina, tamanho) });
  }

  listarDaMarca(marcaId: string, pagina: number, tamanho: number): Observable<Pagina<Reposicao>> {
    return this.http.get<Pagina<Reposicao>>(this.urlDaMarca(marcaId), { params: this.paginacao(pagina, tamanho) });
  }

  buscar(marcaId: string, id: string): Observable<Reposicao> {
    return this.http.get<Reposicao>(`${this.urlDaMarca(marcaId)}/${encodeURIComponent(id)}`);
  }

  criar(marcaId: string, dados: DadosReposicao): Observable<Reposicao> {
    return this.http.post<Reposicao>(this.urlDaMarca(marcaId), dados);
  }

  atualizar(marcaId: string, id: string, dados: DadosReposicao): Observable<Reposicao> {
    return this.http.put<Reposicao>(`${this.urlDaMarca(marcaId)}/${encodeURIComponent(id)}`, dados);
  }

  excluir(marcaId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.urlDaMarca(marcaId)}/${encodeURIComponent(id)}`);
  }

  private urlDaMarca(marcaId: string): string {
    return `${this.baseUrl}/marcas/${encodeURIComponent(marcaId)}/reposicoes`;
  }

  private paginacao(pagina: number, tamanho: number): HttpParams {
    return new HttpParams().set('pagina', pagina).set('tamanho', tamanho);
  }
}
