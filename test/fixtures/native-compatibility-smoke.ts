import { renderMath } from "../../src/math/renderer"

const formulas = [
  String.raw`a\!b + c\negthinspace d`,
  String.raw`\begin{align*} a &= b \\ c &= d \end{align*}`,
  String.raw`\begin{cases} x & x > 0 \\ -x & x \leq 0 \end{cases}`,
  String.raw`\begin{Vmatrix} \frac{1}{2} & b \\ c & d \end{Vmatrix}`,
  String.raw`\begin{alignedat}{2} a &= b & c &= d \\ e &= f & g &= h \end{alignedat}`,
]
for (const latex of formulas) {
  const image = await renderMath({ latex, display: true, foreground: "#000000", background: "#ffffff" })
  if (!image?.png.length) throw new Error(`Formula did not render: ${latex}`)
}
console.log(`rendered ${formulas.length} formulas`)
