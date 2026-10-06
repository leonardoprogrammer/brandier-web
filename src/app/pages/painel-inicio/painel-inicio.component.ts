import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MinhasMarcas } from '../../models/marca.model';
import { AuthService } from '../../services/auth.service';
import { MarcaService } from '../../services/marca.service';

@Component({
  selector: 'app-painel-inicio',
  imports: [RouterLink],
  templateUrl: './painel-inicio.component.html',
})
export class PainelInicioComponent implements OnInit {
  private readonly marcaService = inject(MarcaService);

  protected readonly usuario = inject(AuthService).usuario;
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly resumo = signal<MinhasMarcas | null>(null);

  ngOnInit(): void {
    this.marcaService.listar().subscribe({
      next: (resumo) => {
        this.resumo.set(resumo);
        this.carregando.set(false);
      },
      error: () => {
        this.falhou.set(true);
        this.carregando.set(false);
      },
    });
  }
}
