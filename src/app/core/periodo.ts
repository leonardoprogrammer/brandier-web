import { Periodo } from '../models/painel.model';

export const DIAS_MAXIMOS_DO_PERIODO = 366;

function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

function lerData(valor: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) {
    return null;
  }
  const [ano, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia ? data : null;
}

export function paraCampoData(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function ultimosDias(dias: number, agora: Date = new Date()): Periodo {
  const fim = somarDias(inicioDoDia(agora), 1);
  return { de: somarDias(fim, -dias).toISOString(), ate: fim.toISOString() };
}

export function periodoEntreDatas(de: string, ate: string): Periodo | null {
  const inicio = lerData(de);
  const ultimoDia = lerData(ate);
  if (inicio === null || ultimoDia === null) {
    return null;
  }

  const fim = somarDias(ultimoDia, 1);
  if (inicio.getTime() >= fim.getTime()) {
    return null;
  }
  const dias = Math.round((fim.getTime() - inicio.getTime()) / 86_400_000);
  return dias > DIAS_MAXIMOS_DO_PERIODO ? null : { de: inicio.toISOString(), ate: fim.toISOString() };
}
