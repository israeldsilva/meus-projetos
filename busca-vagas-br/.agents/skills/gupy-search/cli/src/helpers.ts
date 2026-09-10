// Data source: Gupy's public job-search API, the same endpoint that backs the
// public aggregator at portal.gupy.io. No authentication required.
//
// UNVERIFIED FIELD MAPPING - read before trusting this file.
// The request/response shape below was written from documentation of the
// endpoint, not captured from a live call, because the environment this skill
// was authored in had no network route to gupy.io. Everything in this file
// EXCEPT `mapJob` and `SEARCH_URL` is portal-independent plumbing and is
// covered by offline tests. `mapJob` is the part that can be wrong.
//
// It is written to FAIL LOUDLY rather than degrade: a response whose shape
// does not match throws with the offending field named, instead of emitting a
// result row full of nulls. That is deliberate - `/scrape`'s health check
// exists because scraper CLIs usually rot by returning exit code 0 with empty
// fields, and an unverified mapping is exactly the case where silence is worst.
//
// See url-reference.md for what to confirm against a live response, and how to
// fix the mapping if a field moved.

export const SEARCH_URL = "https://portal.api.gupy.io/api/job"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; gupy-search-cli/1.0)"

/** Fetch JSON with exponential backoff on 429/5xx. Returns null on a 404. */
export async function jsonFetch(url: string): Promise<unknown | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }
  throw new Error("Request failed after max retries")
}

/** Fetch a posting page as HTML, same backoff policy. "" on a 404. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

/** A search result, in the shape every portal CLI in this repo emits. */
export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  /** remote | hybrid | on-site | null - Gupy states this, most portals don't. */
  workplaceType: string | null
  /** True when the posting is reserved for candidates with disabilities (vaga afirmativa PCD). */
  disabilities: boolean | null
}

export interface JobDetail extends JobCard {
  description: string | null
  contractType: string | null
  deadline: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function optionalString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number") return String(value)
  return null
}

/** ISO timestamp -> YYYY-MM-DD, the date format every portal CLI emits. */
export function toIsoDate(value: unknown): string | null {
  const raw = optionalString(value)
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

/**
 * Join Gupy's separate city/state fields into the single `location` string the
 * portal contract expects. Either side may be absent on a fully remote posting.
 */
export function joinLocation(city: unknown, state: unknown): string | null {
  const parts = [optionalString(city), optionalString(state)].filter(
    (p): p is string => p !== null,
  )
  return parts.length ? parts.join(", ") : null
}

/**
 * THE UNVERIFIED PART. Map one raw API object to a JobCard.
 *
 * Throws (naming the field) when a required field is missing, so a shape change
 * surfaces as a hard error rather than a row of nulls. `id`, `name` and the
 * posting URL are required; everything else is genuinely optional in the data
 * and maps to null.
 */
export function mapJob(raw: unknown): JobCard {
  const job = asRecord(raw)
  if (!job) {
    throw new Error("expected each element of `data` to be an object")
  }

  const id = optionalString(job.id)
  if (!id) {
    throw new Error(
      "missing required field `id` on a job object - the API shape may have changed; see url-reference.md",
    )
  }

  const title = optionalString(job.name)
  if (!title) {
    throw new Error(
      `missing required field \`name\` (job title) on job ${id} - the API shape may have changed; see url-reference.md`,
    )
  }

  const url = optionalString(job.jobUrl) ?? optionalString(job.careerPageUrl)
  if (!url) {
    throw new Error(
      `missing both \`jobUrl\` and \`careerPageUrl\` on job ${id}, so there is no link to the posting; see url-reference.md`,
    )
  }

  return {
    id,
    title,
    company: optionalString(job.careerPageName),
    location: joinLocation(job.city, job.state),
    date: toIsoDate(job.publishedDate),
    url,
    workplaceType: optionalString(job.workplaceType),
    disabilities: typeof job.disabilities === "boolean" ? job.disabilities : null,
  }
}

/**
 * Pull the `data` array out of a search response, tolerating the two envelope
 * shapes an API like this plausibly uses (`{data: [...]}` or a bare array).
 */
export function extractJobArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  const root = asRecord(payload)
  if (root && Array.isArray(root.data)) return root.data
  throw new Error(
    "search response had no `data` array - the API shape may have changed; see url-reference.md",
  )
}

export function parseSearchResponse(payload: unknown): JobCard[] {
  return extractJobArray(payload).map(mapJob)
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

// Named entities for the accented characters Portuguese actually uses. Without
// these, a description arrives as "an&aacute;lise de dados" and every accented
// word is corrupted - which matters more here than on an English-language
// portal, where named entities beyond &amp; are rare. Numeric references are
// handled generically below; this table is only for the named forms.
const NAMED_ENTITIES: Record<string, string> = {
  aacute: "á", agrave: "à", atilde: "ã", acirc: "â",
  eacute: "é", ecirc: "ê", egrave: "è",
  iacute: "í", icirc: "î",
  oacute: "ó", ocirc: "ô", otilde: "õ",
  uacute: "ú", uuml: "ü", ucirc: "û",
  ccedil: "ç", ntilde: "ñ",
  Aacute: "Á", Agrave: "À", Atilde: "Ã", Acirc: "Â",
  Eacute: "É", Ecirc: "Ê",
  Iacute: "Í",
  Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ",
  Uacute: "Ú", Uuml: "Ü",
  Ccedil: "Ç",
  ordm: "º", ordf: "ª", deg: "°",
  laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&([A-Za-z]+);/g, (whole, name: string) => NAMED_ENTITIES[name] ?? whole)
    .replace(/&nbsp;/g, " ")
    // &amp; last: decoding it first would turn "&amp;aacute;" (a literal,
    // correctly-escaped ampersand followed by text) into a live entity and
    // corrupt it on the next pass.
    .replace(/&amp;/g, "&")
}

/** Strip tags but keep paragraph and list breaks as newlines. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim()
}

/**
 * Extract a JobPosting from a page's JSON-LD block. Gupy career pages emit
 * schema.org JobPosting for search-engine indexing, which is a far more stable
 * contract than the page's own markup - it is the same shape on every ATS that
 * emits it at all.
 */
export function parseJsonLdJobPosting(html: string): Record<string, unknown> | null {
  const blockRe =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = blockRe.exec(html)) !== null) {
    let parsed: unknown
    try {
      parsed = JSON.parse(match[1].trim())
    } catch {
      continue // one malformed block must not hide a valid one later on the page
    }
    // A page may ship several blocks, or one @graph array holding many nodes.
    const candidates: unknown[] = Array.isArray(parsed)
      ? parsed
      : [parsed, ...(Array.isArray(asRecord(parsed)?.["@graph"]) ? (asRecord(parsed)!["@graph"] as unknown[]) : [])]
    for (const candidate of candidates) {
      const node = asRecord(candidate)
      if (node && node["@type"] === "JobPosting") return node
    }
  }
  return null
}

/** Build a JobDetail from a JSON-LD JobPosting node. */
export function detailFromJsonLd(node: Record<string, unknown>, id: string, url: string): JobDetail {
  const org = asRecord(node.hiringOrganization)
  const location = asRecord(node.jobLocation)
  const address = location ? asRecord(location.address) : null

  const rawDescription = optionalString(node.description)

  return {
    id,
    title: optionalString(node.title) ?? "(sem título)",
    company: org ? optionalString(org.name) : null,
    location: address
      ? joinLocation(address.addressLocality, address.addressRegion)
      : null,
    date: toIsoDate(node.datePosted),
    url,
    workplaceType: null,
    disabilities: null,
    description: rawDescription ? htmlToText(rawDescription) : null,
    contractType: optionalString(node.employmentType),
    deadline: toIsoDate(node.validThrough),
  }
}
