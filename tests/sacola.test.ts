import { describe, expect, it } from "vitest";
import {
  escolhasValidas,
  gruposPendentes,
  precoMinimo,
  precoUnitario,
  reais,
} from "../src/dominio/preco.ts";
import {
  QUANTIDADE_MAXIMA,
  restaurarSacola,
  sacolaReducer,
  subtotal,
  type ItemDaSacola,
} from "../src/dominio/sacola.ts";
import type { Produto } from "../src/dominio/tipos.ts";

const lanche: Produto = {
  id: "lanche",
  categoria: "lanches",
  nome: "Lanche",
  preco: 3000,
  grupos: [
    {
      id: "ponto",
      nome: "Ponto",
      minimo: 1,
      maximo: 1,
      opcoes: [
        { id: "mal", nome: "Mal passado" },
        { id: "bem", nome: "Bem passado" },
      ],
    },
    {
      id: "extras",
      nome: "Extras",
      minimo: 0,
      maximo: 2,
      opcoes: [
        { id: "bacon", nome: "Bacon", acrescimo: 500 },
        { id: "ovo", nome: "Ovo", acrescimo: 250 },
        { id: "queijo", nome: "Queijo", acrescimo: 300 },
      ],
    },
  ],
};

const batata: Produto = {
  id: "batata",
  categoria: "porcoes",
  nome: "Batata",
  preco: 1500,
  grupos: [
    {
      id: "tamanho",
      nome: "Tamanho",
      minimo: 1,
      maximo: 1,
      opcoes: [
        { id: "p", nome: "P" },
        { id: "g", nome: "G", acrescimo: 1000 },
      ],
    },
  ],
};

const refri: Produto = { id: "refri", categoria: "bebidas", nome: "Refri", preco: 700 };
const esgotado: Produto = { id: "esgotado", categoria: "bebidas", nome: "Esgotado", preco: 100, indisponivel: true };
const produtos = new Map([lanche, batata, refri, esgotado].map((produto) => [produto.id, produto]));

describe("preço e opções", () => {
  it("formata em reais com espaço comum", () => {
    expect(reais(123456)).toBe("R$ 1.234,56");
  });

  it("soma os acréscimos das opções escolhidas", () => {
    expect(precoUnitario(lanche, { ponto: ["mal"], extras: ["bacon", "ovo"] })).toBe(3750);
  });

  it("mostra 'a partir de' só quando o obrigatório muda o preço", () => {
    expect(precoMinimo(batata)).toEqual({ valor: 1500, aPartirDe: true });
    expect(precoMinimo(lanche)).toEqual({ valor: 3000, aPartirDe: false });
    expect(precoMinimo(refri)).toEqual({ valor: 700, aPartirDe: false });
  });

  it("aponta o grupo obrigatório que falta", () => {
    expect(gruposPendentes(lanche, { extras: ["bacon"] }).map((grupo) => grupo.id)).toEqual(["ponto"]);
    expect(gruposPendentes(lanche, { ponto: ["bem"] })).toEqual([]);
  });

  it("recusa opção inexistente, repetida, acima do máximo ou grupo desconhecido", () => {
    expect(escolhasValidas(lanche, { ponto: ["mal"] })).toBe(true);
    expect(escolhasValidas(lanche, { ponto: ["cru"] })).toBe(false);
    expect(escolhasValidas(lanche, { ponto: ["mal"], extras: ["bacon", "bacon"] })).toBe(false);
    expect(escolhasValidas(lanche, { ponto: ["mal"], extras: ["bacon", "ovo", "queijo"] })).toBe(false);
    expect(escolhasValidas(lanche, { ponto: ["mal", "bem"] })).toBe(false);
    expect(escolhasValidas(lanche, { ponto: ["mal"], molho: ["x"] })).toBe(false);
    expect(escolhasValidas(lanche, {})).toBe(false);
  });
});

describe("sacola", () => {
  const adicionar = (itens: ItemDaSacola[], produtoId: string, escolhas = {}, observacao = "", quantidade = 1) =>
    sacolaReducer(itens, { tipo: "adicionar", item: { produtoId, escolhas, observacao, quantidade } });

  it("junta o mesmo produto com as mesmas opções, em qualquer ordem", () => {
    let itens = adicionar([], "lanche", { ponto: ["mal"], extras: ["bacon", "ovo"] });
    itens = adicionar(itens, "lanche", { extras: ["ovo", "bacon"], ponto: ["mal"] }, "", 2);
    expect(itens).toHaveLength(1);
    expect(itens[0]?.quantidade).toBe(3);
  });

  it("separa quando muda a opção ou a observação", () => {
    let itens = adicionar([], "lanche", { ponto: ["mal"] });
    itens = adicionar(itens, "lanche", { ponto: ["bem"] });
    itens = adicionar(itens, "lanche", { ponto: ["bem"] }, "sem cebola");
    expect(itens).toHaveLength(3);
  });

  it("limita a quantidade e remove quando chega a zero", () => {
    let itens = adicionar([], "refri", {}, "", 98);
    itens = adicionar(itens, "refri", {}, "", 5);
    expect(itens[0]?.quantidade).toBe(QUANTIDADE_MAXIMA);
    const chave = itens[0]?.chave ?? "";
    expect(sacolaReducer(itens, { tipo: "quantidade", chave, quantidade: 0 })).toEqual([]);
  });

  it("calcula o subtotal pelo cardápio", () => {
    let itens = adicionar([], "lanche", { ponto: ["mal"], extras: ["bacon"] }, "", 2);
    itens = adicionar(itens, "batata", { tamanho: ["g"] });
    expect(subtotal(itens, produtos)).toBe(2 * 3500 + 2500);
  });
});

describe("sacola salva no navegador", () => {
  it("ignora preço salvo e recalcula pelo cardápio atual", () => {
    const salvo = [{ produtoId: "refri", escolhas: {}, observacao: "", quantidade: 2, preco: 1 }];
    const itens = restaurarSacola(salvo, produtos);
    expect(subtotal(itens, produtos)).toBe(1400);
  });

  it("descarta item removido, indisponível, com opção inválida ou quantidade estranha", () => {
    const salvo = [
      { produtoId: "sumiu", escolhas: {}, observacao: "", quantidade: 1 },
      { produtoId: "esgotado", escolhas: {}, observacao: "", quantidade: 1 },
      { produtoId: "lanche", escolhas: { ponto: ["cru"] }, observacao: "", quantidade: 1 },
      { produtoId: "refri", escolhas: {}, observacao: "", quantidade: -3 },
      { produtoId: "refri", escolhas: {}, observacao: "", quantidade: 1.5 },
      { produtoId: "refri", escolhas: { x: "y" }, observacao: "", quantidade: 1 },
      "texto solto",
      null,
      { produtoId: "batata", escolhas: { tamanho: ["p"] }, observacao: "bem sequinha", quantidade: 1 },
    ];
    const itens = restaurarSacola(salvo, produtos);
    expect(itens.map((item) => item.produtoId)).toEqual(["batata"]);
  });

  it("devolve sacola vazia para qualquer coisa que não seja lista", () => {
    expect(restaurarSacola({ itens: [] }, produtos)).toEqual([]);
    expect(restaurarSacola(null, produtos)).toEqual([]);
  });
});
