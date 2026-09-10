// The portal-skill contract in add-portal.md: a bogus flag or a missing
// required argument exits 1 with a JSON error on stderr, never on stdout.
// These run offline - every case here is rejected before any request is made.

import { describe, expect, test } from "bun:test"
import { runCLI, type CLIResult } from "./helpers.js"

function stderrJson(result: CLIResult): { error: string; code: string } {
  return JSON.parse(result.stderr)
}

describe("flag validation", () => {
  test("an unknown flag exits 1 with a JSON error on stderr", async () => {
    const result = await runCLI(["search", "--nao-existe", "x"])
    expect(result.exitCode).toBe(1)
    expect(stderrJson(result).code).toBe("UNKNOWN_FLAG")
    expect(result.stdout).toBe("")
  })

  test("a non-numeric --jobage is rejected", async () => {
    const result = await runCLI(["search", "--jobage", "duas semanas"])
    expect(result.exitCode).toBe(1)
    expect(stderrJson(result).code).toBe("BAD_ARG")
  })

  test("a fractional --jobage is rejected rather than truncated to 0", async () => {
    // parseInt would turn 0.5 into 0 and silently widen the window to
    // everything; Number() plus an integer check is what prevents that.
    const result = await runCLI(["search", "--jobage", "0.5"])
    expect(result.exitCode).toBe(1)
    expect(stderrJson(result).code).toBe("BAD_ARG")
  })

  test("an unsupported --remote value is rejected", async () => {
    const result = await runCLI(["search", "--remote", "presencial"])
    expect(result.exitCode).toBe(1)
    expect(stderrJson(result).code).toBe("BAD_ARG")
  })

  test("detail without an argument exits 1", async () => {
    const result = await runCLI(["detail"])
    expect(result.exitCode).toBe(1)
    expect(stderrJson(result).code).toBe("NO_ID")
  })

  test("detail with a bare id explains that it needs the URL", async () => {
    const result = await runCLI(["detail", "8675309"])
    expect(result.exitCode).toBe(1)
    expect(stderrJson(result).code).toBe("NEEDS_URL")
  })

  test("an unknown command exits 1", async () => {
    const result = await runCLI(["listar"])
    expect(result.exitCode).toBe(1)
    expect(stderrJson(result).code).toBe("BAD_CMD")
  })

  test("--help prints usage on stdout and exits 0", async () => {
    const result = await runCLI(["search", "--help"])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("USO")
  })
})
