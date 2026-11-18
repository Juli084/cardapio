import { expect, test, type Page } from "@playwright/test";
import { crc16 } from "../src/dominio/pix.ts";

/*
 * O pedido inteiro como um cliente faria. O window.open é trocado por um registro, para o
 * teste ler a mensagem que iria para o WhatsApp sem sair para a internet.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { aberto: string[] }).aberto = [];
    window.open = (url) => {
      (window as unknown as { aberto: string[] }).aberto.push(String(url));
      return null;
    };
  });
});

async function mensagemEnviada(page: Page): Promise<string> {
  const links = await page.evaluate(() => (window as unknown as { aberto: string[] }).aberto);
  expect(links).toHaveLength(1);
  const link = new URL(links[0] ?? "");
  expect(link.origin + link.pathname).toBe("https://wa.me/5515998250732");
  return link.searchParams.get("text") ?? "";
}

test("monta um pedido com opções, entrega e Pix", async ({ page }) => {
  const externas: string[] = [];
  const erros: string[] = [];
  page.on("request", (requisicao) => {
    if (!requisicao.url().startsWith("http://localhost")) externas.push(requisicao.url());
  });
  page.on("pageerror", (erro) => erros.push(erro.message));
  // Violação da política de segurança aparece como erro no console.
  page.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Hamburgueria do Francesco" })).toBeVisible();

  await page.getByRole("button", { name: /^Clássico, R\$ 32,90/ }).click();
  const folha = page.getByRole("dialog", { name: "Clássico" });
  await expect(folha).toBeVisible();

  // Sem o ponto da carne, o botão avisa o que falta em vez de adicionar.
  await folha.getByRole("button", { name: /Adicionar/ }).click();
  await expect(folha.getByRole("alert")).toHaveText("Escolha: Ponto da carne");

  await folha.getByLabel("Ao ponto").check();
  await folha.getByLabel("Bacon").check();
  await folha.getByRole("button", { name: "Aumentar Clássico" }).click();
  await folha.getByPlaceholder("Ex.: sem cebola").fill("sem cebola");
  await expect(folha.getByRole("button", { name: /Adicionar/ })).toContainText("R$ 75,80");
  await folha.getByRole("button", { name: /Adicionar/ }).click();
  await expect(folha).toBeHidden();

  await page.getByRole("button", { name: /Ver sacola/ }).click();
  const sacola = page.getByRole("dialog", { name: "Sua sacola" });
  await expect(sacola.getByText("Ponto da carne: Ao ponto")).toBeVisible();

  // Sugestão sem escolha obrigatória entra direto na sacola.
  await sacola.getByRole("button", { name: /Guaraná lata 350 ml/ }).click();
  await expect(sacola.getByText("Guaraná lata 350 ml")).toBeVisible();
  await sacola.getByRole("button", { name: /Continuar/ }).click();

  const finalizar = page.getByRole("dialog", { name: "Finalizar pedido" });
  await finalizar.getByRole("button", { name: /Enviar pelo WhatsApp/ }).click();
  await expect(finalizar.getByText("Informe seu nome.")).toBeVisible();

  await finalizar.getByLabel("Seu nome").fill("Ana");
  await finalizar.getByLabel("Bairro").selectOption("Campolim");
  await finalizar.getByLabel("Rua e número").fill("Rua das Flores, 123 #2");
  await finalizar.getByLabel(/Complemento/).fill("ap 12 & 13");
  await expect(finalizar.getByText("R$ 7,00", { exact: true })).toBeVisible();
  await finalizar.getByRole("button", { name: /Enviar pelo WhatsApp/ }).click();

  const mensagem = await mensagemEnviada(page);
  expect(mensagem).toContain("2x Clássico · R$ 75,80");
  expect(mensagem).toContain("   Adicionais: Bacon");
  expect(mensagem).toContain("   Obs.: sem cebola");
  expect(mensagem).toContain("1x Guaraná lata 350 ml · R$ 6,50");
  expect(mensagem).toContain("Entrega (Campolim): R$ 7,00");
  expect(mensagem).toContain("*Total: R$ 89,30*");
  expect(mensagem).toContain("Endereço: Rua das Flores, 123 #2");
  expect(mensagem).toContain("Complemento: ap 12 & 13");

  const confirmacao = page.getByRole("dialog", { name: "Pedido enviado" });
  const codigo = await confirmacao.getByLabel("Pix copia e cola").inputValue();
  expect(codigo).toContain("540589.30");
  expect(crc16(codigo.slice(0, -4))).toBe(codigo.slice(-4));
  await expect(confirmacao.getByRole("img", { name: /QR Code do Pix/ })).toBeVisible();

  await confirmacao.getByRole("button", { name: "Voltar ao cardápio" }).click();
  await expect(page.getByRole("button", { name: /Ver sacola/ })).toBeHidden();

  expect(externas).toEqual([]);
  expect(erros).toEqual([]);
});

test("guarda a sacola e os dados de entrega para a próxima visita", async ({ page }) => {
  await page.goto("/#produto/onion-rings");
  const folha = page.getByRole("dialog", { name: "Onion rings" });
  await folha.getByRole("button", { name: /Adicionar/ }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /Ver sacola/ })).toContainText("R$ 24,90");
});

test("abre o produto pelo link e fecha com o voltar do navegador", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Batata frita, a partir de R\$ 15,90/ }).click();
  await expect(page).toHaveURL(/#produto\/batata-frita$/);
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("não deixa pagar com Pix quando a taxa de entrega é a combinar", async ({ page }) => {
  await page.goto("/#produto/x-tudo");
  await page.getByRole("dialog", { name: "X-Tudo" }).getByRole("button", { name: /Adicionar/ }).click();
  await page.getByRole("button", { name: /Ver sacola/ }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  const finalizar = page.getByRole("dialog", { name: "Finalizar pedido" });
  await finalizar.getByLabel("Seu nome").fill("Bruno");
  await finalizar.getByLabel("Bairro").selectOption({ label: "Outro bairro (taxa a combinar)" });
  await finalizar.getByLabel("Qual bairro?").fill("Ipanema");
  await finalizar.getByLabel("Rua e número").fill("Rua A, 10");
  await finalizar.getByRole("button", { name: /Enviar pelo WhatsApp/ }).click();
  await expect(finalizar.getByText(/valor do Pix só fecha na conversa/)).toBeVisible();

  await finalizar.getByLabel(/Dinheiro/).check();
  await finalizar.getByLabel("Troco para quanto?", { exact: false }).fill("50");
  await finalizar.getByRole("button", { name: /Enviar pelo WhatsApp/ }).click();
  const mensagem = await mensagemEnviada(page);
  expect(mensagem).toContain("Entrega (Ipanema): a combinar");
  expect(mensagem).toContain("*Total: R$ 34,90 + entrega*");
  expect(mensagem).toContain("dinheiro na entrega, troco para R$ 50,00");
});

test("busca sem acento e mostra quando não encontra", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Buscar no cardápio" }).fill("graos de bico");
  await expect(page.getByRole("heading", { name: /0 itens|Nada encontrado/ })).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar no cardápio" }).fill("grao");
  await expect(page.getByRole("button", { name: /^Grão-de-bico/ })).toBeVisible();
});

test("cabe na tela do celular sem rolagem lateral", async ({ page }) => {
  await page.goto("/");
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});
