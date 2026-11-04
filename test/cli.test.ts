import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { parseCliArgs } from "../src/cli"

const bin = path.resolve(import.meta.dir, "../bin/otmd.ts")
const manifest = JSON.parse(readFileSync(path.resolve(import.meta.dir, "../package.json"), "utf8")) as {
  version: string
  bin: { otmd: string }
}

describe("otmd CLI arguments", () => {
  test("bootstraps the Solid client runtime before loading JSX", () => {
    const bootstrap = readFileSync(bin, "utf8")
    expect(manifest.bin.otmd).toBe("bin/otmd.ts")
    expect(bootstrap.split("\n", 1)[0]).toBe("#!/usr/bin/env bun")
    expect(bootstrap).toContain('"--preload"')
    expect(bootstrap).toContain('await import("./otmd-main.js")')
  })

  test("runs the compiled CLI outside the package workspace", async () => {
    const child = Bun.spawn([process.execPath, bin, "--version"], {
      cwd: tmpdir(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toBe(`${manifest.version}\n`)
    expect(stderr).toBe("")
  })

  test("renders a file with automatic config discovery", () => {
    expect(parseCliArgs(["README.md"])).toEqual({
      kind: "run",
      file: "README.md",
      discoverConfig: true,
    })
  })

  test("supports stdin and an explicit config", () => {
    expect(parseCliArgs(["--config=./otmd.jsonc", "-"])).toEqual({
      kind: "run",
      file: "-",
      configPath: "./otmd.jsonc",
      discoverConfig: true,
    })
  })

  test("can disable discovery", () => {
    expect(parseCliArgs(["--no-config", "README.md"])).toEqual({
      kind: "run",
      file: "README.md",
      discoverConfig: false,
    })
  })

  test("recognizes help and version", () => {
    expect(parseCliArgs(["--help"])).toEqual({ kind: "help" })
    expect(parseCliArgs(["--version"])).toEqual({ kind: "version" })
  })

  test("rejects invalid arguments", () => {
    expect(() => parseCliArgs(["--unknown"])).toThrow("Unknown option")
    expect(() => parseCliArgs(["--config"])).toThrow("requires a path")
    expect(() => parseCliArgs(["one.md", "two.md"])).toThrow("Only one")
  })
})
