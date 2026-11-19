/** Valores em centavos, sempre inteiros, para a soma nunca acumular erro de ponto flutuante. */
export type Centavos = number;

export type Selo = "mais-pedido" | "novo" | "vegetariano" | "picante";

export interface Opcao {
  id: string;
  nome: string;
  /** Quanto a opção soma ao preço do produto. */
  acrescimo?: Centavos;
}

export interface GrupoDeOpcoes {
  id: string;
  nome: string;
  /** 0 deixa o grupo opcional. */
  minimo: number;
  /** 1 transforma o grupo em escolha única. */
  maximo: number;
  opcoes: readonly Opcao[];
}

export interface Imagem {
  src: string;
  alt: string;
  largura: number;
  altura: number;
  /** Versões em outras larguras ("/img/x-400.webp 400w, /img/x-800.webp 800w"); o navegador escolhe a menor que basta. */
  srcset?: string;
}

export interface Produto {
  id: string;
  categoria: string;
  nome: string;
  descricao?: string;
  preco: Centavos;
  /** Preço riscado ao lado do atual, para mostrar a economia de um combo ou promoção. */
  precoAnterior?: Centavos;
  serve?: string;
  imagem?: Imagem;
  selos?: readonly Selo[];
  grupos?: readonly GrupoDeOpcoes[];
  indisponivel?: boolean;
}

export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
}

/** Horário no formato "HH:MM". Quando o fechamento é menor ou igual à abertura, a faixa passa da meia-noite. */
export type Faixa = readonly [abre: string, fecha: string];

/** Índice 0 é domingo, como em Date.getDay(). */
export type Horarios = readonly [
  readonly Faixa[],
  readonly Faixa[],
  readonly Faixa[],
  readonly Faixa[],
  readonly Faixa[],
  readonly Faixa[],
  readonly Faixa[],
];

export interface Bairro {
  nome: string;
  taxa: Centavos;
}

export interface ConfiguracaoPix {
  /** CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória. */
  chave: string;
  /** Nome do recebedor, até 25 caracteres sem acento no código. */
  recebedor: string;
  /** Cidade do recebedor, até 15 caracteres sem acento no código. */
  cidade: string;
}

export interface Loja {
  id: string;
  nome: string;
  descricao: string;
  /** Endereço público do site, usado nas metatags e no link de compartilhamento. */
  url: string;
  endereco: { rua: string; bairro: string; cidade: string; uf: string; mapa?: string };
  /** DDI, DDD e número, só dígitos: é o formato que o wa.me aceita. */
  whatsapp: string;
  instagram?: string;
  fusoHorario: string;
  horarios: Horarios;
  entrega: {
    ativa: boolean;
    prazo: string;
    pedidoMinimo: Centavos;
    bairros: readonly Bairro[];
    /** Permite pedir de um bairro fora da lista, com a taxa combinada na conversa. */
    aceitaOutrosBairros: boolean;
  };
  retirada: { ativa: boolean; prazo: string };
  pagamento: {
    pix?: ConfiguracaoPix;
    cartao: boolean;
    dinheiro: boolean;
  };
  marca: {
    logo: Imagem;
    capa: Imagem;
    /** Imagem de 1200x630 em JPEG ou PNG para a prévia do link no WhatsApp e nas redes. */
    compartilhamento?: Imagem;
    corPrimaria: string;
  };
  categorias: readonly Categoria[];
  produtos: readonly Produto[];
  /** Produtos oferecidos na sacola, na ordem de prioridade. */
  sugestoes: readonly string[];
  /** Mostra um aviso de que a loja e os preços são fictícios. */
  demonstracao?: { aviso: string };
  credito?: { texto: string; url: string };
}
