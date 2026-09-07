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
| `conventional_part_of.txt` | **Hierarquia anatômica da FMA** (corpo → sistema nervoso → encéfalo → ...). É a fonte da árvore de navegação |
| `composite_parts.txt` | Mapeia estruturas compostas → suas partes primitivas (ex.: tálamo → tálamo D + tálamo E) |

---

## Inventário de neuroanatomia

Auditoria feita sobre o acervo completo: das **937 malhas STL** disponíveis, **71 são de
neuroanatomia**, somando **~87 MB** brutos.

A coluna "triângulos" orienta o alvo de decimação no pipeline — malhas acima de ~40k são
reduzidas, as pequenas passam praticamente intactas.

### Telencéfalo — córtex e giros (31)

| FMA | Estrutura | Triângulos |
|---|---|---|
| `FMA72653` / `FMA72654` | Giro frontal superior D / E | 30.448 / 30.450 |
| `FMA72655` / `FMA72656` | Giro frontal médio D / E | 15.558 / 15.544 |
| `FMA72661` / `FMA72662` | Giro pré-central D / E | 18.838 / 18.836 |
| `FMA72665` / `FMA72666` | Giro pós-central D / E | 16.862 / 16.858 |
| `FMA72800` / `FMA72801` | Giro temporal superior, parte anterior D / E | 8.348 / 8.338 |
| `FMA72804` / `FMA72805` | Giro temporal superior, parte posterior D / E | 10.472 / 10.472 |
| `FMA72685` / `FMA72686` | Giro temporal médio D / E | 12.926 / 12.918 |
| `FMA72687` / `FMA72688` | Giro temporal inferior D / E | 13.056 / 13.040 |
| `FMA72669` / `FMA72670` | Giro angular D / E | 13.172 / 13.164 |
| `FMA72667` / `FMA72668` | Giro supramarginal D / E | 9.782 / 9.778 |
| `FMA72689` / `FMA72690` | Giro fusiforme D / E | 6.150 / 6.148 |
| `FMA72717` / `FMA72718` | Giro do cíngulo D / E | 11.716 / 11.724 |
| `FMA72705` / `FMA72706` | Giro para-hipocampal D / E | 3.454 / 3.452 |
| `FMA72977` / `FMA72978` | Ínsula D / E | 12.240 / 12.242 |
| `FMA72701` / `FMA72702` | Giro curto acessório D / E | 15.346 / 15.330 |
| `BP51` | Giros orbitais e giro reto | 21.388 |

### Núcleos da base (6)

| FMA | Estrutura | Triângulos |
|---|---|---|
| `FMA72826` / `FMA72827` | Núcleo caudado D / E | 11.272 / 11.160 |
| `FMA72828` / `FMA72829` | Putâmen D / E | 30.670 / 30.636 |
| `FMA72830` / `FMA72831` | Globo pálido D / E | 23.206 / 30.738 |

### Sistema límbico (7)

| FMA | Estrutura | Triângulos |
|---|---|---|
| `FMA72713` / `FMA72714` | Hipocampo D / E | 4.452 / 4.280 |
| `FMA72832` / `FMA72833` | Amígdala D / E | 1.744 / 1.736 |
| `FMA72924` / `FMA72925` | Fórnix D / E | 29.300 / 29.372 |
| `FMA61970` | Comissura do fórnix | 46.164 |

### Substância branca (4)

| FMA | Estrutura | Triângulos |
|---|---|---|
| `FMA86464` | Corpo caloso | 132.552 |
| `FMA61822` | Substância branca do hemisfério cerebral | 176.564 |
| `FMA73413` / `FMA73414` | Estria medular do tálamo D / E | 3.852 / 3.870 |

### Diencéfalo (5)

| FMA | Estrutura | Triângulos |
|---|---|---|
| `FMA258714` / `FMA258716` | Tálamo D / E | 3.298 / 7.396 |
| `FMA62008nsn` | Hipotálamo | 17.690 |
| `FMA62033` | Corpo pineal | 2.536 |
| `FMA13889` | Hipófise | 5.052 |

### Tronco encefálico (4)

| FMA | Estrutura | Triângulos |
|---|---|---|
| `FMA61993nsn` | Mesencéfalo | 56.314 |
| `FMA62394` | Pedúnculo cerebral | 46.834 |
| `FMA67943` | Ponte | 90.072 |
| `FMA62004` | Bulbo (medula oblonga) | 52.760 |

### Cerebelo (1)

| FMA | Estrutura | Triângulos |
|---|---|---|
| `FMA67944` | Cerebelo | 238.506 |

### Ventrículos e LCR (8)

| FMA | Estrutura | Triângulos |
|---|---|---|
| `FMA78449` / `FMA78450` | Ventrículo lateral D / E | 78.218 / 78.010 |
| `FMA78454` | Terceiro ventrículo | 16.808 |
| `FMA78469` | Quarto ventrículo | 30.134 |
| `FMA78467` | Aqueduto cerebral | 2.252 |
| `FMA78497` | Canal central da medula espinhal | 3.162 |
| `FMA274027` / `FMA274029` | Plexo corióide D / E | 21.558 / 21.508 |

### Via óptica (5)

| FMA | Estrutura | Triângulos |
|---|---|---|
| `FMA50875` / `FMA50878` | Nervo óptico D / E | 10.310 / 10.302 |
| `FMA62382` / `FMA67936` | Trato óptico D / E | 10.110 / 10.122 |
| `FMA62045` | Quiasma óptico | 7.752 |

---

## Lacunas do acervo

Duas partes da matéria **não têm malha 3D neste acervo**:

- **Medula espinhal** (`FMA7647`) — não existe. Só o canal central (`FMA78497`).
- **Nervos cranianos** — apenas o **óptico (II)** existe, junto com o quiasma e o trato.
  Faltam os outros onze: olfatório (I), oculomotor (III), troclear (IV), trigêmeo (V),
  abducente (VI), facial (VII), vestibulococlear (VIII), glossofaríngeo (IX), vago (X),
  acessório (XI) e hipoglosso (XII).

Isso é tratado na **Fase 5** do [plano](PLANO.md), com fonte a definir.

**Não geramos geometria aproximada para preencher essas lacunas.** Num material de estudo de
mestrado, uma lacuna sinalizada é honesta; anatomia inventada é um erro que a pessoa carrega
para a prova.

### Nota sobre o sufixo `nsn`

Alguns IDs terminam em `nsn` (ex.: `FMA61993nsn`, `FMA62008nsn`). É a convenção do próprio
BodyParts3D para a malha **"no sub-nodes"** — a estrutura representada como sólido único, sem
subdivisão nas suas partes componentes. Para o nosso uso é exatamente o que queremos.
