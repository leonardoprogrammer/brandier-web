import { Component, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Usuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { ConviteService } from '../../services/convite.service';
import { PainelLayoutComponent } from './painel-layout.component';

@Component({ selector: 'app-pagina-falsa', template: '' })
class PaginaFalsaComponent {}

describe('PainelLayoutComponent', () => {
  let fixture: ComponentFixture<PainelLayoutComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let convites: jasmine.SpyObj<ConviteService>;
  let pendentes: WritableSignal<number>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['sair']);
    Object.defineProperty(auth, 'usuario', {
      value: signal<Usuario | null>({ id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' }).asReadonly(),
    });
    pendentes = signal(0);
    convites = jasmine.createSpyObj<ConviteService>('ConviteService', ['recebidos']);
    convites.recebidos.and.returnValue(of({ convites: [] }));
    Object.defineProperty(convites, 'totalPendentes', { value: pendentes.asReadonly() });
    await TestBed.configureTestingModule({
      imports: [PainelLayoutComponent],
      providers: [
        provideRouter([
          {
            path: 'painel',
            children: [
              { path: '', component: PaginaFalsaComponent },
              { path: 'marcas', component: PaginaFalsaComponent },
              { path: 'marcas/:id/lojas', component: PaginaFalsaComponent },
              { path: 'reposicoes', component: PaginaFalsaComponent },
              { path: 'reposicoes/nova', component: PaginaFalsaComponent },
              { path: 'relatorios', component: PaginaFalsaComponent },
              { path: 'promotor', component: PaginaFalsaComponent },
              { path: 'sobre', component: PaginaFalsaComponent },
            ],
          },
        ]),
        { provide: AuthService, useValue: auth },
        { provide: ConviteService, useValue: convites },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(PainelLayoutComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function botaoSair(): HTMLButtonElement {
    return elemento().querySelector<HTMLButtonElement>('header button')!;
  }

  it('mostra o nome do usuário logado', () => {
    expect(elemento().querySelector('[data-testid="nome-usuario"]')?.textContent).toContain('Pessoa Teste');
  });

  it('tem o menu com Início, Marcas, Reposições, Relatórios, Como promotor e Sobre', () => {
    const menu = elemento().querySelector('nav[aria-label="Menu do painel"]')!;

    expect(menu.querySelector('a[href="/painel"]')).not.toBeNull();
    expect(menu.querySelector('a[href="/painel/marcas"]')).not.toBeNull();
    expect(menu.querySelector('a[href="/painel/reposicoes"]')).not.toBeNull();
    expect(menu.querySelector('a[href="/painel/relatorios"]')).not.toBeNull();
    expect(menu.querySelector('a[href="/painel/promotor"]')).not.toBeNull();
    expect(menu.querySelector('a[href="/painel/sobre"]')).not.toBeNull();
  });

  it('tem o aviso de portfólio e o link para Sobre no rodapé', () => {
    const rodape = elemento().querySelector('footer')!;

    expect(rodape.textContent).toContain('não é para uso comercial');
    expect(rodape.querySelector('a[href="/painel/sobre"]')).not.toBeNull();
  });

  it('sair encerra a sessão e vai para o login', () => {
    auth.sair.and.returnValue(of({ message: 'ok' }));

    botaoSair().click();

    expect(auth.sair).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/entrar']);
  });

  it('sair vai para o login mesmo quando a API falha', () => {
    auth.sair.and.returnValue(throwError(() => new Error('falha')));

    botaoSair().click();

    expect(router.navigate).toHaveBeenCalledWith(['/entrar']);
  });

  it('desabilita o botão enquanto sai', () => {
    auth.sair.and.returnValue(new Subject<{ message: string }>());

    botaoSair().click();
    fixture.detectChanges();

    expect(botaoSair().disabled).toBeTrue();
    expect(botaoSair().textContent).toContain('Saindo...');
  });

  describe('página atual no menu', () => {
    const linkDo = (caminho: string): HTMLAnchorElement =>
      elemento().querySelector<HTMLAnchorElement>(`nav[aria-label="Menu do painel"] a[href="${caminho}"]`)!;

    async function irPara(url: string): Promise<void> {
      await router.navigateByUrl(url);
      await fixture.whenStable();
      fixture.detectChanges();
    }

    function ativos(): string[] {
      return Array.from(
        elemento().querySelectorAll<HTMLAnchorElement>('nav[aria-label="Menu do painel"] a.menu-link-ativo'),
      ).map((a) => a.textContent?.trim().split(/\s+/)[0] ?? '');
    }

    it('destaca só o Início em /painel e marca com aria-current', async () => {
      await irPara('/painel');

      expect(ativos()).toEqual(['Início']);
      expect(linkDo('/painel').getAttribute('aria-current')).toBe('page');
      expect(linkDo('/painel/marcas').hasAttribute('aria-current')).toBeFalse();
    });

    it('destaca Marcas em /painel/marcas e tira o destaque do Início', async () => {
      await irPara('/painel/marcas');

      expect(ativos()).toEqual(['Marcas']);
      expect(linkDo('/painel/marcas').getAttribute('aria-current')).toBe('page');
    });

    it('mantém Marcas destacado nas subpáginas da marca', async () => {
      await irPara('/painel/marcas/abc/lojas');

      expect(ativos()).toEqual(['Marcas']);
    });

    it('destaca Reposições também na tela de nova reposição', async () => {
      await irPara('/painel/reposicoes/nova');

      expect(ativos()).toEqual(['Reposições']);
    });

    it('destaca Relatórios, Como promotor e Sobre nas suas páginas', async () => {
      await irPara('/painel/relatorios');
      expect(ativos()).toEqual(['Relatórios']);

      await irPara('/painel/promotor');
      expect(ativos()).toEqual(['Como']);

      await irPara('/painel/sobre');
      expect(ativos()).toEqual(['Sobre']);
    });

    it('troca o destaque ao navegar de uma página para outra', async () => {
      await irPara('/painel/marcas');
      await irPara('/painel/reposicoes');

      expect(ativos()).toEqual(['Reposições']);
      expect(linkDo('/painel/marcas').classList).not.toContain('menu-link-ativo');
    });

    it('todos os links do menu usam a classe base de componente', () => {
      const links = elemento().querySelectorAll('nav[aria-label="Menu do painel"] a');

      expect(links.length).toBe(6);
      links.forEach((link) => expect(link.classList).toContain('menu-link'));
    });
  });

  describe('convites pendentes', () => {
    it('busca os convites recebidos ao abrir o painel', () => {
      expect(convites.recebidos).toHaveBeenCalledTimes(1);
    });

    it('não mostra o selo quando não há convites', () => {
      expect(elemento().querySelector('[data-testid="selo-convites"]')).toBeNull();
    });

    it('mostra o selo com a quantidade no item "Como promotor"', () => {
      pendentes.set(2);
      fixture.detectChanges();

      const selo = elemento().querySelector('[data-testid="selo-convites"]')!;
      expect(selo.textContent?.trim()).toBe('2');
      expect(selo.getAttribute('aria-label')).toBe('2 convites pendentes');
      expect(selo.closest('a')?.getAttribute('href')).toBe('/painel/promotor');
    });

    it('usa o singular no rótulo acessível', () => {
      pendentes.set(1);
      fixture.detectChanges();

      expect(elemento().querySelector('[data-testid="selo-convites"]')?.getAttribute('aria-label')).toBe('1 convite pendente');
    });

    it('o selo some quando os convites são respondidos', () => {
      pendentes.set(1);
      fixture.detectChanges();
      pendentes.set(0);
      fixture.detectChanges();

      expect(elemento().querySelector('[data-testid="selo-convites"]')).toBeNull();
    });

    it('não quebra o painel quando a busca de convites falha', () => {
      convites.recebidos.and.returnValue(throwError(() => new Error('falha')));

      expect(() => TestBed.createComponent(PainelLayoutComponent).detectChanges()).not.toThrow();
    });
  });
});
