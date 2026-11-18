import { describe, expect, it } from "vitest";
import { descreverSituacao, instanteNaLoja, situacao } from "../src/dominio/horario.ts";
import type { Horarios } from "../src/dominio/tipos.ts";

// Segunda fechado; terça a quinta até 23h; sexta e sábado passam da meia-noite.
const HORARIOS: Horarios = [
  [["17:00", "23:00"]],
  [],
  [["18:00", "23:00"]],
  [["18:00", "23:00"]],
  [["11:30", "14:30"], ["18:00", "23:00"]],
  [["18:00", "00:30"]],
  [["18:00", "00:30"]],
];

const hora = (texto: string) => {
  const [h, m] = texto.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

describe("horário de funcionamento", () => {
  it("usa o fuso da loja, não o do aparelho", () => {
    // 01:00 UTC de uma terça é 22:00 de segunda em São Paulo (UTC-3).
    expect(instanteNaLoja(new Date("2026-11-17T01:00:00Z"), "America/Sao_Paulo")).toEqual({
      dia: 1,
      minutos: hora("22:00"),
    });
  });

  it("abre na hora de abertura e fecha na hora de fechamento", () => {
    expect(situacao({ dia: 2, minutos: hora("17:59") }, HORARIOS).aberto).toBe(false);
    expect(situacao({ dia: 2, minutos: hora("18:00") }, HORARIOS)).toEqual({ aberto: true, fechaAs: "23:00" });
    expect(situacao({ dia: 2, minutos: hora("23:00") }, HORARIOS).aberto).toBe(false);
  });

  it("continua aberto depois da meia-noite pela faixa do dia anterior", () => {
    expect(situacao({ dia: 6, minutos: hora("00:15") }, HORARIOS)).toEqual({ aberto: true, fechaAs: "00:30" });
    expect(situacao({ dia: 6, minutos: hora("00:30") }, HORARIOS).aberto).toBe(false);
    // Domingo 00:20 ainda é a noite de sábado.
    expect(situacao({ dia: 0, minutos: hora("00:20") }, HORARIOS)).toEqual({ aberto: true, fechaAs: "00:30" });
  });

  it("não herda a madrugada de um dia que fecha antes da meia-noite", () => {
    expect(situacao({ dia: 5, minutos: hora("00:10") }, HORARIOS).aberto).toBe(false);
  });

  it("entende duas faixas no mesmo dia", () => {
    expect(situacao({ dia: 4, minutos: hora("12:00") }, HORARIOS)).toEqual({ aberto: true, fechaAs: "14:30" });
    expect(descreverSituacao(situacao({ dia: 4, minutos: hora("15:00") }, HORARIOS))).toBe(
      "Fechado · abre hoje às 18:00",
    );
  });

  it("aponta a próxima abertura pulando o dia fechado", () => {
    expect(descreverSituacao(situacao({ dia: 0, minutos: hora("23:30") }, HORARIOS))).toBe(
      "Fechado · abre terça às 18:00",
    );
    expect(descreverSituacao(situacao({ dia: 1, minutos: hora("10:00") }, HORARIOS))).toBe(
      "Fechado · abre amanhã às 18:00",
    );
  });

  it("não quebra quando a loja não tem horário nenhum", () => {
    const fechada: Horarios = [[], [], [], [], [], [], []];
    expect(situacao({ dia: 3, minutos: 600 }, fechada)).toEqual({ aberto: false, abre: null });
    expect(descreverSituacao({ aberto: false, abre: null })).toBe("Fechado");
  });
});
