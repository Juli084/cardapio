/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { loja } from "./src/dados/loja.ts";
import { dadosEstruturados } from "./src/dominio/seo.ts";

function escaparAtributo(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Preenche no index.html o que depende da loja: título, descrição, cor do navegador,
 * metatags de compartilhamento e os dados estruturados para buscadores. Assim o HTML já
 * sai certo do build, sem esperar o JavaScript, que é o que os robôs de prévia leem.
 */
function metaDaLoja(): Plugin {
  return {
    name: "meta-da-loja",
    transformIndexHtml(html) {
      const previa = loja.marca.compartilhamento ?? loja.marca.capa;
      const imagem = new URL(previa.src, loja.url).href;
      const tags = [
        `<title>${escaparAtributo(loja.nome)}</title>`,
        `<meta name="description" content="${escaparAtributo(loja.descricao)}" />`,
        `<meta name="theme-color" content="${escaparAtributo(loja.marca.corPrimaria)}" />`,
        `<link rel="canonical" href="${escaparAtributo(loja.url)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:locale" content="pt_BR" />`,
        `<meta property="og:title" content="${escaparAtributo(loja.nome)}" />`,
        `<meta property="og:description" content="${escaparAtributo(loja.descricao)}" />`,
        `<meta property="og:url" content="${escaparAtributo(loja.url)}" />`,
        `<meta property="og:image" content="${escaparAtributo(imagem)}" />`,
        `<meta property="og:image:width" content="${previa.largura}" />`,
        `<meta property="og:image:height" content="${previa.altura}" />`,
        `<meta property="og:image:alt" content="${escaparAtributo(previa.alt)}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<link rel="icon" href="${escaparAtributo(loja.marca.logo.src)}" />`,
        `<link rel="apple-touch-icon" href="${escaparAtributo(loja.marca.logo.src)}" />`,
      ];
      // Loja fictícia não deve aparecer em busca nem se passar por restaurante real.
      if (loja.demonstracao) {
        tags.push(`<meta name="robots" content="noindex" />`);
      } else {
        const json = JSON.stringify(dadosEstruturados(loja)).replace(/</g, "\\u003c");
        tags.push(`<script type="application/ld+json">${json}</script>`);
      }
      return html.replace("<!-- meta-da-loja -->", tags.join("\n    "));
    },
  };
}

/**
 * Os mesmos cabeçalhos da Vercel no `vite preview`: os testes de navegador rodam com a
 * política de segurança de produção e falham se algo for bloqueado por ela.
 */
function cabecalhosDeProducao(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf-8")) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const geral = config.headers.find((regra) => regra.source === "/(.*)");
  return Object.fromEntries((geral?.headers ?? []).map(({ key, value }) => [key, value]));
}

export default defineConfig({
  plugins: [tailwindcss(), metaDaLoja()],
  preview: {
    headers: cabecalhosDeProducao(),
  },
  oxc: {
    jsx: { runtime: "automatic", importSource: "preact" },
  },
  build: {
    target: "es2022",
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
