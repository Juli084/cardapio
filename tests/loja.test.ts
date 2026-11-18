import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loja } from "../src/dados/loja.ts";
import { minutosDe } from "../src/dominio/horario.ts";
import { payloadPix, tipoDeChave } from "../src/dominio/pix.ts";
import { dadosEstruturados } from "../src/dominio/seo.ts";
import type { Loja } from "../src/dominio/tipos.ts";

/*
 * Confere a configuração da loja. É o arquivo que muda a cada cliente, então um erro de
 * digitação aqui precisa quebrar o build, não aparecer para quem está pedindo.
 */
const config: Loja = loja;
const imagens = [
  config.marca.logo,
  config.marca.capa,
  ...(config.marca.compartilhamento ? [config.marca.compartilhamento] : []),
  ...config.produtos.flatMap((p) => (p.imagem ? [p.imagem] : [])),
];

describe("configuração da loja", () => {
  it("tem ids únicos de categoria e de produto", () => {
    const categorias = config.categorias.map((c) => c.id);
    const produtos = config.produtos.map((p) => p.id);
    expect(new Set(categorias).size).toBe(categorias.length);
    expect(new Set(produtos).size).toBe(produtos.length);
  });

  it("põe cada produto numa categoria que existe e não deixa categoria vazia", () => {
    const categorias = new Set(config.categorias.map((c) => c.id));
    for (const produto of config.produtos) expect(categorias, produto.id).toContain(produto.categoria);
    for (const categoria of config.categorias) {
      expect(config.produtos.some((p) => p.categoria === categoria.id), categoria.id).toBe(true);
    }
  });

  it("usa preços inteiros e positivos, e preço anterior maior que o atual", () => {
    for (const produto of config.produtos) {
      expect(Number.isInteger(produto.preco) && produto.preco > 0, produto.id).toBe(true);
      if (produto.precoAnterior !== undefined) expect(produto.precoAnterior, produto.id).toBeGreaterThan(produto.preco);
      for (const grupo of produto.grupos ?? []) {
        for (const opcao of grupo.opcoes) {
          const acrescimo = opcao.acrescimo ?? 0;
          expect(Number.isInteger(acrescimo) && acrescimo >= 0, `${produto.id}/${opcao.id}`).toBe(true);
        }
      }
    }
  });

  it("monta grupos de opções coerentes", () => {
    for (const produto of config.produtos) {
      const grupos = produto.grupos ?? [];
      expect(new Set(grupos.map((g) => g.id)).size, produto.id).toBe(grupos.length);
      for (const grupo of grupos) {
        const id = `${produto.id}/${grupo.id}`;
        expect(grupo.minimo, id).toBeGreaterThanOrEqual(0);
        expect(grupo.maximo, id).toBeGreaterThanOrEqual(Math.max(1, grupo.minimo));
        expect(grupo.maximo, id).toBeLessThanOrEqual(grupo.opcoes.length);
        expect(new Set(grupo.opcoes.map((o) => o.id)).size, id).toBe(grupo.opcoes.length);
      }
    }
  });

  it("sugere só produtos que existem", () => {
    const ids = new Set(config.produtos.map((p) => p.id));
    for (const id of config.sugestoes) expect(ids, id).toContain(id);
  });

  it("aponta para imagens que existem em public/, com texto alternativo nos produtos", () => {
    for (const imagem of imagens) expect(existsSync(`public${imagem.src}`), imagem.src).toBe(true);
    for (const produto of config.produtos) if (produto.imagem) expect(produto.imagem.alt, produto.id).not.toBe("");
  });

  it("escreve os horários como HH:MM válidos", () => {
    for (const faixas of config.horarios) {
      for (const faixa of faixas) {
        for (const hora of faixa) {
          expect(hora).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
          expect(minutosDe(hora)).toBeLessThan(24 * 60);
        }
      }
    }
  });

  it("tem WhatsApp com DDI e chave Pix num formato aceito", () => {
    expect(config.whatsapp).toMatch(/^55\d{10,11}$/);
    if (config.pagamento.pix) {
      expect(tipoDeChave(config.pagamento.pix.chave)).not.toBeNull();
      expect(() => payloadPix({ ...config.pagamento.pix!, valor: 100, txid: "TESTE" })).not.toThrow();
    }
  });

  it("aceita ao menos um jeito de receber e um de pagar", () => {
    expect(config.entrega.ativa || config.retirada.ativa).toBe(true);
    expect(Boolean(config.pagamento.pix) || config.pagamento.cartao || config.pagamento.dinheiro).toBe(true);
    if (config.entrega.ativa) expect(config.entrega.bairros.length > 0 || config.entrega.aceitaOutrosBairros).toBe(true);
  });

  it("gera dados estruturados com um item por produto disponível", () => {
    const dados = dadosEstruturados(config) as { hasMenu: { hasMenuSection: { hasMenuItem: unknown[] }[] } };
    const itens = dados.hasMenu.hasMenuSection.flatMap((secao) => secao.hasMenuItem);
    expect(itens).toHaveLength(config.produtos.filter((p) => !p.indisponivel).length);
  });
});
