import { FormControl, FormGroup } from '@angular/forms';

import { senhaComLetraENumero, senhaDentroDoLimiteDeBytes, senhasIguais } from './senha.validator';

describe('senhaComLetraENumero', () => {
  it('aceita senha com letras e números', () => {
    expect(senhaComLetraENumero(new FormControl('abc12345'))).toBeNull();
  });

  it('aceita letras acentuadas', () => {
    expect(senhaComLetraENumero(new FormControl('çãé12345'))).toBeNull();
  });

  it('rejeita senha só com letras', () => {
    expect(senhaComLetraENumero(new FormControl('abcdefgh'))).toEqual({ letraENumero: true });
  });

  it('rejeita senha só com números', () => {
    expect(senhaComLetraENumero(new FormControl('12345678'))).toEqual({ letraENumero: true });
  });

  it('não valida valor vazio (deixa para o required)', () => {
    expect(senhaComLetraENumero(new FormControl(''))).toBeNull();
  });
});

describe('senhaDentroDoLimiteDeBytes', () => {
  it('aceita 72 caracteres ASCII', () => {
    expect(senhaDentroDoLimiteDeBytes(new FormControl('a'.repeat(72)))).toBeNull();
  });

  it('rejeita 73 caracteres ASCII', () => {
    expect(senhaDentroDoLimiteDeBytes(new FormControl('a'.repeat(73)))).toEqual({ bytesExcedidos: true });
  });

  it('conta dois bytes por caractere acentuado', () => {
    expect(senhaDentroDoLimiteDeBytes(new FormControl('é'.repeat(36)))).toBeNull();
    expect(senhaDentroDoLimiteDeBytes(new FormControl('é'.repeat(37)))).toEqual({ bytesExcedidos: true });
  });
});

describe('senhasIguais', () => {
  const criarGrupo = (senha: string, confirmacao: string) =>
    new FormGroup({ senha: new FormControl(senha), confirmarSenha: new FormControl(confirmacao) });

  it('aceita quando os campos são iguais', () => {
    expect(senhasIguais('senha', 'confirmarSenha')(criarGrupo('Abc12345', 'Abc12345'))).toBeNull();
  });

  it('rejeita quando os campos são diferentes', () => {
    expect(senhasIguais('senha', 'confirmarSenha')(criarGrupo('Abc12345', 'Abc12346'))).toEqual({
      senhasDiferentes: true,
    });
  });
});
