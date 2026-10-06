import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PainelAutor, PainelGestor, PainelMarca, Periodo } from '../models/painel.model';

@Injectable({ providedIn: 'root' })
export class PainelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  gestor(periodo: Periodo): Observable<PainelGestor> {
    return this.http.get<PainelGestor>(`${this.baseUrl}/painel/gestor`, { params: this.parametros(periodo) });
  }

  minhasReposicoes(periodo: Periodo): Observable<PainelAutor> {
    return this.http.get<PainelAutor>(`${this.baseUrl}/painel/minhas-reposicoes`, { params: this.parametros(periodo) });
  }

  marca(marcaId: string, periodo: Periodo): Observable<PainelMarca> {
    return this.http.get<PainelMarca>(`${this.baseUrl}/marcas/${encodeURIComponent(marcaId)}/painel`, {
      params: this.parametros(periodo),
    });
  }

  private parametros(periodo: Periodo): HttpParams {
    return new HttpParams().set('de', periodo.de).set('ate', periodo.ate);
  }
}
