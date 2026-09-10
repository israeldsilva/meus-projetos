# Fila de portais brasileiros

Ponto de partida para rodar `/add-portal` em cada portal. **Nada aqui foi
verificado ao vivo** — o ambiente onde este projeto foi montado não tinha rota de
rede para nenhum destes domínios. Trate cada linha como hipótese a confirmar no
Passo 2 do `/add-portal` (investigar antes de escrever parser), não como fato.

O `/add-portal` conduz o processo inteiro: investiga, verifica robots.txt e
termos, gera a skill a partir do padrão canônico e **exige uma busca ao vivo com
resultados reais antes de registrar**. Este arquivo só poupa a primeira meia
hora de reconhecimento.

## Como escolher o próximo

Não instale todos. Cada portal instalado é uma chamada a mais por execução do
`/scrape`, mais uma superfície que apodrece quando o site muda de marcação. Dois
ou três portais que cobrem bem a sua área valem mais que oito meia-boca.

Escolha por **onde as vagas da sua área realmente aparecem**:

| Se você busca | Comece por |
|---|---|
| Qualquer área, maior volume | `gupy-search` (já incluído) + LinkedIn (já incluído) |
| Tecnologia | Coodesh, Programathor, GeekHunter |
| Fora do eixo tech (administrativo, comercial, saúde, indústria) | Catho, InfoJobs, Vagas.com |
| Remoto pagando em USD/EUR | RemoteOK, We Work Remotely, Remotive |
| Startups | InHire, Trampos |

## Fila

### Vagas.com.br
- **Cobertura:** generalista, um dos maiores do país.
- **Hipótese de acesso:** páginas de busca em HTML, indexadas por buscador. Provável parsing de HTML, não JSON.
- **A confirmar:** existe endpoint XHR JSON por trás da busca? O `robots.txt` libera `/vagas`?
- **Cuidado:** portal grande e antigo costuma ter proteção anti-bot. Se só responder com headers de navegador completos, isso passa pelo portão de robots.txt do `/add-portal` (Passo 2.4), não pelo padrão do CLI.

### Catho
- **Cobertura:** generalista, forte fora de tecnologia.
- **Hipótese de acesso:** HTML com bastante JavaScript; detalhes de vaga podem exigir login.
- **A confirmar:** o quanto do anúncio é visível sem conta. Se a listagem exigir autenticação, o `/add-portal` manda **parar** — o padrão só funciona em página pública.

### InfoJobs Brasil
- **Cobertura:** generalista.
- **Hipótese de acesso:** HTML; a plataforma tem API pública em outros mercados, vale checar se vale aqui.
- **A confirmar:** existe API documentada? Ela cobre o Brasil?

### Coodesh
- **Cobertura:** tecnologia, com muita vaga remota.
- **Hipótese de acesso:** aplicação moderna, provavelmente com API JSON por trás — o caso mais fácil depois da Gupy.
- **A confirmar:** endpoint XHR no código-fonte da página de busca.

### Programathor
- **Cobertura:** vagas de desenvolvimento.
- **Hipótese de acesso:** site simples, HTML direto. Provavelmente o parser mais fácil da fila.
- **A confirmar:** paginação e se a data de publicação aparece na listagem (o contrato de portal exige campo `date`).

### GeekHunter
- **Cobertura:** tecnologia, modelo de matching.
- **A confirmar:** o modelo é de matching, então parte das vagas pode não ter página pública. Se a busca exigir perfil cadastrado, não serve para este padrão.

### Trampos.co
- **Cobertura:** tecnologia, produto, design e comunicação.
- **Hipótese de acesso:** já teve endpoints JSON públicos.
- **A confirmar:** se ainda existem e qual o formato.

### InHire
- **Cobertura:** startups de tecnologia.
- **Hipótese de acesso:** ATS com subdomínio por empresa, estrutura parecida com a da Gupy.
- **A confirmar:** existe busca centralizada, ou só páginas por empresa? Sem busca central, não vale como portal.

### Sólides Jobs
- **Cobertura:** ATS generalista, presença grande em pequena e média empresa.
- **Hipótese de acesso:** modelo semelhante ao da Gupy — portal público agregando as vagas do ATS.

### 99jobs
- **Cobertura:** generalista, com foco em cultura e propósito.

### Remotar
- **Cobertura:** vagas remotas no Brasil.

### RemoteOK / We Work Remotely / Remotive
- **Cobertura:** remoto global; contratam do Brasil como PJ.
- **Hipótese de acesso:** RemoteOK tem API JSON pública documentada; We Work Remotely publica feeds RSS. Os dois são os alvos mais amigáveis da lista inteira.
- **Cuidado:** muita vaga "remote worldwide" exclui a América do Sul no texto miúdo. O Portão de Contrato e Modalidade em `04-job-evaluation.md` trata isso como veto — vale conferir na descrição, não no título.

### Indeed Brasil
- **Cobertura:** agregador grande.
- **Cuidado:** proteção anti-bot agressiva e termos restritivos. Provavelmente inviável neste padrão, e o `/add-portal` deve dizer isso no Passo 2.4 em vez de contornar. Cobrir pelo fallback de WebSearch é a saída razoável.

### Glassdoor Brasil
- **Melhor uso:** não como portal de busca, mas como fonte de salário e avaliação de empresa na etapa de pesquisa (`09-web-research.md`) e no benchmark salarial de `04-job-evaluation.md`.

## Setor público

Concursos e processos seletivos públicos seguem lógica completamente diferente:
edital, prazo de inscrição, prova, e nada de currículo personalizado. O framework
inteiro deste repositório — CV direcionado, carta de apresentação, preparação de
entrevista — não se aplica. Se essa for a sua busca, um portal de concursos
(PCI Concursos e afins) resolve melhor sozinho.
