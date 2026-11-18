import { useMemo } from "preact/hooks";
import { encode } from "uqr";

/** QR Code desenhado como um único caminho SVG: nítido em qualquer tela e sem canvas. */
export function QrCode({ texto, rotulo }: { texto: string; rotulo: string }) {
  const { tamanho, caminho } = useMemo(() => {
    const { size, data } = encode(texto, { ecc: "M", border: 2 });
    let d = "";
    data.forEach((linha, y) =>
      linha.forEach((escuro, x) => {
        if (escuro) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { tamanho: size, caminho: d };
  }, [texto]);

  return (
    <svg
      viewBox={`0 0 ${tamanho} ${tamanho}`}
      role="img"
      aria-label={rotulo}
      shape-rendering="crispEdges"
      class="aspect-square w-full max-w-56 rounded-xl"
    >
      <rect width={tamanho} height={tamanho} fill="#fff" />
      <path d={caminho} fill="#000" />
    </svg>
  );
}
