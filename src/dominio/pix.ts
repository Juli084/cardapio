import type { Centavos } from "./tipos.ts";

/*
 * Código Pix estático ("copia e cola") no padrão BR Code do Banco Central.
 * Referência: Manual de Padrões para Iniciação do Pix, seção 2.6 (QR Code estático).
 * Cada campo é ID (2 dígitos) + tamanho (2 dígitos) + valor, e o código termina com
 * o CRC16 do texto inteiro, incluindo o próprio "6304".
 */

export interface DadosPix {
  chave: string;
  recebedor: string;
  cidade: string;
  valor?: Centavos;
  /** Identificador da transação: até 25 letras e dígitos. Sem ele, o padrão manda usar "***". */
  txid?: string;
}

function campo(id: string, valor: string): string {
  if (valor.length > 99) throw new RangeError(`Campo ${id} do Pix passa de 99 caracteres`);
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** Tira acentos e qualquer caractere fora do ASCII imprimível: o tamanho do campo conta caracteres. */
export function textoPix(texto: string, limite: number): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x20-\x7e]/g, "")
    .trim()
    .slice(0, limite);
}

/** CRC-16/CCITT-FALSE: polinômio 0x1021, valor inicial 0xFFFF, como pede o manual. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function valorPix(valor: Centavos): string {
  if (!Number.isInteger(valor) || valor <= 0) throw new RangeError("Valor do Pix inválido");
  return `${Math.floor(valor / 100)}.${String(valor % 100).padStart(2, "0")}`;
}

export function payloadPix({ chave, recebedor, cidade, valor, txid }: DadosPix): string {
  const identificador = txid ? txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) : "***";
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave.trim());
  const semCrc =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor === undefined ? "" : campo("54", valorPix(valor))) +
    campo("58", "BR") +
    campo("59", textoPix(recebedor, 25)) +
    campo("60", textoPix(cidade, 15)) +
    campo("62", campo("05", identificador || "***")) +
    "6304";
  return semCrc + crc16(semCrc);
}

/** Confere o formato da chave. Não diz se ela existe: isso só o banco sabe. */
export function tipoDeChave(chave: string): "cpf" | "cnpj" | "telefone" | "email" | "aleatoria" | null {
  if (/^\d{11}$/.test(chave)) return "cpf";
  if (/^\d{14}$/.test(chave)) return "cnpj";
  if (/^\+55\d{10,11}$/.test(chave)) return "telefone";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave) && chave.length <= 77) return "email";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(chave)) return "aleatoria";
  return null;
}
