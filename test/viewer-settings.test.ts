import { describe, expect, test } from "bun:test"
import { changeSetting, settingKeys, settingRows, type ViewerSettings } from "../src/viewer/settings"

const initial: ViewerSettings = {
  themeName: "light",
  classLayout: "builtin",
  frame: { enabled: true, width: 100, style: "rounded", align: "center", paddingX: 1 },
  tables: { widthMode: "content", overflow: "scroll", columnFitter: "balanced", cellPaddingX: 1 },
}

describe("viewer configuration panel", () => {
  test("every selectable setting has a displayed value", () => {
    expect(settingRows(initial).map((row) => row.key)).toEqual([...settingKeys])
    expect(settingRows(initial)[0]).toEqual({ key: "mode", label: "Theme", value: "light" })
    expect(settingRows(initial)[1]).toEqual({ key: "classLayout", label: "Class layout", value: "builtin" })
  })

  test("cycles the theme and enum settings in either direction", () => {
    const themes = ["light", "dark", "mission-control"]
    expect(changeSetting(initial, "mode", 1).themeName).toBe("light")
    expect(changeSetting(initial, "mode", 1, themes).themeName).toBe("dark")
    expect(changeSetting(initial, "mode", -1, themes).themeName).toBe("mission-control")
    expect(changeSetting({ ...initial, themeName: "dark" }, "mode", 1, themes).themeName).toBe("mission-control")
    expect(changeSetting({ ...initial, themeName: "mission-control" }, "mode", 1, themes).themeName).toBe("light")
    expect(changeSetting(initial, "classLayout", 1).classLayout).toBe("dagre")
    expect(changeSetting(initial, "classLayout", -1).classLayout).toBe("dagre")
    expect(changeSetting({ ...initial, classLayout: "dagre" }, "classLayout", 1).classLayout).toBe("builtin")
    expect(changeSetting(initial, "frameStyle", 1).frame.style).toBe("heavy")
    expect(changeSetting(initial, "frameAlign", 1).frame.align).toBe("right")
    expect(changeSetting(initial, "tableWidth", 1).tables.widthMode).toBe("full")
    expect(changeSetting(initial, "tableOverflow", -1).tables.overflow).toBe("wrap")
    expect(changeSetting(initial, "tableFitter", 1).tables.columnFitter).toBe("proportional")
  })

  test("keeps a configured custom theme until the user changes it", () => {
    const configured = { ...initial, themeName: "mission-control" }
    expect(settingRows(configured)[0]?.value).toBe("mission-control")
    expect(changeSetting(configured, "mode", 1, ["light", "mission-control"]).themeName).toBe("light")
  })

  test("toggles the frame and bounds numeric settings without changing the file configuration", () => {
    expect(changeSetting(initial, "frameEnabled", 1).frame.enabled).toBe(false)
    expect(changeSetting(initial, "frameWidth", -1).frame.width).toBe(95)
    expect(changeSetting({ ...initial, frame: { width: 20 } }, "frameWidth", -1).frame.width).toBe(20)
    expect(changeSetting({ ...initial, tables: { cellPaddingX: 0 } }, "tablePadding", -1).tables.cellPaddingX).toBe(0)
    expect(changeSetting(initial, "framePadding", 1).frame.paddingX).toBe(2)
    expect(initial.frame).toEqual({ enabled: true, width: 100, style: "rounded", align: "center", paddingX: 1 })
    expect(initial.classLayout).toBe("builtin")
    expect(initial.tables).toEqual({ widthMode: "content", overflow: "scroll", columnFitter: "balanced", cellPaddingX: 1 })
  })
})
