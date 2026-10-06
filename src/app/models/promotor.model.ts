export type StatusConvite = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'EXPIRADO';

export interface Promotor {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
  entrouEm: string;
}

export interface Convite {
  id: string;
  email: string;
  status: StatusConvite;
  expiraEm: string;
  criadoEm: string;
}

export interface PromotoresDaMarca {
  promotores: Promotor[];
  convites: Convite[];
  usadas: number;
  limite: number;
}

export interface ConviteRecebido {
  marcaNome: string;
  gestorNome: string;
  email: string;
  expiraEm: string;
}

export interface VinculoPromotor {
  marcaId: string;
  marcaNome: string;
  gestorNome: string;
  entrouEm: string;
}

export interface MeusVinculos {
  vinculos: VinculoPromotor[];
}
