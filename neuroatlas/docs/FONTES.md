# Fontes, licença e inventário

## Origem dos modelos 3D

Todas as malhas 3D do Neuroatlas derivam do **BodyParts3D/Anatomography**, produzido pelo
**Database Center for Life Science (DBCLS)**, Universidade de Tóquio.

- Site oficial: <https://lifesciencedb.jp/bp3d/>
- Espelho usado neste projeto: <https://github.com/Kevin-Mattheus-Moerman/BodyParts3D>
- Versão do acervo: **3.0** (20110915)
- Formato original: **STL binário** (convertido a partir dos OBJ originais pelo espelho)

É anatomia humana real, obtida por escaneamento e **segmentada estrutura por estrutura** —
não é um modelo artístico genérico. Cada estrutura é indexada por um **FMA ID**
(Foundational Model of Anatomy), identificador de ontologia anatômica estável e
internacionalmente reconhecido.

## Licença

> BodyParts3D, © The Database Center for Life Science
> licenciado sob **Creative Commons Attribution-ShareAlike 2.1 Japan**
> <https://creativecommons.org/licenses/by-sa/2.1/jp/>

**O que isso obriga:**

1. **Atribuição** — creditar o DBCLS. Feito aqui e na interface do app.
2. **ShareAlike** — os modelos derivados (nossos GLB processados) permanecem sob
   **CC BY-SA 2.1 JP**. Isso vale para os assets, não para o código do app, que é MIT.

O que fazemos com as malhas — decimar, suavizar normais, recentralizar e converter para
glTF — as caracteriza como **obra derivada**, e portanto elas herdam a licença original.

## Arquivos de apoio do acervo

Além das malhas, o acervo traz metadados que o projeto usa diretamente:

| Arquivo | Uso no projeto |
|---|---|
| `parts_list_e.txt` | Mapeia FMA ID → nome em inglês (1.523 entradas) |
| `conventional_part_of.txt` | **Hierarquia anatômica da FMA** (corpo → sistema nervoso → encéfalo → ...) |
| `composite_parts.txt` | Mapeia estruturas compostas → suas partes primitivas |

---

## Como o acervo foi auditado

> **Correção.** A primeira auditoria deste projeto buscou as estruturas de neuroanatomia
> por **palavra-chave** no índice de nomes e concluiu que existiam 71 malhas. Estava
> errado: o filtro perdia tudo que não continha os termos procurados — entre outros, o
> **lobo occipital**, o **precúneo**, a **cápsula interna**, os **colículos** e os **corpos
> geniculados**, todos presentes no acervo e centrais na disciplina. Um erro de busca
> silencioso, que não falha — apenas devolve menos.

A auditoria correta não usa palavras: percorre a **hierarquia da ontologia FMA** a partir
do nó `FMA7157` (sistema nervoso) em `conventional_part_of.txt`, recolhendo todo
descendente que possua arquivo STL. O resultado é verificável e não depende de como cada
estrutura foi nomeada:

- **99 malhas** de sistema nervoso no acervo
- **99 em uso** no Neuroatlas — cobertura integral
- mais a **hipófise** (`FMA13889`), que fica fora dessa subárvore por ser glândula
  endócrina, e não parte do sistema nervoso

Total: **62 estruturas, 100 malhas.**

---

## Inventário

### Lobo frontal — 4 estruturas, 7 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Giro pré-central | *Gyrus precentralis* | `FMA72661` · `FMA72662` |
| Giro frontal superior | *Gyrus frontalis superior* | `FMA72653` · `FMA72654` |
| Giro frontal médio | *Gyrus frontalis medius* | `FMA72655` · `FMA72656` |
| Giros orbitais e giro reto | *Gyri orbitales et gyrus rectus* | `BP51` |

### Lobo parietal — 4 estruturas, 8 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Giro pós-central | *Gyrus postcentralis* | `FMA72665` · `FMA72666` |
| Giro supramarginal | *Gyrus supramarginalis* | `FMA72667` · `FMA72668` |
| Giro angular | *Gyrus angularis* | `FMA72669` · `FMA72670` |
| Lóbulo parietal superior e precúneo | *Lobulus parietalis superior et precuneus* | `BP50` · `BP49` |

### Lobo temporal — 4 estruturas, 10 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Giro temporal superior | *Gyrus temporalis superior* | `FMA72800` · `FMA72801` · `FMA72804` · `FMA72805` |
| Giro temporal médio | *Gyrus temporalis medius* | `FMA72685` · `FMA72686` |
| Giro temporal inferior | *Gyrus temporalis inferior* | `FMA72687` · `FMA72688` |
| Giro fusiforme | *Gyrus fusiformis* | `FMA72689` · `FMA72690` |

### Lobo occipital — 1 estrutura, 2 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Lobo occipital | *Lobus occipitalis* | `FMA72975` · `FMA72976` |

### Ínsula — 2 estruturas, 4 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Ínsula | *Insula* | `FMA72977` · `FMA72978` |
| Giro curto acessório da ínsula | *Gyrus breves accessorius insulae* | `FMA72701` · `FMA72702` |

### Lobo límbico — 6 estruturas, 11 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Giro do cíngulo | *Gyrus cinguli* | `FMA72717` · `FMA72718` |
| Giro para-hipocampal | *Gyrus parahippocampalis* | `FMA72705` · `FMA72706` |
| Hipocampo | *Hippocampus* | `FMA72713` · `FMA72714` |
| Corpo amigdaloide | *Corpus amygdaloideum* | `FMA72832` · `FMA72833` |
| Fórnix | *Fornix* | `FMA72924` · `FMA72925` |
| Comissura do fórnix | *Commissura fornicis* | `FMA61970` |

### Substância branca — 8 estruturas, 11 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Corpo caloso | *Corpus callosum* | `FMA86464` |
| Substância branca do hemisfério | *Substantia alba hemispherii cerebri* | `FMA61822` |
| Estria medular do tálamo | *Stria medullaris thalami* | `FMA73413` · `FMA73414` |
| Cápsula interna, ramo anterior | *Crus anterius capsulae internae* | `FMA72908` · `FMA72909` |
| Comissura anterior | *Commissura anterior* | `FMA61961` |
| Comissura posterior | *Commissura posterior* | `FMA62072` |
| Septo pelúcido | *Septum pellucidum* | `FMA61844` |
| Estria terminal | *Stria terminalis* | `FMA72939` · `FMA72940` |

### Núcleos da base — 3 estruturas, 6 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Núcleo caudado | *Nucleus caudatus* | `FMA72826` · `FMA72827` |
| Putâmen | *Putamen* | `FMA72828` · `FMA72829` |
| Globo pálido | *Globus pallidus* | `FMA72830` · `FMA72831` |

### Diencéfalo — 9 estruturas, 12 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Tálamo | *Thalamus* | `FMA258714` · `FMA258716` |
| Hipotálamo | *Hypothalamus* | `FMA62008nsn` |
| Hipófise | *Hypophysis* | `FMA13889` |
| Corpo pineal | *Corpus pineale* | `FMA62033` |
| Corpo geniculado lateral | *Corpus geniculatum laterale* | `FMA73303` · `FMA73304` |
| Corpo geniculado medial | *Corpus geniculatum mediale* | `FMA73309` · `FMA73310` |
| Corpo mamilar | *Corpus mamillare* | `FMA74877` |
| Habênula | *Habenula* | `FMA62032` |
| Tuber cinereum | *Tuber cinereum* | `FMA62327` |

### Tronco encefálico — 9 estruturas, 13 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Mesencéfalo | *Mesencephalon* | `FMA61993nsn` |
| Pedúnculo cerebral | *Pedunculus cerebri* | `FMA62394` |
| Ponte | *Pons* | `FMA67943` |
| Bulbo | *Medulla oblongata* | `FMA62004` |
| Colículo superior | *Colliculus superior* | `FMA73422` · `FMA73423` |
| Colículo inferior | *Colliculus inferior* | `FMA73434` · `FMA73435` |
| Braquio do colículo superior | *Brachium colliculi superioris* | `FMA73461` · `FMA73462` |
| Braquio do colículo inferior | *Brachium colliculi inferioris* | `FMA73463` · `FMA73464` |
| Fossa interpeduncular | *Fossa interpeduncularis* | `FMA83740` |

### Cerebelo — 1 estrutura, 1 malha

| Estrutura | Latim | FMA |
|---|---|---|
| Cerebelo | *Cerebellum* | `FMA67944` |

### Ventrículos e LCR — 8 estruturas, 10 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Ventrículo lateral | *Ventriculus lateralis* | `FMA78449` · `FMA78450` |
| Terceiro ventrículo | *Ventriculus tertius* | `FMA78454` |
| Aqueduto cerebral | *Aqueductus mesencephali* | `FMA78467` |
| Quarto ventrículo | *Ventriculus quartus* | `FMA78469` |
| Canal central da medula espinhal | *Canalis centralis* | `FMA78497` |
| Plexo corióide | *Plexus choroideus* | `FMA274027` · `FMA274029` |
| Lâmina terminal | *Lamina terminalis* | `FMA61975` |
| Forame interventricular | *Foramen interventriculare* | `FMA75351` |

### Via óptica — 3 estruturas, 5 malhas

| Estrutura | Latim | FMA |
|---|---|---|
| Nervo óptico | *Nervus opticus* | `FMA50875` · `FMA50878` |
| Quiasma óptico | *Chiasma opticum* | `FMA62045` |
| Trato óptico | *Tractus opticus* | `FMA62382` · `FMA67936` |

---

## Lacunas do acervo

Como a cobertura do sistema nervoso é agora **integral**, o que falta não está no
Neuroatlas porque **não existe no BodyParts3D**:

- **Medula espinhal** (`FMA7647`) — só o canal central (`FMA78497`) tem malha.
- **Nervos cranianos** — apenas o **óptico (II)**, com o quiasma e o trato. Faltam
  olfatório (I), oculomotor (III), troclear (IV), trigêmeo (V), abducente (VI), facial
  (VII), vestibulococlear (VIII), glossofaríngeo (IX), vago (X), acessório (XI) e
  hipoglosso (XII).
- **Giro frontal inferior** (área de Broca) e os **giros temporais transversos**
  (de Heschl) não têm malha própria. Por isso a ínsula, que eles cobririam, aparece
  exposta na face lateral — não é erro de renderização, é ausência dos opérculos no
  acervo.

Isso é tratado na **Fase 5** do [plano](PLANO.md), com fonte a definir.

**Não geramos geometria aproximada para preencher essas lacunas.** Num material de estudo
de mestrado, uma lacuna sinalizada é honesta; anatomia inventada é um erro que a pessoa
carrega para a prova.

### Nota sobre o sufixo `nsn`

Alguns IDs terminam em `nsn` (ex.: `FMA61993nsn`, `FMA62008nsn`). É a convenção do próprio
BodyParts3D para a malha **"no sub-nodes"** — a estrutura representada como sólido único,
sem subdivisão nas suas partes componentes. Para o nosso uso é exatamente o que queremos.
