import { Plus, RotateCcw, ShoppingBag, Trash } from "lucide-preact";
import { descreverEscolhas, precoMinimo, reais } from "../dominio/preco.ts";
import { totalDoItem, type ItemDaSacola } from "../dominio/sacola.ts";
import type { Loja, Produto } from "../dominio/tipos.ts";
import { BotaoPrincipal, Contador } from "./comuns.tsx";

interface Props {
  loja: Loja;
  itens: readonly ItemDaSacola[];
  produtos: ReadonlyMap<string, Produto>;
  subtotal: number;
  ultimoPedido: { codigo: string; quantidade: number } | null;
  onQuantidade: (chave: string, quantidade: number) => void;
  onEsvaziar: () => void;
  onSugestao: (produto: Produto) => void;
  onRepetir: () => void;
  onContinuar: () => void;
}

export function Sacola({
  loja,
  itens,
  produtos,
  subtotal,
  ultimoPedido,
  onQuantidade,
  onEsvaziar,
  onSugestao,
  onRepetir,
  onContinuar,
}: Props) {
  if (itens.length === 0) {
    return (
      <div class="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <ShoppingBag size={40} class="text-suave" aria-hidden="true" />
        <p class="font-display text-lg font-semibold">Sua sacola está vazia</p>
        <p class="text-sm text-suave">Escolha um item do cardápio para começar.</p>
        {ultimoPedido ? (
          <button
            type="button"
            onClick={onRepetir}
            class="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-borda px-4 text-sm font-medium text-primaria"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Repetir o último pedido ({ultimoPedido.codigo})
          </button>
        ) : null}
      </div>
    );
  }

  const naSacola = new Set(itens.map((item) => item.produtoId));
  const sugestoes = loja.sugestoes
    .map((id) => produtos.get(id))
    .filter((produto): produto is Produto => Boolean(produto && !produto.indisponivel && !naSacola.has(produto.id)))
    .slice(0, 3);

  return (
    <>
      <div class="flex-1 overflow-y-auto overscroll-contain">
        <ul class="divide-y divide-borda/60 px-4">
          {itens.map((item) => {
            const produto = produtos.get(item.produtoId);
            if (!produto) return null;
            return (
              <li key={item.chave} class="py-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-semibold">{produto.nome}</p>
                    {descreverEscolhas(produto, item.escolhas).map(({ grupo, opcoes }) => (
                      <p key={grupo} class="text-sm text-suave">
                        {grupo}: {opcoes.join(", ")}
                      </p>
                    ))}
                    {item.observacao ? <p class="text-sm text-suave italic">"{item.observacao}"</p> : null}
                  </div>
                  <p class="shrink-0 font-display font-semibold tabular-nums">
                    {reais(totalDoItem(item, produtos))}
                  </p>
                </div>
                <div class="mt-3 flex items-center justify-between">
                  <Contador
                    pequeno
                    minimo={0}
                    valor={item.quantidade}
                    rotulo={produto.nome}
                    onMudar={(quantidade) => onQuantidade(item.chave, quantidade)}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {sugestoes.length > 0 ? (
          <section class="mt-2 bg-elevada/60 px-4 py-4" aria-labelledby="titulo-sugestoes">
            <h3 id="titulo-sugestoes" class="font-display font-semibold">
              Peça também
            </h3>
            <ul class="mt-3 grid gap-2">
              {sugestoes.map((produto) => {
                const { valor, aPartirDe } = precoMinimo(produto);
                return (
                  <li key={produto.id}>
                    <button
                      type="button"
                      onClick={() => onSugestao(produto)}
                      class="flex w-full items-center gap-3 rounded-xl bg-superficie p-2 text-left"
                    >
                      {produto.imagem ? (
                        <img
                          src={produto.imagem.src}
                          srcset={produto.imagem.srcset}
                          sizes="48px"
                          alt=""
                          class="size-12 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium">{produto.nome}</span>
                        <span class="block text-sm text-suave tabular-nums">
                          {aPartirDe ? "a partir de " : ""}
                          {reais(valor)}
                        </span>
                      </span>
                      <span
                        class="grid size-9 shrink-0 place-items-center rounded-full bg-primaria text-sobre-primaria"
                        aria-hidden="true"
                      >
                        <Plus size={18} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div class="flex justify-end px-4 py-3">
          <button
            type="button"
            onClick={onEsvaziar}
            class="inline-flex min-h-11 items-center gap-2 text-sm text-suave hover:text-fechado"
          >
            <Trash size={16} aria-hidden="true" />
            Esvaziar sacola
          </button>
        </div>
      </div>

      <div class="border-t border-borda bg-superficie px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p class="mb-3 flex justify-between text-sm">
          <span class="text-suave">Subtotal</span>
          <span class="font-semibold tabular-nums">{reais(subtotal)}</span>
        </p>
        <BotaoPrincipal onClick={onContinuar}>
          <span>Continuar</span>
          <span class="tabular-nums">{reais(subtotal)}</span>
        </BotaoPrincipal>
      </div>
    </>
  );
}
