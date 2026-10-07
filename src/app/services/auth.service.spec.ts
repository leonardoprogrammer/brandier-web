import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Usuario } from '../models/usuario.model';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usuario: Usuario = { id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' };
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carregarSessao guarda o usuário quando a API responde', () => {
    let resultado: Usuario | null | undefined;
    service.carregarSessao().subscribe((valor) => (resultado = valor));

    http.expectOne('/api/v1/usuario/eu').flush(usuario);

    expect(resultado).toEqual(usuario);
    expect(service.usuario()).toEqual(usuario);
    expect(service.autenticado()).toBeTrue();
  });

  it('carregarSessao resulta em nulo, sem erro, quando não há sessão', () => {
    let resultado: Usuario | null | undefined;
    service.carregarSessao().subscribe((valor) => (resultado = valor));

    http.expectOne('/api/v1/usuario/eu').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(resultado).toBeNull();
    expect(service.autenticado()).toBeFalse();
  });

  it('entrar envia e-mail e senha e guarda o usuário', () => {
    service.entrar('pessoa@exemplo.com', 'Senha1234').subscribe();

    const requisicao = http.expectOne('/api/v1/usuario/login');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ email: 'pessoa@exemplo.com', senha: 'Senha1234' });
    requisicao.flush(usuario);

    expect(service.usuario()).toEqual(usuario);
  });

  it('entrar não guarda usuário quando a API recusa', () => {
    service.entrar('pessoa@exemplo.com', 'errada').subscribe({ error: () => undefined });

    http.expectOne('/api/v1/usuario/login').flush({ codigo: 'NAO_AUTENTICADO' }, { status: 401, statusText: 'x' });

    expect(service.autenticado()).toBeFalse();
  });

  it('cadastrar faz POST na raiz de /usuario', () => {
    const dados = { nome: 'Pessoa', email: 'pessoa@exemplo.com', senha: 'Senha1234', aceitouTermos: true };
    service.cadastrar(dados).subscribe();

    const requisicao = http.expectOne('/api/v1/usuario');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(dados);
    requisicao.flush({ message: 'ok' });
  });

  it('verificarEmail envia o token', () => {
    service.verificarEmail('abc').subscribe();

    const requisicao = http.expectOne('/api/v1/usuario/verificar-email');
    expect(requisicao.request.body).toEqual({ token: 'abc' });
    requisicao.flush({ message: 'ok' });
  });

  it('reenviarVerificacao envia o e-mail', () => {
    service.reenviarVerificacao('pessoa@exemplo.com').subscribe();

    const requisicao = http.expectOne('/api/v1/usuario/reenviar-verificacao');
    expect(requisicao.request.body).toEqual({ email: 'pessoa@exemplo.com' });
    requisicao.flush({ message: 'ok' });
  });

  it('solicitarRedefinicaoSenha envia o e-mail para esqueci-senha', () => {
    service.solicitarRedefinicaoSenha('pessoa@exemplo.com').subscribe();

    const requisicao = http.expectOne('/api/v1/usuario/esqueci-senha');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ email: 'pessoa@exemplo.com' });
    requisicao.flush({ message: 'ok' });
  });

  it('redefinirSenha envia token e senha e encerra a sessão local', () => {
    service.entrar('pessoa@exemplo.com', 'Senha1234').subscribe();
    http.expectOne('/api/v1/usuario/login').flush(usuario);
    expect(service.autenticado()).toBeTrue();

    service.redefinirSenha('abc', 'NovaSenha123').subscribe();

    const requisicao = http.expectOne('/api/v1/usuario/redefinir-senha');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ token: 'abc', senha: 'NovaSenha123' });
    requisicao.flush({ message: 'ok' });
    expect(service.autenticado()).toBeFalse();
  });

  it('redefinirSenha mantém a sessão local quando a API recusa', () => {
    service.entrar('pessoa@exemplo.com', 'Senha1234').subscribe();
    http.expectOne('/api/v1/usuario/login').flush(usuario);

    service.redefinirSenha('ruim', 'NovaSenha123').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/usuario/redefinir-senha').flush({ codigo: 'TOKEN_REDEFINICAO_INVALIDO' }, { status: 400, statusText: 'x' });

    expect(service.autenticado()).toBeTrue();
  });

  it('excluirConta envia a senha em POST e encerra a sessão local', () => {
    service.entrar('pessoa@exemplo.com', 'Senha1234').subscribe();
    http.expectOne('/api/v1/usuario/login').flush(usuario);
    expect(service.autenticado()).toBeTrue();

    service.excluirConta('Senha1234').subscribe();

    const requisicao = http.expectOne('/api/v1/usuario/excluir-conta');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ senha: 'Senha1234' });
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
    expect(service.autenticado()).toBeFalse();
  });

  it('excluirConta mantém a sessão local quando a senha está incorreta', () => {
    service.entrar('pessoa@exemplo.com', 'Senha1234').subscribe();
    http.expectOne('/api/v1/usuario/login').flush(usuario);

    service.excluirConta('errada').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/usuario/excluir-conta').flush({ codigo: 'SENHA_INCORRETA' }, { status: 403, statusText: 'Forbidden' });

    expect(service.autenticado()).toBeTrue();
  });

  it('atualizarNome envia PUT com o nome e guarda o usuário devolvido', () => {
    service.atualizarNome('Novo Nome').subscribe();

    const requisicao = http.expectOne('/api/v1/usuario');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ nome: 'Novo Nome' });
    requisicao.flush({ id: '1', nome: 'Novo Nome', email: 'pessoa@exemplo.com' });

    expect(service.usuario()).toEqual({ id: '1', nome: 'Novo Nome', email: 'pessoa@exemplo.com' });
  });

  it('alterarSenha envia a senha atual e a nova e encerra a sessão local', () => {
    service.entrar('pessoa@exemplo.com', 'Senha1234').subscribe();
    http.expectOne('/api/v1/usuario/login').flush(usuario);
    expect(service.autenticado()).toBeTrue();

    service.alterarSenha('Senha1234', 'SenhaNova12').subscribe();

    const requisicao = http.expectOne('/api/v1/usuario/alterar-senha');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ senhaAtual: 'Senha1234', novaSenha: 'SenhaNova12' });
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
    expect(service.autenticado()).toBeFalse();
  });

  it('alterarSenha mantém a sessão local quando a senha atual está incorreta', () => {
    service.entrar('pessoa@exemplo.com', 'Senha1234').subscribe();
    http.expectOne('/api/v1/usuario/login').flush(usuario);

    service.alterarSenha('errada', 'SenhaNova12').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/usuario/alterar-senha').flush({ codigo: 'SENHA_INCORRETA' }, { status: 403, statusText: 'Forbidden' });

    expect(service.autenticado()).toBeTrue();
  });

  it('sair limpa o usuário mesmo quando a API falha', () => {
    service.entrar('pessoa@exemplo.com', 'Senha1234').subscribe();
    http.expectOne('/api/v1/usuario/login').flush(usuario);
    expect(service.autenticado()).toBeTrue();

    service.sair().subscribe({ error: () => undefined });
    http.expectOne('/api/v1/usuario/logout').flush(null, { status: 500, statusText: 'x' });

    expect(service.autenticado()).toBeFalse();
  });

  it('renovarSessao compartilha uma única requisição entre chamadas simultâneas', () => {
    service.renovarSessao().subscribe();
    service.renovarSessao().subscribe();

    const requisicoes = http.match('/api/v1/usuario/refresh-token');
    expect(requisicoes.length).toBe(1);
    requisicoes[0].flush(null, { status: 204, statusText: 'No Content' });
  });

  it('renovarSessao faz uma nova requisição depois que a anterior terminou', () => {
    service.renovarSessao().subscribe();
    http.expectOne('/api/v1/usuario/refresh-token').flush(null, { status: 204, statusText: 'No Content' });

    service.renovarSessao().subscribe();
    const segunda = http.expectOne('/api/v1/usuario/refresh-token');
    expect(segunda.request.method).toBe('POST');
    segunda.flush(null, { status: 204, statusText: 'No Content' });
  });
});
