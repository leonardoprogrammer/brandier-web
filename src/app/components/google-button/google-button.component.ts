import { AfterViewInit, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';

import { GoogleScriptService } from '../../services/google-script.service';

@Component({
  selector: 'app-google-button',
  template: `
    <div #area></div>
    @if (falhou()) {
      <p class="campo-erro" role="alert" data-testid="google-erro">
        Não foi possível carregar o login com Google. Recarregue a página e tente de novo.
      </p>
    }
  `,
})
export class GoogleButtonComponent implements AfterViewInit {
  private readonly scriptService = inject(GoogleScriptService);
  private readonly area = viewChild.required<ElementRef<HTMLElement>>('area');

  readonly clientId = input.required<string>();
  readonly texto = input<'signin_with' | 'signup_with' | 'continue_with'>('signin_with');
  readonly credential = output<string>();

  protected readonly falhou = signal(false);

  private destruido = false;

  ngAfterViewInit(): void {
    this.scriptService
      .carregar()
      .then((api) => {
        if (this.destruido) {
          return;
        }
        api.accounts.id.initialize({
          client_id: this.clientId(),
          callback: (resposta) => this.credential.emit(resposta.credential),
        });
        api.accounts.id.renderButton(this.area().nativeElement, {
          theme: 'outline',
          size: 'large',
          text: this.texto(),
          shape: 'rectangular',
          locale: 'pt-BR',
          width: '336',
        });
      })
      .catch(() => {
        if (!this.destruido) {
          this.falhou.set(true);
        }
      });
  }

  ngOnDestroy(): void {
    this.destruido = true;
  }
}
