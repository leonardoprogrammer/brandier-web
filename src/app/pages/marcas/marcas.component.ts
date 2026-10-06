import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { Marca } from '../../models/marca.model';
import { MarcaService } from '../../services/marca.service';

@Component({
  selector: 'app-marcas',
  imports: [RouterLink],
  templateUrl: './marcas.component.html',
})
export class MarcasComponent implements OnInit {
  private readonly marcaService = inject(MarcaService);

  protected readonly marcas = signal<Marca[]>([]);
  protected readonly limite = signal(0);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly confirmandoExclusao = signal<string | null>(null);
  protected readonly excluindo = signal<string | null>(null);
  protected readonly erroExclusao = signal<string | null>(null);

  protected readonly atingiuLimite = computed(() => this.marcas().length >= this.limite());

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.marcaService
      .listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resumo) => {
          this.marcas.set(resumo.marcas);
          this.limite.set(resumo.limite);
        },
        error: () => this.falhou.set(true),
      });
  }

  protected pedirConfirmacao(id: string): void {
    this.erroExclusao.set(null);
    this.confirmandoExclusao.set(id);
  }

  protected cancelarExclusao(): void {
    this.confirmandoExclusao.set(null);
  }

  protected excluir(marca: Marca): void {
    this.excluindo.set(marca.id);
    this.erroExclusao.set(null);
    this.marcaService
      .excluir(marca.id)
      .pipe(finalize(() => this.excluindo.set(null)))
      .subscribe({
        next: () => {
          this.marcas.update((lista) => lista.filter((item) => item.id !== marca.id));
          this.confirmandoExclusao.set(null);
        },
        error: (erro: unknown) => this.erroExclusao.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }
}
