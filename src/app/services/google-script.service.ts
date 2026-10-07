import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

export interface CredencialDoGoogle {
  credential: string;
}

export interface OpcoesDeInicializacaoDoGoogle {
  client_id: string;
  callback: (resposta: CredencialDoGoogle) => void;
}

export interface OpcoesDoBotaoDoGoogle {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: string;
  locale?: string;
}

export interface ApiDoGoogle {
  accounts: {
    id: {
      initialize(opcoes: OpcoesDeInicializacaoDoGoogle): void;
      renderButton(elemento: HTMLElement, opcoes: OpcoesDoBotaoDoGoogle): void;
    };
  };
}

declare global {
  interface Window {
    google?: ApiDoGoogle;
  }
}

export const URL_DO_SCRIPT_DO_GOOGLE = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class GoogleScriptService {
  private readonly documento = inject(DOCUMENT);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private carregamento: Promise<ApiDoGoogle> | null = null;

  carregar(): Promise<ApiDoGoogle> {
    if (!this.navegador) {
      return Promise.reject(new Error('O login com Google só funciona no navegador.'));
    }
    const janela = this.documento.defaultView as Window;
    if (janela.google) {
      return Promise.resolve(janela.google);
    }
    if (this.carregamento) {
      return this.carregamento;
    }

    this.carregamento = new Promise<ApiDoGoogle>((resolver, rejeitar) => {
      const script = this.documento.createElement('script');
      script.src = URL_DO_SCRIPT_DO_GOOGLE;
      script.async = true;
      script.defer = true;
      script.onload = () => (janela.google ? resolver(janela.google) : rejeitar(new Error('Google indisponível.')));
      script.onerror = () => {
        this.carregamento = null;
        script.remove();
        rejeitar(new Error('Não foi possível carregar o login com Google.'));
      };
      this.documento.head.appendChild(script);
    });
    return this.carregamento;
  }
}
