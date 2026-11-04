import path from "node:path"
import { createSolidTransformPlugin } from "@opentui/solid/bun-plugin"

const root = path.resolve(import.meta.dir, "..")
const build = await Bun.build({
  entrypoints: [path.join(root, "bin/otmd-main.tsx")],
  outdir: path.join(root, "bin"),
  naming: { entry: "otmd-main.js" },
  target: "bun",
  format: "esm",
  minify: false,
  sourcemap: "none",
  plugins: [createSolidTransformPlugin()],
  external: [
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
  ],
})

if (!build.success) throw new AggregateError(build.logs, "Unable to build otmd CLI")
