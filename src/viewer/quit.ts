export type QuitAction = "prompt" | "exit" | "cancel" | "none"

export function quitAction(key: { readonly name: string; readonly ctrl: boolean }, confirming: boolean): QuitAction {
  if (key.ctrl && key.name === "c") return "exit"
  if (confirming) {
    if (!key.ctrl && (key.name === "y" || key.name === "return" || key.name === "enter")) return "exit"
    if (key.name === "n" || key.name === "escape") return "cancel"
    return "none"
  }
  return key.name === "q" && !key.ctrl ? "prompt" : "none"
}
