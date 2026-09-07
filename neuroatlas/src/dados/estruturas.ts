import bruto from "./estruturas.json";

/** Divisões do sistema nervoso usadas para agrupar e colorir as estruturas. */
export type Divisao =
  | "tronco"
  | "cerebelo"
  | "diencefalo"
  | "nucleos-base"
  | "limbico"
  | "substancia-branca"
  | "ventriculos";

export type Lado = "direito" | "esquerdo";

/**
 * Uma malha 3D dentro do GLB. O `fma` é o nome do nó no arquivo — a chave que
 * liga o modelo 3D ao conteúdo de estudo.
 */
export type Malha = {
  fma: string;
  lado?: Lado;
};

export type Estrutura = {
  id: string;
  nome: string;
  latim: string;
  ingles: string;
  divisao: Divisao;
  /** Uma malha para estruturas ímpares, duas para as lateralizadas. */
  malhas: Malha[];
  funcao: string;
  irrigacao: string;
  relacoes: string;
  clinica: string;
};

export const estruturas = bruto as Estrutura[];

/**
 * A cor de cada divisão é linguagem visual, não decoração: a mesma cor
 * identifica a estrutura no 3D, na árvore e na ficha.
 */
export const DIVISOES: Record<Divisao, { nome: string; cor: string }> = {
  tronco: { nome: "Tronco encefálico", cor: "#E0A458" },
  cerebelo: { nome: "Cerebelo", cor: "#52B5A8" },
  diencefalo: { nome: "Diencéfalo", cor: "#A688E8" },
  "nucleos-base": { nome: "Núcleos da base", cor: "#E8737F" },
  limbico: { nome: "Sistema límbico", cor: "#7FC96B" },
  "substancia-branca": { nome: "Substância branca", cor: "#C9CFDB" },
  ventriculos: { nome: "Ventrículos e LCR", cor: "#5E9BE8" },
};

/** Ordem de exibição na árvore: de fora para dentro, do simples ao profundo. */
export const ORDEM_DIVISOES: Divisao[] = [
  "tronco",
  "cerebelo",
  "diencefalo",
  "nucleos-base",
  "limbico",
  "substancia-branca",
  "ventriculos",
];

/** Índice FMA → estrutura, para resolver um clique no 3D em uma ficha. */
export const porFma = new Map<string, Estrutura>(
  estruturas.flatMap((e) => e.malhas.map((m) => [m.fma, e] as const)),
);

export const porId = new Map(estruturas.map((e) => [e.id, e]));

export function estruturasDaDivisao(divisao: Divisao): Estrutura[] {
  return estruturas.filter((e) => e.divisao === divisao);
}

/** Ventrículos envolvem as demais estruturas: são translúcidos por padrão. */
export function ehTranslucida(estrutura: Estrutura): boolean {
  return estrutura.divisao === "ventriculos";
}
