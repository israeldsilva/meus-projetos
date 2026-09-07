"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ArvoreAnatomica from "@/componentes/ArvoreAnatomica";
import Busca from "@/componentes/Busca";
import FichaEstrutura from "@/componentes/FichaEstrutura";
import BarraFerramentas from "@/componentes/BarraFerramentas";
import { DIVISOES, porId } from "@/dados/estruturas";
import { useCena } from "@/estado/cena";

// O React Three Fiber precisa do DOM: nada de renderizar no servidor.
const Viewer3D = dynamic(() => import("@/componentes/Viewer3D"), { ssr: false });

/** Rótulo que segue o cursor, nomeando a estrutura sob ele. */
function RotuloFlutuante() {
  const sobRotulo = useCena((s) => s.sobRotulo);
  const origemRotulo = useCena((s) => s.origemRotulo);
  const [posicao, setPosicao] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const mover = (e: MouseEvent) => setPosicao({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", mover);
    return () => window.removeEventListener("mousemove", mover);
  }, []);

  // Na árvore o nome já está sob o cursor; o rótulo só serve no 3D.
  const estrutura = sobRotulo && origemRotulo === "3d" ? porId.get(sobRotulo) : null;
  if (!estrutura) return null;

  return (
    <div
      className="pointer-events-none fixed z-30 flex items-center gap-2 rounded-md border border-borda bg-fundo-elevado/95 px-2.5 py-1.5 text-[12px] shadow-lg backdrop-blur"
      style={{ left: posicao.x + 16, top: posicao.y + 16 }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: DIVISOES[estrutura.divisao].cor }}
      />
      {estrutura.nome}
    </div>
  );
}

export default function Pagina() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Viewer3D />
      <ArvoreAnatomica />
      <FichaEstrutura />
      <BarraFerramentas />
      <RotuloFlutuante />
      <Busca />
    </main>
  );
}
