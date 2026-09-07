import { create } from "zustand";

/** Vistas anatômicas padronizadas, as mesmas de um atlas impresso. */
export type Vista =
  | "anterior"
  | "posterior"
  | "lateral-direita"
  | "lateral-esquerda"
  | "superior"
  | "inferior";

/**
 * Planos anatômicos de corte. Os nomes seguem a anatomia, não os eixos da
 * cena: o corte sagital separa esquerda de direita, o coronal separa anterior
 * de posterior e o axial separa superior de inferior.
 */
export type EixoCorte = "sagital" | "coronal" | "axial";

export type Corte = {
  ativo: boolean;
  /** Posição do plano em unidades da cena; o encéfalo ocupa cerca de -1 a 1. */
  posicao: number;
  /** Inverte qual das duas metades permanece visível. */
  invertido: boolean;
};

export const CORTES_INICIAIS: Record<EixoCorte, Corte> = {
  sagital: { ativo: false, posicao: 0, invertido: false },
  coronal: { ativo: false, posicao: 0, invertido: false },
  axial: { ativo: false, posicao: 0, invertido: false },
};

type EstadoCena = {
  /** Id da estrutura selecionada, ou null. */
  selecionada: string | null;
  /** Id da estrutura sob o cursor, no 3D ou na árvore. */
  sobRotulo: string | null;
  /**
   * De onde veio o apontamento. Passar o cursor pela árvore destaca a estrutura
   * no 3D — é assim que se localiza uma peça sem precisar clicar —, mas aí o
   * rótulo flutuante seria redundante, já que o nome está sob o cursor.
   */
  origemRotulo: "3d" | "arvore" | null;
  /** Ids ocultos pelo usuário na árvore. */
  ocultas: Set<string>;
  /**
   * Quando definido, só esta estrutura aparece. É o "isolar" — o gesto mais
   * útil para entender uma peça sozinha antes de recolocá-la no contexto.
   */
  isolada: string | null;

  /** Vista para a qual a câmera está indo; volta a null ao chegar. */
  vista: Vista | null;
  /** A paleta de busca está aberta. */
  buscaAberta: boolean;

  /**
   * Opacidade do envoltório cortical, de 0 a 1. Abaixo de 1 é o modo raio-X:
   * o córtex fica translúcido e as estruturas profundas aparecem por dentro,
   * sem perder a forma externa como referência.
   */
  opacidadeCortex: number;

  cortes: Record<EixoCorte, Corte>;

  selecionar: (id: string | null) => void;
  apontar: (id: string | null, origem?: "3d" | "arvore") => void;
  alternarVisibilidade: (id: string) => void;
  alternarIsolamento: (id: string) => void;
  mostrarTudo: () => void;
  irPara: (vista: Vista | null) => void;
  abrirBusca: (aberta: boolean) => void;
  definirOpacidadeCortex: (valor: number) => void;
  alternarRaioX: () => void;
  definirCorte: (eixo: EixoCorte, mudanca: Partial<Corte>) => void;
  limparCortes: () => void;
};

/** Opacidade do córtex no raio-X: baixa o bastante para revelar o interior. */
const RAIO_X = 0.12;

export const useCena = create<EstadoCena>((set) => ({
  selecionada: null,
  sobRotulo: null,
  origemRotulo: null,
  ocultas: new Set(),
  isolada: null,
  vista: null,
  buscaAberta: false,
  opacidadeCortex: 1,
  cortes: CORTES_INICIAIS,

  selecionar: (id) => set({ selecionada: id }),

  apontar: (id, origem = "3d") =>
    set({ sobRotulo: id, origemRotulo: id ? origem : null }),

  alternarVisibilidade: (id) =>
    set((s) => {
      const ocultas = new Set(s.ocultas);
      if (ocultas.has(id)) ocultas.delete(id);
      else ocultas.add(id);
      return { ocultas };
    }),

  alternarIsolamento: (id) =>
    set((s) => ({
      isolada: s.isolada === id ? null : id,
      // Isolar é um gesto de foco: faz sentido que também selecione.
      selecionada: s.isolada === id ? s.selecionada : id,
    })),

  mostrarTudo: () => set({ ocultas: new Set(), isolada: null }),

  irPara: (vista) => set({ vista }),

  abrirBusca: (buscaAberta) => set({ buscaAberta }),

  definirOpacidadeCortex: (valor) =>
    set({ opacidadeCortex: Math.min(1, Math.max(0, valor)) }),

  alternarRaioX: () =>
    set((s) => ({ opacidadeCortex: s.opacidadeCortex < 1 ? 1 : RAIO_X })),

  definirCorte: (eixo, mudanca) =>
    set((s) => ({ cortes: { ...s.cortes, [eixo]: { ...s.cortes[eixo], ...mudanca } } })),

  limparCortes: () => set({ cortes: CORTES_INICIAIS }),
}));

/** Uma estrutura aparece se não está oculta e nenhum isolamento a exclui. */
export function estaVisivel(
  id: string,
  ocultas: Set<string>,
  isolada: string | null,
): boolean {
  if (isolada) return id === isolada;
  return !ocultas.has(id);
}
