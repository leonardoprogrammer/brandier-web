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
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['excluirConta', 'atualizarNome', 'alterarSenha']);
    Object.defineProperty(auth, 'usuario', {
      value: signal<Usuario | null>({ id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com', temSenha: true, termosAceitos: true }).asReadonly(),
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

  function abrirSecaoExclusao(): void {
    botao('Exclusão de conta').click();
    fixture.detectChanges();
  }

  function abrirConfirmacao(): void {
    if (!elemento().querySelector('#conteudo-exclusao')) {
      abrirSecaoExclusao();
    }
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

  function digitar(seletor: string, valor: string): void {
    const campo = elemento().querySelector<HTMLInputElement>(seletor)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('mostra o nome e o e-mail da conta', () => {
    expect(elemento().querySelector('[data-testid="nome"]')?.textContent).toContain('Pessoa Teste');
    expect(elemento().querySelector('[data-testid="email"]')?.textContent).toContain('pessoa@exemplo.com');
  });

  it('começa com a seção de exclusão fechada, sem mostrar a explicação nem o botão', () => {
    expect(elemento().textContent).not.toContain('Esta ação é irreversível.');
    expect(botao('Excluir minha conta')).toBeUndefined();
    expect(elemento().querySelector('form')).toBeNull();
    expect(elemento().querySelector('#senha-exclusao')).toBeNull();
  });

  it('ao clicar em "Exclusão de conta" explica o que a exclusão apaga, inclusive as marcas, e que não dá para desfazer', () => {
    abrirSecaoExclusao();
    const texto = elemento().textContent ?? '';

    expect(texto).toContain('marcas que você gerencia');
    expect(texto).toContain('reposições que você registrou');
    expect(texto).toContain('Esta ação é irreversível.');
    expect(botao('Excluir minha conta')).toBeDefined();
    expect(elemento().querySelector('#senha-exclusao')).toBeNull();
  });

  it('clicar novamente em "Exclusão de conta" fecha a seção', () => {
    abrirSecaoExclusao();
    abrirSecaoExclusao();

    expect(elemento().textContent).not.toContain('Esta ação é irreversível.');
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

  describe('editar nome', () => {
    function abrirEdicao(): void {
      botao('Editar').click();
      fixture.detectChanges();
    }

    it('mostra um botão para editar o nome', () => {
      expect(botao('Editar')).toBeDefined();
    });

    it('abre um formulário com o nome atual preenchido', () => {
      abrirEdicao();

      expect(elemento().querySelector<HTMLInputElement>('#nome')!.value).toBe('Pessoa Teste');
    });

    it('cancelar fecha o formulário sem chamar o serviço', () => {
      abrirEdicao();
      digitar('#nome', 'Outro Nome');

      botao('Cancelar').click();
      fixture.detectChanges();

      expect(elemento().querySelector('#nome')).toBeNull();
      expect(auth.atualizarNome).not.toHaveBeenCalled();
    });

    it('nome vazio mostra erro de validação e não chama o serviço', () => {
      abrirEdicao();
      digitar('#nome', '   ');

      enviar();

      expect(auth.atualizarNome).not.toHaveBeenCalled();
      expect(elemento().textContent).toContain('Informe seu nome.');
    });

    it('salva o nome sem espaços nas pontas e fecha o formulário', () => {
      auth.atualizarNome.and.returnValue(of({ id: '1', nome: 'Novo Nome', email: 'pessoa@exemplo.com', temSenha: true, termosAceitos: true }));
      abrirEdicao();
      digitar('#nome', '  Novo Nome  ');

      enviar();

      expect(auth.atualizarNome).toHaveBeenCalledOnceWith('Novo Nome');
      expect(elemento().querySelector('#nome')).toBeNull();
      expect(botao('Editar')).toBeDefined();
    });

    it('mostra erro e mantém o formulário aberto quando o servidor recusa', () => {
      auth.atualizarNome.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      abrirEdicao();
      digitar('#nome', 'Novo Nome');

      enviar();

      expect(elemento().textContent).toContain('Não foi possível conectar ao servidor');
      expect(elemento().querySelector('#nome')).not.toBeNull();
    });
  });

  describe('alterar senha', () => {
    function abrirFormulario(): void {
      botao('Alterar senha').click();
      fixture.detectChanges();
    }

    function preencherValido(): void {
      digitar('#senha-atual', 'SenhaAtual1');
      digitar('#nova-senha', 'SenhaNova12');
      digitar('#confirmar-nova-senha', 'SenhaNova12');
    }

    it('mostra o botão e o formulário aparece ao clicar', () => {
      abrirFormulario();

      expect(elemento().querySelector('#senha-atual')).not.toBeNull();
      expect(elemento().querySelector('#nova-senha')).not.toBeNull();
      expect(elemento().querySelector('#confirmar-nova-senha')).not.toBeNull();
    });

    it('cancelar fecha o formulário e limpa os campos', () => {
      abrirFormulario();
      preencherValido();

      botao('Cancelar').click();
      fixture.detectChanges();
      abrirFormulario();

      expect(elemento().querySelector<HTMLInputElement>('#senha-atual')!.value).toBe('');
      expect(auth.alterarSenha).not.toHaveBeenCalled();
    });

    it('não envia com campos vazios e mostra os avisos', () => {
      abrirFormulario();

      enviar();

      expect(auth.alterarSenha).not.toHaveBeenCalled();
      expect(elemento().textContent).toContain('Informe sua senha atual.');
      expect(elemento().textContent).toContain('Informe a nova senha.');
      expect(elemento().textContent).toContain('Confirme a nova senha.');
    });

    it('nova senha sem número mostra o erro de requisitos', () => {
      abrirFormulario();
      digitar('#senha-atual', 'SenhaAtual1');
      digitar('#nova-senha', 'somenteletras');
      digitar('#confirmar-nova-senha', 'somenteletras');

      enviar();

      expect(auth.alterarSenha).not.toHaveBeenCalled();
      expect(elemento().textContent).toContain('A senha deve conter letras e números.');
    });

    it('senhas diferentes mostram o erro de confirmação', () => {
      abrirFormulario();
      digitar('#senha-atual', 'SenhaAtual1');
      digitar('#nova-senha', 'SenhaNova12');
      digitar('#confirmar-nova-senha', 'Diferente12');

      enviar();

      expect(auth.alterarSenha).not.toHaveBeenCalled();
      expect(elemento().textContent).toContain('As senhas não conferem.');
    });

    it('altera a senha, encerra a sessão e vai para o login avisando a troca', () => {
      auth.alterarSenha.and.returnValue(of(undefined));
      abrirFormulario();
      preencherValido();

      enviar();

      expect(auth.alterarSenha).toHaveBeenCalledOnceWith('SenhaAtual1', 'SenhaNova12');
      expect(router.navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { senhaAlterada: true } });
    });

    it('desabilita os botões enquanto altera', () => {
      auth.alterarSenha.and.returnValue(new Subject<void>());
      abrirFormulario();
      preencherValido();

      enviar();

      expect(botao('Alterando...').disabled).toBeTrue();
      expect(botao('Cancelar').disabled).toBeTrue();
    });

    it('mostra erro no campo da senha atual quando ela está incorreta', () => {
      auth.alterarSenha.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 403, error: { codigo: 'SENHA_INCORRETA', detail: 'A senha informada está incorreta.' } })),
      );
      abrirFormulario();
      preencherValido();

      enviar();

      expect(elemento().querySelector('#senha-atual-erro')?.textContent).toContain('A senha atual informada está incorreta.');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('mostra erro genérico quando o servidor falha', () => {
      auth.alterarSenha.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      abrirFormulario();
      preencherValido();

      enviar();

      expect(elemento().textContent).toContain('Não foi possível conectar ao servidor');
    });

    it('alterna a visibilidade das três senhas', () => {
      abrirFormulario();
      const senhaAtual = elemento().querySelector<HTMLInputElement>('#senha-atual')!;
      const novaSenha = elemento().querySelector<HTMLInputElement>('#nova-senha')!;
      const confirmar = elemento().querySelector<HTMLInputElement>('#confirmar-nova-senha')!;
      expect(senhaAtual.type).toBe('password');

      elemento().querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      fixture.detectChanges();

      expect(senhaAtual.type).toBe('text');
      expect(novaSenha.type).toBe('text');
      expect(confirmar.type).toBe('text');
    });
  });

  describe('conta sem senha definida (login só pelo Google)', () => {
    beforeEach(async () => {
      auth = jasmine.createSpyObj<AuthService>('AuthService', ['excluirConta', 'atualizarNome', 'alterarSenha']);
      Object.defineProperty(auth, 'usuario', {
        value: signal<Usuario | null>({ id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com', temSenha: false, termosAceitos: true }).asReadonly(),
      });
      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [ContaComponent],
          providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
        })
        .compileComponents();

      router = TestBed.inject(Router);
      spyOn(router, 'navigate').and.resolveTo(true);
      fixture = TestBed.createComponent(ContaComponent);
      fixture.detectChanges();
    });

    it('no formulário de senha não exibe o campo de senha atual, só explica que a conta entra pelo Google', () => {
      botao('Definir senha').click();
      fixture.detectChanges();

      expect(elemento().querySelector('#senha-atual')).toBeNull();
      expect(elemento().textContent).toContain('ainda não tem uma senha definida');
    });

    it('define a nova senha sem exigir a senha atual', () => {
      auth.alterarSenha.and.returnValue(of(undefined));
      botao('Definir senha').click();
      fixture.detectChanges();
      digitar('#nova-senha', 'SenhaNova12');
      digitar('#confirmar-nova-senha', 'SenhaNova12');

      enviar();

      expect(auth.alterarSenha).toHaveBeenCalledOnceWith('', 'SenhaNova12');
    });

    it('na confirmação de exclusão não exibe o campo de senha', () => {
      abrirSecaoExclusao();
      botao('Excluir minha conta').click();
      fixture.detectChanges();

      expect(elemento().querySelector('#senha-exclusao')).toBeNull();
    });

    it('exclui a conta marcando só o entendimento, sem senha', () => {
      auth.excluirConta.and.returnValue(of(undefined));
      abrirSecaoExclusao();
      botao('Excluir minha conta').click();
      fixture.detectChanges();
      marcarEntendimento();

      enviar();

      expect(auth.excluirConta).toHaveBeenCalledOnceWith('');
      expect(router.navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { contaExcluida: true } });
    });
  });
});
