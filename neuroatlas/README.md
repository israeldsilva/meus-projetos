# Neuroatlas

Atlas 3D interativo de neuroanatomia, para estudo do sistema nervoso.

Um encéfalo tridimensional real e navegável, com cada estrutura isolável e clicável,
acompanhada de uma ficha de estudo — função, irrigação, relações anatômicas e
correlação clínica — mais um modo de estudo ativo com quiz e flashcards.

Construído para a disciplina de **Neuroanatomia Aplicada** (mestrado em Ciências da Saúde).

---

## Por que existe

Atlas impressos e slides são fracos exatamente no ponto que mais importa em
neuroanatomia: **entender onde cada estrutura fica em relação às outras, em três
dimensões.** Ver o tálamo isolado numa prancha é diferente de girá-lo, escondê-lo,
cortá-lo no plano coronal e enxergar os núcleos da base ao redor.

## Estado

Em desenvolvimento. Consulte o [plano do projeto](docs/PLANO.md) para o escopo
completo, a arquitetura e as fases de entrega.

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Plano documentado e versionado | ✅ |
| 1 | Fatia vertical: pipeline + viewer 3D + árvore + fichas | ✅ |
| 2 | Acervo completo (62 estruturas), busca ⌘K, presets de câmera | ✅ |
| 3 | Planos de corte, modo raio-X, controle de opacidade | ✅ |
| 4 | Modo estudo: identificação no 3D, flashcards, progresso | ✅ |
| 5 | Medula espinhal e nervos cranianos | ⏳ |
| 6 | Polimento, PWA offline, deploy | ⏳ |

## Rodando localmente

```bash
npm install
npm run dev          # http://localhost:3000
```

O `encefalo.glb` já vem versionado, então o app roda sem nenhum passo extra.
Para regerá-lo (ao acrescentar estruturas em `src/dados/estruturas.json`), é
preciso o acervo BodyParts3D, que não é versionado aqui por causa do tamanho:

```bash
git clone --depth 1 https://github.com/Kevin-Mattheus-Moerman/BodyParts3D
python3 scripts/build_assets.py --acervo ./BodyParts3D
npx @gltf-transform/cli draco public/modelos/encefalo.glb public/modelos/encefalo.glb
```

Verificação visual, com o servidor rodando:

```bash
node scripts/captura.mjs tela.png
CLICAR="Tálamo" ISOLAR=1 node scripts/captura.mjs isolado.png
CORTE="Sagital" VISTA="Lateral D" node scripts/captura.mjs mediossagital.png
RAIOX=1 CORTE="Coronal" VISTA="Posterior" node scripts/captura.mjs coronal.png
```

## Documentação

- **[PLANO.md](docs/PLANO.md)** — escopo, arquitetura, stack e fases
- **[FONTES.md](docs/FONTES.md)** — proveniência dos modelos 3D, licença e inventário completo das 62 estruturas

## Licença

- **Código:** MIT
- **Modelos 3D:** derivados do [BodyParts3D/Anatomography](https://lifesciencedb.jp/bp3d/)
  (Database Center for Life Science), sob **CC BY-SA 2.1 JP**. Ver [FONTES.md](docs/FONTES.md).
