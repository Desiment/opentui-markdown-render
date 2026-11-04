import path from "node:path"
import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin"

const root = path.resolve(import.meta.dir, "..")
const external = [
  "@opentui/core",
  "@opentui/solid",
  "@opentui/solid/*",
  "solid-js",
  "solid-js/*",
  "@dagrejs/dagre",
  "entities",
  "gifuct-js",
  "marked",
  "string-width",
]

for (const [entry, name] of [["src/index.ts", "index.js"], ["src/core/index.ts", "core.js"]] as const) {
  const build = await Bun.build({
    entrypoints: [path.join(root, entry)],
    outdir: path.join(root, "dist"),
    naming: { entry: name },
    target: "bun",
    format: "esm",
    minify: false,
    sourcemap: "none",
    plugins: [createSolidTransformPlugin()],
    external,
  })
  if (!build.success) throw new AggregateError(build.logs, `Unable to build ${entry}`)
}
