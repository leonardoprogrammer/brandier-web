import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Usuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { PainelLayoutComponent } from './painel-layout.component';

describe('PainelLayoutComponent', () => {
  let fixture: ComponentFixture<PainelLayoutComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['sair']);
    Object.defineProperty(auth, 'usuario', {
      value: signal<Usuario | null>({ id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' }).asReadonly(),
    });
    await TestBed.configureTestingModule({
      imports: [PainelLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
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

  it('tem o menu com Início, Marcas e Sobre', () => {
    const menu = elemento().querySelector('nav[aria-label="Menu do painel"]')!;

    expect(menu.querySelector('a[href="/painel"]')).not.toBeNull();
    expect(menu.querySelector('a[href="/painel/marcas"]')).not.toBeNull();
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
});
