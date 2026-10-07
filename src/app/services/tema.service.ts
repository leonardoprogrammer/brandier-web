import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type Tema = 'claro' | 'escuro' | 'sistema';

const CHAVE_ARMAZENAMENTO = 'brandier-tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly consultaSistema = this.navegador ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  private readonly temaEscolhido = signal<Tema>(this.lerArmazenado());
  readonly tema = this.temaEscolhido.asReadonly();

  constructor() {
    if (!this.navegador) {
      return;
    }
    this.aplicar();
    this.consultaSistema?.addEventListener('change', () => {
      if (this.temaEscolhido() === 'sistema') {
        this.aplicar();
      }
    });
  }

  definir(tema: Tema): void {
    this.temaEscolhido.set(tema);
    if (!this.navegador) {
      return;
    }
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, tema);
    } catch {
      // navegação privada ou armazenamento bloqueado: o tema vale só para esta sessão
    }
    this.aplicar();
  }

  private lerArmazenado(): Tema {
    if (!this.navegador) {
      return 'sistema';
    }
    try {
      const valor = localStorage.getItem(CHAVE_ARMAZENAMENTO);
      return valor === 'claro' || valor === 'escuro' || valor === 'sistema' ? valor : 'sistema';
    } catch {
      return 'sistema';
    }
  }

  private aplicar(): void {
    const tema = this.temaEscolhido();
    const escuro = tema === 'escuro' || (tema === 'sistema' && (this.consultaSistema?.matches ?? false));
    document.documentElement.classList.toggle('dark', escuro);
  }
}
