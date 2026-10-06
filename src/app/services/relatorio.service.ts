import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { FiltroDoRelatorio, Relatorio } from '../models/reposicao.model';

export const MAXIMO_DE_REPOSICOES_NO_CSV = 5000;

@Injectable({ providedIn: 'root' })
export class RelatorioService {
  private readonly http = inject(HttpClient);

  consultar(marcaId: string, filtro: FiltroDoRelatorio, pagina: number, tamanho: number): Observable<Relatorio> {
    const parametros = this.parametros(filtro).set('pagina', pagina).set('tamanho', tamanho);
    return this.http.get<Relatorio>(this.url(marcaId), { params: parametros });
  }

  urlDoCsv(marcaId: string, filtro: FiltroDoRelatorio): string {
    return `${this.url(marcaId)}/csv?${this.parametros(filtro).toString()}`;
  }

  private url(marcaId: string): string {
    return `${environment.apiUrl}/marcas/${encodeURIComponent(marcaId)}/relatorios/reposicoes`;
  }

  private parametros(filtro: FiltroDoRelatorio): HttpParams {
    let parametros = new HttpParams().set('ordenar', filtro.ordenar).set('direcao', filtro.direcao);
    if (filtro.lojaId) {
      parametros = parametros.set('lojaId', filtro.lojaId);
    }
    if (filtro.autorId) {
      parametros = parametros.set('autorId', filtro.autorId);
    }
    if (filtro.produtoId) {
      parametros = parametros.set('produtoId', filtro.produtoId);
    }
    if (filtro.de) {
      parametros = parametros.set('de', filtro.de);
    }
    if (filtro.ate) {
      parametros = parametros.set('ate', filtro.ate);
    }
    return parametros;
  }
}
