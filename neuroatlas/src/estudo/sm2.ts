/**
 * Repetição espaçada pelo algoritmo SM-2.
 *
 * A ideia: cada estrutura é revista pouco antes do momento em que seria
 * esquecida. Acertar com facilidade empurra a próxima revisão para longe;
 * errar traz de volta para o dia seguinte. O intervalo cresce sozinho conforme
 * a memória se firma, e é isso que evita reestudar o que já está sabido.
 */

/** Qualidade da recordação, de 0 a 5, como definido no SM-2 original. */
export type Qualidade = 2 | 3 | 4 | 5;

export const AVALIACOES: { q: Qualidade; rotulo: string; descricao: string }[] = [
  { q: 2, rotulo: "Errei", descricao: "Não lembrei" },
  { q: 3, rotulo: "Difícil", descricao: "Lembrei com esforço" },
  { q: 4, rotulo: "Bom", descricao: "Lembrei" },
  { q: 5, rotulo: "Fácil", descricao: "Lembrei na hora" },
];

export type Cartao = {
  /** Quantas revisões seguidas foram acertadas. Errar zera. */
  repeticoes: number;
  /** Fator de facilidade: quanto o intervalo cresce a cada acerto. */
  facilidade: number;
  /** Intervalo em dias até a próxima revisão. */
  intervalo: number;
  /** Data da próxima revisão, em ISO (só a parte da data importa). */
  proximaRevisao: string;
  acertos: number;
  erros: number;
};

/** Abaixo disso o cartão voltaria com frequência exagerada. */
const FACILIDADE_MINIMA = 1.3;
const FACILIDADE_INICIAL = 2.5;

export function cartaoNovo(): Cartao {
  return {
    repeticoes: 0,
    facilidade: FACILIDADE_INICIAL,
    intervalo: 0,
    proximaRevisao: hoje(),
    acertos: 0,
    erros: 0,
  };
}

/** Data de hoje em AAAA-MM-DD, no fuso local. */
export function hoje(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function somarDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Aplica uma avaliação ao cartão e devolve o cartão atualizado.
 *
 * Função pura: recebe o estado e devolve o próximo, sem tocar em nada externo.
 * É o que permite conferir o comportamento do algoritmo sem subir a interface.
 */
export function revisar(cartao: Cartao, q: Qualidade): Cartao {
  // Fórmula do SM-2 para o fator de facilidade. Quanto pior a recordação,
  // mais o fator cai — e ele nunca desce do piso, senão o cartão passaria a
  // reaparecer todo dia para sempre.
  const facilidade = Math.max(
    FACILIDADE_MINIMA,
    cartao.facilidade + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  // Abaixo de 3 a recordação falhou: a contagem de acertos seguidos zera e a
  // estrutura volta amanhã, independentemente de quantas vezes já foi acertada.
  if (q < 3) {
    return {
      ...cartao,
      repeticoes: 0,
      facilidade,
      intervalo: 1,
      proximaRevisao: somarDias(1),
      erros: cartao.erros + 1,
    };
  }

  const repeticoes = cartao.repeticoes + 1;
  const intervalo =
    repeticoes === 1 ? 1 : repeticoes === 2 ? 6 : Math.round(cartao.intervalo * facilidade);

  return {
    ...cartao,
    repeticoes,
    facilidade,
    intervalo,
    proximaRevisao: somarDias(intervalo),
    acertos: cartao.acertos + 1,
  };
}

/** O cartão está vencido e deve entrar na sessão de hoje. */
export function vencido(cartao: Cartao): boolean {
  return cartao.proximaRevisao <= hoje();
}
