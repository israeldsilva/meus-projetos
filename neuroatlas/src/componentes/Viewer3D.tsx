"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import {
  DIVISOES,
  ehTranslucida,
  porFma,
  porId,
  type Estrutura,
} from "@/dados/estruturas";
import { estaVisivel, useCena, type Vista } from "@/estado/cena";

const MODELO = "/modelos/encefalo.glb";
// Decodificador Draco servido localmente: o padrão do three aponta para um CDN
// do Google, o que quebraria o app offline.
const DRACO = "/draco/";

/** Opacidade de repouso: os ventrículos envolvem tudo, então são translúcidos. */
function opacidadeBase(estrutura: Estrutura): number {
  return ehTranslucida(estrutura) ? 0.4 : 1;
}

/**
 * Vistas anatômicas em coordenadas esféricas do OrbitControls.
 *
 * `theta` é o ângulo azimutal (giro em torno do eixo vertical) e `phi` o polar,
 * medido a partir de +Y: 0 é olhar de cima, π/2 de lado, π de baixo.
 *
 * Lembrando a orientação da cena (ver scripts/build_assets.py): +X é a ESQUERDA
 * anatômica, +Y é superior e +Z é anterior. Daí a vista lateral esquerda ficar
 * em theta = +π/2 — a câmera se posiciona do lado esquerdo da paciente.
 *
 * As vistas superior e inferior não usam phi exatamente 0 ou π: nos polos o
 * ângulo azimutal fica indefinido e a câmera gira sobre si mesma.
 */
const POLO = 0.02;
const VISTAS: Record<Vista, { theta: number; phi: number }> = {
  anterior: { theta: 0, phi: Math.PI / 2 },
  posterior: { theta: Math.PI, phi: Math.PI / 2 },
  "lateral-esquerda": { theta: Math.PI / 2, phi: Math.PI / 2 },
  "lateral-direita": { theta: -Math.PI / 2, phi: Math.PI / 2 },
  superior: { theta: 0, phi: POLO },
  inferior: { theta: 0, phi: Math.PI - POLO },
};

/** Menor caminho angular entre dois ângulos, em radianos. */
function difAngular(de: number, para: number): number {
  return Math.atan2(Math.sin(para - de), Math.cos(para - de));
}

type Controles = {
  getAzimuthalAngle: () => number;
  getPolarAngle: () => number;
  setAzimuthalAngle: (a: number) => void;
  setPolarAngle: (a: number) => void;
  update: () => void;
};

/**
 * Gira a câmera até a vista pedida com uma transição suave.
 *
 * Move os ângulos do próprio OrbitControls em vez de reposicionar a câmera na
 * mão. Escrever `camera.position` direto entra em conflito com o controle, que
 * recalcula a posição a cada quadro — a câmera não chega ao destino. Além
 * disso, interpolar posição linearmente entre vistas opostas faria a câmera
 * atravessar a origem, isto é, passar por dentro do encéfalo.
 *
 * Girando pelos ângulos, a câmera descreve um arco ao redor da peça e o raio
 * fica intocado: trocar de vista não desfaz o zoom que a pessoa ajustou.
 */
function AnimarCamera({ controles }: { controles: React.RefObject<Controles | null> }) {
  const vista = useCena((s) => s.vista);
  const irPara = useCena((s) => s.irPara);

  useFrame((_, delta) => {
    const ctrl = controles.current;
    if (!vista || !ctrl) return;

    const alvo = VISTAS[vista];
    const theta = ctrl.getAzimuthalAngle();
    const phi = ctrl.getPolarAngle();

    const dTheta = difAngular(theta, alvo.theta);
    const dPhi = alvo.phi - phi;

    if (Math.abs(dTheta) < 0.005 && Math.abs(dPhi) < 0.005) {
      ctrl.setAzimuthalAngle(alvo.theta);
      ctrl.setPolarAngle(alvo.phi);
      ctrl.update();
      irPara(null);
      return;
    }

    // Suavização em função do TEMPO decorrido, não do número de quadros. Uma
    // fração fixa por quadro faria a transição durar meio segundo numa máquina
    // rápida e minutos numa lenta; assim ela leva o mesmo tempo em ambas, e num
    // quadro muito longo simplesmente salta direto para o destino.
    const passo = 1 - Math.exp(-delta * 9);

    ctrl.setAzimuthalAngle(theta + dTheta * passo);
    ctrl.setPolarAngle(phi + dPhi * passo);
    ctrl.update();
  });

  return null;
}

function Encefalo() {
  const { scene } = useGLTF(MODELO, DRACO);
  const selecionada = useCena((s) => s.selecionada);
  const sobRotulo = useCena((s) => s.sobRotulo);
  const ocultas = useCena((s) => s.ocultas);
  const isolada = useCena((s) => s.isolada);
  const selecionar = useCena((s) => s.selecionar);
  const apontar = useCena((s) => s.apontar);

  // O cache do useGLTF é compartilhado; clonamos antes de trocar materiais
  // para não contaminar outras montagens do componente.
  const { modelo, malhas } = useMemo(() => {
    const modelo = scene.clone(true);
    const malhas: { malha: THREE.Mesh; estruturaId: string }[] = [];

    modelo.traverse((objeto) => {
      const malha = objeto as THREE.Mesh;
      if (!malha.isMesh) return;

      const estrutura = porFma.get(malha.name);
      if (!estrutura) return;

      const opacidade = opacidadeBase(estrutura);
      malha.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(DIVISOES[estrutura.divisao].cor),
        roughness: 0.5,
        metalness: 0.04,
        transparent: opacidade < 1,
        opacity: opacidade,
      });
      malhas.push({ malha, estruturaId: estrutura.id });
    });

    return { modelo, malhas };
  }, [scene]);

  // Visibilidade e destaque são aplicados de forma imperativa: mexer no material
  // existente é muito mais barato que recriar a árvore React a cada clique.
  useEffect(() => {
    const haSelecao = selecionada !== null;

    for (const { malha, estruturaId } of malhas) {
      const estrutura = porId.get(estruturaId);
      if (!estrutura) continue;

      malha.visible = estaVisivel(estruturaId, ocultas, isolada);

      const material = malha.material as THREE.MeshStandardMaterial;
      const eSelecionada = selecionada === estruturaId;
      const eApontada = sobRotulo === estruturaId;
      const destacada = eSelecionada || eApontada;

      // Ao selecionar, o resto recua para o fundo em vez de sumir: a estrutura
      // ganha destaque sem perder o contexto anatômico ao redor. Uma estrutura
      // apontada emerge do fundo mesmo enquanto outra está selecionada.
      //
      // O valor precisa ser bem baixo porque as opacidades se ACUMULAM: o
      // córtex são dezenas de giros sobrepostos, e a 0,15 cada um o conjunto
      // ainda soma quase opaco, escondendo as estruturas profundas — que são
      // justamente as que mais interessam ver. O raio-X propriamente dito e os
      // planos de corte vêm na Fase 3.
      const recuada = haSelecao && !destacada;
      const opacidade = opacidadeBase(estrutura) * (recuada ? 0.06 : 1);

      material.opacity = opacidade;
      material.depthWrite = opacidade > 0.95;

      // Só marcar como transparente o que de fato está: com 100 malhas, manter
      // todas em alpha-blend custa ordenação por profundidade a cada quadro.
      //
      // `transparent` decide o programa de shader compilado para o material, e
      // não é um valor lido a cada quadro: alterá-lo sem `needsUpdate` mantém o
      // programa antigo, com o blending desligado, e a opacidade é ignorada em
      // silêncio. Comparamos antes de atribuir para não forçar recompilação a
      // cada clique.
      const precisaBlend = opacidade < 1;
      if (material.transparent !== precisaBlend) {
        material.transparent = precisaBlend;
        material.needsUpdate = true;
      }
      material.emissive.set(destacada ? DIVISOES[estrutura.divisao].cor : "#000000");
      material.emissiveIntensity = eSelecionada ? 0.5 : eApontada ? 0.25 : 0;
    }
  }, [malhas, selecionada, sobRotulo, ocultas, isolada]);

  return (
    <primitive
      object={modelo}
      onClick={(evento: { stopPropagation: () => void; object: THREE.Object3D }) => {
        evento.stopPropagation();
        const estrutura = porFma.get(evento.object.name);
        if (estrutura) selecionar(estrutura.id);
      }}
      onPointerOver={(evento: { stopPropagation: () => void; object: THREE.Object3D }) => {
        evento.stopPropagation();
        apontar(porFma.get(evento.object.name)?.id ?? null);
      }}
      onPointerOut={() => apontar(null)}
    />
  );
}

function Carregando() {
  const { progress, active } = useProgress();
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-3 text-[13px] tracking-wide text-texto-suave">
          Carregando o encéfalo
        </div>
        <div className="mx-auto h-px w-40 overflow-hidden bg-borda">
          <div
            className="h-full bg-acento transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Viewer3D() {
  const selecionar = useCena((s) => s.selecionar);
  const sobRotulo = useCena((s) => s.sobRotulo);
  const controles = useRef<Controles | null>(null);

  useEffect(() => {
    document.body.style.cursor = sobRotulo ? "pointer" : "default";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [sobRotulo]);

  return (
    <div className="vinheta absolute inset-0">
      <Carregando />
      <Canvas
        camera={{ position: [2.3, 1.15, 2.5], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onPointerMissed={() => selecionar(null)}
      >
        <color attach="background" args={["#07090d"]} />

        {/* Luz principal alta e frontal, preenchimento frio atrás e um leve
            realce quente por baixo — dá volume sem achatar as superfícies. */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 5, 3]} intensity={2.1} />
        <directionalLight position={[-4, 1, -3]} intensity={0.85} color="#7f9fd0" />
        <directionalLight position={[0, -3, 2]} intensity={0.35} color="#d9a68f" />

        <Suspense fallback={null}>
          <Encefalo />
        </Suspense>

        <AnimarCamera controles={controles} />
        <OrbitControls
          ref={controles as never}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          minDistance={1.3}
          maxDistance={8}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODELO, DRACO);
