# Queries de Busca para o Job Scraper

<!-- SETUP: Personalize estas queries com suas competências, cargos-alvo e localidade -->

## CLIs de portal instalados (via primária do `/scrape`)

O `/scrape` descobre toda skill de portal em `.agents/skills/*/SKILL.md` e roda o CLI dela primeiro. Nesta instalação vem o `linkedin-search` (país-agnóstico, basta passar `--location "São Paulo, São Paulo, Brazil"`), mais qualquer skill que você adicionar com `/add-portal`. Você **não** precisa de uma linha `site:` correspondente aqui para esses CLIs rodarem.

Os modelos de query `site:` neste arquivo são o **fallback via WebSearch** — para portais sem CLI, páginas de carreira das empresas, ou quando um CLI falha.

**Escopo de idioma:** escreva cada categoria de query em todos os idiomas listados na tabela Idiomas do seu CLAUDE.md. No mercado brasileiro isso quase sempre significa **duas passadas: português e inglês** — vagas de tecnologia em empresas com operação internacional são frequentemente publicadas só em inglês, e vagas em inglês costumam exigir inglês no dia a dia. Uma vaga que exige um idioma que você **não declarou** é excluída antes da pontuação; uma vaga que exige um **nível maior** do que o declarado num idioma que você usa é sinalizada para seu julgamento, não excluída — veja o Portão de Idioma em `04-job-evaluation.md`, a fonte única dessa regra. Traduza os termos de cada categoria em vez de traduzir palavra por palavra ("Desenvolvedor Back-end" ↔ "Backend Developer", não "Back-end Developer" literalizado).

## Sites de busca

Agregadores e ATSs generalistas (maior volume no Brasil):
- **portal.gupy.io** — ATS usado por milhares de empresas brasileiras; muita vaga aparece aqui antes de qualquer agregador
- **linkedin.com/jobs** — também coberto pelo CLI `linkedin-search`
- **vagas.com.br** — um dos maiores quadros generalistas
- **catho.com.br** — generalista, forte fora do eixo tech
- **infojobs.com.br** — generalista
- **br.indeed.com** — agregador
- **glassdoor.com.br** — agregador, com dados de salário e avaliação de empresa
- **99jobs.com** — foco em cultura/propósito
- **jobs.solides.com** — ATS Sólides

Especializados em tecnologia:
- **programathor.com.br** — vagas dev
- **coodesh.com** — tech, muita vaga remota
- **geekhunter.com.br** — tech, modelo de matching
- **revelo.com.br** — tech
- **inhire.com.br** — tech, startups
- **trampos.co** — tech, produto e criação

Remoto (inclusive contratação internacional pagando em USD/EUR):
- **remotar.com.br** — remoto Brasil
- **remoteok.com**, **weworkremotely.com**, **remotive.com** — remoto global, contratam PJ no Brasil
- Filtre por `Brazil`/`LATAM`/`Americas` no fuso — muita vaga "remote" global exclui a América do Sul no texto miúdo

Secundária (páginas de carreira via Google):
- Buscas com `site:` direto nas empresas-alvo

## Categorias de query

Queries agrupadas por prioridade. Escreva **cada categoria em todos os idiomas da sua tabela Idiomas** (veja Escopo de idioma acima). Combine cada query com seus termos de localidade (cidade, região metropolitana) onde o site suportar — ou com `remoto` quando for o caso.

**Organize por função, não por título de vaga.** O mesmo trabalho recebe títulos diferentes conforme a empresa: uma vaga de "Cientista de Dados" aparece como "Analista de Dados Sênior", "Especialista em Analytics" ou "Data Scientist" em outra. Nomeie cada categoria pela função que ela cobre e liste vários títulos plausíveis como variantes dentro dela, em vez de apostar um nível inteiro de prioridade numa string exata.

**Anglicismos são regra, não exceção.** No mercado brasileiro de tecnologia o mesmo cargo circula em português e em inglês (`Desenvolvedor Back-end` / `Backend Developer`, `Pessoa Desenvolvedora` / `Software Engineer`). Inclua as duas formas na mesma categoria mesmo que você só trabalhe em português — o idioma do **título** não diz qual idioma a vaga exige no dia a dia; isso é o Portão de Idioma que decide.

**Linguagem neutra nos títulos.** Muitas empresas brasileiras publicam "Pessoa Desenvolvedora", "Pessoa Engenheira de Dados" no lugar da forma masculina. Inclua a variante com "Pessoa" nas categorias principais — ela é invisível para uma busca por "Desenvolvedor".

### Prioridade 1: [YOUR_PRIMARY_ROLE_TYPE]

Correspondem à sua direção de carreira mais forte e mais desejada.

```
site:portal.gupy.io "[YOUR_PRIMARY_JOB_TITLE_1]" [YOUR_CITY]
site:vagas.com.br "[YOUR_PRIMARY_JOB_TITLE_1]" [YOUR_CITY]
site:linkedin.com/jobs "[YOUR_PRIMARY_JOB_TITLE_1]" Brasil
site:portal.gupy.io "Pessoa [YOUR_PRIMARY_JOB_TITLE_1]"
site:linkedin.com/jobs "[YOUR_PRIMARY_JOB_TITLE_EN_1]" Brazil
```

### Prioridade 2: [YOUR_DOMAIN_EXPERTISE]

Correspondem ao seu domínio de especialidade.

```
site:portal.gupy.io [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY] OR [YOUR_REGION]
site:catho.com.br [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY]
site:linkedin.com/jobs [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY] Brasil
```

### Prioridade 3: [YOUR_ADJACENT_ROLE_TYPE]

Cargos adjacentes para os quais você poderia pivotar.

```
site:portal.gupy.io "[YOUR_ADJACENT_TITLE_1]" [YOUR_KEY_SKILL]
site:vagas.com.br "[YOUR_ADJACENT_TITLE_2]" [YOUR_KEY_SKILL] [YOUR_CITY]
site:infojobs.com.br "[YOUR_ADJACENT_TITLE_1]" [YOUR_CITY]
```

### Prioridade 4: Remoto (Brasil e internacional)

Rede mais ampla, sem restrição de deslocamento. Vale mesmo se você prefere presencial: define o piso salarial com que você negocia.

```
site:remotar.com.br [YOUR_KEY_SKILL]
site:coodesh.com "[YOUR_PRIMARY_JOB_TITLE_1]"
site:linkedin.com/jobs "[YOUR_PRIMARY_JOB_TITLE_EN_1]" remote Brazil
site:weworkremotely.com "[YOUR_PRIMARY_JOB_TITLE_EN_1]"
site:remoteok.com "[YOUR_KEY_SKILL]"
```

## Filtro de localidade e modalidade

Ao avaliar resultados, verifique a modalidade antes da distância — no Brasil o mesmo cargo aparece como presencial, híbrido e remoto na mesma semana, e a modalidade muda completamente o cálculo de deslocamento.

- **Remoto:** sem restrição geográfica. Confirme se é remoto de verdade ou "remoto com idas pontuais" (muito comum e raramente dito no título).
- **Híbrido:** conte os dias presenciais por semana; um híbrido 4x2 é essencialmente presencial.
- **Presencial:** verifique se está dentro de deslocamento razoável a partir de onde você mora.

Defina suas áreas aceitáveis:
- [YOUR_CITY] e região
- [ACCEPTABLE_AREA_1]
- [ACCEPTABLE_AREA_2]
- [BORDERLINE_AREA] (limite — ~X min de transporte)
- [TOO_FAR_AREA] (longe demais)

**Cuidado com "São Paulo" em vaga remota.** Vagas remotas com sede em SP frequentemente listam a localidade como "São Paulo, SP" mesmo sendo 100% remotas — e vagas híbridas fazem o mesmo sem avisar. A localidade no card de busca não é confiável para decidir modalidade; confirme no detalhe da vaga.

## Filtro de regime de contratação

Eixo específico do mercado brasileiro e frequentemente decisivo. O regime raramente aparece no título e às vezes nem no corpo da vaga — quando não estiver declarado, marque como desconhecido e não presuma.

- **CLT** — carteira assinada, com FGTS, 13º, férias remuneradas e INSS recolhido pelo empregador.
- **PJ** — você emite nota fiscal; o valor bruto é maior, mas sem os encargos acima. Compare sempre líquido contra líquido, não bruto PJ contra bruto CLT.
- **Cooperado / autônomo / estágio / jovem aprendiz / temporário** — regimes distintos, com implicações distintas.

Registre em `CLAUDE.md`, nos deal-breakers, quais regimes você aceita. O Portão de Localidade em `04-job-evaluation.md` trata regime recusado da mesma forma que localidade impossível: veto, não desconto de pontuação.

## Filtro de idioma

Seus idiomas de trabalho e níveis estão na tabela Idiomas do CLAUDE.md. Ao filtrar resultados, aplique o Portão de Idioma de `04-job-evaluation.md`: uma vaga que exige um idioma que você não declarou é excluída; uma vaga que exige nível maior do que o declarado num idioma que você usa não é excluída, e sim sinalizada (veja o Passo 3 "Quick Fit Assessment" em `job-scraper/SKILL.md` para como o alerta aparece na saída do `/scrape`). Vagas apenas *escritas* num idioma que você não usa, mas que não o exigem no trabalho, estão liberadas.

**No Brasil isso quase sempre é sobre inglês.** Atenção à diferença entre os rótulos que as vagas usam, porque eles não são intercambiáveis:
- *"Inglês para leitura"* / *"inglês técnico"* — ler documentação. Barreira baixa.
- *"Inglês intermediário"* — reuniões ocasionais, escrita assíncrona.
- *"Inglês avançado/fluente"* — reunião diária em inglês; costuma ser eliminatório de fato.
- *"Inglês fluente obrigatório"* / vaga inteira publicada em inglês por empresa estrangeira — trate como requisito duro.

Espanhol aparece em vagas de empresas com operação em LATAM; declare-o na tabela se você o usa profissionalmente, senão ele vira veto automático quando exigido.

## Filtro de data

Inclua apenas vagas publicadas nos últimos 14 dias, ou cujo prazo de inscrição ainda não passou. Se a data de publicação não puder ser determinada, inclua mas sinalize como "data desconhecida".

Vagas em ATS brasileiro (Gupy e similares) costumam ficar no ar depois de encerradas, sem marcar isso na página. Trate uma vaga com mais de 30 dias como suspeita mesmo que a página abra normalmente, e confirme no detalhe antes de investir tempo numa candidatura.

## Adaptando queries

Se o usuário especificar uma área de foco, selecione queries da categoria correspondente e gere também 2-3 queries customizadas para esse foco. Por exemplo:
- "/scrape [area_de_foco]" -> queries da categoria relevante + queries específicas do foco
