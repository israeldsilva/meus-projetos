"use client";

import { useEffect, useState } from "react";
import {
  DIVISOES,
  ORDEM_DIVISOES,
  ehBilateral,
  estruturas,
  estruturasDaDivisao,
  type Estrutura,
} from "@/dados/estruturas";
import { estaVisivel, useCena } from "@/estado/cena";

function IconeOlho({ aberto }: { aberto: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" strokeWidth="1.4">
      <path
        d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4-6.5-4-6.5-4Z"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="1.8" stroke="currentColor" />
      {!aberto && <path d="M2.5 13.5 13.5 2.5" stroke="currentColor" strokeLinecap="round" />}
    </svg>
  );
}

function IconeIsolar() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" strokeWidth="1.4">
      <circle cx="8" cy="8" r="4.5" stroke="currentColor" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <path d="M8 1v1.8M8 13.2V15M1 8h1.8M13.2 8H15" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function Linha({ estrutura, cor }: { estrutura: Estrutura; cor: string }) {
  const selecionada = useCena((s) => s.selecionada);
  const ocultas = useCena((s) => s.ocultas);
  const isolada = useCena((s) => s.isolada);
  const selecionar = useCena((s) => s.selecionar);
  const apontar = useCena((s) => s.apontar);
  const alternarVisibilidade = useCena((s) => s.alternarVisibilidade);
  const alternarIsolamento = useCena((s) => s.alternarIsolamento);

  const visivel = estaVisivel(estrutura.id, ocultas, isolada);
  const ativa = selecionada === estrutura.id;
  const isolando = isolada === estrutura.id;
  const bilateral = ehBilateral(estrutura);

  return (
    <div
      onMouseEnter={() => apontar(estrutura.id, "arvore")}
      onMouseLeave={() => apontar(null)}
      className={`group flex items-center gap-2 rounded-md px-2 py-[7px] transition-colors ${
        ativa ? "bg-white/[0.07]" : "hover:bg-white/[0.035]"
      }`}
    >
      <button
        onClick={() => selecionar(ativa ? null : estrutura.id)}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full transition-opacity"
          style={{ backgroundColor: cor, opacity: visivel ? 1 : 0.25 }}
        />
        <span className="min-w-0">
          <span
            className={`block truncate text-[13px] leading-tight ${
              visivel ? "text-texto" : "text-texto-fraco"
            }`}
          >
            {estrutura.nome}
            {bilateral && (
              <span className="ml-1.5 text-[10px] text-texto-fraco">D · E</span>
            )}
          </span>
          <span className="block truncate text-[11px] italic leading-tight text-texto-fraco">
            {estrutura.latim}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          onClick={() => alternarIsolamento(estrutura.id)}
          title={isolando ? "Mostrar todas" : "Isolar esta estrutura"}
          className={`rounded p-1 transition-colors hover:bg-white/10 ${
            isolando ? "text-acento" : "text-texto-fraco hover:text-texto-suave"
          }`}
        >
          <IconeIsolar />
        </button>
        <button
          onClick={() => alternarVisibilidade(estrutura.id)}
          title={visivel ? "Ocultar" : "Mostrar"}
          className="rounded p-1 text-texto-fraco transition-colors hover:bg-white/10 hover:text-texto-suave"
        >
          <IconeOlho aberto={visivel} />
        </button>
      </div>

      {isolando && (
        <span className="shrink-0 text-[10px] tracking-wide text-acento opacity-100 group-hover:hidden">
          isolada
        </span>
      )}
    </div>
  );
}

export default function ArvoreAnatomica() {
  const ocultas = useCena((s) => s.ocultas);
  const isolada = useCena((s) => s.isolada);
  const mostrarTudo = useCena((s) => s.mostrarTudo);
  const abrirBusca = useCena((s) => s.abrirBusca);
  const alterado = ocultas.size > 0 || isolada !== null;

  // Detectado depois da montagem: ler o agente do usuário durante a renderização
  // faria o HTML do servidor divergir do cliente.
  const [atalho, setAtalho] = useState("Ctrl K");
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setAtalho("⌘K");
  }, []);

  return (
    <aside className="painel rolagem absolute top-4 bottom-4 left-4 z-10 flex w-[270px] flex-col overflow-hidden rounded-xl">
      <header className="shrink-0 border-b border-borda px-3 pt-4 pb-3">
        <div className="px-1">
          <h1 className="text-[15px] font-medium tracking-tight">Neuroatlas</h1>
          <p className="mt-0.5 text-[11px] text-texto-fraco">
            Encéfalo · {estruturas.length} estruturas
          </p>
        </div>

        <button
          onClick={() => abrirBusca(true)}
          className="mt-3 flex w-full items-center gap-2 rounded-md border border-borda px-2.5 py-2 text-left text-[12px] text-texto-fraco transition-colors hover:bg-white/[0.04] hover:text-texto-suave"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" />
            <path d="m10.5 10.5 3 3" stroke="currentColor" strokeLinecap="round" />
          </svg>
          <span className="flex-1">Buscar…</span>
          <kbd className="rounded border border-borda px-1 py-px text-[10px]">{atalho}</kbd>
        </button>
      </header>

      <div className="rolagem flex-1 overflow-y-auto px-2 py-2">
        {ORDEM_DIVISOES.map((divisao) => {
          const grupo = estruturasDaDivisao(divisao);
          if (grupo.length === 0) return null;

          return (
            <section key={divisao} className="mb-1">
              <h2 className="px-2 pt-3 pb-1.5 text-[10px] font-medium tracking-[0.09em] text-texto-fraco uppercase">
                {DIVISOES[divisao].nome}
              </h2>
              {grupo.map((estrutura) => (
                <Linha
                  key={estrutura.id}
                  estrutura={estrutura}
                  cor={DIVISOES[divisao].cor}
                />
              ))}
            </section>
          );
        })}
      </div>

      {alterado && (
        <footer className="shrink-0 border-t border-borda p-2">
          <button
            onClick={mostrarTudo}
            className="w-full rounded-md py-2 text-[12px] text-texto-suave transition-colors hover:bg-white/[0.05] hover:text-texto"
          >
            Mostrar todas as estruturas
          </button>
        </footer>
      )}
    </aside>
  );
}
