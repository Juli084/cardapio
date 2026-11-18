import { Flame, Leaf, Minus, Plus, Sparkles, Star, X } from "lucide-preact";
import type { ComponentChildren } from "preact";
import { QUANTIDADE_MAXIMA } from "../dominio/sacola.ts";
import type { Selo } from "../dominio/tipos.ts";

const SELOS: Record<Selo, { texto: string; icone: typeof Star; classe: string }> = {
  "mais-pedido": { texto: "Mais pedido", icone: Star, classe: "text-primaria" },
  novo: { texto: "Novo", icone: Sparkles, classe: "text-sky-300" },
  vegetariano: { texto: "Vegetariano", icone: Leaf, classe: "text-emerald-300" },
  picante: { texto: "Picante", icone: Flame, classe: "text-orange-400" },
};

export function Selos({ selos }: { selos: readonly Selo[] | undefined }) {
  if (!selos?.length) return null;
  return (
    <span class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
      {selos.map((selo) => {
        const { texto, icone: Icone, classe } = SELOS[selo];
        return (
          <span key={selo} class={`inline-flex items-center gap-1 text-xs font-medium ${classe}`}>
            <Icone size={13} aria-hidden="true" />
            {texto}
          </span>
        );
      })}
    </span>
  );
}

interface ContadorProps {
  valor: number;
  rotulo: string;
  onMudar: (valor: number) => void;
  minimo?: number;
  pequeno?: boolean;
}

export function Contador({ valor, rotulo, onMudar, minimo = 1, pequeno = false }: ContadorProps) {
  const tamanho = pequeno ? "size-8" : "size-11";
  return (
    <div class="inline-flex items-center rounded-full border border-borda bg-fundo" role="group" aria-label={rotulo}>
      <button
        type="button"
        class={`${tamanho} grid place-items-center rounded-full text-primaria disabled:text-borda`}
        onClick={() => onMudar(valor - 1)}
        disabled={valor <= minimo}
        aria-label={valor === 1 && minimo === 0 ? `Remover ${rotulo}` : `Diminuir ${rotulo}`}
      >
        <Minus size={pequeno ? 16 : 18} aria-hidden="true" />
      </button>
      <span class="min-w-7 text-center font-display font-semibold tabular-nums" aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        class={`${tamanho} grid place-items-center rounded-full text-primaria disabled:text-borda`}
        onClick={() => onMudar(valor + 1)}
        disabled={valor >= QUANTIDADE_MAXIMA}
        aria-label={`Aumentar ${rotulo}`}
      >
        <Plus size={pequeno ? 16 : 18} aria-hidden="true" />
      </button>
    </div>
  );
}

export function CabecalhoDoPainel({
  titulo,
  onFechar,
  antes,
}: {
  titulo: string;
  onFechar: () => void;
  antes?: ComponentChildren;
}) {
  return (
    <div class="flex items-center gap-2 border-b border-borda px-4 py-3">
      {antes}
      {/* O título recebe o foco quando o painel abre: o leitor de tela anuncia onde a
          pessoa está, e o anel de foco não aparece no botão de fechar. */}
      <h2 class="flex-1 font-display text-lg font-semibold focus:outline-none" tabIndex={-1} autofocus>
        {titulo}
      </h2>
      <button
        type="button"
        class="grid size-11 place-items-center rounded-full text-suave hover:bg-elevada"
        onClick={onFechar}
        aria-label="Fechar"
      >
        <X size={22} aria-hidden="true" />
      </button>
    </div>
  );
}

export function BotaoPrincipal({
  children,
  onClick,
  tipo = "button",
}: {
  children: ComponentChildren;
  onClick?: () => void;
  tipo?: "button" | "submit";
}) {
  return (
    <button
      type={tipo}
      onClick={onClick}
      class="flex min-h-13 w-full items-center justify-between gap-3 rounded-2xl bg-primaria px-5 font-display text-base font-semibold text-sobre-primaria shadow-lg shadow-black/30 transition active:scale-[0.99]"
    >
      {children}
    </button>
  );
}
