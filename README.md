# Cardápio online

Cardápio de uma hamburgueria fictícia, com carrinho e pedido enviado pelo WhatsApp. HTML, JavaScript
sem framework e Tailwind CSS.

**Demonstração:** [cardapio-gilt-ten.vercel.app](https://cardapio-gilt-ten.vercel.app)

## O que faz

- lista lanches e bebidas, com preço calculado a partir do mesmo valor que vai para o carrinho;
- carrinho com quantidade, remoção por unidade e total em reais;
- mostra se a loja está aberta pelo horário de Brasília, não pelo relógio de quem acessa;
- exige endereço antes de finalizar e monta a mensagem do pedido para o WhatsApp, com itens, total
  e endereço, codificada para que caracteres como `#` e `&` não cortem o texto.

## Rodando localmente

Não há etapa de build para o HTML e o JavaScript: qualquer servidor estático serve.

```bash
npx serve .
```

O CSS é gerado pelo Tailwind a partir de `styles/style.css`:

```bash
npm install
npm run build:css
```

`npm run dev` regera o CSS a cada alteração. O arquivo `styles/output.css` fica versionado: o deploy
serve a pasta como site estático, sem etapa de build.

## Configuração

Número do WhatsApp, horário de funcionamento e fuso ficam no objeto `CONFIG`, no início de
`script.js`.

## Decisões

- O carrinho é montado com `textContent`, sem `innerHTML`: nenhum texto vira HTML.
- O Font Awesome vem da cdnjs com versão fixa e hash de integridade (SRI). A biblioteca de avisos
  que era carregada sem versão foi trocada por um aviso próprio, com `aria-live`.
- As imagens são WebP no tamanho em que aparecem, com carregamento tardio fora do topo da página.
