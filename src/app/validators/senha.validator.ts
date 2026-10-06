import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const SENHA_TAMANHO_MINIMO = 8;
export const SENHA_TAMANHO_MAXIMO = 72;

export const senhaComLetraENumero: ValidatorFn = (controle: AbstractControl): ValidationErrors | null => {
  const valor: unknown = controle.value;
  if (typeof valor !== 'string' || valor.length === 0) {
    return null;
  }
  const temLetra = /\p{L}/u.test(valor);
  const temNumero = /\d/.test(valor);
  return temLetra && temNumero ? null : { letraENumero: true };
};

export const senhaDentroDoLimiteDeBytes: ValidatorFn = (controle: AbstractControl): ValidationErrors | null => {
  const valor: unknown = controle.value;
  if (typeof valor !== 'string') {
    return null;
  }
  return new TextEncoder().encode(valor).length <= SENHA_TAMANHO_MAXIMO ? null : { bytesExcedidos: true };
};

export const senhasIguais =
  (campoSenha: string, campoConfirmacao: string): ValidatorFn =>
  (grupo: AbstractControl): ValidationErrors | null => {
    const senha = grupo.get(campoSenha)?.value;
    const confirmacao = grupo.get(campoConfirmacao)?.value;
    return senha === confirmacao ? null : { senhasDiferentes: true };
  };
