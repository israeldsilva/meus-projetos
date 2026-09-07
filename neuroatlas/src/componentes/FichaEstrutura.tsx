"use client";

import { DIVISOES, porId } from "@/dados/estruturas";
import { useCena } from "@/estado/cena";

function Secao({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="border-t border-borda px-5 py-4">
      <h3 className="mb-1.5 text-[10px] font-medium tracking-[0.09em] text-texto-fraco uppercase">
        {titulo}
      </h3>
      <p className="text-[13px] leading-[1.65] text-texto-suave">{texto}</p>
    </section>
  );
}

export default function FichaEstrutura() {
  const selecionada = useCena((s) => s.selecionada);
  const selecionar = useCena((s) => s.selecionar);
  const alternarIsolamento = useCena((s) => s.alternarIsolamento);
  const isolada = useCena((s) => s.isolada);

  const estrutura = selecionada ? porId.get(selecionada) : null;
  if (!estrutura) return null;

  const divisao = DIVISOES[estrutura.divisao];
  const lados = estrutura.malhas.filter((m) => m.lado).length;

  return (
    <aside className="painel rolagem absolute top-4 right-4 bottom-4 z-10 flex w-[350px] flex-col overflow-hidden rounded-xl">
      <header className="shrink-0 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: divisao.cor }}
              />
              <span className="text-[10px] font-medium tracking-[0.09em] text-texto-fraco uppercase">
                {divisao.nome}
              </span>
            </div>
            <h2 className="text-[19px] leading-tight font-medium tracking-tight">
              {estrutura.nome}
            </h2>
            <p className="mt-1 text-[13px] italic text-texto-suave">{estrutura.latim}</p>
            <p className="mt-0.5 text-[11px] text-texto-fraco">
              {estrutura.ingles}
              {lados === 2 && " · estrutura par (direita e esquerda)"}
            </p>
          </div>

          <button
            onClick={() => selecionar(null)}
            title="Fechar"
            className="-mt-1 -mr-1 shrink-0 rounded p-1.5 text-texto-fraco transition-colors hover:bg-white/10 hover:text-texto"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" strokeWidth="1.5">
              <path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <button
          onClick={() => alternarIsolamento(estrutura.id)}
          className={`mt-4 w-full rounded-md border py-2 text-[12px] transition-colors ${
            isolada === estrutura.id
              ? "border-acento/40 bg-acento/10 text-acento"
              : "border-borda text-texto-suave hover:bg-white/[0.05] hover:text-texto"
          }`}
        >
          {isolada === estrutura.id ? "Mostrar todas" : "Isolar no 3D"}
        </button>
      </header>

      <div className="rolagem flex-1 overflow-y-auto">
        <Secao titulo="Função" texto={estrutura.funcao} />
        <Secao titulo="Irrigação" texto={estrutura.irrigacao} />
        <Secao titulo="Relações anatômicas" texto={estrutura.relacoes} />
        <Secao titulo="Correlação clínica" texto={estrutura.clinica} />
      </div>
    </aside>
  );
}
