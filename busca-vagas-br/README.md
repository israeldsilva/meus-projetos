<div align="center">
  <img src="assets/mascot/pip_flight_loop.gif" alt="Mascote do projeto" width="180">
</div>

# busca-vagas-br

Fluxo de candidatura a vagas assistido por IA, rodando localmente com o Claude
Code. Avalia anúncios contra o seu perfil, gera currículo e carta de
apresentação direcionados para cada vaga, e prepara você para a entrevista.

Adaptação do [ai-job-search](https://github.com/MadsLorentzen/ai-job-search)
(MIT, de Mads Lorentzen) para o mercado brasileiro. O framework original foi
construído para o mercado dinamarquês; o que muda aqui está em
[O que foi adaptado](#o-que-foi-adaptado).

---

## O que ele faz

| Comando | O que faz |
|---|---|
| `/setup` | Monta seu perfil a partir do seu currículo, documentos ou de uma entrevista guiada |
| `/scrape` | Busca vagas nos portais instalados e ranqueia por aderência |
| `/rank` | Pontua em lote as vagas novas contra o framework de avaliação completo |
| `/apply` | Avalia uma vaga específica e gera CV + carta sob medida, em PDF |
| `/interview` | Prepara material de entrevista por etapa, com método STAR |
| `/outcome` | Registra o resultado da candidatura e arquiva o que foi enviado |
| `/upskill` | Mapeia lacunas entre o seu perfil e as vagas que você persegue |
| `/expand` | Enriquece o perfil lendo seu GitHub, portfólio e credenciais públicas |
| `/html-report` | Gera um painel offline com as estatísticas da sua busca |
| `/add-portal` | Gera uma skill de busca para um novo portal de vagas |
| `/add-template` | Registra um template próprio de CV ou carta |

O `/apply` **redige, nunca envia**. Toda candidatura passa por você.

## Começando

Requisitos: [Claude Code](https://claude.com/claude-code), Python 3.10+,
[bun](https://bun.sh) (para os CLIs de portal) e uma distribuição LaTeX com
`lualatex` e `xelatex` (para compilar CV e carta em PDF).

```bash
cd busca-vagas-br
claude
```

Dentro do Claude Code, rode `/setup`. Ele conduz a montagem do perfil e preenche
o `CLAUDE.md`, os arquivos de skill e os templates com os seus dados.

> **Antes do `/setup`: veja se este repositório é público.** O `/setup` escreve
> os seus **dados pessoais** em arquivos **versionados** — `CLAUDE.md` e os
> arquivos de perfil das skills — e dar push nesses commits publica tudo para
> quem enxergar o repositório (public repository), de forma permanente, inclusive
> no histórico depois de você apagar. Confira agora, que é quando a escolha ainda
> é barata:
>
> ```bash
> gh repo view --json visibility -q .visibility   # PUBLIC ou PRIVATE
> ```
>
> Se vier `PUBLIC`, decida antes de gerar qualquer coisa: mova o projeto para um
> repositório privado, ou faça os commits localmente sem dar push. O
> [SETUP.md](SETUP.md), seção 8, tem o raciocínio completo e os comandos. Os
> arquivos realmente sensíveis — tracker, dados salariais, `documents/`, os PDFs
> gerados — já são ignorados pelo git dos dois jeitos; o risco está no
> `CLAUDE.md`.

Depois:

```
/scrape          # procura vagas
/apply <url>     # avalia uma vaga e gera os documentos
```

> **Este projeto vive num subdiretório.** Abra o Claude Code **dentro de
> `busca-vagas-br/`**, não na raiz do repositório — é lá que estão o `.claude/` e
> o `CLAUDE.md` que definem os comandos.

## Portais de busca

| Portal | Estado |
|---|---|
| `linkedin-search` | **Ativo.** País-agnóstico; passe `--location "São Paulo, São Paulo, Brazil"` |
| `gupy-search` | **Desligado até você verificar.** Veja abaixo |

O `gupy-search` cobre o ATS por trás de boa parte das vagas publicadas no
Brasil, mas o mapeamento de campos dele **não foi verificado contra a API real**
— o ambiente onde ele foi escrito não tinha rota de rede para o `gupy.io`. Por
isso a skill vem com `enabled: false` e o `/scrape` a ignora.

Verificar leva dois minutos e precisa só de rede:

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "analista de dados" --limit 5 --format table
```

Se vier tabela com título, empresa e data preenchidos, troque `enabled: false`
para `enabled: true` no `.agents/skills/gupy-search/SKILL.md`. Se vier erro, ele
vai **nomear o campo** que mudou — o conserto é uma função só, e
`.agents/skills/gupy-search/url-reference.md` diz qual. O CLI foi escrito para
falhar alto justamente para que isso não vire resultado silencioso cheio de
campos vazios.

Para instalar outros portais, use `/add-portal` — ele investiga o site, checa
`robots.txt` e termos de uso, gera a skill e **exige uma busca ao vivo com
resultados reais antes de registrar**. O [`PORTAIS-BR.md`](PORTAIS-BR.md) traz a
fila de candidatos brasileiros com o reconhecimento inicial já feito.

## O que foi adaptado

**Perfil e avaliação.** O `CLAUDE.md` ganhou os eixos que decidem uma busca no
Brasil e não existiam no template original: modalidade (remoto/híbrido/
presencial), regime de contratação, pretensão salarial e uma seção de
privacidade que desaconselha guardar CPF e RG num arquivo versionado.

A avaliação de vagas ganhou um **Portão de Contrato e Modalidade**, com o mesmo
formato de veto-antes-de-pontuar dos portões que já existiam. Ele parte de duas
observações do mercado local: regime silencioso é o caso comum, não a exceção
(e silêncio não é CLT — vira "não verificado"), e bruto PJ nunca se compara com
bruto CLT sem converter. O portão de idioma passou a ler os rótulos de inglês
que os anúncios brasileiros usam, que não são intercambiáveis: "inglês para
leitura" e "inglês fluente" são barreiras muito diferentes.

**Documentos.** Templates LaTeX em português, com `babel` brazil no currículo
para hifenização correta e data por extenso na carta. As convenções locais estão
documentadas e verificadas a cada geração: sem foto, sem CPF, sem estado civil,
endereço só até cidade/UF, pretensão salarial fora do CV.

O modo de falha mais provável de um currículo brasileiro ganhou item próprio no
checklist: **acento que some na camada de texto do PDF**. A página renderizada
fica perfeita e a extração devolve "Gestao de Projetos", perdendo exatamente a
palavra-chave que o ATS procura. Só a extração revela isso — por isso ela é
obrigatória, e não opcional.

**Busca.** Queries reescritas para os portais brasileiros, cobrindo duas
armadilhas locais: o mesmo cargo circula em português e em inglês ao mesmo tempo
(e o idioma do título não diz qual idioma a vaga exige), e vaga remota
frequentemente exibe a cidade da sede como se fosse presencial.

**Salário.** O casamento de nomes de empresa passou a entender as convenções
brasileiras (LTDA, S.A., "do Brasil", acentos) no lugar dos sufixos
dinamarqueses. As fontes recomendadas para montar a base estão em
`04-job-evaluation.md` — com a ressalva de que dado salarial envelhece rápido
aqui, por conta de inflação e dissídio.

**Idioma dos arquivos.** O que você lê e edita está em português: `CLAUDE.md`,
este README, os templates, as queries de busca. Os arquivos internos de
instrução das skills e comandos continuam em inglês — são prompts densos e
muito específicos, e reescrevê-los traria mais risco de perder precisão do que
ganho prático. O Claude lê os dois igualmente bem.

## Testes

```bash
python3 -m pytest tests/ -q                                    # 409 testes
python3 tools/lint_skills.py                                   # skills, comandos, settings
python3 tools/security_guards.py                               # permissões, gitignore, manifests
cd .agents/skills/gupy-search/cli && bun test && bun run typecheck
```

O CI da raiz do repositório roda tudo isso, mais a compilação LaTeX dos
documentos de exemplo em duas versões de TeX Live.

Nenhum teste bate em portal de vaga real: eles são instáveis em rede, e a skill
`linkedin-search` é de uso pessoal por termos de serviço. Teste ao vivo de
portal é passo local e sob demanda.

## Privacidade

O `.gitignore` já protege currículos e cartas gerados, o tracker de
candidaturas, os relatórios e tudo em `documents/`. O `CLAUDE.md` **não** é
ignorado, porque o template precisa ser versionado — leia a seção Privacidade
dentro dele antes de commitar num repositório público.

## Licença

MIT — veja [LICENSE](LICENSE). O framework original é
[MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search),
de Mads Lorentzen, e o aviso de copyright dele permanece intacto.

Esta é uma cópia vendorizada, não um fork git: o histórico deste repositório é
independente do original, então as ferramentas de sincronização com upstream que
vinham no projeto foram removidas por não funcionarem aqui. Para trazer
melhorias de lá, clone o repositório original e compare as pastas.
