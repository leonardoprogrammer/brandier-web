import { Promotor } from './promotor.model';
import { Reposicao } from './reposicao.model';

export interface Periodo {
  de: string;
  ate: string;
}

export interface Totais {
  reposicoes: number;
  unidades: number;
}

export interface Agregado {
  id: string;
  nome: string;
  reposicoes: number;
  unidades: number;
}

export interface UsoDeLimites {
  lojas: number;
  limiteLojas: number;
  produtos: number;
  limiteProdutos: number;
  promotores: number;
  limitePromotores: number;
}

export interface MarcaNoPainel {
  marcaId: string;
  marcaNome: string;
  totais: Totais;
  uso: UsoDeLimites;
}

export interface PainelGestor {
  periodo: Periodo;
  marcas: MarcaNoPainel[];
  limiteMarcas: number;
}

export interface PainelMarca {
  periodo: Periodo;
  marcaId: string;
  marcaNome: string;
  totais: Totais;
  porLoja: Agregado[];
  porPromotor: Agregado[];
  porProduto: Agregado[];
  promotoresSemAtividade: Promotor[];
  uso: UsoDeLimites;
}

export interface PainelAutor {
  periodo: Periodo;
  possuiReposicoes: boolean;
  marcasComoPromotor: number;
  totais: Totais;
  porMarca: Agregado[];
  porLoja: Agregado[];
  porProduto: Agregado[];
  ultimas: Reposicao[];
}
