import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Usuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { AceitarTermosComponent } from './aceitar-termos.component';

describe('AceitarTermosComponent', () => {
  let fixture: ComponentFixture<AceitarTermosComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  const usuarioPendente: Usuario = { id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com', temSenha: false, termosAceitos: false };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['aceitarTermos', 'sair']);
    Object.defineProperty(auth, 'usuario', { value: signal<Usuario | null>(usuarioPendente).asReadonly() });
    await TestBed.configureTestingModule({
      imports: [AceitarTermosComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(AceitarTermosComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const checkbox = (): HTMLInputElement => elemento().querySelector<HTMLInputElement>('#aceitou-termos')!;
  const botao = (rotulo: string): HTMLButtonElement =>
    Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === rotulo)!;

  function marcarCheckbox(): void {
    checkbox().click();
    fixture.detectChanges();
  }

  it('mostra o texto dos termos e o botão Prosseguir desabilitado até marcar o checkbox', () => {
    expect(elemento().textContent).toContain('Li e concordo com os termos');
    expect(botao('Prosseguir').disabled).toBeTrue();
  });

  it('marcar o checkbox habilita o Prosseguir', () => {
    marcarCheckbox();

    expect(botao('Prosseguir').disabled).toBeFalse();
  });

  it('prosseguir chama o serviço e vai para o painel', () => {
    auth.aceitarTermos.and.returnValue(of({ ...usuarioPendente, termosAceitos: true }));
    marcarCheckbox();

    botao('Prosseguir').click();
    fixture.detectChanges();

    expect(auth.aceitarTermos).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/painel']);
  });

  it('mostra erro e não navega quando o servidor recusa', () => {
    auth.aceitarTermos.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    marcarCheckbox();

    botao('Prosseguir').click();
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Não foi possível conectar ao servidor');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('desabilita os botões enquanto confirma', () => {
    auth.aceitarTermos.and.returnValue(new Subject());
    marcarCheckbox();

    botao('Prosseguir').click();
    fixture.detectChanges();

    expect(botao('Confirmando...').disabled).toBeTrue();
    expect(botao('Sair').disabled).toBeTrue();
  });

  it('sair chama o logout e vai para o login, mesmo sem marcar o checkbox', () => {
    auth.sair.and.returnValue(of({ message: 'ok' }));

    botao('Sair').click();
    fixture.detectChanges();

    expect(auth.sair).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/entrar']);
  });
});
