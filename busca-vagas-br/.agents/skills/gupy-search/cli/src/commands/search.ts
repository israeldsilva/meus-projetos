import {
  SEARCH_URL,
  jsonFetch,
  parseSearchResponse,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  /** Posting age in days. Gupy exposes no server-side recency filter, so this is applied client-side. */
  jobage?: number
  remote?: string
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

const PAGE_SIZE = 20

export function buildUrl(opts: SearchOpts): string {
  const params = new URLSearchParams()
  if (opts.query) params.set("name", opts.query)
  // The API takes city/state as free text on the same `name` search in some
  // deployments; `--location` is sent as its own parameter and simply ignored
  // by the server if unsupported, which is why the client-side filter below
  // also runs. See url-reference.md.
  if (opts.location) params.set("workplaceCity", opts.location)
  params.set("offset", String((opts.page - 1) * PAGE_SIZE))
  params.set("limit", String(PAGE_SIZE))
  return `${SEARCH_URL}?${params.toString()}`
}

/**
 * Drop postings older than `jobage` days. Gupy has no recency parameter, and
 * /scrape's Step 1b requires the window to be honoured whether or not the
 * portal supports it - a sort is not a filter.
 */
export function filterByAge(cards: JobCard[], jobage: number | undefined, now = new Date()): JobCard[] {
  if (jobage === undefined) return cards
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - jobage)
  const cutoffDay = cutoff.toISOString().slice(0, 10)
  // A posting with no date is kept: /scrape flags it as "date unknown" rather
  // than silently losing it, which is the behaviour the skill documents.
  return cards.filter((c) => c.date === null || c.date >= cutoffDay)
}

/** Client-side workplace-type filter, matching the flag's documented values. */
export function filterByWorkplace(cards: JobCard[], remote: string | undefined): JobCard[] {
  if (!remote) return cards
  const wanted = remote.toLowerCase().replace("on-site", "onsite")
  return cards.filter((c) => {
    if (c.workplaceType === null) return false
    return c.workplaceType.toLowerCase().replace("on-site", "onsite") === wanted
  })
}

/** Client-side location filter, applied whether or not the server honoured it. */
export function filterByLocation(cards: JobCard[], location: string | undefined): JobCard[] {
  if (!location) return cards
  const needle = location.toLowerCase()
  return cards.filter((c) => (c.location ?? "").toLowerCase().includes(needle))
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "Nenhum resultado."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 42).padEnd(42)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const loc = (c.location || "—").slice(0, 22).padEnd(22)
    const mode = (c.workplaceType || "—").slice(0, 9).padEnd(9)
    const date = c.date || "—"
    return `${c.id.padEnd(10)} ${title} ${company} ${loc} ${mode} ${date}`
  })
  const header =
    "ID".padEnd(10) +
    " " +
    "TÍTULO".padEnd(42) +
    " " +
    "EMPRESA".padEnd(26) +
    " " +
    "LOCAL".padEnd(22) +
    " " +
    "MODAL.".padEnd(9) +
    " DATA"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const payload = await jsonFetch(buildUrl(opts))
    if (payload === null) {
      writeError("search endpoint returned 404", "SEARCH_FAILED")
      return 1
    }
    let cards = parseSearchResponse(payload)
    cards = filterByLocation(cards, opts.location)
    cards = filterByWorkplace(cards, opts.remote)
    cards = filterByAge(cards, opts.jobage)
    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.workplaceType || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, page: opts.page }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
