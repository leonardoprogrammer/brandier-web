import { HttpErrorResponse } from '@angular/common/http';

import { extrairProblema, mensagemDeErro } from './api-error';

describe('extrairProblema', () => {
  it('lê código, detalhe e erros por campo do corpo da API', () => {
    const erro = new HttpErrorResponse({
      status: 400,
      error: {
        codigo: 'VALIDACAO_INVALIDA',
        detail: 'Um ou mais campos estão inválidos.',
        erros: [{ campo: 'senha', mensagem: 'A senha deve conter letras e números' }, { invalido: true }],
      },
    });

    expect(extrairProblema(erro)).toEqual({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      mensagem: 'Um ou mais campos estão inválidos.',
      erros: [{ campo: 'senha', mensagem: 'A senha deve conter letras e números' }],
    });
  });

  it('devolve problema vazio quando o corpo não é um objeto', () => {
    const erro = new HttpErrorResponse({ status: 500, error: 'texto' });

    expect(extrairProblema(erro)).toEqual({ status: 500, codigo: null, mensagem: null, erros: [] });
  });

  it('trata erros que não são HttpErrorResponse como falha de conexão', () => {
    expect(extrairProblema(new Error('x')).status).toBe(0);
  });
});

describe('mensagemDeErro', () => {
  const problema = (status: number, codigo: string | null, mensagem: string | null = null) => ({
    status,
    codigo,
    mensagem,
    erros: [],
  });

  it('informa falha de conexão quando status é 0', () => {
    expect(mensagemDeErro(problema(0, null))).toContain('conectar ao servidor');
  });

  it('traduz credenciais inválidas', () => {
    expect(mensagemDeErro(problema(401, 'NAO_AUTENTICADO'))).toBe('E-mail ou senha incorretos.');
  });

  it('usa a primeira mensagem de validação', () => {
    const comErros = {
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      mensagem: null,
      erros: [{ campo: 'email', mensagem: 'Informe um e-mail válido' }],
    };

    expect(mensagemDeErro(comErros)).toBe('Informe um e-mail válido');
  });

  it('usa o detalhe da API nos demais casos', () => {
    expect(mensagemDeErro(problema(400, 'TOKEN_VERIFICACAO_INVALIDO', 'O link expirou.'))).toBe('O link expirou.');
  });

  it('mostra a mensagem de limite de tentativas devolvida pela API', () => {
    const limite = problema(429, 'MUITAS_TENTATIVAS', 'Muitas tentativas. Tente novamente em 7 minutos.');

    expect(mensagemDeErro(limite)).toBe('Muitas tentativas. Tente novamente em 7 minutos.');
  });

  it('mostra a mensagem de link de redefinição inválido devolvida pela API', () => {
    const invalido = problema(400, 'TOKEN_REDEFINICAO_INVALIDO', 'O link de redefinição de senha é inválido, expirou ou já foi utilizado.');

    expect(mensagemDeErro(invalido)).toContain('expirou ou já foi utilizado');
  });

  it('usa mensagem genérica sem detalhe', () => {
    expect(mensagemDeErro(problema(500, null))).toContain('erro inesperado');
  });
});
