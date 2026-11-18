import type { Centavos, GrupoDeOpcoes, Produto } from "./tipos.ts";

/** Opções escolhidas em cada grupo, pelo id do grupo. */
export type Escolhas = Readonly<Record<string, readonly string[]>>;

const formatoReal = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function reais(valor: Centavos): string {
  // O Intl separa "R$" do número com espaço não separável; troco por espaço comum
  // para o texto copiado e a mensagem do WhatsApp ficarem iguais ao que se lê.
  return formatoReal.format(valor / 100).replace(/s/g, " ");
}

export function precoUnitario(produto: Produto, escolhas: Escolhas): Centavos {
  let total = produto.preco;
  for (const grupo of produto.grupos ?? []) {
    for (const id of escolhas[grupo.id] ?? []) {
      total += grupo.opcoes.find((opcao) => opcao.id === id)?.acrescimo ?? 0;
    }
  }
  return total;
}

/**
 * Menor preço possível com os grupos obrigatórios preenchidos. Quando é maior que o
 * preço-base ou quando os obrigatórios têm opções de preços diferentes, o cardápio
 * mostra "a partir de".
 */
export function precoMinimo(produto: Produto): { valor: Centavos; aPartirDe: boolean } {
  let valor = produto.preco;
  let aPartirDe = false;
  for (const grupo of produto.grupos ?? []) {
    if (grupo.minimo === 0) continue;
    const acrescimos = grupo.opcoes.map((opcao) => opcao.acrescimo ?? 0).sort((a, b) => a - b);
    valor += acrescimos.slice(0, grupo.minimo).reduce((soma, atual) => soma + atual, 0);
    if (new Set(acrescimos).size > 1) aPartirDe = true;
  }
  return { valor, aPartirDe };
}

/** Grupos obrigatórios que ainda não têm o mínimo de opções escolhidas. */
export function gruposPendentes(produto: Produto, escolhas: Escolhas): GrupoDeOpcoes[] {
  return (produto.grupos ?? []).filter((grupo) => (escolhas[grupo.id]?.length ?? 0) < grupo.minimo);
}

/**
 * Confere as escolhas contra o cardápio atual: grupos e opções que existem, sem
 * repetição e dentro do mínimo e do máximo de cada grupo. Serve tanto para a tela do
 * produto quanto para descartar uma sacola salva que não bate mais com o cardápio.
 */
export function escolhasValidas(produto: Produto, escolhas: Escolhas): boolean {
  const grupos = produto.grupos ?? [];
  for (const id of Object.keys(escolhas)) {
    if (!grupos.some((grupo) => grupo.id === id)) return false;
  }
  return grupos.every((grupo) => {
    const selecionadas = escolhas[grupo.id] ?? [];
    if (new Set(selecionadas).size !== selecionadas.length) return false;
    if (selecionadas.length < grupo.minimo || selecionadas.length > grupo.maximo) return false;
    return selecionadas.every((id) => grupo.opcoes.some((opcao) => opcao.id === id));
  });
}

/** Nomes das opções escolhidas, por grupo, na ordem do cardápio. */
export function descreverEscolhas(produto: Produto, escolhas: Escolhas): { grupo: string; opcoes: string[] }[] {
  const resultado: { grupo: string; opcoes: string[] }[] = [];
  for (const grupo of produto.grupos ?? []) {
    const selecionadas = escolhas[grupo.id] ?? [];
    const nomes = grupo.opcoes.filter((opcao) => selecionadas.includes(opcao.id)).map((opcao) => opcao.nome);
    if (nomes.length > 0) resultado.push({ grupo: grupo.nome, opcoes: nomes });
  }
  return resultado;
}
