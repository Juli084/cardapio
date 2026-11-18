import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

interface Props {
  aberto: boolean;
  rotulo: string;
  onFechar: () => void;
  children: ComponentChildren;
}

/**
 * Janela modal com o <dialog> nativo: o navegador cuida do foco, do Esc e de esconder o
 * resto da página dos leitores de tela. O conteúdo só é montado enquanto está aberto.
 */
export function Painel({ aberto, rotulo, onFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      class="painel"
      aria-label={rotulo}
      onCancel={(evento) => {
        evento.preventDefault();
        onFechar();
      }}
      onClick={(evento) => {
        // O clique no fundo escurecido chega no próprio <dialog>.
        if (evento.target === ref.current) onFechar();
      }}
    >
      {aberto ? children : null}
    </dialog>
  );
}
