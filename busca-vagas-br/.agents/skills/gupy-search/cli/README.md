# gupy-cli

CLI de busca de vagas na API pública da Gupy. Zero dependências em runtime —
roda só com `bun`.

> **Mapeamento de campos não verificado ao vivo.** Veja `../SKILL.md`, seção
> "Verificação obrigatória", antes de ligar este portal no `/scrape`. A skill vem
> com `enabled: false` justamente por isso.

## Instalação

```bash
bun install   # instala apenas tipos de desenvolvimento
```

## Uso

```bash
bun run src/cli.ts search -q "engenheiro de dados" --jobage 14 --format table
bun run src/cli.ts detail "https://empresa.gupy.io/job/abc123" --format plain
bun run src/cli.ts --help
```

## Desenvolvimento

```bash
bun run typecheck   # tsc --noEmit
bun run test        # suíte offline: mapeamento, filtros e validação de flags
```

Os testes não fazem requisição de rede. Eles fixam o comportamento do
mapeamento e o contrato de CLI; **não** provam que a forma bruta da resposta
está certa — só uma execução ao vivo prova isso.

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `src/cli.ts` | Parsing de flags, help, despacho de comando, validação |
| `src/helpers.ts` | Fetch com backoff, mapeamento da resposta, decodificação de HTML/JSON-LD |
| `src/commands/search.ts` | Monta a URL, filtra no cliente, renderiza |
| `src/commands/detail.ts` | Busca a página da vaga e extrai o JSON-LD |

Se o portal mudar, o que precisa de correção quase sempre é `mapJob` em
`src/helpers.ts`. Os pontos de ancoragem estão em `../url-reference.md`.
