// Configuração do cardápio. Horário e número ficam aqui, num lugar só.
const CONFIG = {
  whatsapp: "15998250732",
  abre: 17, // hora de abertura (inclusive)
  fecha: 23, // hora de fechamento (exclusive)
  fusoHorario: "America/Sao_Paulo",
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const cartBtn = document.getElementById("cart-btn");
const cartModal = document.getElementById("cart-modal");
const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const cartCounter = document.getElementById("cart-count");
const addressInput = document.getElementById("address");
const addressWarn = document.getElementById("address-warn");
const statusHorario = document.getElementById("date-span");
const aviso = document.getElementById("aviso");

let cart = [];

// O preço exibido em cada produto sai do mesmo data-price que vai para o
// carrinho, para os dois nunca divergirem.
document.querySelectorAll(".add-to-cart-btn").forEach((botao) => {
  const alvo = botao.parentElement.querySelector(".preco");
  if (alvo) alvo.textContent = moeda.format(Number(botao.dataset.price));
});

function abrirCarrinho() {
  atualizarCarrinho();
  cartModal.style.display = "flex";
  closeModalBtn.focus();
}

function fecharCarrinho() {
  cartModal.style.display = "none";
  cartBtn.focus();
}

cartBtn.addEventListener("click", abrirCarrinho);
closeModalBtn.addEventListener("click", fecharCarrinho);

cartModal.addEventListener("click", (event) => {
  if (event.target === cartModal) fecharCarrinho();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cartModal.style.display === "flex") fecharCarrinho();
});

// Um ouvinte só para lanches e bebidas.
document.addEventListener("click", (event) => {
  const botao = event.target.closest(".add-to-cart-btn");
  if (botao) adicionar(botao.dataset.name, Number(botao.dataset.price));
});

function adicionar(nome, preco) {
  const existente = cart.find((item) => item.nome === nome);
  if (existente) {
    existente.quantidade += 1;
  } else {
    cart.push({ nome, preco, quantidade: 1 });
  }
  atualizarCarrinho();
}

function remover(nome) {
  const indice = cart.findIndex((item) => item.nome === nome);
  if (indice === -1) return;

  if (cart[indice].quantidade > 1) {
    cart[indice].quantidade -= 1;
  } else {
    cart.splice(indice, 1);
  }
  atualizarCarrinho();
}

function totalDoCarrinho() {
  return cart.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
}

// O carrinho é montado com textContent: nenhum texto vira HTML.
function atualizarCarrinho() {
  cartItemsContainer.replaceChildren();

  for (const item of cart) {
    const linha = document.createElement("div");
    linha.className = "flex items-center justify-between mb-4";

    const info = document.createElement("div");
    const nome = document.createElement("p");
    nome.className = "font-medium";
    nome.textContent = `Produto: ${item.nome}`;
    const quantidade = document.createElement("p");
    quantidade.textContent = `Qtd: ${item.quantidade}`;
    const preco = document.createElement("p");
    preco.className = "font-medium mt-2";
    preco.textContent = moeda.format(item.preco);
    info.append(nome, quantidade, preco);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = "Remover";
    botao.setAttribute("aria-label", `Remover uma unidade de ${item.nome}`);
    botao.addEventListener("click", () => remover(item.nome));

    linha.append(info, botao);
    cartItemsContainer.append(linha);
  }

  cartTotal.textContent = moeda.format(totalDoCarrinho());
  cartCounter.textContent = String(cart.reduce((soma, item) => soma + item.quantidade, 0));
}

addressInput.addEventListener("input", () => {
  if (addressInput.value.trim() !== "") {
    addressInput.classList.remove("border-red-600");
    addressWarn.classList.add("hidden");
  }
});

checkoutBtn.addEventListener("click", () => {
  if (!estaAberto()) {
    avisar(`Estamos fechados agora. Funcionamos das ${CONFIG.abre}h às ${CONFIG.fecha}h.`);
    return;
  }
  if (cart.length === 0) {
    avisar("Seu carrinho está vazio.");
    return;
  }

  const endereco = addressInput.value.trim();
  if (endereco === "") {
    addressWarn.classList.remove("hidden");
    addressInput.classList.add("border-red-600");
    addressInput.focus();
    return;
  }

  // A mensagem inteira, endereço incluído, passa por encodeURIComponent:
  // um "#" ou "&" no endereço cortaria o texto no meio.
  const mensagem = [
    "Pedido:",
    ...cart.map((item) => `${item.quantidade}x ${item.nome}: ${moeda.format(item.preco * item.quantidade)}`),
    `Total: ${moeda.format(totalDoCarrinho())}`,
    `Endereço: ${endereco}`,
  ].join("\n");

  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener");

  cart = [];
  atualizarCarrinho();
  fecharCarrinho();
});

// O horário é o de Brasília, não o relógio de quem acessa.
function horaAtual() {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: CONFIG.fusoHorario,
  }).formatToParts(new Date());
  return Number(partes.find((parte) => parte.type === "hour").value);
}

function estaAberto() {
  const hora = horaAtual();
  return hora >= CONFIG.abre && hora < CONFIG.fecha;
}

function mostrarHorario() {
  const aberto = estaAberto();
  statusHorario.classList.toggle("bg-green-500", aberto);
  statusHorario.classList.toggle("bg-red-600", !aberto);
}

mostrarHorario();
setInterval(mostrarHorario, 60_000);

let temporizadorAviso;
function avisar(texto) {
  const mensagem = document.createElement("p");
  mensagem.className = "bg-red-500 text-white px-4 py-2 rounded shadow-lg";
  mensagem.textContent = texto;
  aviso.replaceChildren(mensagem);
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.replaceChildren(), 4000);
}
