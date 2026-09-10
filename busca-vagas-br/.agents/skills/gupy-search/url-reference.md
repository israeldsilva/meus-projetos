# Gupy — referência de endpoints e parsing

Este é o arquivo que um mantenedor futuro precisa quando o portal muda. Ele
registra o que o CLI assume, o quanto cada suposição está confirmada, e onde
mexer para corrigir.

## Estado de verificação

| Parte | Estado |
|---|---|
| Endpoint de busca (host e caminho) | **Não verificado ao vivo** — derivado da documentação da API |
| Nomes dos campos da resposta | **Não verificado ao vivo** |
| Parâmetros de busca (`name`, `offset`, `limit`) | **Não verificado ao vivo** |
| Extração de detalhe via JSON-LD | **Não verificado ao vivo** (schema.org é padrão, mas a presença do bloco não foi confirmada) |
| Flags, formato de saída, erros, backoff, filtros | **Testado offline** — 47 testes em `cli/tests/` |

O CLI foi escrito num ambiente sem rota de rede para `gupy.io`. O procedimento
de verificação está no `SKILL.md`, seção "Verificação obrigatória".

## Busca

```
GET https://portal.api.gupy.io/api/job
```

| Parâmetro | Usado para | Confiança |
|---|---|---|
| `name` | Termo de busca (título/palavra-chave) | Média-alta |
| `offset` | Deslocamento da paginação | Média |
| `limit` | Tamanho da página (o CLI usa 20) | Média |
| `workplaceCity` | Cidade — enviado, mas **também** filtrado no cliente porque pode ser ignorado | Baixa |

Não há parâmetro de recência conhecido. Por isso `--jobage` é aplicado no
cliente, em `filterByAge` (`cli/src/commands/search.ts`) — o `/scrape` exige que
a janela de 14 dias seja respeitada mesmo em portal que não a suporta, e uma
ordenação não é um filtro.

### Envelope esperado

```jsonc
{
  "data": [ /* objetos de vaga */ ],
  "pagination": { "limit": 20, "offset": 0, "total": 1234 }
}
```

`extractJobArray` também aceita um array puro na raiz, caso o envelope mude.
Qualquer outra forma dispara erro com a mensagem ``search response had no `data` array``.

### Campos de cada vaga

Mapeados em `mapJob` (`cli/src/helpers.ts`) — **a única função a corrigir** se um
nome de campo tiver mudado.

| Campo bruto | Vira | Obrigatório? |
|---|---|---|
| `id` | `id` (convertido para string) | **Sim** — erro se faltar |
| `name` | `title` | **Sim** — erro se faltar |
| `jobUrl`, senão `careerPageUrl` | `url` | **Sim** — erro se os dois faltarem |
| `careerPageName` | `company` | Não → `null` |
| `city` + `state` | `location` (unidos por vírgula) | Não → `null` |
| `publishedDate` | `date` (ISO truncado para `YYYY-MM-DD`) | Não → `null` |
| `workplaceType` | `workplaceType` (`remote`/`hybrid`/`on-site`) | Não → `null` |
| `disabilities` | `disabilities` (booleano; vaga afirmativa PCD) | Não → `null` |

Os três obrigatórios são obrigatórios porque sem eles a entrada é inútil a
jusante: sem `id` e `title` o `tools/job_key.py` não deriva chave estável de
deduplicação, e sem `url` não há vaga para abrir. Falhar é melhor que gravar
uma entrada quebrada no `seen_jobs.json`, que persiste entre execuções.

## Detalhe

Não há endpoint de detalhe indexado pelo id numérico. As vagas ficam em
subdomínios por empregador:

```
https://<empresa>.gupy.io/job/<token>
```

O CLI busca essa página e extrai o bloco
`<script type="application/ld+json">` com `"@type": "JobPosting"`
(`parseJsonLdJobPosting`). Um `@graph` com vários nós é percorrido, e um bloco
JSON malformado é pulado em vez de abortar a página — páginas reais costumam
trazer mais de um bloco.

| Campo do JSON-LD | Vira |
|---|---|
| `title` | `title` |
| `hiringOrganization.name` | `company` |
| `jobLocation.address.addressLocality` + `.addressRegion` | `location` |
| `datePosted` | `date` |
| `validThrough` | `deadline` |
| `employmentType` | `contractType` |
| `description` (HTML) | `description` (texto puro) |

`employmentType` usa o vocabulário do schema.org (`FULL_TIME`, `CONTRACTOR`) e
**não** diz se a vaga é CLT ou PJ. Não infira o regime a partir dele.

## Entidades HTML

`decodeHtmlEntities` trata numéricas (`&#225;`) e uma tabela de nomeadas com os
acentos que o português usa (`&aacute;`, `&ccedil;`, `&otilde;`, …). Isso importa
mais aqui do que num portal de mercado anglófono: sem a tabela, toda palavra
acentuada de uma descrição chega corrompida.

`&amp;` é decodificado **por último**, de propósito: decodificá-lo primeiro
transformaria `&amp;aacute;` (um `&` literal corretamente escapado) numa entidade
viva, que a passagem seguinte corromperia.

Se aparecer entidade nomeada não decodificada no `detail`, acrescente-a ao mapa
`NAMED_ENTITIES` em `cli/src/helpers.ts`.

## Termos de uso e robots.txt

**Não conferidos** — o ambiente onde a skill foi escrita não alcançava o domínio.
Antes de usar em volume, siga o Passo 2.4 do `/add-portal`: leia
`https://portal.gupy.io/robots.txt` e verifique se os caminhos de busca são
permitidos. Mantenha volume baixo e uso pessoal de qualquer forma.
