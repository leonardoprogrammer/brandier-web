import { Component, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
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
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly marcas = signal<Marca[]>([]);
  protected readonly limite = signal(0);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly confirmandoExclusao = signal<string | null>(null);
  protected readonly excluindo = signal<string | null>(null);
  protected readonly erroExclusao = signal<string | null>(null);
  protected readonly menuAberto = signal<string | null>(null);

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

  protected alternarMenu(id: string, evento: Event): void {
    evento.stopPropagation();
    const abrindo = this.menuAberto() !== id;
    this.menuAberto.set(abrindo ? id : null);
    if (abrindo) {
      setTimeout(() => this.itensDoMenu(id)[0]?.focus());
    }
  }

  @HostListener('document:click')
  protected fecharMenuAoClicarFora(): void {
    this.menuAberto.set(null);
  }

  @HostListener('document:keydown.escape')
  protected fecharMenuComEscape(): void {
    const id = this.menuAberto();
    if (id === null) {
      return;
    }
    this.menuAberto.set(null);
    this.elemento.nativeElement.querySelector<HTMLElement>(`#menu-botao-${CSS.escape(id)}`)?.focus();
  }

  protected aoTeclarNoMenu(evento: KeyboardEvent, id: string): void {
    const itens = this.itensDoMenu(id);
    const posicao = itens.indexOf(document.activeElement as HTMLElement);

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      const passo = evento.key === 'ArrowDown' ? 1 : -1;
      itens[(posicao + passo + itens.length) % itens.length]?.focus();
    } else if (evento.key === 'Home' || evento.key === 'End') {
      evento.preventDefault();
      itens[evento.key === 'Home' ? 0 : itens.length - 1]?.focus();
    } else if (evento.key === 'Tab') {
      this.menuAberto.set(null);
    }
  }

  private itensDoMenu(id: string): HTMLElement[] {
    const menu = this.elemento.nativeElement.querySelector(`#menu-${CSS.escape(id)}`);
    return menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
  }

  protected pedirConfirmacao(id: string): void {
    this.erroExclusao.set(null);
    this.menuAberto.set(null);
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
