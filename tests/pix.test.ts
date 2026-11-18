import { describe, expect, it } from "vitest";
import { crc16, payloadPix, textoPix, tipoDeChave, valorPix } from "../src/dominio/pix.ts";

// Exemplos copiados do Manual de Padrões para Iniciação do Pix (Banco Central).
const MANUAL_ESTATICO =
  "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR" +
  "5913Fulano de Tal6008BRASILIA62070503***63041D3D";
const MANUAL_COM_VALOR =
  "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865406100.50" +
  "5802BR5913Fulano de Tal6008BRASILIA62070503***80740014br.gov.bcb.pix2552pix.example.com/rec/" +
  "2353c790eefb11eaadc10242ac12000263042875";

describe("Pix copia e cola", () => {
  it("reproduz o QR estático do manual, caractere por caractere", () => {
    expect(
      payloadPix({ chave: "123e4567-e12b-12d1-a456-426655440000", recebedor: "Fulano de Tal", cidade: "BRASILIA" }),
    ).toBe(MANUAL_ESTATICO);
  });

  it("calcula o CRC dos dois exemplos do manual sobre o texto que inclui 6304", () => {
    for (const exemplo of [MANUAL_ESTATICO, MANUAL_COM_VALOR]) {
      expect(crc16(exemplo.slice(0, -4))).toBe(exemplo.slice(-4));
    }
  });

  it("escreve o valor com ponto e duas casas, no formato do campo 54 do manual", () => {
    expect(valorPix(10050)).toBe("100.50");
    expect(valorPix(5)).toBe("0.05");
    expect(valorPix(5990)).toBe("59.90");
    expect(() => valorPix(0)).toThrow();
    expect(() => valorPix(12.5)).toThrow();
  });

  it("inclui valor e txid e mantém o CRC coerente", () => {
    const codigo = payloadPix({
      chave: "123e4567-e12b-12d1-a456-426655440000",
      recebedor: "Hamburgueria do Francesco",
      cidade: "Sorocaba",
      valor: 5990,
      txid: "PEDK7Q2",
    });
    expect(codigo).toContain("540559.90");
    expect(codigo).toContain("62110507PEDK7Q2");
    expect(crc16(codigo.slice(0, -4))).toBe(codigo.slice(-4));
  });

  it("tira acentos e corta nome e cidade nos limites do padrão", () => {
    expect(textoPix("São José dos Campos", 15)).toBe("Sao Jose dos Ca");
    expect(textoPix("Lanchonete Açaí & Cia — Matriz Central", 25)).toHaveLength(25);
    const codigo = payloadPix({ chave: "+5515999999999", recebedor: "Açaí", cidade: "Itu", valor: 100 });
    expect(codigo).toContain("5904Acai");
  });

  it("remove do txid o que não é letra ou dígito e usa *** sem txid", () => {
    expect(payloadPix({ chave: "12345678901", recebedor: "A", cidade: "B", txid: "PED-12#3" })).toContain(
      "0506PED123",
    );
    expect(payloadPix({ chave: "12345678901", recebedor: "A", cidade: "B", txid: "--" })).toContain("0503***");
  });

  it("reconhece os formatos de chave", () => {
    expect(tipoDeChave("12345678901")).toBe("cpf");
    expect(tipoDeChave("12345678000199")).toBe("cnpj");
    expect(tipoDeChave("+5515999999999")).toBe("telefone");
    expect(tipoDeChave("loja@exemplo.com.br")).toBe("email");
    expect(tipoDeChave("123e4567-e12b-12d1-a456-426655440000")).toBe("aleatoria");
    expect(tipoDeChave("15999999999 ")).toBeNull();
    expect(tipoDeChave("(15) 99999-9999")).toBeNull();
  });
});
