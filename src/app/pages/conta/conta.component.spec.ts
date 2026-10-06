import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Usuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { ContaComponent } from './conta.component';

describe('ContaComponent', () => {
  let fixture: ComponentFixture<ContaComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['excluirConta']);
    Object.defineProperty(auth, 'usuario', {
      value: signal<Usuario | null>({ id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' }).asReadonly(),
    });
    await TestBed.configureTestingModule({
      imports: [ContaComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ContaComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const botao = (rotulo: string): HTMLButtonElement =>
    Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === rotulo)!;

  function abrirConfirmacao(): void {
    botao('Excluir minha conta').click();
    fixture.detectChanges();
  }

  function digitarSenha(valor: string): void {
    const campo = elemento().querySelector<HTMLInputElement>('#senha-exclusao')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function marcarEntendimento(): void {
    const campo = elemento().querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    campo.checked = true;
    campo.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function enviar(): void {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('mostra o nome e o e-mail da conta', () => {
    expect(elemento().querySelector('[data-testid="nome"]')?.textContent).toContain('Pessoa Teste');
    expect(elemento().querySelector('[data-testid="email"]')?.textContent).toContain('pessoa@exemplo.com');
  });

  it('explica o que a exclusão apaga, inclusive as marcas e que não dá para desfazer', () => {
    const texto = elemento().textContent ?? '';

    expect(texto).toContain('marcas que você gerencia');
    expect(texto).toContain('reposições que você registrou');
    expect(texto).toContain('Esta ação é irreversível.');
  });

  it('começa só com o botão de excluir, sem pedir a senha', () => {
    expect(elemento().querySelector('form')).toBeNull();
    expect(elemento().querySelector('#senha-exclusao')).toBeNull();
  });

  it('o botão abre a confirmação com senha e aviso de entendimento', () => {
    abrirConfirmacao();

    expect(elemento().querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(elemento().querySelector('#senha-exclusao')).not.toBeNull();
    expect(elemento().querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(botao('Excluir definitivamente')).toBeDefined();
  });

  it('cancelar fecha a confirmação e limpa o que foi digitado', () => {
    abrirConfirmacao();
    digitarSenha('Senha1234');

    botao('Cancelar').click();
    fixture.detectChanges();
    abrirConfirmacao();

    expect(elemento().querySelector<HTMLInputElement>('#senha-exclusao')!.value).toBe('');
    expect(auth.excluirConta).not.toHaveBeenCalled();
  });

  it('não envia sem senha nem confirmação e mostra os dois avisos', () => {
    abrirConfirmacao();

    enviar();

    expect(auth.excluirConta).not.toHaveBeenCalled();
    expect(elemento().textContent).toContain('Informe sua senha para confirmar.');
    expect(elemento().textContent).toContain('Marque a confirmação para continuar.');
  });

  it('não envia só com a senha, sem marcar o entendimento', () => {
    abrirConfirmacao();
    digitarSenha('Senha1234');

    enviar();

    expect(auth.excluirConta).not.toHaveBeenCalled();
    expect(elemento().textContent).toContain('Marque a confirmação para continuar.');
  });

  it('exclui com a senha, encerra a sessão e vai para o login avisando que a conta foi excluída', () => {
    auth.excluirConta.and.returnValue(of(undefined));
    abrirConfirmacao();
    digitarSenha('Senha1234');
    marcarEntendimento();

    enviar();

    expect(auth.excluirConta).toHaveBeenCalledOnceWith('Senha1234');
    expect(router.navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { contaExcluida: true } });
  });

  it('desabilita os botões enquanto exclui', () => {
    auth.excluirConta.and.returnValue(new Subject<void>());
    abrirConfirmacao();
    digitarSenha('Senha1234');
    marcarEntendimento();

    enviar();

    expect(botao('Excluindo...').disabled).toBeTrue();
    expect(botao('Cancelar').disabled).toBeTrue();
  });

  it('mostra erro no campo da senha quando a senha está incorreta e permanece na tela', () => {
    auth.excluirConta.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403, error: { codigo: 'SENHA_INCORRETA', detail: 'A senha informada está incorreta.' } })),
    );
    abrirConfirmacao();
    digitarSenha('errada');
    marcarEntendimento();

    enviar();

    expect(elemento().querySelector('#senha-exclusao-erro')?.textContent).toContain('A senha informada está incorreta.');
    expect(elemento().querySelector('#senha-exclusao')?.getAttribute('aria-invalid')).toBe('true');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('mostra a mensagem de excesso de tentativas', () => {
    auth.excluirConta.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 429, error: { codigo: 'MUITAS_TENTATIVAS', detail: 'Muitas tentativas. Tente novamente em 60 segundos.' } })),
    );
    abrirConfirmacao();
    digitarSenha('Senha1234');
    marcarEntendimento();

    enviar();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Muitas tentativas');
  });

  it('mostra mensagem de conexão quando o servidor não responde', () => {
    auth.excluirConta.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    abrirConfirmacao();
    digitarSenha('Senha1234');
    marcarEntendimento();

    enviar();

    expect(elemento().textContent).toContain('Não foi possível conectar ao servidor');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
