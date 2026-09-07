# Neuroatlas — Plano do Projeto

## Contexto

Uma mestranda em Ciências da Saúde cursa **Neuroanatomia Aplicada**, matéria que exige o
domínio das estruturas do sistema nervoso central e periférico — não só os nomes, mas
localização, relações espaciais, irrigação e correlação clínica. Atlas impressos e slides 2D
são ruins justamente no que mais importa aqui: **entender onde cada estrutura fica em
relação às outras, em três dimensões.**

O Neuroatlas é um app web que resolve isso: um encéfalo 3D real, navegável, com cada
estrutura isolável, clicável e acompanhada de uma ficha de estudo — mais um modo de estudo
ativo (quiz e flashcards) construído sobre o mesmo acervo.

**Resultado pretendido:** ela abre no navegador (desktop ou celular), gira o encéfalo, isola
o tálamo, corta no plano coronal pra ver os núcleos da base, lê a ficha, e depois testa a si
mesma.

---

## 1. Fonte dos modelos 3D

**[BodyParts3D/Anatomography](https://lifesciencedb.jp/bp3d/)** — Database Center for Life
Science (Universidade de Tóquio). Anatomia humana real obtida por escaneamento e
**segmentada estrutura por estrutura**. Licença **CC BY-SA 2.1 JP**.

O acervo foi baixado e auditado antes de escrever este plano. Confirmado:

- **937 malhas STL binárias** no total; **99 são de sistema nervoso**.
  *(A primeira auditoria buscou por palavra-chave e contou 71, perdendo o lobo occipital,
  o precúneo, a cápsula interna, os colículos e os corpos geniculados. A contagem correta
  vem de percorrer a hierarquia da ontologia FMA — ver [FONTES.md](FONTES.md).)*
- Quase tudo vem **lateralizado (direita/esquerda)** — ideal para estudo.
- Cada malha é indexada por **FMA ID** (Foundational Model of Anatomy), identificador de
  ontologia estável.
- O arquivo `conventional_part_of.txt` traz a **hierarquia anatômica oficial da FMA**
  (corpo → sistema nervoso → encéfalo → tálamo → ...). A árvore de navegação do app sai
  daí, de dados de ontologia — não de digitação manual.

O inventário completo das 71 estruturas, com contagem de triângulos, está em
[FONTES.md](FONTES.md).

**Detalhe técnico importante:** estruturas "genéricas" (ex.: `tálamo`, FMA62007) não têm
malha própria — são nós compostos cujos **filhos lateralizados têm** (tálamo direito =
FMA258714, tálamo esquerdo = FMA258716). O app monta o composto a partir dos filhos.

### Lacuna conhecida e assumida

**Medula espinhal e 11 dos 12 nervos cranianos não existem neste acervo** (só o óptico, II).
Isso fica para a Fase 5, com fonte a definir.

**Decisão: nada aproximado ou inventado entra no app.** Melhor uma lacuna honesta e
sinalizada do que anatomia falsa num material de estudo de mestrado.

---

## 2. Decisões de arquitetura

**O FMA ID é a chave primária de tudo.** Ele liga malha 3D ↔ ficha de conteúdo ↔ questão de
quiz ↔ nó da árvore. Adicionar uma estrutura nova é acrescentar uma linha num arquivo de
dados; nada mais precisa mudar. É isso que faz o projeto escalar de 16 para 71 estruturas
sem refatoração.

**Assets são pré-processados, não convertidos no navegador.** Um script offline transforma
os STL pesados em glTF comprimido, versionado no repositório. O navegador só baixa o
resultado pronto.

**Um GLB único com nós nomeados**, em vez de um arquivo por estrutura. Preserva as posições
relativas automaticamente (todas as malhas do BodyParts3D compartilham o mesmo espaço de
coordenadas do corpo inteiro) e evita 71 requisições HTTP. Se o carregamento inicial pesar
na Fase 2, aí sim divide-se por grupo anatômico.

---

## 3. Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Deploy trivial na Vercel, tipagem forte no modelo de dados anatômico |
| 3D | **React Three Fiber + @react-three/drei** | Three.js declarativo; `drei` já traz controles de câmera, carregamento de GLTF e Draco |
| Estilo | **Tailwind CSS** | Iteração visual rápida |
| Estado | **Zustand** | Estado da cena (seleção, visibilidade, opacidade, modo) fora da árvore React |
| Pipeline | **Python + trimesh** | Carrega STL, decima malha, exporta GLB numa biblioteca só |
| Compressão | **@gltf-transform/cli** (Draco) | Redução drástica de tamanho |
| Deploy | **Vercel** | Gratuito, HTTPS, deploy por push |

---

## 4. Modelo de dados

`src/dados/estruturas.ts` — fonte única da verdade:

```ts
type Estrutura = {
  fma: string;              // "FMA258714" — chave primária, liga à malha no GLB
  nome: string;             // "Tálamo direito"
  latim: string;            // "Thalamus dexter" (Terminologia Anatômica)
  ingles: string;           // "Right thalamus"
  divisao: Divisao;         // "diencefalo" — define cor e posição na árvore
  lado?: "direito" | "esquerdo";
  composto?: string;        // FMA do pai, ex. "FMA62007" (tálamo)
  funcao: string;
  irrigacao: string;        // artérias responsáveis
  relacoes: string;         // estruturas vizinhas
  clinica: string;          // "se lesionado: ..." — o que cai em prova
};
```

Cada `divisao` (telencéfalo, diencéfalo, tronco, cerebelo, ventrículos, límbico...) carrega
uma **cor própria**, usada de forma consistente no 3D, na árvore e nas fichas. Cor vira
linguagem visual, não decoração.

---

## 5. Pipeline de assets

`scripts/build_assets.py` — executado sob demanda, não a cada build:

1. Lê a lista curada de FMA IDs de `estruturas.ts`.
2. Carrega cada `FMA*.stl` do acervo BodyParts3D.
3. **Decima** malhas pesadas (o cerebelo tem 238.506 triângulos → alvo ~25k). Estruturas
   pequenas (amígdala, 1.7k) passam intactas.
4. **Funde vértices duplicados e recalcula normais suaves** — sem isso o STL renderiza
   facetado e feio.
5. Calcula **um único transform global** (a partir da bounding box da união de todas as
   estruturas) e aplica igualmente a todas — centraliza e escala o conjunto **preservando as
   posições anatômicas relativas**. Aplicar transform por malha quebraria a anatomia.
6. Exporta um GLB com cada estrutura como nó nomeado pelo FMA ID.
7. Comprime com Draco via `gltf-transform`.

**Meta:** 87 MB → ~8-12 MB. Carregamento rápido inclusive no celular.

---

## 6. Design e interação

**Direção visual:** fundo escuro quase preto com vinheta sutil, painéis de vidro fosco com
bordas de 1px, muito respiro, tipografia Inter com termos em latim em itálico. Estética de
instrumento científico — sóbria, não "app de games". O encéfalo é o herói da tela; a
interface recua.

**Layout:** viewer 3D ocupando a tela inteira; painel esquerdo com a árvore anatômica;
painel direito com a ficha da estrutura selecionada. Ambos recolhíveis.

**Interações:**

- Clique numa malha → seleciona, destaca, abre a ficha
- Hover → rótulo flutuante
- Árvore → mostrar/ocultar, **isolar** (esconde todo o resto), opacidade por estrutura
- Busca ⌘K → salta pra qualquer estrutura, buscando em português, latim ou inglês
- Presets de câmera → anterior, posterior, lateral D/E, superior, inferior, mediossagital
- **Modo raio-X** → torna o córtex translúcido pra revelar estruturas profundas
- **Plano de corte** deslizante (axial / coronal / sagital) — recurso de maior valor
  didático em neuroanatomia, nativo no Three.js via `clippingPlanes`

**Modo estudo** (Fase 4):

- **Identificação**: reproduz o formato da prova prática. Todas as estruturas ficam de um
  cinza uniforme — como um espécime dissecado, que não tem código de cores — e só a
  perguntada recebe destaque. As alternativas erradas vêm da mesma divisão: distratores
  de divisões diferentes tornariam a questão trivial por eliminação de categoria.
- **Flashcards** com **repetição espaçada** (SM-2), progresso em `localStorage`.
- **Escopo por divisão**, em vez das trilhas temáticas previstas no plano original.
  Trilhas como "vias motoras" exigiriam agrupar estruturas por critério que eu
  inventaria; o escopo por divisão usa a ontologia real. Se as trilhas fizerem falta, é
  ela quem deve definir quais são.

---

## 7. Fases de entrega

| Fase | Entrega | Estado ao final |
|---|---|---|
| **0** | Plano documentado em `docs/`, commitado e enviado ao GitHub | Plano versionado |
| **1** | **Fatia vertical:** pipeline + viewer 3D + árvore + fichas das estruturas-chave | **App real rodando** — gira, clica, lê a ficha |
| **2** | Acervo completo (62 estruturas, 100 malhas), árvore por lobo, busca ⌘K, presets de câmera | Atlas navegável completo |
| **3** | Planos de corte axial/coronal/sagital, modo raio-X, controle de opacidade | Ferramenta de exploração espacial |
| **4** | Modo estudo: identificação no 3D, flashcards SM-2, progresso por divisão | Ferramenta de estudo ativo |
| **5** | Medula espinhal e nervos cranianos (fonte a definir) | Cobertura da matéria completa |
| **6** | Polimento, PWA offline, deploy na Vercel | Publicado e usável offline |

A Fase 1 é deliberadamente uma **fatia vertical**: atravessa todas as camadas (assets → 3D →
UI → conteúdo) com poucas estruturas, em vez de construir uma camada de cada vez. Assim o
app real aparece cedo e o rumo se corrige com algo concreto na tela.

### Estruturas da Fase 1

Escolhidas por serem o núcleo da matéria e por formarem um conjunto **visualmente coerente**
— as estruturas profundas do encéfalo, que são exatamente as mais difíceis de entender em 2D:

| Estrutura | FMA |
|---|---|
| Mesencéfalo | `FMA61993nsn` |
| Ponte | `FMA67943` |
| Bulbo | `FMA62004` |
| Cerebelo | `FMA67944` |
| Tálamo D / E | `FMA258714` / `FMA258716` |
| Hipotálamo | `FMA62008nsn` |
| Núcleo caudado D / E | `FMA72826` / `FMA72827` |
| Putâmen D / E | `FMA72828` / `FMA72829` |
| Globo pálido D / E | `FMA72830` / `FMA72831` |
| Hipocampo D / E | `FMA72713` / `FMA72714` |
| Amígdala D / E | `FMA72832` / `FMA72833` |
| Corpo caloso | `FMA86464` |
| Ventrículo lateral D / E | `FMA78449` / `FMA78450` |
| Terceiro ventrículo | `FMA78454` |
| Hipófise | `FMA13889` |
| Corpo pineal | `FMA62033` |

---

## 8. Estrutura de pastas

```
neuroatlas/
├── docs/
│   ├── PLANO.md            ← este documento
│   ├── FONTES.md           ← proveniência, licença e inventário
│   └── CONTEUDO.md         ← fichas em um só lugar, para revisão
├── scripts/
│   └── build_assets.py     ← pipeline STL → GLB
├── public/modelos/
│   └── encefalo.glb        ← asset processado (versionado)
├── src/
│   ├── app/                ← páginas Next.js
│   ├── componentes/        ← Viewer3D, ArvoreAnatomica, FichaEstrutura
│   ├── dados/estruturas.ts ← fonte única da verdade
│   └── estado/cena.ts      ← store Zustand
└── package.json
```

---

## 9. Licenciamento e créditos

- **Código:** MIT.
- **Modelos 3D:** derivados do BodyParts3D → permanecem **CC BY-SA 2.1 JP**. Isso exige
  atribuição e que os assets derivados mantenham a mesma licença.
- Crédito visível na interface do app e documentado em [FONTES.md](FONTES.md).

Isso não é burocracia: é a condição de uso legítimo de um acervo científico aberto.

---

## 10. Verificação

**Fase 0:** o plano aparece no GitHub na branch `claude/primeiro-projeto-real-2unway`.

**Fase 1 — critérios objetivos:**

1. `python scripts/build_assets.py` gera `encefalo.glb` **abaixo de 12 MB**.
2. `npm run dev` sobe sem erro; a página carrega o GLB.
3. As estruturas renderizam **nas posições anatômicas corretas entre si** (o cerebelo atrás e
   abaixo, o tálamo central, os ventrículos por dentro) — verificação visual, é o teste que
   pega erro de transform.
4. Clicar numa malha seleciona e abre a ficha correta.
5. Ocultar/isolar pela árvore funciona.
6. **Captura de tela via Playwright** para conferir o resultado visual de fato, em vez de
   presumir que funcionou.

Cada fase seguinte encerra com o app rodando e uma captura de tela do estado novo.

---

## Limitação conhecida dos cortes

Os planos de corte **não têm tampa**. Cada estrutura é uma superfície fechada, e o
plano a abre expondo o interior oco, em vez de uma face sólida como a de uma peça
serrada de verdade. Tampar exigiria uma passagem extra com *stencil buffer* para cada
estrutura e cada plano — cerca de trezentas chamadas de desenho a mais.

Na prática o corte combinado com o raio-X lê bem, e as estruturas continuam
identificáveis pela cor e pela posição. A tampa fica como polimento da Fase 6, se a
falta dela realmente atrapalhar o estudo.

---

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Malhas decimadas ficarem feias ou perderem detalhe anatômico | Ajustar alvo por estrutura; as pequenas (amígdala, pineal) quase não são tocadas |
| GLB único pesar demais com o acervo completo | Resolvido na Fase 2: 100 malhas em 2,7 MB. Se crescer, dividir por grupo anatômico e carregar sob demanda |
| Desempenho de 100 malhas no celular | Orçamento de 15 mil faces por malha na Fase 2. Se ainda pesar: nível de detalhe reduzido no mobile e carregamento sob demanda |
| Precisão do conteúdo das fichas | Todo o conteúdo concentrado em `docs/CONTEUDO.md`, num só lugar, para revisão da mestranda |
