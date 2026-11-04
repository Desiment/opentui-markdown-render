#!/usr/bin/env bun

const preloadMarker = "OTMD_SOLID_PRELOAD_ACTIVE"

if (process.env[preloadMarker] !== "1") {
  const child = Bun.spawn({
    cmd: [
      process.execPath,
      "--preload",
      "@opentui/solid/preload",
      import.meta.path,
      ...process.argv.slice(2),
    ],
    env: { ...process.env, [preloadMarker]: "1" },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  process.exit(await child.exited)
}

await import("./otmd-main.js")
