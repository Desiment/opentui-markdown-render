import { describe, expect, test } from "bun:test"
import { quitAction } from "../src/viewer/quit"

describe("viewer exit confirmation", () => {
  test("q asks for confirmation from either screen", () => {
    expect(quitAction({ name: "q", ctrl: false }, false)).toBe("prompt")
    expect(quitAction({ name: "q", ctrl: false }, true)).toBe("none")
  })

  test("Enter or y confirms and n or Esc cancels the prompt", () => {
    expect(quitAction({ name: "y", ctrl: false }, true)).toBe("exit")
    expect(quitAction({ name: "return", ctrl: false }, true)).toBe("exit")
    expect(quitAction({ name: "enter", ctrl: false }, true)).toBe("exit")
    expect(quitAction({ name: "n", ctrl: false }, true)).toBe("cancel")
    expect(quitAction({ name: "escape", ctrl: false }, true)).toBe("cancel")
    expect(quitAction({ name: "y", ctrl: false }, false)).toBe("none")
    expect(quitAction({ name: "return", ctrl: false }, false)).toBe("none")
  })

  test("Ctrl+C always exits while panel keys do not confirm", () => {
    expect(quitAction({ name: "c", ctrl: true }, false)).toBe("exit")
    expect(quitAction({ name: "c", ctrl: true }, true)).toBe("exit")
    expect(quitAction({ name: "c", ctrl: true, shift: true }, false)).toBe("none")
    expect(quitAction({ name: "c", ctrl: false }, true)).toBe("none")
    expect(quitAction({ name: "escape", ctrl: false }, false)).toBe("none")
  })
})
