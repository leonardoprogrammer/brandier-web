import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

export interface OpcoesDoTurnstile {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
}

export interface ApiDoTurnstile {
  render(elemento: HTMLElement, opcoes: OpcoesDoTurnstile): string;
  reset(idDoWidget?: string): void;
  remove(idDoWidget?: string): void;
}

declare global {
  interface Window {
    turnstile?: ApiDoTurnstile;
  }
}

export const URL_DO_SCRIPT_DO_TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

@Injectable({ providedIn: 'root' })
export class TurnstileScriptService {
  private readonly documento = inject(DOCUMENT);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private carregamento: Promise<ApiDoTurnstile> | null = null;

  carregar(): Promise<ApiDoTurnstile> {
    if (!this.navegador) {
      return Promise.reject(new Error('O Turnstile só funciona no navegador.'));
    }
    const janela = this.documento.defaultView as Window;
    if (janela.turnstile) {
      return Promise.resolve(janela.turnstile);
    }
    if (this.carregamento) {
      return this.carregamento;
    }

    this.carregamento = new Promise<ApiDoTurnstile>((resolver, rejeitar) => {
      const script = this.documento.createElement('script');
      script.src = URL_DO_SCRIPT_DO_TURNSTILE;
      script.async = true;
      script.defer = true;
      script.onload = () => (janela.turnstile ? resolver(janela.turnstile) : rejeitar(new Error('Turnstile indisponível.')));
      script.onerror = () => {
        this.carregamento = null;
        script.remove();
        rejeitar(new Error('Não foi possível carregar o Turnstile.'));
      };
      this.documento.head.appendChild(script);
    });
    return this.carregamento;
  }
}
