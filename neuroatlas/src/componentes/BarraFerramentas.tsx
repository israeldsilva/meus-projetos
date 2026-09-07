"use client";

import { useState } from "react";
import { useCena, type EixoCorte, type Vista } from "@/estado/cena";

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

const PLANOS: { eixo: EixoCorte; rotulo: string; revela: string }[] = [
  { eixo: "sagital", rotulo: "Sagital", revela: "Separa os lados; no plano mediano revela o corpo caloso e o tronco" },
  { eixo: "coronal", rotulo: "Coronal", revela: "Separa frente e trás; revela os núcleos da base e os ventrículos" },
  { eixo: "axial", rotulo: "Axial", revela: "Separa cima e baixo; revela o tálamo e a cápsula interna" },
];

function LinhaCorte({ eixo, rotulo, revela }: (typeof PLANOS)[number]) {
  const corte = useCena((s) => s.cortes[eixo]);
  const definirCorte = useCena((s) => s.definirCorte);

  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => definirCorte(eixo, { ativo: !corte.ativo })}
        title={revela}
        className={`w-[68px] shrink-0 rounded-md py-1 text-[11.5px] transition-colors ${
          corte.ativo
            ? "bg-acento/15 text-acento"
            : "text-texto-fraco hover:bg-white/[0.06] hover:text-texto-suave"
        }`}
      >
        {rotulo}
      </button>

      <input
        type="range"
        min={-1.1}
        max={1.1}
        step={0.01}
        value={corte.posicao}
        disabled={!corte.ativo}
        onChange={(e) =>
          definirCorte(eixo, { posicao: Number(e.target.value), ativo: true })
        }
        style={{ accentColor: "#6aa8ff" }}
        className="h-1 w-[150px] cursor-pointer disabled:cursor-default disabled:opacity-30"
      />

      <button
        onClick={() => definirCorte(eixo, { invertido: !corte.invertido })}
        disabled={!corte.ativo}
        title="Trocar a metade que fica visível"
        className="rounded p-1 text-texto-fraco transition-colors hover:bg-white/10 hover:text-texto-suave disabled:opacity-25 disabled:hover:bg-transparent"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" strokeWidth="1.4">
          <path d="M2 6h9M9 3.5 11.5 6 9 8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 10H5M7 7.5 4.5 10 7 12.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

export default function BarraFerramentas() {
  const irPara = useCena((s) => s.irPara);
  const vistaAtual = useCena((s) => s.vista);
  const opacidadeCortex = useCena((s) => s.opacidadeCortex);
  const definirOpacidadeCortex = useCena((s) => s.definirOpacidadeCortex);
  const alternarRaioX = useCena((s) => s.alternarRaioX);
  const cortes = useCena((s) => s.cortes);
  const limparCortes = useCena((s) => s.limparCortes);
  const entrarModo = useCena((s) => s.entrarModo);

  const [aberto, setAberto] = useState(false);
  const raioXAtivo = opacidadeCortex < 1;
  const cortando = cortes.sagital.ativo || cortes.coronal.ativo || cortes.axial.ativo;

  return (
    /* Ancorada à esquerda, ao lado da árvore, e não no centro: centralizada,
       ela cobre justamente o tronco encefálico e as estruturas inferiores nas
       vistas em que mais importam, como a mediossagital. */
    <div className="absolute bottom-4 left-[290px] z-10">
      {aberto && (
        <div className="painel mb-1.5 rounded-lg px-4 py-3.5">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="w-[68px] shrink-0 text-[11.5px] text-texto-suave">Córtex</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={opacidadeCortex}
              onChange={(e) => definirOpacidadeCortex(Number(e.target.value))}
              style={{ accentColor: "#6aa8ff" }}
              className="h-1 w-[150px] cursor-pointer"
            />
            <span className="w-8 shrink-0 text-right text-[10.5px] text-texto-fraco tabular-nums">
              {Math.round(opacidadeCortex * 100)}%
            </span>
          </div>

          <div className="space-y-2 border-t border-borda pt-3">
            {PLANOS.map((p) => (
              <LinhaCorte key={p.eixo} {...p} />
            ))}
          </div>

          {cortando && (
            <button
              onClick={limparCortes}
              className="mt-3 w-full rounded-md border border-borda py-1.5 text-[11.5px] text-texto-suave transition-colors hover:bg-white/[0.05] hover:text-texto"
            >
              Remover cortes
            </button>
          )}
        </div>
      )}

      <div className="painel flex items-center gap-0.5 rounded-lg p-1">
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

        <span className="mx-1 h-4 w-px bg-borda" />

        <button
          onClick={alternarRaioX}
          title="Torna o córtex translúcido para revelar as estruturas profundas"
          className={`rounded-md px-2.5 py-1.5 text-[11.5px] transition-colors ${
            raioXAtivo
              ? "bg-acento/15 text-acento"
              : "text-texto-suave hover:bg-white/[0.06] hover:text-texto"
          }`}
        >
          Raio-X
        </button>

        <button
          onClick={() => entrarModo("identificacao")}
          title="Testar o reconhecimento das estruturas no 3D"
          className="rounded-md px-2.5 py-1.5 text-[11.5px] text-texto-suave transition-colors hover:bg-white/[0.06] hover:text-texto"
        >
          Estudar
        </button>

        <button
          onClick={() => setAberto((a) => !a)}
          title="Planos de corte e opacidade"
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] transition-colors ${
            aberto || cortando
              ? "bg-white/10 text-texto"
              : "text-texto-suave hover:bg-white/[0.06] hover:text-texto"
          }`}
        >
          Cortes
          <svg
            viewBox="0 0 10 10"
            className={`h-2 w-2 transition-transform ${aberto ? "" : "rotate-180"}`}
            fill="none"
            strokeWidth="1.6"
          >
            <path d="M1.5 6.5 5 3l3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
