export type CliCommand =
  | { readonly kind: "help" }
  | { readonly kind: "version" }
  | {
      readonly kind: "run"
      readonly file?: string
      readonly configPath?: string
      readonly discoverConfig: boolean
    }

export const cliUsage = `Usage: otmd [options] [file]

Render a Markdown file in the terminal. Use - to read Markdown from stdin.

Options:
  -c, --config <path>  Load a specific JSON/JSONC config file
      --no-config      Disable automatic config discovery
  -h, --help           Show this help
  -v, --version        Show the package version

Viewer keys:
  c                     Open or close runtime configuration
  q                     Ask to quit
  Ctrl+C                Quit immediately
`

export function parseCliArgs(args: readonly string[]): CliCommand {
  let configPath: string | undefined
  let discoverConfig = true
  let file: string | undefined

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!
    if (argument === "--") {
      if (file !== undefined || index + 1 >= args.length) throw new Error("Expected one Markdown file after --")
      file = args[++index]
      continue
    }
    if (argument === "-h" || argument === "--help") return { kind: "help" }
    if (argument === "-v" || argument === "--version") return { kind: "version" }
    if (argument === "--no-config") {
      discoverConfig = false
      continue
    }
    if (argument === "-") {
      if (file !== undefined) throw new Error("Only one Markdown file can be rendered")
      file = argument
      continue
    }
    if (argument === "-c" || argument === "--config") {
      const value = args[++index]
      if (!value) throw new Error(`${argument} requires a path`)
      configPath = value
      continue
    }
    if (argument.startsWith("--config=")) {
      const value = argument.slice("--config=".length)
      if (!value) throw new Error("--config requires a path")
      configPath = value
      continue
    }
    if (argument.startsWith("-")) throw new Error(`Unknown option: ${argument}`)
    if (file !== undefined) throw new Error("Only one Markdown file can be rendered")
    file = argument
  }

  return { kind: "run", file, configPath, discoverConfig }
}
