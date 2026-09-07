"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DIVISOES,
  ORDEM_DIVISOES,
  estruturas,
  porId,
  type Divisao,
  type Estrutura,
} from "@/dados/estruturas";
import { useCena } from "@/estado/cena";
import { AVALIACOES, revisar, vencido, type Qualidade } from "@/estudo/sm2";
import { cartaoDe, carregar, resumir, salvar, type Progresso } from "@/estudo/progresso";

function embaralhar<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Sorteia as alternativas erradas.
 *
 * Elas vêm da MESMA divisão sempre que possível. Distratores de divisões
 * diferentes tornariam a questão trivial: bastaria reconhecer que a estrutura
 * destacada fica no tronco para descartar tudo que não é do tronco, sem saber
 * qual estrutura é. Tirando da mesma divisão, a pergunta exige discriminar de
 * fato entre vizinhas.
 */
function alternativas(alvo: Estrutura, quantidade = 4): Estrutura[] {
  const irmas = estruturas.filter((e) => e.divisao === alvo.divisao && e.id !== alvo.id);
  const outras = estruturas.filter((e) => e.divisao !== alvo.divisao);

  const erradas = embaralhar(irmas).slice(0, quantidade - 1);
  // Divisões pequenas não têm irmãs suficientes; aí completa-se com o resto.
  if (erradas.length < quantidade - 1) {
    erradas.push(...embaralhar(outras).slice(0, quantidade - 1 - erradas.length));
  }

  return embaralhar([alvo, ...erradas]);
}

function Aba({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md py-1.5 text-[12px] transition-colors ${
        ativa ? "bg-white/10 text-texto" : "text-texto-suave hover:bg-white/[0.05]"
      }`}
    >
      {children}
    </button>
  );
}

export default function ModoEstudo() {
  const modo = useCena((s) => s.modo);
  const entrarModo = useCena((s) => s.entrarModo);
  const definirAlvoEstudo = useCena((s) => s.definirAlvoEstudo);

  const [escopo, setEscopo] = useState<Divisao | "tudo">("tudo");
  const [progresso, setProgresso] = useState<Progresso>({});
  const [fila, setFila] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [opcoes, setOpcoes] = useState<Estrutura[]>([]);
  const [respondido, setRespondido] = useState<string | null>(null);
  const [verso, setVerso] = useState(false);
  const [acertos, setAcertos] = useState(0);

  const estudando = modo !== "atlas";
  const atual = fila[pos] ? porId.get(fila[pos]) : undefined;

  useEffect(() => {
    setProgresso(carregar());
  }, []);

  const idsNoEscopo = useMemo(
    () =>
      (escopo === "tudo" ? estruturas : estruturas.filter((e) => e.divisao === escopo)).map(
        (e) => e.id,
      ),
    [escopo],
  );

  // Monta a fila da sessão. As estruturas vencidas vêm primeiro — é o ponto da
  // repetição espaçada: rever o que está prestes a ser esquecido, e não o que
  // já está firme.
  const montarFila = useCallback(() => {
    const dados = carregar();
    const devidas = idsNoEscopo.filter((id) => vencido(cartaoDe(dados, id)));
    const resto = idsNoEscopo.filter((id) => !vencido(cartaoDe(dados, id)));
    setProgresso(dados);
    setFila([...embaralhar(devidas), ...embaralhar(resto)]);
    setPos(0);
    setRespondido(null);
    setVerso(false);
    setAcertos(0);
  }, [idsNoEscopo]);

  useEffect(() => {
    if (estudando) montarFila();
  }, [estudando, modo, montarFila]);

  // Cada questão define o alvo destacado no 3D e sorteia suas alternativas.
  useEffect(() => {
    if (!estudando) {
      definirAlvoEstudo(null);
      return;
    }
    const estrutura = fila[pos] ? porId.get(fila[pos]) : undefined;
    definirAlvoEstudo(estrutura?.id ?? null);
    if (estrutura && modo === "identificacao") setOpcoes(alternativas(estrutura));
  }, [estudando, modo, fila, pos, definirAlvoEstudo]);

  const registrar = useCallback(
    (id: string, q: Qualidade) => {
      setProgresso((anterior) => {
        const atualizado = { ...anterior, [id]: revisar(cartaoDe(anterior, id), q) };
        salvar(atualizado);
        return atualizado;
      });
    },
    [],
  );

  const avancar = () => {
    setRespondido(null);
    setVerso(false);
    setPos((p) => p + 1);
  };

  if (!estudando) return null;

  const resumo = resumir(progresso, idsNoEscopo);
  const acabou = pos >= fila.length;

  return (
    <aside className="painel rolagem absolute top-4 right-4 bottom-4 z-10 flex w-[350px] flex-col overflow-hidden rounded-xl">
      <header className="shrink-0 border-b border-borda p-3">
        <div className="mb-2.5 flex gap-1">
          <Aba ativa={modo === "identificacao"} onClick={() => entrarModo("identificacao")}>
            Identificação
          </Aba>
          <Aba ativa={modo === "flashcards"} onClick={() => entrarModo("flashcards")}>
            Cartões
          </Aba>
        </div>

        <select
          value={escopo}
          onChange={(e) => setEscopo(e.target.value as Divisao | "tudo")}
          className="w-full rounded-md border border-borda bg-fundo-elevado px-2.5 py-1.5 text-[12px] text-texto-suave outline-none"
        >
          <option value="tudo">Todas as {estruturas.length} estruturas</option>
          {ORDEM_DIVISOES.map((d) => (
            <option key={d} value={d}>
              {DIVISOES[d].nome}
            </option>
          ))}
        </select>
      </header>

      <div className="rolagem flex-1 overflow-y-auto p-4">
        {acabou ? (
          <div className="pt-6 text-center">
            <p className="text-[15px]">Sessão concluída</p>
            <p className="mt-2 text-[13px] text-texto-suave">
              {acertos} de {fila.length} corretas
            </p>
            <button
              onClick={montarFila}
              className="mt-5 rounded-md border border-borda px-4 py-2 text-[12px] text-texto-suave transition-colors hover:bg-white/[0.05] hover:text-texto"
            >
              Nova sessão
            </button>
          </div>
        ) : modo === "identificacao" ? (
          <>
            <p className="mb-4 text-[13px] text-texto-suave">
              Que estrutura está destacada?
            </p>

            <div className="space-y-1.5">
              {opcoes.map((opcao) => {
                const correta = opcao.id === atual?.id;
                const escolhida = respondido === opcao.id;
                const revelado = respondido !== null;

                return (
                  <button
                    key={opcao.id}
                    disabled={revelado}
                    onClick={() => {
                      setRespondido(opcao.id);
                      if (!atual) return;
                      const acertou = opcao.id === atual.id;
                      if (acertou) setAcertos((a) => a + 1);
                      registrar(atual.id, acertou ? 4 : 2);
                    }}
                    className={`w-full rounded-md border px-3 py-2.5 text-left text-[13px] transition-colors ${
                      revelado && correta
                        ? "border-[#7FC96B]/50 bg-[#7FC96B]/10 text-[#a8dd97]"
                        : revelado && escolhida
                          ? "border-[#E8737F]/50 bg-[#E8737F]/10 text-[#f0a0a8]"
                          : revelado
                            ? "border-borda text-texto-fraco"
                            : "border-borda text-texto hover:bg-white/[0.05]"
                    }`}
                  >
                    {opcao.nome}
                    <span className="block text-[11px] italic text-texto-fraco">
                      {opcao.latim}
                    </span>
                  </button>
                );
              })}
            </div>

            {respondido && atual && (
              <div className="mt-4 border-t border-borda pt-4">
                <p className="text-[12.5px] leading-relaxed text-texto-suave">
                  {atual.funcao}
                </p>
                <button
                  onClick={avancar}
                  className="mt-4 w-full rounded-md bg-white/10 py-2 text-[12.5px] text-texto transition-colors hover:bg-white/[0.16]"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        ) : (
          atual && (
            <>
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: DIVISOES[atual.divisao].cor }}
                />
                <span className="text-[10px] font-medium tracking-[0.09em] text-texto-fraco uppercase">
                  {DIVISOES[atual.divisao].nome}
                </span>
              </div>
              <h2 className="text-[18px] leading-tight font-medium">{atual.nome}</h2>
              <p className="mt-0.5 text-[13px] italic text-texto-suave">{atual.latim}</p>

              {!verso ? (
                <button
                  onClick={() => setVerso(true)}
                  className="mt-6 w-full rounded-md border border-borda py-2.5 text-[12.5px] text-texto-suave transition-colors hover:bg-white/[0.05] hover:text-texto"
                >
                  Mostrar resposta
                </button>
              ) : (
                <>
                  <div className="mt-4 space-y-3 border-t border-borda pt-4 text-[12.5px] leading-relaxed">
                    <p className="text-texto-suave">{atual.funcao}</p>
                    <p className="text-texto-suave">
                      <span className="text-texto-fraco">Irrigação. </span>
                      {atual.irrigacao}
                    </p>
                    <p className="text-texto-suave">
                      <span className="text-texto-fraco">Clínica. </span>
                      {atual.clinica}
                    </p>
                  </div>

                  <p className="mt-5 mb-2 text-[11px] text-texto-fraco">
                    Como foi a recordação?
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {AVALIACOES.map(({ q, rotulo, descricao }) => (
                      <button
                        key={q}
                        title={descricao}
                        onClick={() => {
                          registrar(atual.id, q);
                          if (q >= 3) setAcertos((a) => a + 1);
                          avancar();
                        }}
                        className="rounded-md border border-borda py-2 text-[12px] text-texto-suave transition-colors hover:bg-white/[0.06] hover:text-texto"
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )
        )}
      </div>

      <footer className="shrink-0 border-t border-borda p-3">
        <div className="mb-2 flex items-baseline justify-between text-[11px] text-texto-fraco">
          <span>
            {acabou ? fila.length : pos + 1} de {fila.length} · {acertos} certas
          </span>
          <span>{resumo.firmes} firmes</span>
        </div>
        <button
          onClick={() => entrarModo("atlas")}
          className="w-full rounded-md py-1.5 text-[12px] text-texto-suave transition-colors hover:bg-white/[0.05] hover:text-texto"
        >
          Sair do estudo
        </button>
      </footer>
    </aside>
  );
}
