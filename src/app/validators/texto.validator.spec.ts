import { FormControl } from '@angular/forms';

import { semSoEspacos } from './texto.validator';

describe('semSoEspacos', () => {
  it('aceita texto vazio, deixando a obrigatoriedade para o required', () => {
    expect(semSoEspacos(new FormControl(''))).toBeNull();
  });

  it('aceita texto com conteúdo', () => {
    expect(semSoEspacos(new FormControl('  Alfa '))).toBeNull();
  });

  it('rejeita texto só com espaços', () => {
    expect(semSoEspacos(new FormControl('   '))).toEqual({ semSoEspacos: true });
  });

  it('ignora valores que não são texto', () => {
    expect(semSoEspacos(new FormControl(null))).toBeNull();
  });
});
