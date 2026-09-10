// Offline tests for the response mapping.
//
// IMPORTANT about what these do and do not prove. The fixture below is
// HAND-WRITTEN from the documented API shape, not captured from a live call, so
// these tests pin the mapping's *behaviour* (which raw field lands in which
// output field, what happens when one is missing, how dates and locations are
// normalised) - they cannot prove the raw shape itself is right. Only a live
// run can do that; see SKILL.md's verification step.
//
// They are still worth having: once a live response IS captured, replacing the
// fixture is the whole job, and every behavioural guarantee below is re-checked
// against the real shape for free.

import { describe, expect, test } from "bun:test"
import {
  mapJob,
  parseSearchResponse,
  extractJobArray,
  toIsoDate,
  joinLocation,
  htmlToText,
  parseJsonLdJobPosting,
  detailFromJsonLd,
} from "../src/helpers.js"
import {
  filterByAge,
  filterByWorkplace,
  filterByLocation,
  buildUrl,
} from "../src/commands/search.js"

const rawJob = {
  id: 8675309,
  name: "Pessoa Engenheira de Dados Sênior",
  careerPageName: "Empresa Exemplo",
  city: "São Paulo",
  state: "São Paulo",
  country: "Brasil",
  publishedDate: "2026-08-14T13:22:05.000Z",
  workplaceType: "remote",
  disabilities: false,
  jobUrl: "https://empresaexemplo.gupy.io/job/abc123",
  careerPageUrl: "https://empresaexemplo.gupy.io",
}

const searchPayload = { data: [rawJob], pagination: { limit: 20, offset: 0, total: 1 } }

describe("mapJob", () => {
  test("maps every documented field onto the portal contract shape", () => {
    expect(mapJob(rawJob)).toEqual({
      id: "8675309",
      title: "Pessoa Engenheira de Dados Sênior",
      company: "Empresa Exemplo",
      location: "São Paulo, São Paulo",
      date: "2026-08-14",
      url: "https://empresaexemplo.gupy.io/job/abc123",
      workplaceType: "remote",
      disabilities: false,
    })
  })

  test("numeric ids become strings, so downstream key derivation is stable", () => {
    expect(mapJob(rawJob).id).toBe("8675309")
  })

  test("optional fields map to null rather than being omitted", () => {
    const sparse = { id: 1, name: "Analista", jobUrl: "https://x.gupy.io/job/1" }
    const card = mapJob(sparse)
    expect(card.company).toBeNull()
    expect(card.location).toBeNull()
    expect(card.date).toBeNull()
    expect(card.workplaceType).toBeNull()
    expect(card.disabilities).toBeNull()
  })

  test("falls back to the career page URL when jobUrl is absent", () => {
    const { jobUrl, ...noJobUrl } = rawJob
    expect(mapJob(noJobUrl).url).toBe("https://empresaexemplo.gupy.io")
  })

  // These are the point of the whole file: an unverified mapping must fail
  // loudly. A silent row of nulls is the failure mode /scrape's health check
  // exists to catch, and it is much harder to notice than a thrown error.
  test("throws, naming the field, when the id is missing", () => {
    const { id, ...noId } = rawJob
    expect(() => mapJob(noId)).toThrow(/`id`/)
  })

  test("throws, naming the field, when the title is missing", () => {
    const { name, ...noName } = rawJob
    expect(() => mapJob(noName)).toThrow(/`name`/)
  })

  test("throws when there is no link to the posting at all", () => {
    const { jobUrl, careerPageUrl, ...noUrl } = rawJob
    expect(() => mapJob(noUrl)).toThrow(/jobUrl/)
  })

  test("throws when a job entry is not an object", () => {
    expect(() => mapJob("nope")).toThrow(/object/)
  })
})

describe("extractJobArray", () => {
  test("reads the data array out of the documented envelope", () => {
    expect(extractJobArray(searchPayload)).toHaveLength(1)
  })

  test("tolerates a bare array response", () => {
    expect(extractJobArray([rawJob])).toHaveLength(1)
  })

  test("throws when the envelope has no data array", () => {
    expect(() => extractJobArray({ results: [] })).toThrow(/`data` array/)
  })
})

describe("parseSearchResponse", () => {
  test("maps a full payload", () => {
    const cards = parseSearchResponse(searchPayload)
    expect(cards).toHaveLength(1)
    expect(cards[0].company).toBe("Empresa Exemplo")
  })
})

describe("toIsoDate", () => {
  test("truncates an ISO timestamp to a calendar date", () => {
    expect(toIsoDate("2026-08-14T13:22:05.000Z")).toBe("2026-08-14")
  })

  test("returns null for junk rather than an Invalid Date string", () => {
    expect(toIsoDate("não é data")).toBeNull()
    expect(toIsoDate(null)).toBeNull()
    expect(toIsoDate(undefined)).toBeNull()
  })
})

describe("joinLocation", () => {
  test("joins city and state", () => {
    expect(joinLocation("Recife", "Pernambuco")).toBe("Recife, Pernambuco")
  })

  test("keeps whichever side is present", () => {
    expect(joinLocation("Recife", null)).toBe("Recife")
    expect(joinLocation(null, "Pernambuco")).toBe("Pernambuco")
  })

  test("is null when a remote posting carries no place at all", () => {
    expect(joinLocation(null, undefined)).toBeNull()
  })
})

describe("filterByAge", () => {
  const now = new Date("2026-09-10T00:00:00.000Z")
  const card = (date: string | null) => ({
    id: "1", title: "t", company: null, location: null, date,
    url: "u", workplaceType: null, disabilities: null,
  })

  test("keeps postings inside the window", () => {
    expect(filterByAge([card("2026-09-01")], 14, now)).toHaveLength(1)
  })

  test("drops postings older than the window", () => {
    expect(filterByAge([card("2026-06-01")], 14, now)).toHaveLength(0)
  })

  test("keeps undated postings - /scrape flags them rather than losing them", () => {
    expect(filterByAge([card(null)], 14, now)).toHaveLength(1)
  })

  test("is a no-op when no window was requested", () => {
    expect(filterByAge([card("2020-01-01")], undefined, now)).toHaveLength(1)
  })
})

describe("filterByWorkplace", () => {
  const card = (workplaceType: string | null) => ({
    id: "1", title: "t", company: null, location: null, date: null,
    url: "u", workplaceType, disabilities: null,
  })

  test("matches the requested mode", () => {
    expect(filterByWorkplace([card("remote")], "remote")).toHaveLength(1)
    expect(filterByWorkplace([card("hybrid")], "remote")).toHaveLength(0)
  })

  test("treats on-site and onsite as the same mode", () => {
    expect(filterByWorkplace([card("on-site")], "onsite")).toHaveLength(1)
  })

  test("excludes postings that state no mode, so the filter never over-reports", () => {
    expect(filterByWorkplace([card(null)], "remote")).toHaveLength(0)
  })
})

describe("filterByLocation", () => {
  const card = (location: string | null) => ({
    id: "1", title: "t", company: null, location, date: null,
    url: "u", workplaceType: null, disabilities: null,
  })

  test("matches a city inside the joined location string", () => {
    expect(filterByLocation([card("Belo Horizonte, Minas Gerais")], "belo horizonte")).toHaveLength(1)
  })

  test("drops non-matching places", () => {
    expect(filterByLocation([card("Curitiba, Paraná")], "Salvador")).toHaveLength(0)
  })
})

describe("buildUrl", () => {
  test("sends the query as `name` and paginates by offset", () => {
    const url = buildUrl({ query: "dados", page: 2, format: "json" })
    expect(url).toContain("name=dados")
    expect(url).toContain("offset=20")
    expect(url).toContain("limit=20")
  })

  test("percent-encodes accented queries", () => {
    expect(buildUrl({ query: "análise", page: 1, format: "json" })).toContain(
      "name=an%C3%A1lise",
    )
  })
})

describe("htmlToText", () => {
  test("decodes entities and breaks paragraphs onto their own lines", () => {
    expect(htmlToText("<p>Vaga&nbsp;para <b>an&aacute;lise</b></p><p>Segundo</p>"))
      .toBe("Vaga para análise\nSegundo")
  })

  test("decodes numeric entities", () => {
    expect(htmlToText("<p>an&#225;lise de dados</p>")).toBe("análise de dados")
  })

  // Named accent entities are the common case in Portuguese postings, and the
  // one an English-market portal CLI never has to handle. Left undecoded, every
  // accented word in a description arrives corrupted.
  test("decodes the named accent entities Portuguese uses", () => {
    expect(htmlToText("<p>Gest&atilde;o de proje&ccedil;&otilde;es t&eacute;cnicas</p>"))
      .toBe("Gestão de projeções técnicas")
  })

  test("leaves an unknown named entity untouched rather than dropping it", () => {
    expect(htmlToText("<p>a &fake; b</p>")).toBe("a &fake; b")
  })

  test("decodes an escaped ampersand without re-decoding what follows it", () => {
    expect(htmlToText("<p>P&amp;D e A&amp;aacute;</p>")).toBe("P&D e A&aacute;")
  })

  test("converts list items to lines, which is how requirements arrive", () => {
    expect(htmlToText("<ul><li>Python</li><li>SQL</li></ul>")).toBe("Python\nSQL")
  })
})

describe("parseJsonLdJobPosting", () => {
  test("finds a JobPosting node", () => {
    const html = `<script type="application/ld+json">{"@type":"JobPosting","title":"Analista"}</script>`
    expect(parseJsonLdJobPosting(html)?.title).toBe("Analista")
  })

  test("finds a JobPosting inside an @graph array", () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"WebSite"},{"@type":"JobPosting","title":"Dev"}]}</script>`
    expect(parseJsonLdJobPosting(html)?.title).toBe("Dev")
  })

  test("skips a malformed block instead of giving up on the page", () => {
    const html =
      `<script type="application/ld+json">{ not json </script>` +
      `<script type="application/ld+json">{"@type":"JobPosting","title":"Ok"}</script>`
    expect(parseJsonLdJobPosting(html)?.title).toBe("Ok")
  })

  test("returns null when the page carries no JobPosting", () => {
    expect(parseJsonLdJobPosting("<html><body>nada</body></html>")).toBeNull()
  })
})

describe("detailFromJsonLd", () => {
  test("maps the schema.org fields onto the detail contract", () => {
    const node = {
      "@type": "JobPosting",
      title: "Pessoa Desenvolvedora",
      description: "<p>Descri&#231;&#227;o da vaga</p>",
      datePosted: "2026-08-14T00:00:00Z",
      validThrough: "2026-09-30T00:00:00Z",
      employmentType: "FULL_TIME",
      hiringOrganization: { name: "Empresa Exemplo" },
      jobLocation: { address: { addressLocality: "Recife", addressRegion: "PE" } },
    }
    const detail = detailFromJsonLd(node, "u", "https://x.gupy.io/job/1")
    expect(detail.title).toBe("Pessoa Desenvolvedora")
    expect(detail.company).toBe("Empresa Exemplo")
    expect(detail.location).toBe("Recife, PE")
    expect(detail.date).toBe("2026-08-14")
    expect(detail.deadline).toBe("2026-09-30")
    expect(detail.contractType).toBe("FULL_TIME")
    expect(detail.description).toBe("Descrição da vaga")
  })
})
