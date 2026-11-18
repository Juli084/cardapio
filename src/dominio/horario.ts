import type { Faixa, Horarios } from "./tipos.ts";

/** Dia da semana (0 = domingo) e minutos desde a meia-noite, no fuso da loja. */
export interface Instante {
  dia: number;
  minutos: number;
}

export type Situacao =
  | { aberto: true; fechaAs: string }
  | { aberto: false; abre: { emDias: number; dia: number; hora: string } | null };

const DIAS_EM_INGLES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const NOMES_DOS_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** O horário vale no fuso da loja, não no relógio de quem abre o cardápio. */
export function instanteNaLoja(agora: Date, fusoHorario: string): Instante {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fusoHorario,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(agora);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return {
    dia: DIAS_EM_INGLES.indexOf(valor("weekday")),
    minutos: Number(valor("hour")) * 60 + Number(valor("minute")),
  };
}

export function minutosDe(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function passaDaMeiaNoite([abre, fecha]: Faixa): boolean {
  return minutosDe(fecha) <= minutosDe(abre);
}

export function situacao(instante: Instante, horarios: Horarios): Situacao {
  const hoje = horarios[instante.dia] ?? [];
  const ontem = horarios[(instante.dia + 6) % 7] ?? [];

  for (const faixa of ontem) {
    if (passaDaMeiaNoite(faixa) && instante.minutos < minutosDe(faixa[1])) {
      return { aberto: true, fechaAs: faixa[1] };
    }
  }
  for (const faixa of hoje) {
    const abre = minutosDe(faixa[0]);
    const fecha = minutosDe(faixa[1]);
    const dentro = passaDaMeiaNoite(faixa)
      ? instante.minutos >= abre
      : instante.minutos >= abre && instante.minutos < fecha;
    if (dentro) return { aberto: true, fechaAs: faixa[1] };
  }

  for (let emDias = 0; emDias <= 7; emDias++) {
    const dia = (instante.dia + emDias) % 7;
    const faixas = [...(horarios[dia] ?? [])].sort((a, b) => minutosDe(a[0]) - minutosDe(b[0]));
    const proxima = faixas.find((faixa) => emDias > 0 || minutosDe(faixa[0]) > instante.minutos);
    if (proxima) return { aberto: false, abre: { emDias, dia, hora: proxima[0] } };
  }
  return { aberto: false, abre: null };
}

export function descreverSituacao(atual: Situacao): string {
  if (atual.aberto) return `Aberto agora · fecha às ${atual.fechaAs}`;
  if (!atual.abre) return "Fechado";
  const { emDias, dia, hora } = atual.abre;
  const quando = emDias === 0 ? "hoje" : emDias === 1 ? "amanhã" : NOMES_DOS_DIAS[dia];
  return `Fechado · abre ${quando} às ${hora}`;
}

/** Faixas de um dia como texto: "18:00 às 23:00", "Fechado". */
export function descreverDia(faixas: readonly Faixa[]): string {
  if (faixas.length === 0) return "Fechado";
  return faixas.map(([abre, fecha]) => `${abre} às ${fecha}`).join(" e ");
}
