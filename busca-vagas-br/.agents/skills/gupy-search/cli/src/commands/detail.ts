import {
  htmlFetch,
  parseJsonLdJobPosting,
  detailFromJsonLd,
  writeError,
  type JobDetail,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/**
 * `detail` takes the posting URL from a `search` result. Gupy postings live on
 * per-employer subdomains (`https://<empresa>.gupy.io/job/<token>`), so there is
 * no single detail endpoint keyed by the numeric id the search returns - the URL
 * is the addressable thing, and passing a bare id cannot be resolved without it.
 */
export function isUsableUrl(idOrUrl: string): boolean {
  return /^https?:\/\//i.test(idOrUrl)
}

function renderPlain(d: JobDetail): string {
  const lines = [
    d.title,
    `${d.company || "—"} · ${d.location || "—"}`,
    d.date ? `Publicada em: ${d.date}` : null,
    d.deadline ? `Inscrições até: ${d.deadline}` : null,
    d.contractType ? `Contratação: ${d.contractType}` : null,
    d.url,
    "",
    d.description || "(sem descrição)",
  ]
  return lines.filter((l): l is string => l !== null).join("\n")
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  try {
    if (!isUsableUrl(opts.id)) {
      writeError(
        `detail needs the posting URL, not a bare id - Gupy postings live on per-employer subdomains, so "${opts.id}" cannot be resolved on its own. Pass the \`url\` field from a search result.`,
        "NEEDS_URL",
      )
      return 1
    }

    const html = await htmlFetch(opts.id)
    if (!html) {
      writeError(`posting not found (404): ${opts.id}`, "NOT_FOUND")
      return 1
    }

    const node = parseJsonLdJobPosting(html)
    if (!node) {
      writeError(
        "no schema.org JobPosting block found on the page - the posting may have been taken down, or the page markup changed; see url-reference.md",
        "NO_JOBPOSTING",
      )
      return 1
    }

    const detail = detailFromJsonLd(node, opts.id, opts.id)

    if (opts.format === "plain") {
      process.stdout.write(renderPlain(detail) + "\n")
    } else {
      process.stdout.write(JSON.stringify(detail, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
