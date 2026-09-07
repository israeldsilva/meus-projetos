"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import {
  DIVISOES,
  ehTranslucida,
  porFma,
  porId,
  type Estrutura,
} from "@/dados/estruturas";
import { estaVisivel, useCena } from "@/estado/cena";

const MODELO = "/modelos/encefalo.glb";
// Decodificador Draco servido localmente: o padrão do three aponta para um CDN
// do Google, o que quebraria o app offline.
const DRACO = "/draco/";

/** Opacidade de repouso: os ventrículos envolvem tudo, então são translúcidos. */
function opacidadeBase(estrutura: Estrutura): number {
  return ehTranslucida(estrutura) ? 0.4 : 1;
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

      malha.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(DIVISOES[estrutura.divisao].cor),
        roughness: 0.5,
        metalness: 0.04,
        transparent: true,
        opacity: opacidadeBase(estrutura),
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
      const recuada = haSelecao && !destacada;
      const opacidade = opacidadeBase(estrutura) * (recuada ? 0.15 : 1);

      material.opacity = opacidade;
      material.depthWrite = opacidade > 0.95;
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

        <OrbitControls
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
