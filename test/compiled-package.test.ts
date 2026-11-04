import { expect, test } from "bun:test"
import path from "node:path"

test("compiled package defers image dimensions until media is ready", async () => {
  const fixture = path.resolve(import.meta.dir, "fixtures/compiled-package-smoke.tsx")
  const child = Bun.spawn([process.execPath, "--preload", "@opentui/solid/preload", fixture], {
    cwd: path.resolve(import.meta.dir, ".."),
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect({ exitCode, stdout, stderr }).toEqual({ exitCode: 0, stdout: "compiled package image ok\n", stderr: "" })
})
