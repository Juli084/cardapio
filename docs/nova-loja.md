# Montar o cardápio de uma loja nova

Leva umas duas horas com as informações em mãos. Peça ao dono da loja, antes de começar:

- cardápio atual com preços, opções e adicionais;
- fotos dos produtos, de preferência quadradas e com boa luz;
- logo e uma foto de ambiente ou de produto para o topo;
- horários de cada dia da semana;
- bairros atendidos e a taxa de cada um, pedido mínimo e tempo de entrega;
- formas de pagamento e, se aceitar Pix, a chave, o nome e a cidade do recebedor;
- o número de WhatsApp que recebe os pedidos.

## 1. Fotos

Coloque as imagens em `public/img/` em WebP, no tamanho em que aparecem:

| Uso | Tamanho sugerido |
|---|---|
| Produto | 480 × 480 |
| Logo | 408 × 408 |
| Capa do topo | 1920 × 680 |
| Prévia do link (`compartilhar.jpg`) | 1200 × 630, em JPEG |

A prévia do link precisa ser JPEG ou PNG, porque nem todo aplicativo mostra WebP na prévia.

## 2. Configuração

Edite [`src/dados/loja.ts`](../src/dados/loja.ts). Os campos têm comentários no tipo
[`Loja`](../src/dominio/tipos.ts). Pontos que costumam dar erro:

- **Preços em centavos.** R$ 32,90 é `3290`.
- **WhatsApp com DDI e DDD, só dígitos.** (15) 99999-0000 é `"5515999990000"`.
- **Horários.** Uma lista por dia, começando no domingo. Dia fechado é `[]`. Faixa que passa da
  meia-noite é escrita normalmente: `["18:00", "00:30"]`.
- **Opções.** `minimo: 1, maximo: 1` é escolha única obrigatória (ponto da carne, sabor).
  `minimo: 0, maximo: 4` é "escolha até 4" (adicionais). Grupos repetidos em vários produtos
  podem ficar numa constante, como `PONTO` e `ADICIONAIS` no arquivo da demonstração.
- **Chave Pix.** Telefone no formato `+5515999990000`; CPF e CNPJ só com dígitos; e-mail ou
  chave aleatória como estão.
- **Demonstração.** Apague o campo `demonstracao` numa loja real. Com ele, o site mostra o aviso
  de loja fictícia, libera o envio fora do horário e pede aos buscadores para não indexar.
  Sem ele, o HTML passa a ter os dados estruturados de restaurante (endereço, horário e
  cardápio) para o Google.

## 3. Conferir

```bash
npm test
npm run test:e2e
```

Os testes da configuração (`tests/loja.test.ts`) apontam o produto e o campo com problema. Os
testes de ponta a ponta usam produtos da demonstração pelo nome; numa loja nova, ajuste os
nomes em `e2e/pedido.spec.ts` ou mantenha só os testes que ainda fazem sentido.

Antes de entregar, faça um pedido real do celular até o WhatsApp da loja e, se houver Pix,
pague um valor pequeno com o código gerado para confirmar que a chave está certa.

## 4. Publicar

Na Vercel, importe o repositório: o `vercel.json` já define o build e os cabeçalhos de
segurança. Depois, configure o domínio da loja e atualize o campo `url` na configuração,
que é o endereço usado nas metatags e nos dados estruturados.
