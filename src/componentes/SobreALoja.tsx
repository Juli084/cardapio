import { Clock, CreditCard, MapPin, Truck } from "lucide-preact";
import { descreverDia, NOMES_DOS_DIAS } from "../dominio/horario.ts";
import { reais } from "../dominio/preco.ts";
import type { Loja } from "../dominio/tipos.ts";

const ORDEM_DA_SEMANA = [1, 2, 3, 4, 5, 6, 0];

export function SobreALoja({ loja, hoje }: { loja: Loja; hoje: number }) {
  const formas = [
    loja.pagamento.pix ? "Pix" : null,
    loja.pagamento.cartao ? "cartão de crédito e débito" : null,
    loja.pagamento.dinheiro ? "dinheiro" : null,
  ].filter(Boolean);

  return (
    <div class="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4">
      <section aria-labelledby="titulo-horarios">
        <h3 id="titulo-horarios" class="flex items-center gap-2 font-display font-semibold">
          <Clock size={18} aria-hidden="true" class="text-primaria" />
          Horários
        </h3>
        <table class="mt-2 w-full text-sm">
          <tbody>
            {ORDEM_DA_SEMANA.map((dia) => (
              <tr key={dia} class={dia === hoje ? "font-semibold text-texto" : "text-suave"}>
                <th scope="row" class="py-1 text-left font-[inherit]">
                  <span class="capitalize">{NOMES_DOS_DIAS[dia]}</span>
                  {dia === hoje ? " (hoje)" : ""}
                </th>
                <td class="py-1 text-right tabular-nums">{descreverDia(loja.horarios[dia] ?? [])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="titulo-endereco">
        <h3 id="titulo-endereco" class="flex items-center gap-2 font-display font-semibold">
          <MapPin size={18} aria-hidden="true" class="text-primaria" />
          Endereço
        </h3>
        <p class="mt-2 text-sm text-suave">
          {loja.endereco.rua}, {loja.endereco.bairro}, {loja.endereco.cidade} - {loja.endereco.uf}
        </p>
        {loja.endereco.mapa ? (
          <a href={loja.endereco.mapa} target="_blank" rel="noopener noreferrer" class="mt-1 inline-block text-sm text-primaria">
            Abrir no mapa
          </a>
        ) : null}
      </section>

      {loja.entrega.ativa ? (
        <section aria-labelledby="titulo-entrega">
          <h3 id="titulo-entrega" class="flex items-center gap-2 font-display font-semibold">
            <Truck size={18} aria-hidden="true" class="text-primaria" />
            Entrega
          </h3>
          <p class="mt-2 text-sm text-suave">
            Em {loja.entrega.prazo}. Pedido mínimo de {reais(loja.entrega.pedidoMinimo)}.
          </p>
          <table class="mt-2 w-full text-sm">
            <caption class="sr-only">Taxa de entrega por bairro</caption>
            <tbody>
              {loja.entrega.bairros.map((bairro) => (
                <tr key={bairro.nome} class="border-b border-borda/50 last:border-0">
                  <th scope="row" class="py-1.5 text-left font-normal">
                    {bairro.nome}
                  </th>
                  <td class="py-1.5 text-right tabular-nums">{bairro.taxa === 0 ? "grátis" : reais(bairro.taxa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loja.entrega.aceitaOutrosBairros ? (
            <p class="mt-2 text-sm text-suave">Outros bairros: taxa combinada pelo WhatsApp.</p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="titulo-pagamento">
        <h3 id="titulo-pagamento" class="flex items-center gap-2 font-display font-semibold">
          <CreditCard size={18} aria-hidden="true" class="text-primaria" />
          Pagamento
        </h3>
        <p class="mt-2 text-sm text-suave first-letter:uppercase">{formas.join(", ").replace(/, ([^,]*)$/, " e $1")}.</p>
      </section>
    </div>
  );
}
