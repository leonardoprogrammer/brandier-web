import { Component } from '@angular/core';

export interface PerguntaFrequente {
  pergunta: string;
  resposta: string;
}

export const PASSOS: readonly { titulo: string; descricao: string }[] = [
  {
    titulo: 'Crie sua conta e confirme o e-mail',
    descricao: 'O cadastro é feito com o seu e-mail. Você recebe um link de confirmação e só depois consegue entrar.',
  },
  {
    titulo: 'Crie uma marca',
    descricao: 'Quem cria a marca é o gestor dela. Cada conta pode gerenciar até 2 marcas.',
  },
  {
    titulo: 'Cadastre lojas e produtos',
    descricao: 'Cada marca tem até 5 lojas (os pontos de venda) e um catálogo de até 10 produtos.',
  },
  {
    titulo: 'Convide promotores',
    descricao:
      'O gestor convida pessoas por e-mail, até 5 por marca. Quem recebe o convite aceita dentro do Brandier, em "Como promotor", ou pelo link do e-mail.',
  },
  {
    titulo: 'Registre reposições',
    descricao:
      'Promotores e o gestor escolhem a loja, informam os produtos e as quantidades repostas, e a data e a hora da reposição.',
  },
  {
    titulo: 'Acompanhe no painel e nos relatórios',
    descricao:
      'O painel mostra totais por loja, promotor e produto no período. Os relatórios têm filtros, ordenação e exportação em CSV.',
  },
];

export const PERGUNTAS: readonly PerguntaFrequente[] = [
  {
    pergunta: 'Por que há limites de marcas, lojas, produtos e promotores?',
    resposta:
      'O Brandier é um projeto de portfólio rodando em um servidor pequeno. Os limites (2 marcas por conta, 5 lojas, 10 produtos e 5 promotores por marca) mantêm a demonstração leve e evitam abuso.',
  },
  {
    pergunta: 'Preciso ser gestor para ser promotor?',
    resposta:
      'Não. Gestor e promotor não são tipos de conta: são papéis em cada marca. A mesma pessoa pode gerenciar as suas marcas e, ao mesmo tempo, ser promotora em marcas de outros gestores.',
  },
  {
    pergunta: 'Recebi um convite. O que eu faço?',
    resposta:
      'Entre com a conta cadastrada no e-mail que recebeu o convite (ou crie uma com esse e-mail). O convite aparece no início do painel e em "Como promotor", onde você pode aceitar ou recusar. Ele vale por 7 dias.',
  },
  {
    pergunta: 'Posso editar ou excluir uma reposição?',
    resposta:
      'O gestor pode editar e excluir qualquer reposição da sua marca, sem prazo. O promotor só pode alterar as próprias reposições e apenas nas 24 horas seguintes ao registro. Depois disso, é preciso pedir ao gestor.',
  },
  {
    pergunta: 'O que acontece se um promotor sair da marca?',
    resposta:
      'As reposições que ele já registrou continuam na marca. Ele só deixa de poder registrar novas e de ver as lojas e os produtos da marca.',
  },
  {
    pergunta: 'Como redefino minha senha?',
    resposta:
      'Na tela de entrada, use "Esqueci minha senha". Enviamos um link, válido por 30 minutos, para o e-mail da conta. Ao trocar a senha, as sessões abertas são encerradas.',
  },
  {
    pergunta: 'Meus dados estão seguros?',
    resposta:
      'Guardamos só o necessário: nome, e-mail e a senha criptografada. A sessão usa cookies protegidos e a aplicação limita tentativas de acesso. Mesmo assim, este é um ambiente de demonstração: evite informar dados sensíveis.',
  },
  {
    pergunta: 'Como excluo a minha conta?',
    resposta:
      'Em "Minha conta", no topo do painel, você pode excluir a conta confirmando a senha. Isso apaga também as marcas que você gerencia e as reposições que você registrou. A ação é irreversível.',
  },
];

@Component({
  selector: 'app-como-funciona-conteudo',
  templateUrl: './como-funciona-conteudo.component.html',
})
export class ComoFuncionaConteudoComponent {
  protected readonly passos = PASSOS;
  protected readonly perguntas = PERGUNTAS;
}
