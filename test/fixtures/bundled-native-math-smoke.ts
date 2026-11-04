import { renderMath } from "../../src/math/renderer"

const rendered = await renderMath({ latex: "x^2", display: false, foreground: "#ffffff", background: "#000000" })
if (!rendered?.png.length) throw new Error("Bundled native math returned no image")
console.log(`bundled native math ok ${rendered.pixelWidth}x${rendered.pixelHeight}`)
