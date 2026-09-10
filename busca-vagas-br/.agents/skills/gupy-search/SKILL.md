---
name: gupy-search
version: 1.0.0
description: >
  Busca vagas na API pública da Gupy, o ATS por trás de boa parte das vagas
  publicadas no Brasil. Use quando o usuário quiser procurar vagas, oportunidades
  ou emprego no mercado brasileiro, em qualquer cidade, estado ou remoto, e em
  qualquer área (tecnologia, dados, financeiro, RH, comercial, operações,
  jurídico etc.). Frases de gatilho em português: procurar vaga, buscar vagas,
  vagas abertas, oportunidades de emprego, estou procurando emprego, tem vaga de
  X em Y, vaga remota, vaga CLT, processo seletivo, trabalhar na Gupy. Trigger
  phrases in English: find a job in Brazil, Brazilian job search, job openings in
  Brazil, remote jobs Brazil.
context: fork
enabled: false  # NÃO VERIFICADO - veja "Verificação obrigatória" abaixo antes de ligar
allowed-tools: Bash(bun run .agents/skills/gupy-search/cli/src/cli.ts *)
---

# Gupy Search Skill

Busca vagas na API pública de busca da Gupy — a mesma que alimenta o agregador
público em `portal.gupy.io`. Sem autenticação, sem chave de API e **zero
dependências em runtime**: roda só com `bun`.

A Gupy é o ATS usado por milhares de empresas brasileiras, então muita vaga
aparece aqui antes (ou em vez) de chegar a um agregador generalista.

## ⚠️ Verificação obrigatória — esta skill vem desligada

**`enabled: false` no frontmatter acima. O `/scrape` a ignora até você mudar
isso, e você não deveria mudar antes de fazer o teste abaixo.**

O CLI foi escrito num ambiente **sem rota de rede para `gupy.io`**, então o
mapeamento de campos em `cli/src/helpers.ts` (`mapJob`) foi derivado da forma
documentada da API, **não capturado de uma resposta real**. Tudo em volta —
flags, formato de saída, backoff, tratamento de erro, filtros — é testado
offline e independe do portal. O que pode estar errado é o nome dos campos.

O código foi escrito para **falhar alto** nesse caso: se a resposta não tiver a
forma esperada, o CLI sai com código 1 e um erro nomeando o campo, em vez de
emitir resultados cheios de `null`. Essa escolha é deliberada — um CLI de portal
costuma apodrecer retornando exit 0 com campos vazios, e é exatamente o que o
health check do `/scrape` existe para pegar.

### Como verificar (leva 2 minutos, precisa de rede)

```bash
cd .agents/skills/gupy-search/cli && bun install && bun run typecheck && bun test
cd ../../../.. # volta à raiz do projeto
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "analista de dados" --limit 5 --format table
```

Interprete o resultado assim:

| O que aconteceu | O que significa | O que fazer |
|---|---|---|
| Tabela com título, empresa, local e data preenchidos | O mapeamento está certo | Troque para `enabled: true` e siga |
| Erro nomeando um campo (`missing required field \`name\``) | Um campo mudou de nome | Corrija `mapJob` em `cli/src/helpers.ts` — é a única função a mexer; veja `url-reference.md` |
| `search response had no \`data\` array` | O envelope mudou | Corrija `extractJobArray` no mesmo arquivo |
| Coluna `EMPRESA` ou `LOCAL` vazia em todos os resultados | Campo opcional renomeado | Ajuste o campo correspondente em `mapJob` |
| HTTP 403 / 429 | Bloqueio ou limite de taxa, não defeito de código | Espere e tente de novo, com volume baixo |

Depois valide o `detail` numa das URLs retornadas:

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts detail "<url do resultado>" --format plain
```

A descrição precisa sair como texto legível, com acentos corretos. Se vier
`Gest&atilde;o` em vez de `Gestão`, falta uma entidade nomeada na tabela
`NAMED_ENTITIES` de `helpers.ts`.

Quando search e detail passarem, mude `enabled: false` para `enabled: true` — é
a única linha a editar — e o `/scrape` passa a incluir o portal automaticamente.

## Comandos

### Buscar vagas

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts search [flags]
```

Flags:
- `--query <texto>` / `-q <texto>` — palavras-chave (cargo, competência). Recomendado.
- `--location <texto>` / `-l <texto>` — cidade ou estado, ex.: `"São Paulo"`. Enviado ao servidor **e** aplicado como filtro no cliente, porque a API pode ignorar o parâmetro.
- `--jobage <dias>` — publicadas nos últimos N dias. **Filtro aplicado no cliente**: a API não expõe filtro de recência.
- `--remote <modo>` — `remote`, `hybrid` ou `onsite`. Filtrado no cliente sobre o campo `workplaceType`.
- `--page <n>` — página, 1-indexada (20 resultados por página).
- `--limit <n>` / `-n <n>` — limita os resultados emitidos.
- `--format json|table|plain` — padrão `json`.

### Detalhe da vaga

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts detail <url> [--format json|plain]
```

**Exige a URL**, não o id. Vagas da Gupy ficam em subdomínios por empregador
(`https://<empresa>.gupy.io/job/<token>`), então não existe um endpoint único de
detalhe indexado pelo id numérico que o `search` devolve — passar só o id sai com
erro `NEEDS_URL` explicando isso. Use o campo `url` de um resultado de busca.

O detalhe é extraído do bloco JSON-LD `schema.org/JobPosting` da página, que é um
contrato bem mais estável que a marcação da página em si.

## Exemplos

```bash
# Vagas de dados publicadas nas últimas 2 semanas
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "engenheiro de dados" --jobage 14 --format table

# Vagas remotas de desenvolvimento
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "pessoa desenvolvedora" --remote remote --limit 10 --format table

# Vagas em Belo Horizonte
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "analista financeiro" -l "Belo Horizonte" --format table

# Detalhe completo de uma vaga
bun run .agents/skills/gupy-search/cli/src/cli.ts detail "https://empresa.gupy.io/job/abc123" --format plain
```

## Formatos de saída

| Formato | Melhor para |
|---------|-------------|
| `json` | Padrão — uso programático, passar URLs para o `detail` |
| `table` | Leitura rápida por humano |
| `plain` | Ler o detalhe completo de uma vaga |

Todo erro vai para o **stderr** como `{ "error": "...", "code": "..." }` e o
processo sai com código `1`.

## Notas

- **Dois campos além do contrato padrão de portal.** O `search` emite
  `workplaceType` (`remote`/`hybrid`/`on-site`) e `disabilities` (vaga afirmativa
  para PCD). A Gupy declara os dois; a maioria dos portais não declara nenhum, e
  a modalidade é justamente o eixo que o Portão de Contrato e Modalidade em
  `04-job-evaluation.md` precisa. `disabilities` só é útil se o perfil do
  candidato declarar elegibilidade — veja o aviso de privacidade no `CLAUDE.md`.
- **Sem filtro de recência no servidor.** `--jobage` filtra no cliente, sobre a
  página já retornada. Isso significa que uma página cheia de vagas antigas
  retorna poucos resultados: pagine com `--page` se precisar de mais.
- **Vaga que continua no ar depois de encerrada** é comum em ATS brasileiro. O
  `search` não distingue; o `detail` traz `validThrough` quando a página declara.
  Trate uma vaga com mais de 30 dias como suspeita mesmo que a página abra.
- **Regime de contratação (CLT/PJ) raramente vem na busca.** Quando vier, estará
  no `contractType` do detalhe, mapeado do `employmentType` do JSON-LD, que usa o
  vocabulário do schema.org (`FULL_TIME`) e não diz nada sobre CLT versus PJ.
  Isso é "não declarado", não "CLT" — é assim que o portão de contratação trata.
- Mantenha o volume baixo. O CLI faz backoff exponencial em 429/5xx.
