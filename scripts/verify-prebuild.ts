import { createRequire } from "node:module"
import path from "node:path"

const root = path.resolve(import.meta.dir, "..")
const file = path.join(root, "prebuilds", "linux-x64-gnu", "opentui_markdown_render.node")
const bytes = new Uint8Array(await Bun.file(file).arrayBuffer())
const contents = new TextDecoder("latin1").decode(bytes)
const versions = [...contents.matchAll(/GLIBC_(\d+)\.(\d+)/g)]
  .map((match) => [Number(match[1]), Number(match[2])] as const)
  .sort(([leftMajor, leftMinor], [rightMajor, rightMinor]) => leftMajor - rightMajor || leftMinor - rightMinor)
const latest = versions.at(-1)
if (!latest) throw new Error("Native prebuild does not declare a glibc baseline")
if (latest[0] > 2 || latest[0] === 2 && latest[1] > 17) {
  throw new Error(`Native prebuild requires GLIBC_${latest[0]}.${latest[1]}; expected at most GLIBC_2.17`)
}

if (process.platform === "linux" && process.arch === "x64") {
  const native = createRequire(import.meta.url)(file) as {
    renderLatex(input: { latex: string; display?: boolean }): Promise<{ png: Uint8Array }>
  }
  const formula = await native.renderLatex({ latex: "x^2" })
  if (!formula.png.length) throw new Error("Native prebuild returned no image")
}

process.stdout.write(`Native prebuild supports GLIBC_2.17 and rendered a formula.\n`)
