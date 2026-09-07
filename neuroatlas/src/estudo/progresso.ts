import { cartaoNovo, type Cartao } from "./sm2";

/**
 * Persistência do progresso de estudo no navegador.
 *
 * Fica em localStorage e só no aparelho de quem estuda — nada sai daqui. Toda
 * leitura e escrita é protegida: em janela anônima, com dados de site
 * bloqueados ou com a cota estourada, o acesso ao armazenamento LANÇA exceção,
 * e uma falha de gravação não pode derrubar uma sessão de estudo.
 */

const CHAVE = "neuroatlas:progresso:v1";

export type Progresso = Record<string, Cartao>;

export function carregar(): Progresso {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return {};
    const dados = JSON.parse(bruto);
    return dados && typeof dados === "object" ? (dados as Progresso) : {};
  } catch {
    // Armazenamento indisponível ou conteúdo corrompido: começa vazio, em vez
    // de impedir o estudo.
    return {};
  }
}

export function salvar(progresso: Progresso): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(progresso));
  } catch {
    // Sem armazenamento, a sessão continua funcionando; só não é lembrada.
  }
}

export function limpar(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Nada a fazer.
  }
}

export function cartaoDe(progresso: Progresso, id: string): Cartao {
  return progresso[id] ?? cartaoNovo();
}

export type Resumo = {
  vistas: number;
  acertos: number;
  erros: number;
  /** Estruturas com pelo menos três acertos seguidos. */
  firmes: number;
};

export function resumir(progresso: Progresso, ids: string[]): Resumo {
  let vistas = 0;
  let acertos = 0;
  let erros = 0;
  let firmes = 0;

  for (const id of ids) {
    const cartao = progresso[id];
    if (!cartao) continue;
    vistas++;
    acertos += cartao.acertos;
    erros += cartao.erros;
    if (cartao.repeticoes >= 3) firmes++;
  }

  return { vistas, acertos, erros, firmes };
}
