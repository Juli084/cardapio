import { Search, X } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { prefereMenosMovimento } from "../ganchos.ts";
import type { Categoria } from "../dominio/tipos.ts";

interface Props {
  categorias: readonly Categoria[];
  busca: string;
  onBusca: (termo: string) => void;
}

/** Barra fixa com a busca e as categorias; a categoria visível na tela fica destacada. */
export function Navegacao({ categorias, busca, onBusca }: Props) {
  const [ativa, setAtiva] = useState(categorias[0]?.id ?? "");
  const trilho = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (busca) return;
    const secoes = categorias
      .map((categoria) => document.getElementById(`categoria-${categoria.id}`))
      .filter((secao): secao is HTMLElement => secao !== null);
    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.find((entrada) => entrada.isIntersecting);
        if (visivel) setAtiva(visivel.target.id.replace("categoria-", ""));
      },
      { rootMargin: "-130px 0px -65% 0px" },
    );
    secoes.forEach((secao) => observador.observe(secao));
    return () => observador.disconnect();
  }, [categorias, busca]);

  useEffect(() => {
    // Rola só o trilho das categorias, sem mexer na rolagem da página.
    const botao = trilho.current?.querySelector<HTMLElement>(`[data-categoria="${ativa}"]`);
    if (!botao || !trilho.current) return;
    const destino = botao.offsetLeft - trilho.current.clientWidth / 2 + botao.clientWidth / 2;
    trilho.current.scrollTo({ left: destino, behavior: prefereMenosMovimento() ? "auto" : "smooth" });
  }, [ativa]);

  function irPara(id: string) {
    setAtiva(id);
    document
      .getElementById(`categoria-${id}`)
      ?.scrollIntoView({ behavior: prefereMenosMovimento() ? "auto" : "smooth", block: "start" });
  }

  return (
    <nav class="sticky top-0 z-30 border-b border-borda/70 bg-fundo/95 backdrop-blur" aria-label="Cardápio">
      <div class="mx-auto max-w-3xl px-4 pt-3">
        <label class="relative block">
          <span class="sr-only">Buscar no cardápio</span>
          <Search size={18} aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-suave" />
          <input
            type="search"
            value={busca}
            onInput={(evento) => onBusca(evento.currentTarget.value)}
            placeholder="Buscar lanche, porção, bebida..."
            enterKeyHint="search"
            class="h-11 w-full rounded-xl border border-borda bg-superficie pr-11 pl-10 placeholder:text-suave/80 focus:border-primaria focus:outline-none"
          />
          {busca ? (
            <button
              type="button"
              onClick={() => onBusca("")}
              class="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center text-suave"
              aria-label="Limpar busca"
            >
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </label>
      </div>
      {busca ? (
        <div class="h-3" />
      ) : (
        <div ref={trilho} class="sem-barra mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3">
          {categorias.map((categoria) => (
            <button
              key={categoria.id}
              type="button"
              data-categoria={categoria.id}
              onClick={() => irPara(categoria.id)}
              aria-current={ativa === categoria.id ? "true" : undefined}
              class={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                ativa === categoria.id
                  ? "bg-primaria text-sobre-primaria"
                  : "bg-superficie text-suave hover:text-texto"
              }`}
            >
              {categoria.nome}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
