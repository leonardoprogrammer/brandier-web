import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { Loja } from '../../models/loja.model';
import { LojaService } from '../../services/loja.service';
import { MarcaService } from '../../services/marca.service';

@Component({
  selector: 'app-lojas',
  imports: [RouterLink],
  templateUrl: './lojas.component.html',
})
export class LojasComponent implements OnInit {
  private readonly lojaService = inject(LojaService);
  private readonly marcaService = inject(MarcaService);

  protected readonly marcaId = inject(ActivatedRoute).snapshot.paramMap.get('marcaId') ?? '';

  protected readonly marcaNome = signal('');
  protected readonly lojas = signal<Loja[]>([]);
  protected readonly limite = signal(0);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly naoEncontrada = signal(false);
  protected readonly confirmandoExclusao = signal<string | null>(null);
  protected readonly excluindo = signal<string | null>(null);
  protected readonly erroExclusao = signal<string | null>(null);

  protected readonly atingiuLimite = computed(() => this.lojas().length >= this.limite());

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.naoEncontrada.set(false);
    forkJoin({ marca: this.marcaService.buscar(this.marcaId), resumo: this.lojaService.listar(this.marcaId) })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ marca, resumo }) => {
          this.marcaNome.set(marca.nome);
          this.lojas.set(resumo.lojas);
          this.limite.set(resumo.limite);
        },
        error: (erro: unknown) => {
          if (extrairProblema(erro).status === 404) {
            this.naoEncontrada.set(true);
          } else {
            this.falhou.set(true);
          }
        },
      });
  }

  protected pedirConfirmacao(id: string): void {
    this.erroExclusao.set(null);
    this.confirmandoExclusao.set(id);
  }

  protected cancelarExclusao(): void {
    this.confirmandoExclusao.set(null);
  }

  protected excluir(loja: Loja): void {
    this.excluindo.set(loja.id);
    this.erroExclusao.set(null);
    this.lojaService
      .excluir(this.marcaId, loja.id)
      .pipe(finalize(() => this.excluindo.set(null)))
      .subscribe({
        next: () => {
          this.lojas.update((lista) => lista.filter((item) => item.id !== loja.id));
          this.confirmandoExclusao.set(null);
        },
        error: (erro: unknown) => this.erroExclusao.set(mensagemDeErro(extrairProblema(erro))),
      });
  }
}
