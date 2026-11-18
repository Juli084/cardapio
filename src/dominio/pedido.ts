import { descreverEscolhas, reais } from "./preco.ts";
import { totalDoItem, type ItemDaSacola } from "./sacola.ts";
import type { Centavos, Loja, Produto } from "./tipos.ts";

export type Modo = "entrega" | "retirada";
export type FormaDePagamento = "pix" | "cartao" | "dinheiro";

/** Valor do seletor de bairro quando o cliente mora fora da lista. */
export const OUTRO_BAIRRO = "__outro__";

export interface DadosDoCliente {
  nome: string;
  modo: Modo;
  bairro: string;
  bairroOutro: string;
  endereco: string;
  complemento: string;
  referencia: string;
}

export interface Pagamento {
  forma: FormaDePagamento;
  cartao: "credito" | "debito";
  /** Texto digitado no campo "troco para"; vazio quando não precisa de troco. */
  trocoPara: string;
}

export interface Totais {
  subtotal: Centavos;
  /** null quando a taxa é combinada na conversa (bairro fora da lista). */
  taxa: Centavos | null;
  total: Centavos | null;
}

export const CLIENTE_VAZIO: DadosDoCliente = {
  nome: "",
  modo: "entrega",
  bairro: "",
  bairroOutro: "",
  endereco: "",
  complemento: "",
  referencia: "",
};

export function taxaDeEntrega(loja: Loja, cliente: DadosDoCliente): Centavos | null {
  if (cliente.modo === "retirada") return 0;
  if (cliente.bairro === OUTRO_BAIRRO) return null;
  return loja.entrega.bairros.find((bairro) => bairro.nome === cliente.bairro)?.taxa ?? null;
}

export function calcularTotais(loja: Loja, subtotal: Centavos, cliente: DadosDoCliente): Totais {
  const taxa = taxaDeEntrega(loja, cliente);
  return { subtotal, taxa, total: taxa === null ? null : subtotal + taxa };
}

/**
 * Converte "100", "100,50", "1.000" ou "R$ 100,50" em centavos. Com vírgula, os pontos são
 * separador de milhar; sem vírgula, um ponto seguido de 1 ou 2 dígitos é o decimal.
 * Devolve null se não for um valor.
 */
export function lerValor(texto: string): Centavos | null {
  let limpo = texto.replace(/[R$\s]/g, "");
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(limpo)) limpo = limpo.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}

export type Campo =
  | "horario"
  | "sacola"
  | "nome"
  | "bairro"
  | "bairroOutro"
  | "endereco"
  | "minimo"
  | "pagamento"
  | "troco";

export interface Problema {
  campo: Campo;
  mensagem: string;
}

/** Tudo o que impede o envio, com o campo a destacar na tela. */
export function problemasDoPedido(
  loja: Loja,
  itens: readonly ItemDaSacola[],
  cliente: DadosDoCliente,
  pagamento: Pagamento,
  totais: Totais,
  aberto: boolean,
): Problema[] {
  const problemas: Problema[] = [];
  // Na loja de demonstração o envio fica liberado fora do horário, para quem avalia o
  // cardápio conseguir testar o pedido inteiro a qualquer hora.
  if (!aberto && !loja.demonstracao) {
    problemas.push({ campo: "horario", mensagem: "A loja está fechada agora. O pedido fica salvo na sacola." });
  }
  if (itens.length === 0) problemas.push({ campo: "sacola", mensagem: "A sacola está vazia." });
  if (cliente.modo === "entrega" && !loja.entrega.ativa) {
    problemas.push({ campo: "bairro", mensagem: "Esta loja não faz entrega." });
  }
  if (cliente.modo === "retirada" && !loja.retirada.ativa) {
    problemas.push({ campo: "bairro", mensagem: "Esta loja não tem retirada no balcão." });
  }
  const formaAtiva =
    pagamento.forma === "pix" ? Boolean(loja.pagamento.pix) : loja.pagamento[pagamento.forma];
  if (!formaAtiva) problemas.push({ campo: "pagamento", mensagem: "Escolha uma forma de pagamento aceita." });
  if (cliente.nome.trim().length < 2) problemas.push({ campo: "nome", mensagem: "Informe seu nome." });

  if (cliente.modo === "entrega") {
    if (cliente.bairro === "") problemas.push({ campo: "bairro", mensagem: "Escolha o bairro." });
    if (cliente.bairro === OUTRO_BAIRRO && cliente.bairroOutro.trim() === "") {
      problemas.push({ campo: "bairroOutro", mensagem: "Informe o nome do bairro." });
    }
    if (cliente.endereco.trim().length < 5) {
      problemas.push({ campo: "endereco", mensagem: "Informe a rua e o número." });
    }
    if (totais.subtotal < loja.entrega.pedidoMinimo) {
      const falta = reais(loja.entrega.pedidoMinimo - totais.subtotal);
      problemas.push({
        campo: "minimo",
        mensagem: `O pedido mínimo para entrega é ${reais(loja.entrega.pedidoMinimo)}. Faltam ${falta}.`,
      });
    }
  }

  if (pagamento.forma === "pix" && totais.total === null) {
    problemas.push({
      campo: "pagamento",
      mensagem: "Com a taxa de entrega a combinar, o valor do Pix só fecha na conversa. Escolha outra forma.",
    });
  }
  if (pagamento.forma === "dinheiro" && pagamento.trocoPara.trim() !== "") {
    const troco = lerValor(pagamento.trocoPara);
    if (troco === null) {
      problemas.push({ campo: "troco", mensagem: "Digite o valor do troco, por exemplo 100 ou 50,00." });
    } else if (totais.total !== null && troco < totais.total) {
      problemas.push({ campo: "troco", mensagem: `O troco precisa ser para ${reais(totais.total)} ou mais.` });
    }
  }
  return problemas;
}

const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Código curto para a loja e o cliente se referirem ao pedido, sem letras que se confundem. */
export function gerarCodigo(
  sortear: (quantidade: number) => ArrayLike<number> = (quantidade) => crypto.getRandomValues(new Uint8Array(quantidade)),
): string {
  return Array.from(sortear(4), (byte) => ALFABETO[byte % ALFABETO.length]).join("");
}

function descreverPagamento(pagamento: Pagamento, modo: Modo, totais: Totais): string {
  const momento = modo === "entrega" ? "na entrega" : "na retirada";
  switch (pagamento.forma) {
    case "pix":
      return "Pix (código gerado no cardápio). Envio o comprovante nesta conversa.";
    case "cartao":
      return `cartão de ${pagamento.cartao === "credito" ? "crédito" : "débito"} ${momento}`;
    case "dinheiro": {
      const troco = lerValor(pagamento.trocoPara);
      if (troco === null || troco === 0) return `dinheiro ${momento}, sem troco`;
      const devolver = totais.total === null ? "" : ` (devolver ${reais(troco - totais.total)})`;
      return `dinheiro ${momento}, troco para ${reais(troco)}${devolver}`;
    }
  }
}

export function mensagemDoPedido(
  loja: Loja,
  codigo: string,
  itens: readonly ItemDaSacola[],
  produtos: ReadonlyMap<string, Produto>,
  cliente: DadosDoCliente,
  pagamento: Pagamento,
  totais: Totais,
): string {
  const linhas: string[] = [`*Pedido ${codigo}* · ${loja.nome}`, ""];

  for (const item of itens) {
    const produto = produtos.get(item.produtoId);
    if (!produto) continue;
    linhas.push(`${item.quantidade}x ${produto.nome} · ${reais(totalDoItem(item, produtos))}`);
    for (const { grupo, opcoes } of descreverEscolhas(produto, item.escolhas)) {
      linhas.push(`   ${grupo}: ${opcoes.join(", ")}`);
    }
    if (item.observacao) linhas.push(`   Obs.: ${item.observacao}`);
  }

  linhas.push("", `Subtotal: ${reais(totais.subtotal)}`);
  if (cliente.modo === "entrega") {
    const bairro = cliente.bairro === OUTRO_BAIRRO ? cliente.bairroOutro.trim() : cliente.bairro;
    const taxa = totais.taxa === null ? "a combinar" : totais.taxa === 0 ? "grátis" : reais(totais.taxa);
    linhas.push(`Entrega (${bairro}): ${taxa}`);
  }
  linhas.push(
    totais.total === null ? `*Total: ${reais(totais.subtotal)} + entrega*` : `*Total: ${reais(totais.total)}*`,
    "",
  );

  if (cliente.modo === "entrega") {
    linhas.push("*Entrega*", `Nome: ${cliente.nome.trim()}`, `Endereço: ${cliente.endereco.trim()}`);
    linhas.push(`Bairro: ${cliente.bairro === OUTRO_BAIRRO ? cliente.bairroOutro.trim() : cliente.bairro}`);
    if (cliente.complemento.trim()) linhas.push(`Complemento: ${cliente.complemento.trim()}`);
    if (cliente.referencia.trim()) linhas.push(`Referência: ${cliente.referencia.trim()}`);
  } else {
    linhas.push("*Retirada no balcão*", `Nome: ${cliente.nome.trim()}`);
  }
  linhas.push("", `*Pagamento:* ${descreverPagamento(pagamento, cliente.modo, totais)}`);
  return linhas.join("\n");
}

/** O texto inteiro passa por encodeURIComponent: um "#" ou "&" no endereço cortaria a mensagem. */
export function linkDoWhatsApp(numero: string, mensagem: string): string {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
}
