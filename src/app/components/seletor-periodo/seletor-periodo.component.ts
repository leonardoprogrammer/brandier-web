import { Component, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { DIAS_MAXIMOS_DO_PERIODO, paraCampoData, periodoEntreDatas, ultimosDias } from '../../core/periodo';
import { Periodo } from '../../models/painel.model';

export const OPCOES_DE_DIAS: readonly number[] = [7, 30, 90];

@Component({
  selector: 'app-seletor-periodo',
  imports: [ReactiveFormsModule],
  templateUrl: './seletor-periodo.component.html',
})
export class SeletorPeriodoComponent {
  readonly diasIniciais = input<number>(30);
  readonly permitirTodo = input<boolean>(false);
  readonly periodoAlterado = output<Periodo>();
  readonly todoPeriodo = output<void>();

  protected readonly opcoes = OPCOES_DE_DIAS;
  protected readonly selecao = signal<number | 'personalizado' | 'todo' | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly hoje = paraCampoData(new Date());

  protected readonly de = new FormControl('', { nonNullable: true });
  protected readonly ate = new FormControl(this.hoje, { nonNullable: true });

  protected selecionada(): number | 'personalizado' | 'todo' {
    return this.selecao() ?? this.diasIniciais();
  }

  protected escolher(dias: number): void {
    this.selecao.set(dias);
    this.erro.set(null);
    this.periodoAlterado.emit(ultimosDias(dias));
  }

  protected escolherTodo(): void {
    this.selecao.set('todo');
    this.erro.set(null);
    this.todoPeriodo.emit();
  }

  protected abrirPersonalizado(): void {
    this.selecao.set('personalizado');
  }

  protected aplicar(evento: Event): void {
    evento.preventDefault();
    const periodo = periodoEntreDatas(this.de.value, this.ate.value);
    if (periodo === null) {
      this.erro.set(
        `Informe datas válidas, com o início antes do fim e no máximo ${DIAS_MAXIMOS_DO_PERIODO} dias de intervalo.`,
      );
      return;
    }
    this.erro.set(null);
    this.periodoAlterado.emit(periodo);
  }
}
