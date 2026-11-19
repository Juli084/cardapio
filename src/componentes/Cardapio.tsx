import { Plus } from "lucide-preact";
import { buscarProdutos } from "../dominio/busca.ts";
import { precoMinimo, reais } from "../dominio/preco.ts";
import type { Categoria, Produto } from "../dominio/tipos.ts";
import { Selos } from "./comuns.tsx";

interface Props {
  categorias: readonly Categoria[];
  produtos: readonly Produto[];
  busca: string;
  onAbrir: (produto: Produto) => void;
}

function Preco({ produto }: { produto: Produto }) {
  const { valor, aPartirDe } = precoMinimo(produto);
  return (
    <span class="mt-2 flex flex-wrap items-baseline gap-x-2">
      {aPartirDe ? <span class="text-xs text-suave">a partir de</span> : null}
      <span class="font-display font-semibold tabular-nums">{reais(valor)}</span>
      {produto.precoAnterior ? (
        <s class="text-sm text-suave tabular-nums">
          <span class="sr-only">antes </span>
          {reais(produto.precoAnterior)}
        </s>
      ) : null}
    </span>
  );
}

function ItemDoCardapio({ produto, onAbrir }: { produto: Produto; onAbrir: (produto: Produto) => void }) {
  const { valor, aPartirDe } = precoMinimo(produto);
  const descricaoId = `descricao-${produto.id}`;
  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(produto)}
        disabled={produto.indisponivel}
        aria-label={`${produto.nome}, ${aPartirDe ? "a partir de " : ""}${reais(valor)}${
          produto.indisponivel ? ", esgotado" : ""
        }`}
        aria-describedby={produto.descricao ? descricaoId : undefined}
        class="group flex w-full gap-4 py-4 text-left disabled:opacity-50"
      >
        <span class="min-w-0 flex-1">
          <span class="block font-display text-[1.05rem] leading-snug font-semibold">{produto.nome}</span>
          <Selos selos={produto.selos} />
          {produto.descricao ? (
            <span id={descricaoId} class="mt-1 line-clamp-2 block text-sm text-suave">
              {produto.descricao}
            </span>
          ) : null}
          {produto.indisponivel ? (
            <span class="mt-2 block text-sm font-medium text-fechado">Esgotado por hoje</span>
          ) : (
            <Preco produto={produto} />
          )}
          {produto.serve ? <span class="mt-1 block text-xs text-suave">{produto.serve}</span> : null}
        </span>

        {produto.imagem ? (
          <span class="relative shrink-0 self-start">
            <img
              src={produto.imagem.src}
              srcset={produto.imagem.srcset}
              sizes="104px"
              alt=""
              width={produto.imagem.largura}
              height={produto.imagem.altura}
              loading="lazy"
              decoding="async"
              class="size-26 rounded-2xl object-cover transition group-hover:brightness-110"
            />
            <span
              class="absolute -right-1.5 -bottom-1.5 grid size-9 place-items-center rounded-full bg-primaria text-sobre-primaria shadow-lg"
              aria-hidden="true"
            >
              <Plus size={20} />
            </span>
          </span>
        ) : (
          <span
            class="grid size-9 shrink-0 place-items-center self-center rounded-full border border-borda text-primaria group-hover:border-primaria"
            aria-hidden="true"
          >
            <Plus size={20} />
          </span>
        )}
      </button>
    </li>
  );
}

function Destaques({ produtos, onAbrir }: { produtos: readonly Produto[]; onAbrir: (produto: Produto) => void }) {
  // Uma foto aparece uma vez só: um combo que usa a foto do lanche não repete a imagem.
  const fotos = new Set<string>();
  const destaques = produtos.filter((produto) => {
    if (!produto.imagem || !produto.selos?.includes("mais-pedido") || produto.indisponivel) return false;
    if (fotos.has(produto.imagem.src)) return false;
    fotos.add(produto.imagem.src);
    return true;
  });
  if (destaques.length < 2) return null;
  return (
    <section aria-labelledby="titulo-destaques" class="mx-auto mt-6 max-w-3xl">
      <h2 id="titulo-destaques" class="px-4 font-display text-xl font-semibold">
        Os mais pedidos
      </h2>
      <ul class="sem-barra mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {destaques.map((produto) => (
          <li key={produto.id} class="w-44 shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onAbrir(produto)}
              class="group w-full overflow-hidden rounded-2xl bg-superficie text-left"
            >
              <img
                src={produto.imagem!.src}
                srcset={produto.imagem!.srcset}
                sizes="176px"
                alt=""
                width={produto.imagem!.largura}
                height={produto.imagem!.altura}
                class="aspect-square w-full object-cover transition group-hover:brightness-110"
              />
              <span class="block p-3">
                <span class="block truncate font-display font-semibold">{produto.nome}</span>
                <Preco produto={produto} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Cardapio({ categorias, produtos, busca, onAbrir }: Props) {
  if (busca.trim()) {
    const encontrados = buscarProdutos(produtos, categorias, busca);
    return (
      <section class="mx-auto max-w-3xl px-4 pt-4" aria-live="polite">
        <h2 class="font-display text-xl font-semibold">
          {encontrados.length === 0
            ? `Nada encontrado para "${busca.trim()}"`
            : `${encontrados.length} ${encontrados.length === 1 ? "item" : "itens"} para "${busca.trim()}"`}
        </h2>
        {encontrados.length === 0 ? (
          <p class="mt-2 text-sm text-suave">Tente outra palavra, como "bacon", "batata" ou "suco".</p>
        ) : (
          <ul class="divide-y divide-borda/60">
            {encontrados.map((produto) => (
              <ItemDoCardapio key={produto.id} produto={produto} onAbrir={onAbrir} />
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <>
      <Destaques produtos={produtos} onAbrir={onAbrir} />
      {categorias.map((categoria) => {
        const daCategoria = produtos.filter((produto) => produto.categoria === categoria.id);
        if (daCategoria.length === 0) return null;
        return (
          <section
            key={categoria.id}
            id={`categoria-${categoria.id}`}
            aria-labelledby={`titulo-${categoria.id}`}
            class="mx-auto mt-8 max-w-3xl px-4"
          >
            <h2 id={`titulo-${categoria.id}`} class="font-display text-2xl font-bold">
              {categoria.nome}
            </h2>
            {categoria.descricao ? <p class="mt-1 text-sm text-suave">{categoria.descricao}</p> : null}
            <ul class="mt-1 divide-y divide-borda/60">
              {daCategoria.map((produto) => (
                <ItemDoCardapio key={produto.id} produto={produto} onAbrir={onAbrir} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
