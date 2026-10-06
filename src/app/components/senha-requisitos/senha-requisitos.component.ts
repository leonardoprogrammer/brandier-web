import { Component, computed, input } from '@angular/core';

import { SENHA_TAMANHO_MINIMO } from '../../validators/senha.validator';

@Component({
  selector: 'app-senha-requisitos',
  templateUrl: './senha-requisitos.component.html',
})
export class SenhaRequisitosComponent {
  readonly senha = input.required<string>();

  protected readonly requisitos = computed(() => {
    const senha = this.senha();
    return [
      { descricao: `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres`, atendido: senha.length >= SENHA_TAMANHO_MINIMO },
      { descricao: 'Pelo menos uma letra', atendido: /\p{L}/u.test(senha) },
      { descricao: 'Pelo menos um número', atendido: /\d/.test(senha) },
    ];
  });
}
