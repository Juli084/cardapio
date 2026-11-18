import { CLIENTE_VAZIO, type DadosDoCliente } from "./pedido.ts";

/*
 * Tudo o que o cardápio guarda fica no navegador de quem pediu: a sacola, os dados de
 * entrega para o próximo pedido e o último pedido, para repetir. Nada vai para servidor.
 * O acesso ao localStorage pode falhar (aba anônima, armazenamento bloqueado), então toda
 * leitura e escrita tem fallback.
 */

export function ler(chave: string): unknown {
  try {
    const texto = localStorage.getItem(chave);
    return texto === null ? null : JSON.parse(texto);
  } catch {
    return null;
  }
}

export function gravar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Sem armazenamento, o cardápio continua funcionando; só não lembra na próxima visita.
  }
}

export function apagar(chave: string): void {
  try {
    localStorage.removeItem(chave);
  } catch {
    // idem
  }
}

const LIMITES: Record<keyof DadosDoCliente, number> = {
  nome: 60,
  modo: 10,
  bairro: 60,
  bairroOutro: 60,
  endereco: 120,
  complemento: 60,
  referencia: 120,
};

export function restaurarCliente(bruto: unknown): DadosDoCliente {
  if (typeof bruto !== "object" || bruto === null) return CLIENTE_VAZIO;
  const registro = bruto as Record<string, unknown>;
  const texto = (campo: keyof DadosDoCliente) => {
    const valor = registro[campo];
    return typeof valor === "string" ? valor.slice(0, LIMITES[campo]) : "";
  };
  return {
    nome: texto("nome"),
    modo: registro.modo === "retirada" ? "retirada" : "entrega",
    bairro: texto("bairro"),
    bairroOutro: texto("bairroOutro"),
    endereco: texto("endereco"),
    complemento: texto("complemento"),
    referencia: texto("referencia"),
  };
}
