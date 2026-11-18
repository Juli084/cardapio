import { Check } from "lucide-preact";
import { useState } from "preact/hooks";
import { prefereMenosMovimento } from "../ganchos.ts";
import { gruposPendentes, precoUnitario, reais, type Escolhas } from "../dominio/preco.ts";
import { OBSERVACAO_MAXIMA, type NovoItem } from "../dominio/sacola.ts";
import type { GrupoDeOpcoes, Produto } from "../dominio/tipos.ts";
import { BotaoPrincipal, CabecalhoDoPainel, Contador, Selos } from "./comuns.tsx";

interface Props {
  produto: Produto;
  onAdicionar: (item: NovoItem) => void;
  onFechar: () => void;
}

function regraDoGrupo({ minimo, maximo }: GrupoDeOpcoes): string {
  if (maximo === 1) return "Escolha 1";
  if (minimo === maximo) return `Escolha ${maximo}`;
  if (minimo === 0) return `Escolha até ${maximo}`;
  return `Escolha de ${minimo} a ${maximo}`;
}

export function FolhaDoProduto({ produto, onAdicionar, onFechar }: Props) {
  const [escolhas, setEscolhas] = useState<Record<string, string[]>>({});
  const [observacao, setObservacao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [tentou, setTentou] = useState(false);

  const pendentes = gruposPendentes(produto, escolhas);
  const unitario = precoUnitario(produto, escolhas);

  function alternar(grupo: GrupoDeOpcoes, opcaoId: string) {
    setEscolhas((atual) => {
      const selecionadas = atual[grupo.id] ?? [];
      if (grupo.maximo === 1) return { ...atual, [grupo.id]: [opcaoId] };
      if (selecionadas.includes(opcaoId)) {
        return { ...atual, [grupo.id]: selecionadas.filter((id) => id !== opcaoId) };
      }
      if (selecionadas.length >= grupo.maximo) return atual;
      return { ...atual, [grupo.id]: [...selecionadas, opcaoId] };
    });
  }

  function adicionar() {
    const primeiro = pendentes[0];
    if (primeiro) {
      setTentou(true);
      document
        .getElementById(`grupo-${primeiro.id}`)
        ?.scrollIntoView({ block: "center", behavior: prefereMenosMovimento() ? "auto" : "smooth" });
      return;
    }
    const limpas: Escolhas = Object.fromEntries(Object.entries(escolhas).filter(([, ids]) => ids.length > 0));
    onAdicionar({ produtoId: produto.id, escolhas: limpas, observacao, quantidade });
  }

  return (
    <>
      <CabecalhoDoPainel titulo={produto.nome} onFechar={onFechar} />
      <div class="flex-1 overflow-y-auto overscroll-contain">
        {produto.imagem ? (
          <img
            src={produto.imagem.src}
            alt={produto.imagem.alt}
            width={produto.imagem.largura}
            height={produto.imagem.altura}
            class="aspect-[16/10] w-full object-cover"
          />
        ) : null}
        <div class="px-4 pt-4 pb-2">
          <Selos selos={produto.selos} />
          {produto.descricao ? <p class="mt-2 text-suave">{produto.descricao}</p> : null}
          {produto.serve ? <p class="mt-1 text-sm text-suave">{produto.serve}</p> : null}
          <p class="mt-3 font-display text-xl font-semibold tabular-nums">
            {reais(produto.preco)}
            {produto.precoAnterior ? (
              <s class="ml-2 text-base font-normal text-suave">{reais(produto.precoAnterior)}</s>
            ) : null}
          </p>
        </div>

        {(produto.grupos ?? []).map((grupo) => {
          const selecionadas = escolhas[grupo.id] ?? [];
          const obrigatorio = grupo.minimo > 0;
          const completo = selecionadas.length >= grupo.minimo;
          const lotado = grupo.maximo > 1 && selecionadas.length >= grupo.maximo;
          const destacar = tentou && obrigatorio && !completo;
          return (
            <fieldset key={grupo.id} id={`grupo-${grupo.id}`} class="mt-4">
              <legend class="w-full">
                <span
                  class={`flex w-full items-center justify-between gap-3 px-4 py-3 ${
                    destacar ? "bg-fechado/15" : "bg-elevada"
                  }`}
                >
                  <span>
                    <span class="block font-semibold">{grupo.nome}</span>
                    <span class="block text-xs text-suave">{regraDoGrupo(grupo)}</span>
                  </span>
                  {obrigatorio ? (
                    completo ? (
                      <span class="text-aberto">
                        <Check size={20} aria-hidden="true" />
                        <span class="sr-only">Escolhido</span>
                      </span>
                    ) : (
                      <span
                        class={`rounded-md px-2 py-1 text-[0.7rem] font-bold tracking-wide uppercase ${
                          destacar ? "bg-fechado text-fundo" : "bg-borda text-texto"
                        }`}
                      >
                        Obrigatório
                      </span>
                    )
                  ) : null}
                </span>
              </legend>
              <div class="divide-y divide-borda/60 px-4">
                {grupo.opcoes.map((opcao) => {
                  const marcada = selecionadas.includes(opcao.id);
                  return (
                    <label
                      key={opcao.id}
                      class={`flex min-h-13 cursor-pointer items-center gap-3 py-2 ${
                        lotado && !marcada ? "cursor-not-allowed opacity-50" : ""
                      }`}
                    >
                      <span class="flex-1">{opcao.nome}</span>
                      {opcao.acrescimo ? (
                        <span class="text-sm text-suave tabular-nums">+ {reais(opcao.acrescimo)}</span>
                      ) : null}
                      <input
                        type={grupo.maximo === 1 ? "radio" : "checkbox"}
                        name={`${produto.id}-${grupo.id}`}
                        checked={marcada}
                        disabled={lotado && !marcada}
                        onChange={() => alternar(grupo, opcao.id)}
                        class="size-5 accent-[var(--cor-primaria)]"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <label class="mt-4 block px-4 pb-4">
          <span class="block font-semibold">Alguma observação?</span>
          <textarea
            value={observacao}
            maxLength={OBSERVACAO_MAXIMA}
            rows={2}
            onInput={(evento) => setObservacao(evento.currentTarget.value)}
            placeholder="Ex.: sem cebola, molho à parte"
            class="mt-2 w-full resize-none rounded-xl border border-borda bg-fundo px-3 py-2 placeholder:text-suave/70 focus:border-primaria focus:outline-none"
          />
          <span class="block text-right text-xs text-suave">
            {observacao.length}/{OBSERVACAO_MAXIMA}
          </span>
        </label>
      </div>

      <div class="border-t border-borda bg-superficie px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {tentou && pendentes.length > 0 ? (
          <p class="mb-2 text-sm text-fechado" role="alert">
            Escolha: {pendentes.map((grupo) => grupo.nome).join(", ")}
          </p>
        ) : null}
        <div class="flex items-center gap-3">
          <Contador valor={quantidade} rotulo={produto.nome} onMudar={setQuantidade} />
          <BotaoPrincipal onClick={adicionar}>
            <span>Adicionar</span>
            <span class="tabular-nums">{reais(unitario * quantidade)}</span>
          </BotaoPrincipal>
        </div>
      </div>
    </>
  );
}
