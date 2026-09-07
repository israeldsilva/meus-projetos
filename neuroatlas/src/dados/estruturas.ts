import bruto from "./estruturas.json";

/**
 * Divisões usadas para agrupar e colorir as estruturas.
 *
 * O córtex é dividido por LOBO, e não numa única gaveta "córtex": é assim que
 * a neuroanatomia é estudada e cobrada. Pela mesma razão, os giros do cíngulo
 * e para-hipocampal ficam sob `limbico` — pertencem ao lobo límbico, não ao
 * temporal, apesar de vizinhos dele.
 */
export type Divisao =
  | "lobo-frontal"
  | "lobo-parietal"
  | "lobo-temporal"
  | "lobo-occipital"
  | "insula"
  | "limbico"
  | "substancia-branca"
  | "nucleos-base"
  | "diencefalo"
  | "tronco"
  | "cerebelo"
  | "ventriculos"
  | "via-optica";

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
  /**
   * Uma malha para estruturas ímpares, duas para as pares — e quatro no giro
   * temporal superior, que o acervo segmenta em partes anterior e posterior.
   */
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
 *
 * Com doze divisões, cores totalmente distintas entre todas seriam impossíveis
 * sem virar arco-íris. A paleta prioriza contraste DENTRO de cada família — os
 * lobos corticais entre si, as estruturas profundas entre si —, que é onde a
 * confusão atrapalharia. Entre famílias, alguma proximidade de matiz é
 * aceitável: o córtex e as estruturas profundas raramente competem pelo mesmo
 * ponto da tela, e a árvore mantém a legenda sempre ao lado.
 */
export const DIVISOES: Record<Divisao, { nome: string; cor: string }> = {
  // Córtex
  "lobo-frontal": { nome: "Lobo frontal", cor: "#5B93D9" },
  "lobo-parietal": { nome: "Lobo parietal", cor: "#E0C15E" },
  "lobo-temporal": { nome: "Lobo temporal", cor: "#5FBE85" },
  "lobo-occipital": { nome: "Lobo occipital", cor: "#E8859B" },
  insula: { nome: "Ínsula", cor: "#C77FD4" },
  // Estruturas profundas
  limbico: { nome: "Lobo límbico", cor: "#A9C95E" },
  "substancia-branca": { nome: "Substância branca", cor: "#C9CFDB" },
  "nucleos-base": { nome: "Núcleos da base", cor: "#E8737F" },
  diencefalo: { nome: "Diencéfalo", cor: "#A688E8" },
  tronco: { nome: "Tronco encefálico", cor: "#E09A52" },
  cerebelo: { nome: "Cerebelo", cor: "#46B3B0" },
  // Cavidades e vias
  ventriculos: { nome: "Ventrículos e LCR", cor: "#7FB2F0" },
  "via-optica": { nome: "Via óptica", cor: "#F2E3B0" },
};

/**
 * Ordem de exibição na árvore: de fora para dentro — como se fosse dissecando
 * o encéfalo, do córtex até as cavidades.
 */
export const ORDEM_DIVISOES: Divisao[] = [
  "lobo-frontal",
  "lobo-parietal",
  "lobo-temporal",
  "lobo-occipital",
  "insula",
  "limbico",
  "substancia-branca",
  "nucleos-base",
  "diencefalo",
  "tronco",
  "cerebelo",
  "ventriculos",
  "via-optica",
];

/** Índice FMA → estrutura, para resolver um clique no 3D em uma ficha. */
export const porFma = new Map<string, Estrutura>(
  estruturas.flatMap((e) => e.malhas.map((m) => [m.fma, e] as const)),
);

export const porId = new Map(estruturas.map((e) => [e.id, e]));

export function estruturasDaDivisao(divisao: Divisao): Estrutura[] {
  return estruturas.filter((e) => e.divisao === divisao);
}

/** Ventrículos são cavidades internas: translúcidos por padrão. */
export function ehTranslucida(estrutura: Estrutura): boolean {
  return estrutura.divisao === "ventriculos";
}

/**
 * Estrutura par (direita e esquerda). Não basta contar malhas: o giro temporal
 * superior tem quatro, por vir dividido em partes anterior e posterior.
 */
export function ehBilateral(estrutura: Estrutura): boolean {
  return estrutura.malhas.some((m) => m.lado !== undefined);
}

/** Busca em português, latim e inglês — normalizada, para acento não atrapalhar. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buscar(termo: string): Estrutura[] {
  const alvo = normalizar(termo.trim());
  if (!alvo) return estruturas;

  return estruturas
    .map((e) => {
      const nome = normalizar(e.nome);
      const latim = normalizar(e.latim);
      const ingles = normalizar(e.ingles);
      const divisao = normalizar(DIVISOES[e.divisao].nome);

      // Começar com o termo vale mais que contê-lo no meio, e o nome em
      // português vale mais que o termo em latim ou inglês.
      let peso = 0;
      if (nome.startsWith(alvo)) peso = 6;
      else if (latim.startsWith(alvo) || ingles.startsWith(alvo)) peso = 5;
      else if (nome.includes(alvo)) peso = 4;
      else if (latim.includes(alvo) || ingles.includes(alvo)) peso = 3;
      else if (divisao.includes(alvo)) peso = 1;

      return { estrutura: e, peso };
    })
    .filter((r) => r.peso > 0)
    .sort((a, b) => b.peso - a.peso)
    .map((r) => r.estrutura);
}
