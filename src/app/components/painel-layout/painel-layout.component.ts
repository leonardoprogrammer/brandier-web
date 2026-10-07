import { isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { ConviteService } from '../../services/convite.service';
import { TemaToggleComponent } from '../tema-toggle/tema-toggle.component';

@Component({
  selector: 'app-painel-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TemaToggleComponent],
  templateUrl: './painel-layout.component.html',
})
export class PainelLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly convites = inject(ConviteService);

  protected readonly usuario = this.auth.usuario;
  protected readonly saindo = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => setTimeout(() => this.mostrarAbaAtiva()));
  }

  ngOnInit(): void {
    this.convites.recebidos().subscribe({ error: () => undefined });
    setTimeout(() => this.mostrarAbaAtiva());
  }

  protected sair(): void {
    this.saindo.set(true);
    this.auth
      .sair()
      .pipe(finalize(() => this.saindo.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/entrar']),
        error: () => void this.router.navigate(['/entrar']),
      });
  }

  private mostrarAbaAtiva(): void {
    if (!this.navegador) {
      return;
    }
    this.elemento.nativeElement
      .querySelector<HTMLElement>('nav[aria-label="Menu do painel"] [aria-current="page"]')
      ?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }
}
