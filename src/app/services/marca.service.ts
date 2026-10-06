import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { DadosMarca, Marca, MinhasMarcas } from '../models/marca.model';

@Injectable({ providedIn: 'root' })
export class MarcaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/marcas`;

  listar(): Observable<MinhasMarcas> {
    return this.http.get<MinhasMarcas>(this.baseUrl);
  }

  buscar(id: string): Observable<Marca> {
    return this.http.get<Marca>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  criar(dados: DadosMarca): Observable<Marca> {
    return this.http.post<Marca>(this.baseUrl, dados);
  }

  atualizar(id: string, dados: DadosMarca): Observable<Marca> {
    return this.http.put<Marca>(`${this.baseUrl}/${encodeURIComponent(id)}`, dados);
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
