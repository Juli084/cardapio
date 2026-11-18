import { Check, Copy, ExternalLink } from "lucide-preact";
import { useRef, useState } from "preact/hooks";
import { reais } from "../dominio/preco.ts";
import { QrCode } from "./QrCode.tsx";

export interface PedidoEnviado {
  codigo: string;
  link: string;
  total: number | null;
  pix: string | null;
  formaPix: boolean;
}

interface Props {
  pedido: PedidoEnviado;
  demonstracao: boolean;
  onVoltar: () => void;
}

async function copiar(texto: string, campo: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Sem a API (página sem HTTPS, permissão negada): seleciona o texto para copiar à mão.
    campo?.select();
    return false;
  }
}

export function Confirmacao({ pedido, demonstracao, onVoltar }: Props) {
  const [copiado, setCopiado] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);

  return (
    <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-6">
      <div class="text-center">
        <span class="mx-auto grid size-14 place-items-center rounded-full bg-aberto/15 text-aberto">
          <Check size={30} aria-hidden="true" />
        </span>
        <h3 class="mt-3 font-display text-2xl font-bold">Pedido {pedido.codigo} pronto</h3>
        <p class="mt-2 text-suave">
          A mensagem abriu no WhatsApp da loja. Confira e toque em enviar: o pedido só chega depois disso.
        </p>
        <a
          href={pedido.link}
          target="_blank"
          rel="noopener noreferrer"
          class="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primaria"
        >
          O WhatsApp não abriu? Toque aqui
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </div>

      {pedido.pix ? (
        <section class="mt-6 rounded-2xl bg-elevada p-4" aria-labelledby="titulo-pix">
          <h4 id="titulo-pix" class="font-display text-lg font-semibold">
            Pague com Pix{pedido.total !== null ? ` · ${reais(pedido.total)}` : ""}
          </h4>
          <p class="mt-1 text-sm text-suave">
            O valor já está no código. Depois de pagar, mande o comprovante na conversa.
          </p>
          <div class="mt-4 flex justify-center">
            <QrCode texto={pedido.pix} rotulo={`QR Code do Pix do pedido ${pedido.codigo}`} />
          </div>
          <label class="mt-4 block text-sm font-medium" for="pix-copia-e-cola">
            Pix copia e cola
          </label>
          <textarea
            id="pix-copia-e-cola"
            ref={campo}
            readOnly
            rows={3}
            value={pedido.pix}
            class="mt-1 w-full resize-none rounded-xl border border-borda bg-fundo px-3 py-2 font-mono text-xs break-all"
          />
          <button
            type="button"
            onClick={async () => setCopiado(await copiar(pedido.pix ?? "", campo.current))}
            class="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primaria font-medium text-primaria"
          >
            {copiado ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            {copiado ? "Código copiado" : "Copiar código"}
          </button>
          <p class="sr-only" aria-live="polite">
            {copiado ? "Código Pix copiado" : ""}
          </p>
          {demonstracao ? (
            <p class="mt-3 text-xs text-suave">
              Demonstração: a chave é a de exemplo do manual do Banco Central e o código não transfere dinheiro.
            </p>
          ) : null}
        </section>
      ) : pedido.formaPix ? (
        <p class="mt-6 rounded-2xl bg-elevada p-4 text-sm">
          A loja manda a chave Pix na conversa, junto com o valor final.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onVoltar}
        class="mt-6 min-h-11 w-full rounded-xl bg-superficie font-medium text-texto ring-1 ring-borda"
      >
        Voltar ao cardápio
      </button>
    </div>
  );
}
