import { describe, expect, it } from "vitest";
import { loja } from "../src/dados/loja.ts";
import {
  CLIENTE_VAZIO,
  OUTRO_BAIRRO,
  calcularTotais,
  gerarCodigo,
  lerValor,
  linkDoWhatsApp,
  mensagemDoPedido,
  problemasDoPedido,
  type DadosDoCliente,
  type Pagamento,
} from "../src/dominio/pedido.ts";
import { sacolaReducer, subtotal, type ItemDaSacola } from "../src/dominio/sacola.ts";
import type { Loja } from "../src/dominio/tipos.ts";

const produtos = new Map(loja.produtos.map((produto) => [produto.id, produto]));
const { demonstracao: _demonstracao, ...semAviso } = loja;
const lojaReal: Loja = semAviso;

function sacola(...entradas: [string, Record<string, string[]>, string?, number?][]): ItemDaSacola[] {
  return entradas.reduce<ItemDaSacola[]>(
    (itens, [produtoId, escolhas, observacao = "", quantidade = 1]) =>
      sacolaReducer(itens, { tipo: "adicionar", item: { produtoId, escolhas, observacao, quantidade } }),
    [],
  );
}

const cliente: DadosDoCliente = {
  ...CLIENTE_VAZIO,
  nome: "Ana",
  bairro: "Campolim",
  endereco: "Rua das Flores, 123 #2",
  complemento: "ap 12 & 13",
};
const pix: Pagamento = { forma: "pix", cartao: "credito", trocoPara: "" };

describe("valores digitados", () => {
  it("entende vírgula, ponto de milhar e ponto decimal", () => {
    expect(lerValor("100")).toBe(10000);
    expect(lerValor("100,5")).toBe(10050);
    expect(lerValor("R$ 1.234,56")).toBe(123456);
    expect(lerValor("1.000")).toBe(100000);
    expect(lerValor("50.00")).toBe(5000);
    expect(lerValor("cem")).toBeNull();
    expect(lerValor("")).toBeNull();
  });
});

describe("totais", () => {
  it("soma a taxa do bairro e zera na retirada", () => {
    expect(calcularTotais(loja, 3000, cliente)).toEqual({ subtotal: 3000, taxa: 700, total: 3700 });
    expect(calcularTotais(loja, 3000, { ...cliente, modo: "retirada" })).toEqual({
      subtotal: 3000,
      taxa: 0,
      total: 3000,
    });
  });

  it("deixa o total em aberto para bairro fora da lista", () => {
    expect(calcularTotais(loja, 3000, { ...cliente, bairro: OUTRO_BAIRRO, bairroOutro: "Ipanema" })).toEqual({
      subtotal: 3000,
      taxa: null,
      total: null,
    });
  });
});

describe("validação antes de enviar", () => {
  const itens = sacola(["classico", { ponto: ["ao-ponto"] }]);
  const totais = calcularTotais(loja, subtotal(itens, produtos), cliente);

  it("aceita um pedido completo", () => {
    expect(problemasDoPedido(loja, itens, cliente, pix, totais, true)).toEqual([]);
  });

  it("bloqueia fora do horário numa loja real, mas não na demonstração", () => {
    expect(problemasDoPedido(lojaReal, itens, cliente, pix, totais, false).map((p) => p.campo)).toEqual([
      "horario",
    ]);
    expect(problemasDoPedido(loja, itens, cliente, pix, totais, false)).toEqual([]);
  });

  it("aponta nome, bairro e endereço que faltam", () => {
    const vazio = { ...CLIENTE_VAZIO };
    const campos = problemasDoPedido(loja, itens, vazio, pix, calcularTotais(loja, 3290, vazio), true).map(
      (p) => p.campo,
    );
    expect(campos).toEqual(expect.arrayContaining(["nome", "bairro", "endereco", "pagamento"]));
  });

  it("cobra o pedido mínimo só na entrega", () => {
    const pouco = sacola(["agua", { tipo: ["sem-gas"] }]);
    const valor = subtotal(pouco, produtos);
    const naEntrega = problemasDoPedido(loja, pouco, cliente, pix, calcularTotais(loja, valor, cliente), true);
    expect(naEntrega.map((p) => p.campo)).toContain("minimo");
    const retirada = { ...cliente, modo: "retirada" as const };
    expect(problemasDoPedido(loja, pouco, retirada, pix, calcularTotais(loja, valor, retirada), true)).toEqual([]);
  });

  it("não deixa pagar com Pix quando a taxa é a combinar", () => {
    const outro = { ...cliente, bairro: OUTRO_BAIRRO, bairroOutro: "Ipanema" };
    const campos = problemasDoPedido(loja, itens, outro, pix, calcularTotais(loja, 3290, outro), true).map(
      (p) => p.campo,
    );
    expect(campos).toEqual(["pagamento"]);
  });

  it("confere o troco contra o total", () => {
    const dinheiro = (trocoPara: string): Pagamento => ({ forma: "dinheiro", cartao: "credito", trocoPara });
    expect(problemasDoPedido(loja, itens, cliente, dinheiro("20"), totais, true).map((p) => p.campo)).toEqual([
      "troco",
    ]);
    expect(problemasDoPedido(loja, itens, cliente, dinheiro("abc"), totais, true).map((p) => p.campo)).toEqual([
      "troco",
    ]);
    expect(problemasDoPedido(loja, itens, cliente, dinheiro("50"), totais, true)).toEqual([]);
    expect(problemasDoPedido(loja, itens, cliente, dinheiro(""), totais, true)).toEqual([]);
  });
});

describe("mensagem para o WhatsApp", () => {
  const itens = sacola(
    ["classico", { ponto: ["ao-ponto"], adicionais: ["bacon", "cheddar"] }, "sem cebola", 2],
    ["coca-cola-lata", { versao: ["sem-acucar"] }],
  );
  const totais = calcularTotais(loja, subtotal(itens, produtos), cliente);

  it("lista itens com opções, observação, taxa, total, endereço e pagamento", () => {
    const texto = mensagemDoPedido(loja, "K7Q2", itens, produtos, cliente, pix, totais);
    expect(texto).toBe(
      [
        "*Pedido K7Q2* · Hamburgueria do Francesco",
        "",
        "2x Clássico · R$ 83,80",
        "   Ponto da carne: Ao ponto",
        "   Adicionais: Bacon, Cheddar",
        "   Obs.: sem cebola",
        "1x Coca-Cola lata 350 ml · R$ 7,00",
        "   Versão: Sem açúcar",
        "",
        "Subtotal: R$ 90,80",
        "Entrega (Campolim): R$ 7,00",
        "*Total: R$ 97,80*",
        "",
        "*Entrega*",
        "Nome: Ana",
        "Endereço: Rua das Flores, 123 #2",
        "Bairro: Campolim",
        "Complemento: ap 12 & 13",
        "",
        "*Pagamento:* Pix (código gerado no cardápio). Envio o comprovante nesta conversa.",
      ].join("\n"),
    );
  });

  it("descreve troco e retirada", () => {
    const retirada = { ...cliente, modo: "retirada" as const };
    const texto = mensagemDoPedido(
      loja,
      "AB12",
      itens,
      produtos,
      retirada,
      { forma: "dinheiro", cartao: "credito", trocoPara: "100" },
      calcularTotais(loja, subtotal(itens, produtos), retirada),
    );
    expect(texto).toContain("*Retirada no balcão*\nNome: Ana");
    expect(texto).toContain("*Pagamento:* dinheiro na retirada, troco para R$ 100,00 (devolver R$ 9,20)");
    expect(texto).not.toContain("Endereço");
  });

  it("mostra a taxa a combinar e o total sem entrega", () => {
    const outro = { ...cliente, bairro: OUTRO_BAIRRO, bairroOutro: "Ipanema" };
    const texto = mensagemDoPedido(
      loja,
      "AB12",
      itens,
      produtos,
      outro,
      { forma: "cartao", cartao: "debito", trocoPara: "" },
      calcularTotais(loja, subtotal(itens, produtos), outro),
    );
    expect(texto).toContain("Entrega (Ipanema): a combinar");
    expect(texto).toContain("*Total: R$ 90,80 + entrega*");
    expect(texto).toContain("*Pagamento:* cartão de débito na entrega");
  });

  it("codifica a mensagem inteira no link, sem cortar em # ou &", () => {
    const link = linkDoWhatsApp("55 (15) 99999-0000", "Rua 1 #2 & 3");
    expect(link).toBe("https://wa.me/5515999990000?text=Rua%201%20%232%20%26%203");
    expect(decodeURIComponent(new URL(link).searchParams.get("text") ?? "")).toBe("Rua 1 #2 & 3");
  });
});

describe("código do pedido", () => {
  it("tem 4 caracteres sem 0, O, 1 e I", () => {
    expect(gerarCodigo(() => new Uint8Array([0, 31, 32, 255]))).toBe("2Z2Z");
    for (let i = 0; i < 200; i++) expect(gerarCodigo()).toMatch(/^[2-9A-HJ-NP-Z]{4}$/);
  });
});
