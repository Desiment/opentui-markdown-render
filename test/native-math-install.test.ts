import { expect, test } from "bun:test"
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

test("bundled renderer finds native math in a hoisted package dependency", async () => {
  const temp = path.join(os.tmpdir(), "opencode")
  await mkdir(temp, { recursive: true })
  const root = await mkdtemp(path.join(temp, "opentui-markdown-native-"))
  try {
    const host = path.join(root, "node_modules", "canvas-host")
    const dependency = path.join(root, "node_modules", "opentui-markdown-render")
    const relative = path.join("prebuilds", "linux-x64-gnu", "opentui_markdown_render.node")
    await mkdir(host, { recursive: true })
    await mkdir(path.dirname(path.join(dependency, relative)), { recursive: true })
    await cp(path.resolve(import.meta.dir, "..", relative), path.join(dependency, relative))
    await mkdir(path.join(dependency, "dist"), { recursive: true })
    await writeFile(path.join(dependency, "package.json"), JSON.stringify({
      name: "opentui-markdown-render",
      type: "module",
      exports: { ".": "./dist/index.js" },
    }))
    await writeFile(path.join(dependency, "dist/index.js"), "export {}\n")

    const build = await Bun.build({
      entrypoints: [path.resolve(import.meta.dir, "fixtures/bundled-native-math-smoke.ts")],
      outdir: host,
      naming: { entry: "tui.js" },
      target: "bun",
      format: "esm",
      minify: false,
    })
    expect(build.success).toBe(true)

    const child = Bun.spawn([process.execPath, path.join(host, "tui.js")], { stdout: "pipe", stderr: "pipe" })
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect({ exitCode, stdout, stderr }).toEqual({
      exitCode: 0,
      stdout: expect.stringContaining("bundled native math ok"),
      stderr: "",
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
