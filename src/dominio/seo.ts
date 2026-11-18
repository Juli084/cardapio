import { precoMinimo } from "./preco.ts";
import type { Loja } from "./tipos.ts";

const DIAS_SCHEMA = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function decimal(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

/** Restaurant e Menu do schema.org, para o buscador entender endereço, horário e cardápio. */
export function dadosEstruturados(loja: Loja): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: loja.nome,
    description: loja.descricao,
    url: loja.url,
    image: new URL(loja.marca.capa.src, loja.url).href,
    telephone: `+${loja.whatsapp}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: loja.endereco.rua,
      addressLocality: loja.endereco.cidade,
      addressRegion: loja.endereco.uf,
      addressCountry: "BR",
    },
    openingHoursSpecification: loja.horarios.flatMap((faixas, dia) =>
      faixas.map(([abre, fecha]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DIAS_SCHEMA[dia],
        opens: abre,
        closes: fecha,
      })),
    ),
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: loja.categorias.map((categoria) => ({
        "@type": "MenuSection",
        name: categoria.nome,
        hasMenuItem: loja.produtos
          .filter((produto) => produto.categoria === categoria.id && !produto.indisponivel)
          .map((produto) => ({
            "@type": "MenuItem",
            name: produto.nome,
            ...(produto.descricao ? { description: produto.descricao } : {}),
            offers: { "@type": "Offer", price: decimal(precoMinimo(produto).valor), priceCurrency: "BRL" },
          })),
      })),
    },
  };
}
