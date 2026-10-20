import { cp, mkdir, rm } from "node:fs/promises"
import path from "node:path"

const root = path.resolve(import.meta.dir, "..")
const target = path.join(root, "native", "target", "release", "libopentui_markdown_render_native.so")
const output = path.join(root, "prebuilds", "linux-x64-gnu", "opentui_markdown_render.node")

const build = Bun.spawn(["cargo", "build", "--manifest-path", path.join(root, "native", "Cargo.toml"), "--release"], {
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
})
if ((await build.exited) !== 0) throw new Error("Unable to build native renderer")

await rm(output, { force: true })
await mkdir(path.dirname(output), { recursive: true })
await cp(target, output)
