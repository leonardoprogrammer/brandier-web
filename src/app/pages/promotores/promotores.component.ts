import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize, forkJoin } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { Convite, PromotoresDaMarca, StatusConvite } from '../../models/promotor.model';
import { ConviteService } from '../../services/convite.service';
import { MarcaService } from '../../services/marca.service';
import { PromotorService } from '../../services/promotor.service';

const ROTULOS_STATUS: Record<StatusConvite, string> = {
  PENDENTE: 'Pendente',
  ACEITO: 'Aceito',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
};

@Component({
  selector: 'app-promotores',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './promotores.component.html',
})
export class PromotoresComponent implements OnInit {
  private readonly promotorService = inject(PromotorService);
  private readonly conviteService = inject(ConviteService);
  private readonly marcaService = inject(MarcaService);

  protected readonly marcaId = inject(ActivatedRoute).snapshot.paramMap.get('marcaId') ?? '';

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email, Validators.maxLength(254)],
  });

  protected readonly marcaNome = signal('');
  protected readonly dados = signal<PromotoresDaMarca | null>(null);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly naoEncontrada = signal(false);
  protected readonly convidando = signal(false);
  protected readonly erroConvite = signal<string | null>(null);
  protected readonly conviteEnviadoPara = signal<string | null>(null);
  protected readonly confirmando = signal<string | null>(null);
  protected readonly processando = signal<string | null>(null);
  protected readonly erroAcao = signal<string | null>(null);

  protected readonly atingiuLimite = computed(() => {
    const atual = this.dados();
    return atual !== null && atual.usadas >= atual.limite;
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.naoEncontrada.set(false);
    forkJoin({ marca: this.marcaService.buscar(this.marcaId), resumo: this.promotorService.listar(this.marcaId) })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ marca, resumo }) => {
          this.marcaNome.set(marca.nome);
          this.dados.set(resumo);
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

  protected convidar(evento: Event): void {
    evento.preventDefault();
    this.conviteEnviadoPara.set(null);
    this.erroConvite.set(null);
    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }

    const destino = this.email.value.trim();
    this.convidando.set(true);
    this.conviteService
      .convidar(this.marcaId, destino)
      .pipe(finalize(() => this.convidando.set(false)))
      .subscribe({
        next: () => {
          this.conviteEnviadoPara.set(destino);
          this.email.reset('');
          this.recarregarLista();
        },
        error: (erro: unknown) => this.tratarErroConvite(erro),
      });
  }

  protected pedirConfirmacao(id: string): void {
    this.erroAcao.set(null);
    this.confirmando.set(id);
  }

  protected cancelarConfirmacao(): void {
    this.confirmando.set(null);
  }

  protected removerPromotor(id: string): void {
    this.executar(id, this.promotorService.remover(this.marcaId, id));
  }

  protected removerConvite(id: string): void {
    this.executar(id, this.conviteService.cancelar(this.marcaId, id));
  }

  protected rotuloDoStatus(status: StatusConvite): string {
    return ROTULOS_STATUS[status];
  }

  protected podeCancelar(convite: Convite): boolean {
    return convite.status === 'PENDENTE';
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  protected mensagemDoEmail(): string | null {
    const servidor = this.email.getError('servidor') as string | null;
    if (servidor) {
      return servidor;
    }
    if (!this.email.touched || this.email.valid) {
      return null;
    }
    return this.email.hasError('required') ? 'Informe o e-mail da pessoa.' : 'Informe um e-mail válido.';
  }

  private executar(id: string, requisicao: Observable<void>): void {
    this.processando.set(id);
    this.erroAcao.set(null);
    requisicao.pipe(finalize(() => this.processando.set(null))).subscribe({
      next: () => {
        this.confirmando.set(null);
        this.recarregarLista();
      },
      error: (erro: unknown) => this.erroAcao.set(mensagemDeErro(extrairProblema(erro))),
    });
  }

  private recarregarLista(): void {
    this.promotorService.listar(this.marcaId).subscribe({
      next: (resumo) => this.dados.set(resumo),
      error: () => this.falhou.set(true),
    });
  }

  private tratarErroConvite(erro: unknown): void {
    const problema = extrairProblema(erro);

    if (problema.codigo === 'VALIDACAO_INVALIDA' && problema.erros.length > 0) {
      this.email.setErrors({ servidor: problema.erros[0].mensagem });
      this.email.markAsTouched();
      return;
    }

    this.erroConvite.set(mensagemDeErro(problema));
  }
}
