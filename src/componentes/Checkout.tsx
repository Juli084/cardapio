import { MessageCircle } from "lucide-preact";
import type { ComponentChildren } from "preact";
import { reais } from "../dominio/preco.ts";
import {
  OUTRO_BAIRRO,
  type Campo,
  type DadosDoCliente,
  type FormaDePagamento,
  type Pagamento,
  type Problema,
  type Totais,
} from "../dominio/pedido.ts";
import type { Loja } from "../dominio/tipos.ts";
import { BotaoPrincipal } from "./comuns.tsx";

interface Props {
  loja: Loja;
  cliente: DadosDoCliente;
  pagamento: Pagamento;
  totais: Totais;
  problemas: Problema[];
  mostrarProblemas: boolean;
  aberto: boolean;
  onCliente: (mudanca: Partial<DadosDoCliente>) => void;
  onPagamento: (mudanca: Partial<Pagamento>) => void;
  onEnviar: () => void;
}

const CAMPO =
  "mt-1 h-12 w-full rounded-xl border bg-fundo px-3 placeholder:text-suave/70 focus:border-primaria focus:outline-none";

function Erro({ problemas, campo }: { problemas: Problema[]; campo: Campo }) {
  const problema = problemas.find((p) => p.campo === campo);
  if (!problema) return null;
  return (
    <p id={`erro-${campo}`} class="mt-1 text-sm text-fechado">
      {problema.mensagem}
    </p>
  );
}

function Opcao({
  nome,
  valor,
  marcado,
  onEscolher,
  children,
}: {
  nome: string;
  valor: string;
  marcado: boolean;
  onEscolher: () => void;
  children: ComponentChildren;
}) {
  return (
    <label
      class={`flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${
        marcado ? "border-primaria bg-primaria/10" : "border-borda"
      }`}
    >
      <input
        type="radio"
        name={nome}
        value={valor}
        checked={marcado}
        onChange={onEscolher}
        class="size-5 accent-[var(--cor-primaria)]"
      />
      <span class="flex-1">{children}</span>
    </label>
  );
}

export function Checkout({
  loja,
  cliente,
  pagamento,
  totais,
  problemas,
  mostrarProblemas,
  aberto,
  onCliente,
  onPagamento,
  onEnviar,
}: Props) {
  const visiveis = mostrarProblemas ? problemas : [];
  const borda = (campo: Campo) => (visiveis.some((p) => p.campo === campo) ? "border-fechado" : "border-borda");
  const descrito = (campo: Campo) => (visiveis.some((p) => p.campo === campo) ? `erro-${campo}` : undefined);
  const formas: { forma: FormaDePagamento; nome: string; detalhe: string }[] = [];
  if (loja.pagamento.pix) formas.push({ forma: "pix", nome: "Pix", detalhe: "O código sai com o valor do pedido" });
  if (loja.pagamento.cartao) {
    formas.push({ forma: "cartao", nome: "Cartão", detalhe: cliente.modo === "entrega" ? "Maquininha na entrega" : "No balcão" });
  }
  if (loja.pagamento.dinheiro) formas.push({ forma: "dinheiro", nome: "Dinheiro", detalhe: "Informe se precisa de troco" });

  return (
    <form
      class="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        onEnviar();
      }}
    >
      <div class="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4">
        {loja.entrega.ativa && loja.retirada.ativa ? (
          <fieldset>
            <legend class="font-semibold">Como você quer receber?</legend>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <Opcao nome="modo" valor="entrega" marcado={cliente.modo === "entrega"} onEscolher={() => onCliente({ modo: "entrega" })}>
                <span class="block font-medium">Entrega</span>
                <span class="block text-xs text-suave">{loja.entrega.prazo}</span>
              </Opcao>
              <Opcao nome="modo" valor="retirada" marcado={cliente.modo === "retirada"} onEscolher={() => onCliente({ modo: "retirada" })}>
                <span class="block font-medium">Retirada</span>
                <span class="block text-xs text-suave">{loja.retirada.prazo}</span>
              </Opcao>
            </div>
          </fieldset>
        ) : null}

        <label class="block">
          <span class="font-semibold">Seu nome</span>
          <input
            name="nome"
            autoComplete="name"
            value={cliente.nome}
            maxLength={60}
            onInput={(evento) => onCliente({ nome: evento.currentTarget.value })}
            aria-invalid={Boolean(descrito("nome"))}
            aria-describedby={descrito("nome")}
            class={`${CAMPO} ${borda("nome")}`}
          />
          <Erro problemas={visiveis} campo="nome" />
        </label>

        {cliente.modo === "entrega" ? (
          <div class="space-y-4">
            <label class="block">
              <span class="font-semibold">Bairro</span>
              <select
                name="bairro"
                value={cliente.bairro}
                onChange={(evento) => onCliente({ bairro: evento.currentTarget.value })}
                aria-invalid={Boolean(descrito("bairro"))}
                aria-describedby={descrito("bairro")}
                class={`${CAMPO} ${borda("bairro")}`}
              >
                <option value="" disabled>
                  Escolha o bairro
                </option>
                {loja.entrega.bairros.map((bairro) => (
                  <option key={bairro.nome} value={bairro.nome}>
                    {bairro.nome} · {bairro.taxa === 0 ? "grátis" : reais(bairro.taxa)}
                  </option>
                ))}
                {loja.entrega.aceitaOutrosBairros ? <option value={OUTRO_BAIRRO}>Outro bairro (taxa a combinar)</option> : null}
              </select>
              <Erro problemas={visiveis} campo="bairro" />
            </label>

            {cliente.bairro === OUTRO_BAIRRO ? (
              <label class="block">
                <span class="font-semibold">Qual bairro?</span>
                <input
                  name="bairroOutro"
                  value={cliente.bairroOutro}
                  maxLength={60}
                  onInput={(evento) => onCliente({ bairroOutro: evento.currentTarget.value })}
                  aria-invalid={Boolean(descrito("bairroOutro"))}
                  aria-describedby={descrito("bairroOutro")}
                  class={`${CAMPO} ${borda("bairroOutro")}`}
                />
                <Erro problemas={visiveis} campo="bairroOutro" />
              </label>
            ) : null}

            <label class="block">
              <span class="font-semibold">Rua e número</span>
              <input
                name="endereco"
                autoComplete="street-address"
                value={cliente.endereco}
                maxLength={120}
                onInput={(evento) => onCliente({ endereco: evento.currentTarget.value })}
                aria-invalid={Boolean(descrito("endereco"))}
                aria-describedby={descrito("endereco")}
                class={`${CAMPO} ${borda("endereco")}`}
              />
              <Erro problemas={visiveis} campo="endereco" />
            </label>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="font-semibold">Complemento</span> <span class="text-sm text-suave">(opcional)</span>
                <input
                  name="complemento"
                  value={cliente.complemento}
                  maxLength={60}
                  placeholder="Apto, bloco, casa 2"
                  onInput={(evento) => onCliente({ complemento: evento.currentTarget.value })}
                  class={`${CAMPO} border-borda`}
                />
              </label>
              <label class="block">
                <span class="font-semibold">Referência</span> <span class="text-sm text-suave">(opcional)</span>
                <input
                  name="referencia"
                  value={cliente.referencia}
                  maxLength={120}
                  placeholder="Perto de..."
                  onInput={(evento) => onCliente({ referencia: evento.currentTarget.value })}
                  class={`${CAMPO} border-borda`}
                />
              </label>
            </div>
          </div>
        ) : (
          <p class="rounded-xl bg-elevada px-3 py-3 text-sm">
            Retire em <strong>{loja.endereco.rua}</strong>, {loja.endereco.bairro}. Fica pronto em{" "}
            {loja.retirada.prazo}.
          </p>
        )}

        <fieldset aria-describedby={descrito("pagamento")}>
          <legend class="font-semibold">Pagamento</legend>
          <div class="mt-2 grid gap-2">
            {formas.map(({ forma, nome, detalhe }) => (
              <Opcao key={forma} nome="pagamento" valor={forma} marcado={pagamento.forma === forma} onEscolher={() => onPagamento({ forma })}>
                <span class="block font-medium">{nome}</span>
                <span class="block text-xs text-suave">{detalhe}</span>
              </Opcao>
            ))}
          </div>
          <Erro problemas={visiveis} campo="pagamento" />

          {pagamento.forma === "cartao" ? (
            <div class="mt-3 grid grid-cols-2 gap-2">
              <Opcao nome="cartao" valor="credito" marcado={pagamento.cartao === "credito"} onEscolher={() => onPagamento({ cartao: "credito" })}>
                Crédito
              </Opcao>
              <Opcao nome="cartao" valor="debito" marcado={pagamento.cartao === "debito"} onEscolher={() => onPagamento({ cartao: "debito" })}>
                Débito
              </Opcao>
            </div>
          ) : null}

          {pagamento.forma === "dinheiro" ? (
            <label class="mt-3 block">
              <span class="font-medium">Troco para quanto?</span>{" "}
              <span class="text-sm text-suave">(deixe em branco se não precisar)</span>
              <input
                name="troco"
                inputMode="decimal"
                value={pagamento.trocoPara}
                placeholder="Ex.: 100"
                onInput={(evento) => onPagamento({ trocoPara: evento.currentTarget.value })}
                aria-invalid={Boolean(descrito("troco"))}
                aria-describedby={descrito("troco")}
                class={`${CAMPO} ${borda("troco")}`}
              />
              <Erro problemas={visiveis} campo="troco" />
            </label>
          ) : null}
        </fieldset>

        <dl class="space-y-1 rounded-xl bg-elevada px-3 py-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-suave">Subtotal</dt>
            <dd class="tabular-nums">{reais(totais.subtotal)}</dd>
          </div>
          {cliente.modo === "entrega" ? (
            <div class="flex justify-between">
              <dt class="text-suave">Entrega</dt>
              <dd class="tabular-nums">
                {cliente.bairro === ""
                  ? "escolha o bairro"
                  : totais.taxa === null
                    ? "a combinar"
                    : totais.taxa === 0
                      ? "grátis"
                      : reais(totais.taxa)}
              </dd>
            </div>
          ) : null}
          <div class="flex justify-between pt-1 text-base font-semibold">
            <dt>Total</dt>
            <dd class="tabular-nums">
              {totais.total === null ? `${reais(totais.subtotal)} + entrega` : reais(totais.total)}
            </dd>
          </div>
        </dl>

        <p class="text-xs text-suave">
          Seu nome e endereço ficam guardados só neste aparelho, para preencher o próximo pedido.
        </p>
      </div>

      <div class="border-t border-borda bg-superficie px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {mostrarProblemas && problemas.some((p) => ["horario", "minimo", "sacola"].includes(p.campo)) ? (
          <p class="mb-2 text-sm text-fechado" role="alert">
            {problemas.find((p) => ["horario", "minimo", "sacola"].includes(p.campo))?.mensagem}
          </p>
        ) : null}
        {!aberto && loja.demonstracao ? (
          <p class="mb-2 text-xs text-suave">
            A loja estaria fechada agora. Na demonstração, o envio continua liberado.
          </p>
        ) : null}
        <BotaoPrincipal tipo="submit">
          <span class="inline-flex items-center gap-2">
            <MessageCircle size={20} aria-hidden="true" />
            Enviar pelo WhatsApp
          </span>
          <span class="tabular-nums">{reais(totais.total ?? totais.subtotal)}</span>
        </BotaoPrincipal>
      </div>
    </form>
  );
}
