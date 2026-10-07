import { Component, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';

import { Tema, TemaService } from '../../services/tema.service';

const ROTULOS: Record<Tema, string> = {
  sistema: 'Sistema',
  claro: 'Claro',
  escuro: 'Escuro',
};

@Component({
  selector: 'app-tema-toggle',
  templateUrl: './tema-toggle.component.html',
})
export class TemaToggleComponent {
  private readonly temaService = inject(TemaService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly abrirAEsquerdaNoMobile = input(false);

  protected readonly tema = this.temaService.tema;
  protected readonly aberto = signal(false);
  protected readonly rotulo = computed(() => ROTULOS[this.tema()]);
  protected readonly classesDoPainel = computed(() =>
    this.abrirAEsquerdaNoMobile() ? 'right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2' : 'left-1/2 -translate-x-1/2',
  );

  protected alternar(): void {
    const abrindo = !this.aberto();
    this.aberto.set(abrindo);
    if (abrindo) {
      setTimeout(() => this.itensDoMenu()[0]?.focus());
    }
  }

  protected escolher(tema: Tema): void {
    this.temaService.definir(tema);
    this.aberto.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected fecharAoClicarFora(evento: MouseEvent): void {
    if (!this.aberto() || this.elemento.nativeElement.contains(evento.target as Node)) {
      return;
    }
    this.aberto.set(false);
  }

  @HostListener('document:keydown.escape')
  protected fecharComEscape(): void {
    if (!this.aberto()) {
      return;
    }
    this.aberto.set(false);
    this.elemento.nativeElement.querySelector<HTMLElement>('button')?.focus();
  }

  protected aoTeclarNoMenu(evento: KeyboardEvent): void {
    const itens = this.itensDoMenu();
    const posicao = itens.indexOf(document.activeElement as HTMLElement);

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowRight') {
      evento.preventDefault();
      itens[(posicao + 1 + itens.length) % itens.length]?.focus();
    } else if (evento.key === 'ArrowUp' || evento.key === 'ArrowLeft') {
      evento.preventDefault();
      itens[(posicao - 1 + itens.length) % itens.length]?.focus();
    } else if (evento.key === 'Tab') {
      this.aberto.set(false);
    }
  }

  private itensDoMenu(): HTMLElement[] {
    return Array.from(this.elemento.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  }
}
