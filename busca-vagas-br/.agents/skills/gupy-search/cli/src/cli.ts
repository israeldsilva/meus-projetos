#!/usr/bin/env bun
// Self-contained CLI for searching jobs on Gupy's public job-search API, the
// ATS behind a large share of Brazilian job postings. No external CLI
// framework, so it runs anywhere `bun` is available with zero install beyond
// the repo clone.
//
// UNVERIFIED: the field mapping in helpers.ts has not been run against a live
// response. Confirm it before enabling this portal in /scrape - see SKILL.md.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--") || a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `gupy-cli — busca vagas na API pública da Gupy (Brasil)

USO
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <url> [--format json|plain]

FLAGS DE BUSCA
  --query, -q <texto>     Palavras-chave (cargo, competência). Recomendado.
  --location, -l <texto>  Cidade ou estado, ex.: "São Paulo". Filtrado também no cliente.
  --jobage <dias>         Publicadas nos últimos N dias. Filtro aplicado no cliente:
                          a API não expõe filtro de recência.
  --remote <modo>         remote | hybrid | onsite. Filtrado no cliente.
  --page <n>              Página, 1-indexada (20 resultados/página). Padrão 1.
  --limit, -n <n>         Limita os resultados emitidos (no cliente).
  --format <fmt>          json (padrão) | table | plain.

EXEMPLOS
  bun run src/cli.ts search -q "engenheiro de dados" --jobage 14 --format table
  bun run src/cli.ts search -q "pessoa desenvolvedora" -l "São Paulo" --limit 10 --format table
  bun run src/cli.ts search -q "analista financeiro" --remote remote --format json
  bun run src/cli.ts detail "https://empresa.gupy.io/job/<token>" --format plain

DETAIL exige a URL da vaga (campo \`url\` de um resultado de search), não o id:
vagas da Gupy ficam em subdomínios por empregador e o id sozinho não resolve.
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "location", "jobage", "remote", "page", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  // Reject unknown flags instead of silently discarding them: a discarded
  // filter changes what the search returns with no error. The portal-skill
  // contract in add-portal.md requires a bogus flag to exit 1 with a JSON
  // error on stderr.
  const knownFlags = KNOWN_FLAGS[cmd]
  if (knownFlags) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || knownFlags.has(key)) continue
      process.stderr.write(
        JSON.stringify({
          error: `unknown flag --${key} for '${cmd}' - flags are never silently ignored, because a discarded filter changes what the search returns; see --help for the supported flags`,
          code: "UNKNOWN_FLAG",
        }) + "\n",
      )
      return 1
    }
  }

  if (cmd === "search") {
    const fmt = (flags.format as string) || "json"

    const parseIntFlag = (name: string, raw: string | boolean | string[]): number | null => {
      // Number(), not parseInt(): parseInt truncates, so "--jobage 0.5" would
      // become 0 and silently widen the window to everything.
      const val = typeof raw === "string" ? Number(raw.trim()) : NaN
      if (!Number.isInteger(val) || val < 1) {
        process.stderr.write(
          JSON.stringify({ error: `--${name} must be a whole number of at least 1, got "${raw}"`, code: "BAD_ARG" }) + "\n",
        )
        return null
      }
      return val
    }

    for (const name of ["jobage", "page", "limit"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name])
        if (v === null) return 1
        flags[name] = String(v)
      }
    }

    if (typeof flags.remote === "string") {
      const allowed = ["remote", "hybrid", "onsite", "on-site"]
      if (!allowed.includes(flags.remote.toLowerCase())) {
        process.stderr.write(
          JSON.stringify({
            error: `--remote must be one of remote|hybrid|onsite, got "${flags.remote}"`,
            code: "BAD_ARG",
          }) + "\n",
        )
        return 1
      }
    }

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      location: typeof flags.location === "string" ? flags.location : undefined,
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : undefined,
      remote: typeof flags.remote === "string" ? flags.remote : undefined,
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(
        JSON.stringify({ error: "detail requires the posting <url>", code: "NO_ID" }) + "\n",
      )
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = {
      id,
      format: (fmt === "plain" ? "plain" : "json") as DetailOpts["format"],
    }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(
      JSON.stringify({
        error: e instanceof Error ? e.message : String(e),
        code: "INTERNAL_ERROR",
      }) + "\n",
    )
    process.exit(1)
  })
