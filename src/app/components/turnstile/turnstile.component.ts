import { AfterViewInit, Component, ElementRef, OnDestroy, inject, input, output, signal, viewChild } from '@angular/core';

import { ApiDoTurnstile, TurnstileScriptService } from '../../services/turnstile-script.service';

@Component({
  selector: 'app-turnstile',
  template: `
    <div #area aria-label="Verificação de segurança"></div>
    @if (falhou()) {
      <p class="campo-erro" role="alert" data-testid="turnstile-erro">
        Não foi possível carregar a verificação de segurança. Recarregue a página e tente de novo.
      </p>
    }
  `,
})
export class TurnstileComponent implements AfterViewInit, OnDestroy {
  private readonly scriptService = inject(TurnstileScriptService);
  private readonly area = viewChild.required<ElementRef<HTMLElement>>('area');

  readonly siteKey = input.required<string>();
  readonly token = output<string | null>();

  protected readonly falhou = signal(false);

  private api: ApiDoTurnstile | null = null;
  private idDoWidget: string | null = null;
  private destruido = false;

  ngAfterViewInit(): void {
    this.scriptService
      .carregar()
      .then((api) => {
        if (this.destruido) {
          return;
        }
        this.api = api;
        this.idDoWidget = api.render(this.area().nativeElement, {
          sitekey: this.siteKey(),
          theme: 'light',
          language: 'pt-br',
          callback: (valor) => this.token.emit(valor),
          'expired-callback': () => this.token.emit(null),
          'error-callback': () => this.token.emit(null),
        });
      })
      .catch(() => {
        if (!this.destruido) {
          this.falhou.set(true);
        }
      });
  }

  reiniciar(): void {
    this.token.emit(null);
    if (this.api && this.idDoWidget !== null) {
      this.api.reset(this.idDoWidget);
    }
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.api && this.idDoWidget !== null) {
      this.api.remove(this.idDoWidget);
    }
  }
}
