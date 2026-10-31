# Mermaid syntax support

This renderer implements a **subset**, not the upstream Mermaid grammar. Only
fenced `mermaid` blocks whose first meaningful line identifies one of the seven
families below are eligible for rendering as terminal diagrams. This page
describes the current implementation, not a promise of compatibility with a particular
Mermaid release. Examples in the “unsupported” column are illustrative, not an
exhaustive list of rejected syntax.

**Legend:** **rendered** means the syntax affects the diagram; **accepted but
ignored** means the block still renders, but that directive has no visual or
semantic effect; **unsupported** means the diagram cannot be prepared and the
viewer normally shows its source fence. Comments and accessibility metadata
are listed where the corresponding parser handles them; do not assume one
diagram family's directives work in another.

| Family / first line | Rendered syntax | Accepted but ignored / approximated | Unsupported examples |
| --- | --- | --- | --- |
| `flowchart` / `graph` | `TB`, `TD`, `BT`, `LR`, `RL`; box, rounded, circle, decision, database, subroutine, hexagon and `[/parallelogram/]` nodes; arrows/links, edge labels, chains, `&` groups, nested subgraphs, top-level `;` separators | `classDef`, `class`, `style`, `linkStyle` (terminal theme wins); `%%` comments | Modern `@{ shape: ... }` declarations, `click`/hyperlinks, other node shapes and unrecognized statements |
| `sequenceDiagram` | Participants/actors, aliases and boxes; messages, notes, activations, `autonumber`; `alt`/`else`, `loop`, `opt`, `par`/`and`, `critical`/`option`, `break` | Colour on `box` is not applied (its label is retained); `%%` comment lines | `rect`, participant `create`/`destroy`, bidirectional messages |
| `stateDiagram` / `stateDiagram-v2` | Directions `TB`, `TD`, `BT`, `LR`, `RL`; transitions and labels, start/end, declarations/descriptions, choice, fork/join, composites, inline/multiline left/right notes | `%%` comment lines | A `direction` inside a composite state and other unrecognized state statements |
| `gantt` | `title`, `section`, `dateFormat`, `axisFormat`, fixed-unit `tickInterval`; task IDs, `after` dependencies, duration/end dates, `active`, `done`, `crit`, `milestone`; date formats `s`, `X`, `x`, `HH:mm`, `HH:mm:ss`, `YYYY-MM-DD`, `YYYY-MM-DD HH:mm`, `YYYY-MM-DD HH:mm:ss` and the same date-time formats with `T` instead of a space | `accTitle`, `accDescr`, `%%` comments; `vert` flag currently draws as a regular task | `excludes`, `todayMarker`, calendar-month tick intervals and other date formats |
| `timeline` | `title`, `section`, periods and events separated by colon, continuation lines | `accTitle`, `accDescr`, `%%` comments; `TD`/`LR` is parsed but the terminal layout is always vertical | Empty `title`/`section`, continuation without a period; arbitrary unknown lines may instead be interpreted as period text |
| `gitGraph` | `commit` (ID/message/tags/type), `branch` (order), `checkout`/`switch`, `merge`, simple `cherry-pick id: "..."` | `title`, `accTitle`, `accDescr`, `%%` comments; `LR`/`TB`/`BT` is parsed but the terminal layout is always vertical | `cherry-pick` with `parent:` or other extra options, unknown commands/attributes |
| `classDiagram` | Directions `TB`, `BT`, `LR`, `RL`; classes, labelled classes, members, stereotypes, relationships, cardinalities and `note for Class "..."` (shown inside the class box) | `accTitle`, `accDescr`, `%%` comments | Standalone notes, `namespace`, `package`, `click`/hyperlinks, CSS styles |

Other diagram families, such as `erDiagram`, `pie`, `journey`, `mindmap`,
`sankey` and `xychart`, are **not detected** and remain readable code fences.
See [`src/merman/detect.ts`](src/merman/detect.ts) for the actual family list.

For an unsupported statement in a detected family, the parser raises a
`MermaidSyntaxError`. The view uses a code-fence fallback; while an existing
diagram is being edited, it may instead keep the **last valid rendering** or
render a valid prefix until the new input is complete. Some syntax can also
render with simplified geometry or theme colours rather than matching Mermaid's
SVG output.

The canvas is limited to **250,000 cells**, and a flowchart source line may
contain at most **10,000 characters**; exceeding these limits does not produce
a partial drawing.

The status examples are checked in
[`test/mermaid-support.test.ts`](test/mermaid-support.test.ts); additional
rendering fixtures are in [`test/mermaid-extended.test.ts`](test/mermaid-extended.test.ts),
[`test/merman-ext.test.ts`](test/merman-ext.test.ts),
[`test/mermaid-view.render.test.tsx`](test/mermaid-view.render.test.tsx),
[`examples/mermaid.md`](examples/mermaid.md) and the 95-diagram
[`examples/merman-ext.md`](examples/merman-ext.md) stress suite.
