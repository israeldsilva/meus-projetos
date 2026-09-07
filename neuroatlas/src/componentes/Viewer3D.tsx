"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import {
  DIVISOES,
  ehEnvoltorio,
  ehTranslucida,
  porFma,
  porId,
  type Estrutura,
} from "@/dados/estruturas";
import { estaVisivel, useCena, type EixoCorte, type Vista } from "@/estado/cena";

const MODELO = "/modelos/encefalo.glb";
// Decodificador Draco servido localmente: o padrão do three aponta para um CDN
// do Google, o que quebraria o app offline.
const DRACO = "/draco/";

/**
 * Opacidade de repouso da estrutura, antes de qualquer destaque.
 * Os ventrículos são cavidades internas e ficam sempre translúcidos; o
 * envoltório cortical obedece ao controle de raio-X.
 */
function opacidadeBase(estrutura: Estrutura, opacidadeCortex: number): number {
  // Os ventrículos não acompanham o raio-X: são estruturas profundas, e o
  // ponto de tornar o córtex transparente é justamente poder vê-los.
  if (ehTranslucida(estrutura)) return 0.4;
  if (ehEnvoltorio(estrutura)) return opacidadeCortex;
  return 1;
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

/**
 * Normal de cada plano anatômico de corte, nos eixos da cena (+X esquerda,
 * +Y superior, +Z anterior). O plano sagital separa os lados, o coronal separa
 * frente e trás, o axial separa cima e baixo.
 */
const NORMAIS: Record<EixoCorte, THREE.Vector3> = {
  sagital: new THREE.Vector3(1, 0, 0),
  coronal: new THREE.Vector3(0, 0, 1),
  axial: new THREE.Vector3(0, 1, 0),
};

/**
 * Aplica os planos de corte à cena inteira.
 *
 * Usa o recorte GLOBAL do renderizador em vez de listas por material: os planos
 * valem para todas as 100 malhas de uma vez, e o three recompila os shaders
 * sozinho quando a quantidade de planos muda.
 *
 * Um `THREE.Plane` descarta o que estiver do lado negativo, onde
 * `normal · ponto + constante < 0`. Para manter a metade além de `posicao` ao
 * longo da normal, a constante é `-posicao`; inverter o corte troca o sinal
 * dos dois, e a outra metade é que fica.
 */
function Cortes() {
  const { gl } = useThree();
  const cortes = useCena((s) => s.cortes);

  const planos = useMemo(
    () =>
      ({
        sagital: new THREE.Plane(),
        coronal: new THREE.Plane(),
        axial: new THREE.Plane(),
      }) as Record<EixoCorte, THREE.Plane>,
    [],
  );

  useEffect(() => {
    const ativos: THREE.Plane[] = [];

    for (const eixo of Object.keys(planos) as EixoCorte[]) {
      const corte = cortes[eixo];
      if (!corte.ativo) continue;

      const sinal = corte.invertido ? -1 : 1;
      const plano = planos[eixo];
      plano.normal.copy(NORMAIS[eixo]).multiplyScalar(sinal);
      plano.constant = -corte.posicao * sinal;
      ativos.push(plano);
    }

    gl.clippingPlanes = ativos;
  }, [cortes, gl, planos]);

  // Deixar os planos ativos ao desmontar afetaria qualquer cena seguinte.
  useEffect(() => {
    return () => {
      gl.clippingPlanes = [];
    };
  }, [gl]);

  return null;
}

type Controles = {
  getAzimuthalAngle: () => number;
  getPolarAngle: () => number;
  setAzimuthalAngle: (a: number) => void;
  setPolarAngle: (a: number) => void;
  target: THREE.Vector3;
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

/**
 * Cores do modo estudo.
 *
 * Durante a prova TODAS as estruturas ficam de um cinza uniforme e só a
 * perguntada recebe cor. É como funciona a prova prática de anatomia: um
 * espécime dissecado não tem código de cores — é todo da mesma cor, e se
 * identifica a peça marcada pela forma e pela posição.
 *
 * Isso resolve de uma vez dois problemas. A cor da divisão deixaria de ser uma
 * pista, e as estruturas voltam a ser OPACAS: dezenas de superfícies
 * translúcidas sobrepostas somavam uma névoa leitosa em que o destaque
 * simplesmente sumia.
 */
const NEUTRO_ESTUDO = "#7E838D";
const DESTAQUE_ESTUDO = "#F0A93B";

type Caixas = React.RefObject<Map<string, THREE.Box3>>;

/**
 * Aponta a câmera para a estrutura perguntada.
 *
 * Sem isso o estudo seria injusto: a habênula tem 384 triângulos e o corpo
 * pineal 2.536 — enquadrados junto com o encéfalo inteiro, virariam pontos de
 * poucos pixels. O salto é imediato, e não animado, porque entre duas perguntas
 * quaisquer a interpolação só desorientaria.
 */
function Enquadrar({
  caixas,
  controles,
}: {
  caixas: Caixas;
  controles: React.RefObject<Controles | null>;
}) {
  const alvoEstudo = useCena((s) => s.alvoEstudo);
  const modo = useCena((s) => s.modo);
  const { camera } = useThree();

  useEffect(() => {
    const ctrl = controles.current;
    if (!ctrl) return;

    const caixa = alvoEstudo ? caixas.current?.get(alvoEstudo) : null;

    if (!caixa || modo === "atlas") {
      // Fora do estudo a órbita volta ao centro do encéfalo.
      ctrl.target.set(0, 0, 0);
      ctrl.update();
      return;
    }

    const centro = caixa.getCenter(new THREE.Vector3());
    const raio = caixa.getBoundingSphere(new THREE.Sphere()).radius;

    // O piso é o que mais importa. Sem ele, enquadrar o aqueduto cerebral —
    // que tem alguns milímetros — colocaria a câmera DENTRO do encéfalo, e a
    // pergunta viraria uma sopa translúcida sem referência nenhuma. O teto
    // evita o oposto: enquadrar o córtex e voltar à vista do atlas inteiro.
    const distancia = Math.min(Math.max(raio * 6, 1.7), 3.4);
    const direcao = camera.position.clone().sub(ctrl.target).normalize();

    ctrl.target.copy(centro);
    camera.position.copy(centro).add(direcao.multiplyScalar(distancia));
    ctrl.update();
  }, [alvoEstudo, modo, caixas, controles, camera]);

  return null;
}

function Encefalo({ caixas }: { caixas: Caixas }) {
  const { scene } = useGLTF(MODELO, DRACO);
  const selecionada = useCena((s) => s.selecionada);
  const sobRotulo = useCena((s) => s.sobRotulo);
  const ocultas = useCena((s) => s.ocultas);
  const isolada = useCena((s) => s.isolada);
  const opacidadeCortex = useCena((s) => s.opacidadeCortex);
  const cortes = useCena((s) => s.cortes);
  const modo = useCena((s) => s.modo);
  const alvoEstudo = useCena((s) => s.alvoEstudo);
  const selecionar = useCena((s) => s.selecionar);
  const apontar = useCena((s) => s.apontar);

  const estudando = modo !== "atlas";
  const alvo = alvoEstudo ? porId.get(alvoEstudo) : undefined;
  const alvoEhEnvoltorio = alvo ? ehEnvoltorio(alvo) : false;

  const cortando =
    cortes.sagital.ativo || cortes.coronal.ativo || cortes.axial.ativo;

  // O cache do useGLTF é compartilhado; clonamos antes de trocar materiais
  // para não contaminar outras montagens do componente.
  const { modelo, malhas } = useMemo(() => {
    const modelo = scene.clone(true);
    // As caixas usam matrixWorld, que o clone ainda não calculou por não estar
    // na cena; sem isto os limites sairiam na posição errada.
    modelo.updateMatrixWorld(true);

    const malhas: { malha: THREE.Mesh; estruturaId: string }[] = [];
    const limites = new Map<string, THREE.Box3>();

    modelo.traverse((objeto) => {
      const malha = objeto as THREE.Mesh;
      if (!malha.isMesh) return;

      const estrutura = porFma.get(malha.name);
      if (!estrutura) return;

      malha.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(DIVISOES[estrutura.divisao].cor),
        roughness: 0.5,
        metalness: 0.04,
      });
      malhas.push({ malha, estruturaId: estrutura.id });

      // Limites por ESTRUTURA, unindo as malhas dos dois lados: enquadrar só o
      // tálamo direito deixaria o esquerdo fora de quadro, e a pergunta é
      // sobre a estrutura, não sobre um dos lados.
      malha.geometry.computeBoundingBox();
      const caixa = malha.geometry.boundingBox!.clone().applyMatrix4(malha.matrixWorld);
      const atual = limites.get(estrutura.id);
      limites.set(estrutura.id, atual ? atual.union(caixa) : caixa);
    });

    caixas.current = limites;
    return { modelo, malhas };
  }, [scene, caixas]);

  // Visibilidade e destaque são aplicados de forma imperativa: mexer no material
  // existente é muito mais barato que recriar a árvore React a cada clique.
  useEffect(() => {
    const haSelecao = selecionada !== null;

    for (const { malha, estruturaId } of malhas) {
      const estrutura = porId.get(estruturaId);
      if (!estrutura) continue;

      // Quando a pergunta é sobre uma estrutura profunda, o envoltório
      // cortical sai de cena por inteiro em vez de ficar translúcido: é a
      // dissecção que um exame prático faria para expor o que está sendo
      // perguntado. Se a pergunta é sobre o próprio córtex, ele fica.
      const eEnvoltorio = ehEnvoltorio(estrutura);
      malha.visible = estudando
        ? alvoEhEnvoltorio || !eEnvoltorio
        : estaVisivel(estruturaId, ocultas, isolada);

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
      // ainda soma quase opaco, escondendo justamente as estruturas profundas
      // que mais interessam ver.
      const recuada = haSelecao && !destacada;

      const eAlvo = estudando && alvoEstudo === estruturaId;
      const opacidade = estudando
        ? 1
        : opacidadeBase(estrutura, opacidadeCortex) * (recuada ? 0.06 : 1);

      material.opacity = opacidade;
      material.depthWrite = opacidade > 0.95;

      // Com um plano de corte ativo, a superfície interna precisa ser
      // desenhada: sem ela a estrutura cortada fica um casco vazado, e vê-se
      // o fundo da cena através dela.
      const lado = cortando ? THREE.DoubleSide : THREE.FrontSide;
      if (material.side !== lado) {
        material.side = lado;
        material.needsUpdate = true;
      }

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
      // Com tudo opaco, uma estrutura profunda como o aqueduto cerebral ficaria
      // escondida dentro do mesencéfalo e a pergunta seria impossível. O alvo
      // então ignora o teste de profundidade e desenha por cima de tudo, como o
      // pino que marca a peça num exame prático. A forma continua legível
      // porque a iluminação é preservada — só a oclusão é que não se aplica.
      material.depthTest = !eAlvo;
      malha.renderOrder = eAlvo ? 999 : 0;

      const corDivisao = DIVISOES[estrutura.divisao].cor;
      material.color.set(
        estudando ? (eAlvo ? DESTAQUE_ESTUDO : NEUTRO_ESTUDO) : corDivisao,
      );
      material.emissive.set(
        eAlvo ? DESTAQUE_ESTUDO : destacada && !estudando ? corDivisao : "#000000",
      );
      material.emissiveIntensity = eAlvo
        ? 0.35
        : estudando
          ? 0
          : eSelecionada
            ? 0.5
            : eApontada
              ? 0.25
              : 0;
    }
  }, [
    malhas,
    selecionada,
    sobRotulo,
    ocultas,
    isolada,
    opacidadeCortex,
    cortando,
    estudando,
    alvoEstudo,
    alvoEhEnvoltorio,
  ]);

  return (
    <primitive
      object={modelo}
      // Durante o estudo, clicar ou passar o cursor abriria a ficha e o rótulo
      // — ou seja, entregaria a resposta da pergunta na tela.
      onClick={(evento: { stopPropagation: () => void; object: THREE.Object3D }) => {
        if (estudando) return;
        evento.stopPropagation();
        const estrutura = porFma.get(evento.object.name);
        if (estrutura) selecionar(estrutura.id);
      }}
      onPointerOver={(evento: { stopPropagation: () => void; object: THREE.Object3D }) => {
        if (estudando) return;
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
  const caixas = useRef<Map<string, THREE.Box3>>(new Map());

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
          <Encefalo caixas={caixas} />
        </Suspense>

        <Cortes />
        <Enquadrar caixas={caixas} controles={controles} />
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
