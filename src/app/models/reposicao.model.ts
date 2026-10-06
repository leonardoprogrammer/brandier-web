export interface ItemReposicao {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
}

export interface Reposicao {
  id: string;
  marcaId: string;
  marcaNome: string;
  lojaId: string;
  lojaNome: string;
  autorNome: string;
  repostoEm: string;
  observacoes: string | null;
  itens: ItemReposicao[];
  totalUnidades: number;
  criadoEm: string;
  podeEditar: boolean;
  editavelAte: string | null;
}

export interface Pagina<T> {
  conteudo: T[];
  pagina: number;
  tamanho: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface DadosItemReposicao {
  produtoId: string;
  quantidade: number;
}

export interface DadosReposicao {
  lojaId: string;
  repostoEm: string;
  itens: DadosItemReposicao[];
  observacoes: string;
}

export interface Relatorio extends Pagina<Reposicao> {
  totais: { reposicoes: number; unidades: number };
}

export type CampoDeOrdenacao = 'data' | 'loja' | 'autor';
export type SentidoDaOrdenacao = 'asc' | 'desc';

export interface FiltroDoRelatorio {
  lojaId: string;
  autorId: string;
  produtoId: string;
  de: string | null;
  ate: string | null;
  ordenar: CampoDeOrdenacao;
  direcao: SentidoDaOrdenacao;
}
