import { ChevronLeft, ShoppingBag } from "lucide-preact";
import { useEffect, useMemo, useReducer, useRef, useState } from "preact/hooks";
import { Cabecalho } from "./componentes/Cabecalho.tsx";
import { Cardapio } from "./componentes/Cardapio.tsx";
import { Checkout } from "./componentes/Checkout.tsx";
import { CabecalhoDoPainel } from "./componentes/comuns.tsx";
import { Confirmacao, type PedidoEnviado } from "./componentes/Confirmacao.tsx";
import { FolhaDoProduto } from "./componentes/FolhaDoProduto.tsx";
import { Navegacao } from "./componentes/Navegacao.tsx";
import { Painel } from "./componentes/Painel.tsx";
import { Sacola } from "./componentes/Sacola.tsx";
import { SobreALoja } from "./componentes/SobreALoja.tsx";
import { loja as configuracao } from "./dados/loja.ts";
import { gravar, ler, restaurarCliente } from "./dominio/armazenamento.ts";
import { instanteNaLoja, situacao } from "./dominio/horario.ts";
import {
  calcularTotais,
  gerarCodigo,
  linkDoWhatsApp,
  mensagemDoPedido,
  problemasDoPedido,
  type DadosDoCliente,
  type Pagamento,
} from "./dominio/pedido.ts";
import { payloadPix } from "./dominio/pix.ts";
import { reais } from "./dominio/preco.ts";
import {
  quantidadeTotal,
  restaurarSacola,
  sacolaReducer,
  subtotal as calcularSubtotal,
  type ItemDaSacola,
  type NovoItem,
} from "./dominio/sacola.ts";
import type { Loja, Produto } from "./dominio/tipos.ts";
import { useAgora, useRota } from "./ganchos.ts";

const loja: Loja = configuracao;
const produtos = new Map(loja.produtos.map((produto) => [produto.id, produto]));
const CHAVES = {
  sacola: `cardapio:${loja.id}:sacola`,
  cliente: `cardapio:${loja.id}:cliente`,
  ultimo: `cardapio:${loja.id}:ultimo-pedido`,
};

type Etapa = "sacola" | "dados" | "enviado";

function semChave(itens: readonly ItemDaSacola[]): NovoItem[] {
  return itens.map(({ produtoId, escolhas, observacao, quantidade }) => ({ produtoId, escolhas, observacao, quantidade }));
}

function lerUltimoPedido(): { codigo: string; itens: unknown } | null {
  const bruto = ler(CHAVES.ultimo);
  if (typeof bruto !== "object" || bruto === null) return null;
  const { codigo, itens } = bruto as Record<string, unknown>;
  return typeof codigo === "string" && /^[A-Z0-9]{4}$/.test(codigo) ? { codigo, itens } : null;
}

export function App() {
  const [itens, despachar] = useReducer(sacolaReducer, null, () => restaurarSacola(ler(CHAVES.sacola), produtos));
  const [cliente, setCliente] = useState<DadosDoCliente>(() => restaurarCliente(ler(CHAVES.cliente)));
  const [pagamento, setPagamento] = useState<Pagamento>(() => ({
    forma: loja.pagamento.pix ? "pix" : loja.pagamento.cartao ? "cartao" : "dinheiro",
    cartao: "credito",
    trocoPara: "",
  }));
  const [etapa, setEtapa] = useState<Etapa>("sacola");
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [enviado, setEnviado] = useState<PedidoEnviado | null>(null);
  const [ultimo, setUltimo] = useState(lerUltimoPedido);
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [rota, abrir, fechar] = useRota();
  const agora = useAgora(30_000);
  const instante = instanteNaLoja(agora, loja.fusoHorario);
  const atual = situacao(instante, loja.horarios);

  useEffect(() => gravar(CHAVES.sacola, semChave(itens)), [itens]);
  useEffect(() => gravar(CHAVES.cliente, cliente), [cliente]);
  useEffect(() => {
    document.documentElement.style.setProperty("--cor-primaria", loja.marca.corPrimaria);
  }, []);

  const produtoAberto = rota.startsWith("#produto/") ? produtos.get(decodeURIComponent(rota.slice(9))) : undefined;
  const sacolaAberta = rota === "#sacola";
  const sobreAberto = rota === "#sobre";

  const subtotal = calcularSubtotal(itens, produtos);
  const totais = calcularTotais(loja, subtotal, cliente);
  const problemas = useMemo(
    () => problemasDoPedido(loja, itens, cliente, pagamento, totais, atual.aberto),
    [itens, cliente, pagamento, totais.subtotal, totais.taxa, atual.aberto],
  );
  const quantidade = quantidadeTotal(itens);

  function avisar(texto: string) {
    setAviso(texto);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(""), 3000);
  }

  function abrirProduto(produto: Produto) {
    abrir(`#produto/${encodeURIComponent(produto.id)}`);
  }

  function adicionar(item: NovoItem) {
    despachar({ tipo: "adicionar", item });
    const produto = produtos.get(item.produtoId);
    fechar();
    avisar(`${item.quantidade}x ${produto?.nome ?? "item"} na sacola`);
  }

  function sugerir(produto: Produto) {
    // Produto sem escolha obrigatória entra direto; com escolha, abre a tela dele.
    if ((produto.grupos ?? []).some((grupo) => grupo.minimo > 0)) {
      abrirProduto(produto);
    } else {
      despachar({ tipo: "adicionar", item: { produtoId: produto.id, escolhas: {}, observacao: "", quantidade: 1 } });
      avisar(`${produto.nome} na sacola`);
    }
  }

  function repetir() {
    if (!ultimo) return;
    const recuperados = restaurarSacola(ultimo.itens, produtos);
    despachar({ tipo: "substituir", itens: recuperados });
    const original = Array.isArray(ultimo.itens) ? ultimo.itens.length : 0;
    if (recuperados.length < original) avisar("Alguns itens não estão mais no cardápio e ficaram de fora.");
  }

  function abrirSacola() {
    setEtapa(enviado ? "enviado" : "sacola");
    abrir("#sacola");
  }

  function enviar() {
    setTentouEnviar(true);
    if (problemas.length > 0) {
      const primeiro = problemas[0];
      if (primeiro) document.querySelector<HTMLElement>(`[name="${primeiro.campo}"]`)?.focus();
      return;
    }
    const codigo = gerarCodigo();
    const mensagem = mensagemDoPedido(loja, codigo, itens, produtos, cliente, pagamento, totais);
    const link = linkDoWhatsApp(loja.whatsapp, mensagem);
    let pix: string | null = null;
    if (pagamento.forma === "pix" && loja.pagamento.pix && totais.total !== null) {
      try {
        pix = payloadPix({ ...loja.pagamento.pix, valor: totais.total, txid: `PED${codigo}` });
      } catch {
        pix = null;
      }
    }
    window.open(link, "_blank", "noopener");
    const registro = { codigo, itens: semChave(itens) };
    gravar(CHAVES.ultimo, registro);
    setUltimo(registro);
    setEnviado({ codigo, link, total: totais.total, pix, formaPix: pagamento.forma === "pix" });
    setEtapa("enviado");
    setTentouEnviar(false);
    despachar({ tipo: "esvaziar" });
  }

  function voltarAoCardapio() {
    setEnviado(null);
    setEtapa("sacola");
    fechar();
  }

  const tituloDaSacola = etapa === "dados" ? "Finalizar pedido" : etapa === "enviado" ? "Pedido enviado" : "Sua sacola";

  return (
    <>
      <Cabecalho loja={loja} situacao={atual} onSobre={() => abrir("#sobre")} />
      <Navegacao categorias={loja.categorias} busca={busca} onBusca={setBusca} />
      <main class={quantidade > 0 ? "pb-32" : "pb-16"}>
        <Cardapio categorias={loja.categorias} produtos={loja.produtos} busca={busca} onAbrir={abrirProduto} />
      </main>

      <footer class="mx-auto max-w-3xl px-4 pb-10 text-center text-xs text-suave">
        <p>
          {loja.nome} · {loja.endereco.rua}, {loja.endereco.cidade} - {loja.endereco.uf}
        </p>
        {loja.credito ? (
          <p class="mt-2">
            <a href={loja.credito.url} target="_blank" rel="noopener" class="underline-offset-2 hover:underline">
              {loja.credito.texto}
            </a>
          </p>
        ) : null}
      </footer>

      {quantidade > 0 ? (
        <div class="fixed inset-x-0 bottom-0 z-40 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={abrirSacola}
            class="mx-auto flex min-h-14 w-full max-w-3xl items-center gap-3 rounded-2xl bg-primaria px-4 font-display font-semibold text-sobre-primaria shadow-2xl shadow-black/50"
          >
            <span class="relative">
              <ShoppingBag size={22} aria-hidden="true" />
              <span class="absolute -top-2 -right-2.5 grid min-w-5 place-items-center rounded-full bg-fundo px-1 text-xs text-texto">
                {quantidade}
              </span>
            </span>
            <span class="flex-1 text-left">Ver sacola</span>
            <span class="tabular-nums">{reais(subtotal)}</span>
            <span class="sr-only">, {quantidade} {quantidade === 1 ? "item" : "itens"}</span>
          </button>
        </div>
      ) : null}

      <div aria-live="polite" class="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
        {aviso ? (
          <p class="rounded-full bg-texto px-4 py-2 text-sm font-medium text-fundo shadow-xl">{aviso}</p>
        ) : null}
      </div>

      <Painel aberto={Boolean(produtoAberto)} rotulo={produtoAberto?.nome ?? "Produto"} onFechar={fechar}>
        {produtoAberto ? (
          <FolhaDoProduto key={produtoAberto.id} produto={produtoAberto} onAdicionar={adicionar} onFechar={fechar} />
        ) : null}
      </Painel>

      <Painel aberto={sacolaAberta} rotulo={tituloDaSacola} onFechar={etapa === "enviado" ? voltarAoCardapio : fechar}>
        <CabecalhoDoPainel
          titulo={tituloDaSacola}
          onFechar={etapa === "enviado" ? voltarAoCardapio : fechar}
          antes={
            etapa === "dados" ? (
              <button
                type="button"
                onClick={() => setEtapa("sacola")}
                class="grid size-11 place-items-center rounded-full text-suave hover:bg-elevada"
                aria-label="Voltar para a sacola"
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
            ) : undefined
          }
        />
        {etapa === "enviado" && enviado ? (
          <Confirmacao pedido={enviado} demonstracao={Boolean(loja.demonstracao)} onVoltar={voltarAoCardapio} />
        ) : etapa === "dados" && itens.length > 0 ? (
          <Checkout
            loja={loja}
            cliente={cliente}
            pagamento={pagamento}
            totais={totais}
            problemas={problemas}
            mostrarProblemas={tentouEnviar}
            aberto={atual.aberto}
            onCliente={(mudanca) => setCliente((anterior) => ({ ...anterior, ...mudanca }))}
            onPagamento={(mudanca) => setPagamento((anterior) => ({ ...anterior, ...mudanca }))}
            onEnviar={enviar}
          />
        ) : (
          <Sacola
            loja={loja}
            itens={itens}
            produtos={produtos}
            subtotal={subtotal}
            ultimoPedido={
              ultimo ? { codigo: ultimo.codigo, quantidade: Array.isArray(ultimo.itens) ? ultimo.itens.length : 0 } : null
            }
            onQuantidade={(chave, novaQuantidade) => despachar({ tipo: "quantidade", chave, quantidade: novaQuantidade })}
            onEsvaziar={() => despachar({ tipo: "esvaziar" })}
            onSugestao={sugerir}
            onRepetir={repetir}
            onContinuar={() => {
              setTentouEnviar(false);
              setEtapa("dados");
            }}
          />
        )}
      </Painel>

      <Painel aberto={sobreAberto} rotulo="Sobre a loja" onFechar={fechar}>
        <CabecalhoDoPainel titulo={loja.nome} onFechar={fechar} />
        <SobreALoja loja={loja} hoje={instante.dia} />
      </Painel>
    </>
  );
}
