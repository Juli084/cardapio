import { useCallback, useEffect, useState } from "preact/hooks";

/*
 * Painéis abertos ficam no endereço (#sacola, #produto/classico, #sobre). Assim o botão
 * "voltar" do celular fecha o painel em vez de sair do cardápio, e dá para mandar o link
 * de um produto direto no Instagram ou no WhatsApp.
 */
export function useRota(): [rota: string, abrir: (rota: string) => void, fechar: () => void] {
  const [rota, setRota] = useState(() => location.hash);

  useEffect(() => {
    const aoVoltar = () => setRota(location.hash);
    addEventListener("popstate", aoVoltar);
    return () => removeEventListener("popstate", aoVoltar);
  }, []);

  const abrir = useCallback((nova: string) => {
    if (nova === location.hash) return;
    history.pushState({ painel: true }, "", nova);
    setRota(nova);
  }, []);

  const fechar = useCallback(() => {
    // Só volta no histórico quando fui eu que empilhei a entrada; se a pessoa chegou por
    // um link com #produto/..., voltar a tiraria do site.
    if ((history.state as { painel?: boolean } | null)?.painel) {
      history.back();
    } else {
      history.replaceState(null, "", location.pathname + location.search);
      setRota("");
    }
  }, []);

  return [rota, abrir, fechar];
}

/** Data atual, atualizada a cada intervalo e quando a aba volta a ficar visível. */
export function useAgora(intervalo: number): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const atualizar = () => setAgora(new Date());
    const relogio = setInterval(atualizar, intervalo);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [intervalo]);
  return agora;
}

export function prefereMenosMovimento(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
