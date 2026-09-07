"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DIVISOES, buscar, ehBilateral } from "@/dados/estruturas";
import { useCena } from "@/estado/cena";

export default function Busca() {
  const aberta = useCena((s) => s.buscaAberta);
  const abrirBusca = useCena((s) => s.abrirBusca);
  const selecionar = useCena((s) => s.selecionar);
  const apontar = useCena((s) => s.apontar);

  const [termo, setTermo] = useState("");
  const [indice, setIndice] = useState(0);
  const campoRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const resultados = useMemo(() => buscar(termo).slice(0, 40), [termo]);

  // ⌘K no Mac, Ctrl+K no resto. A tecla "/" também abre, como em muitas
  // ferramentas de busca.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const emCampo =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !emCampo)) {
        e.preventDefault();
        abrirBusca(true);
      }
      if (e.key === "Escape") abrirBusca(false);
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [abrirBusca]);

  useEffect(() => {
    if (aberta) {
      setTermo("");
      setIndice(0);
      // Foco direto, sem requestAnimationFrame: o efeito já roda com o campo
      // montado, e adiar para o próximo quadro amarraria o foco à taxa de
      // renderização — num aparelho lento a pessoa digitaria no vazio.
      campoRef.current?.focus();
    }
  }, [aberta]);

  useEffect(() => setIndice(0), [termo]);

  // Mantém o item destacado visível ao navegar pelo teclado.
  useEffect(() => {
    listaRef.current
      ?.querySelector(`[data-indice="${indice}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [indice]);

  if (!aberta) return null;

  const escolher = (id: string) => {
    selecionar(id);
    apontar(null);
    abrirBusca(false);
  };

  const navegar = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && resultados[indice]) {
      e.preventDefault();
      escolher(resultados[indice].id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 pt-[14vh] backdrop-blur-[2px]"
      onClick={() => abrirBusca(false)}
    >
      <div
        className="painel w-[min(560px,92vw)] overflow-hidden rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-borda px-4">
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-texto-fraco" fill="none" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeLinecap="round" />
          </svg>
          <input
            ref={campoRef}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={navegar}
            placeholder="Buscar estrutura em português, latim ou inglês…"
            className="w-full bg-transparent py-3.5 text-[14px] text-texto outline-none placeholder:text-texto-fraco"
          />
          <kbd className="shrink-0 rounded border border-borda px-1.5 py-0.5 text-[10px] text-texto-fraco">
            esc
          </kbd>
        </div>

        <div ref={listaRef} className="rolagem max-h-[46vh] overflow-y-auto p-1.5">
          {resultados.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-texto-fraco">
              Nada encontrado para “{termo}”.
            </p>
          ) : (
            resultados.map((estrutura, i) => {
              const divisao = DIVISOES[estrutura.divisao];
              return (
                <button
                  key={estrutura.id}
                  data-indice={i}
                  onMouseEnter={() => setIndice(i)}
                  onClick={() => escolher(estrutura.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                    i === indice ? "bg-white/[0.08]" : ""
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: divisao.cor }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] leading-tight">
                      {estrutura.nome}
                      {ehBilateral(estrutura) && (
                        <span className="ml-1.5 text-[10px] text-texto-fraco">D · E</span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] italic leading-tight text-texto-fraco">
                      {estrutura.latim}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10.5px] text-texto-fraco">{divisao.nome}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
