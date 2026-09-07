"use client";

import { useCena, type Vista } from "@/estado/cena";

/**
 * As mesmas vistas de um atlas impresso. "Lateral D" e "Lateral E" designam o
 * lado da PACIENTE que se observa, não o lado da tela — é a convenção
 * anatômica, e trocá-la seria o mesmo erro de espelhamento que o pipeline
 * evita ao gerar o modelo.
 */
const VISTAS: { vista: Vista; rotulo: string; titulo: string }[] = [
  { vista: "anterior", rotulo: "Anterior", titulo: "Vista anterior (de frente)" },
  { vista: "posterior", rotulo: "Posterior", titulo: "Vista posterior (por trás)" },
  { vista: "lateral-direita", rotulo: "Lateral D", titulo: "Vista lateral direita" },
  { vista: "lateral-esquerda", rotulo: "Lateral E", titulo: "Vista lateral esquerda" },
  { vista: "superior", rotulo: "Superior", titulo: "Vista superior (de cima)" },
  { vista: "inferior", rotulo: "Inferior", titulo: "Vista inferior (por baixo)" },
];

export default function PresetsCamera() {
  const irPara = useCena((s) => s.irPara);
  const vistaAtual = useCena((s) => s.vista);

  return (
    <div className="painel absolute bottom-12 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 rounded-lg p-1">
      {VISTAS.map(({ vista, rotulo, titulo }) => (
        <button
          key={vista}
          onClick={() => irPara(vista)}
          title={titulo}
          className={`rounded-md px-2.5 py-1.5 text-[11.5px] transition-colors ${
            vistaAtual === vista
              ? "bg-white/10 text-texto"
              : "text-texto-suave hover:bg-white/[0.06] hover:text-texto"
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}
