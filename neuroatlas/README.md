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
| 1 | Fatia vertical: pipeline + viewer 3D + árvore + fichas | 🔨 em andamento |
| 2 | Acervo completo (71 estruturas), busca, presets de câmera | ⏳ |
| 3 | Planos de corte, modo raio-X, isolamento | ⏳ |
| 4 | Modo estudo: quiz, flashcards, trilhas | ⏳ |
| 5 | Medula espinhal e nervos cranianos | ⏳ |
| 6 | Polimento, PWA offline, deploy | ⏳ |

## Documentação

- **[PLANO.md](docs/PLANO.md)** — escopo, arquitetura, stack e fases
- **[FONTES.md](docs/FONTES.md)** — proveniência dos modelos 3D, licença e inventário das 71 estruturas

## Licença

- **Código:** MIT
- **Modelos 3D:** derivados do [BodyParts3D/Anatomography](https://lifesciencedb.jp/bp3d/)
  (Database Center for Life Science), sob **CC BY-SA 2.1 JP**. Ver [FONTES.md](docs/FONTES.md).
