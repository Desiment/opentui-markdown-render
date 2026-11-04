import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { parseCliArgs } from "../src/cli"

const bin = path.resolve(import.meta.dir, "../bin/otmd.tsx")

describe("otmd CLI arguments", () => {
  test("preloads the Solid client runtime from the installed executable", () => {
    expect(readFileSync(bin, "utf8").split("\n", 1)[0]).toBe(
      "#!/usr/bin/env -S bun --preload @opentui/solid/preload",
    )
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
