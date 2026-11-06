import { createClipboard, createHostClipboard, createRendererClipboardAdapter, type CliRenderer, type ClipboardService } from "@opentui/core"

// The terminal's Ctrl+Shift+C copies its own selection, not OpenTUI's. Copy the
// internal selection when the mouse drag finishes, using the host clipboard or
// OSC 52 where supported. Do not copy empty clicks or incomplete drags.
export function enableSelectionCopy(
  renderer: CliRenderer,
  report: (status: string | undefined) => void,
  clipboard?: Pick<ClipboardService, "writeText">,
): () => void {
  const owned = clipboard ? undefined : createClipboard({
    host: createHostClipboard(),
    terminal: createRendererClipboardAdapter(renderer),
  })
  const service = clipboard ?? owned!
  let active = true
  let clear: ReturnType<typeof setTimeout> | undefined
  const status = (message: string) => {
    if (!active) return
    report(message)
    if (clear) clearTimeout(clear)
    clear = setTimeout(() => report(undefined), 2500)
  }
  const onSelection: Parameters<typeof renderer.on<"selection">>[1] = (selection) => {
    const text = selection.getSelectedText()
    if (!text) return
    void service.writeText(text, { destination: "best-available", allowRemoteHost: false })
      .then((result) => {
        if (result.host.status === "written") status("Copied selection")
        else if (result.terminal.status === "attempted") status("Copy sent via terminal")
        else status("Clipboard unavailable")
      })
      .catch(() => status("Clipboard unavailable"))
  }
  renderer.on("selection", onSelection)
  return () => {
    active = false
    if (clear) clearTimeout(clear)
    renderer.off("selection", onSelection)
    if (owned) void owned.dispose()
  }
}
