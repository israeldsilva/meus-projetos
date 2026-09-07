import { create } from "zustand";

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

  selecionar: (id: string | null) => void;
  apontar: (id: string | null, origem?: "3d" | "arvore") => void;
  alternarVisibilidade: (id: string) => void;
  alternarIsolamento: (id: string) => void;
  mostrarTudo: () => void;
};

export const useCena = create<EstadoCena>((set) => ({
  selecionada: null,
  sobRotulo: null,
  origemRotulo: null,
  ocultas: new Set(),
  isolada: null,

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
