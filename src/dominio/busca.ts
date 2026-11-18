import type { Categoria, Produto } from "./tipos.ts";

export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Todas as palavras digitadas precisam aparecer no nome, na descrição ou na categoria. */
export function buscarProdutos(
  produtos: readonly Produto[],
  categorias: readonly Categoria[],
  termo: string,
): Produto[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [...produtos];
  const nomeDaCategoria = new Map(categorias.map((categoria) => [categoria.id, categoria.nome]));
  return produtos.filter((produto) => {
    const texto = normalizar(
      [produto.nome, produto.descricao ?? "", nomeDaCategoria.get(produto.categoria) ?? ""].join(" "),
    );
    return palavras.every((palavra) => texto.includes(palavra));
  });
}
