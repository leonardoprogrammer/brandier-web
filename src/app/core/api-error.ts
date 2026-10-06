import { HttpErrorResponse } from '@angular/common/http';

export interface ErroCampo {
  campo: string;
  mensagem: string;
}

export interface ProblemaApi {
  status: number;
  codigo: string | null;
  mensagem: string | null;
  erros: ErroCampo[];
}

function ehErroCampo(valor: unknown): valor is ErroCampo {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const candidato = valor as Record<string, unknown>;
  return typeof candidato['campo'] === 'string' && typeof candidato['mensagem'] === 'string';
}

export function extrairProblema(erro: unknown): ProblemaApi {
  if (!(erro instanceof HttpErrorResponse)) {
    return { status: 0, codigo: null, mensagem: null, erros: [] };
  }

  const corpo: unknown = erro.error;
  if (typeof corpo !== 'object' || corpo === null) {
    return { status: erro.status, codigo: null, mensagem: null, erros: [] };
  }

  const problema = corpo as Record<string, unknown>;
  const erros: unknown[] = Array.isArray(problema['erros']) ? problema['erros'] : [];
  return {
    status: erro.status,
    codigo: typeof problema['codigo'] === 'string' ? problema['codigo'] : null,
    mensagem: typeof problema['detail'] === 'string' ? problema['detail'] : null,
    erros: erros.filter(ehErroCampo),
  };
}

export function mensagemDeErro(problema: ProblemaApi): string {
  if (problema.status === 0) {
    return 'Não foi possível conectar ao servidor. Tente novamente em instantes.';
  }

  switch (problema.codigo) {
    case 'NAO_AUTENTICADO':
      return 'E-mail ou senha incorretos.';
    case 'CSRF_INVALIDO':
      return 'Não foi possível validar a requisição. Recarregue a página e tente novamente.';
    case 'VALIDACAO_INVALIDA':
      return problema.erros[0]?.mensagem ?? 'Verifique os dados informados.';
    default:
      return problema.mensagem ?? 'Ocorreu um erro inesperado. Tente novamente.';
  }
}
