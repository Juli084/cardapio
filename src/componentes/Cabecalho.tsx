import { Bike, ChevronRight, Info, Store } from "lucide-preact";
import { descreverSituacao, type Situacao } from "../dominio/horario.ts";
import { reais } from "../dominio/preco.ts";
import type { Loja } from "../dominio/tipos.ts";

interface Props {
  loja: Loja;
  situacao: Situacao;
  onSobre: () => void;
}

export function Cabecalho({ loja, situacao, onSobre }: Props) {
  const { capa, logo } = loja.marca;
  return (
    <header>
      {loja.demonstracao ? (
        <p class="flex items-center justify-center gap-2 bg-primaria/15 px-4 py-2 text-center text-xs text-primaria">
          <Info size={14} aria-hidden="true" class="shrink-0" />
          {loja.demonstracao.aviso}
        </p>
      ) : null}

      <div class="relative h-40 overflow-hidden sm:h-56 lg:h-80">
        <img
          src={capa.src}
          srcset={capa.srcset}
          sizes="100vw"
          alt={capa.alt}
          width={capa.largura}
          height={capa.altura}
          fetchpriority="high"
          class="absolute inset-0 size-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-black/0 via-fundo/30 to-fundo" />
      </div>

      <div class="relative mx-auto -mt-14 max-w-3xl px-4">
        <img
          src={logo.src}
          alt={logo.alt}
          width={logo.largura}
          height={logo.altura}
          class="size-20 rounded-2xl object-cover shadow-xl ring-4 ring-fundo"
        />
        <h1 class="mt-3 font-display text-3xl leading-tight font-bold text-balance">{loja.nome}</h1>
        <p class="mt-1 text-sm text-suave">
          {loja.endereco.bairro}, {loja.endereco.cidade}
          {loja.entrega.ativa ? ` · Pedido mínimo ${reais(loja.entrega.pedidoMinimo)}` : ""}
        </p>

        <p
          class={`mt-4 inline-flex items-center gap-2 rounded-full bg-superficie px-3 py-1.5 text-sm font-medium ${
            situacao.aberto ? "text-aberto" : "text-fechado"
          }`}
        >
          <span class="size-2 rounded-full bg-current" aria-hidden="true" />
          {descreverSituacao(situacao)}
        </p>
        <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-suave">
          {loja.entrega.ativa ? (
            <li class="inline-flex items-center gap-1.5">
              <Bike size={16} aria-hidden="true" />
              Entrega {loja.entrega.prazo}
            </li>
          ) : null}
          {loja.retirada.ativa ? (
            <li class="inline-flex items-center gap-1.5">
              <Store size={16} aria-hidden="true" />
              Retirada {loja.retirada.prazo}
            </li>
          ) : null}
        </ul>

        <button
          type="button"
          onClick={onSobre}
          class="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primaria"
        >
          Horários, taxas de entrega e pagamento
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
