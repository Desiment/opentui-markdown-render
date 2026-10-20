import { firstMeaningfulMermaidLine, meaningfulNumberedMermaidLines, stripMermaidQuotes } from "../core/mermaid.js"
import { MermaidSyntaxError } from "../diagnostics.js"
import type {
  ClassDefinition,
  ClassDiagram,
  ClassDiagramDirection,
  ClassMember,
  ClassRelationship,
  ClassRelationshipKind,
} from "./types.js"

const HEADER_RE = /^classDiagram(?:\s+(TB|BT|LR|RL))?$/i
const DIRECTION_RE = /^direction\s+(TB|BT|LR|RL)$/i
const ACCESSIBILITY_RE = /^acc(?:Title|Descr)(?::|\s|$)/i
const CLASS_NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_.\-~]*$/
const ANNOTATION_RE = /^<<(.+?)>>\s+(.+)$/
const STEREOTYPE_ONLY_RE = /^<<(.+?)>>$/

interface RelationshipOperator {
  token: string
  kind: ClassRelationshipKind
  headAt: "from" | "to" | "none"
  dashed: boolean
}

// Longest first so `--|>` wins over `--` and `-->` over `--` at the same index.
const RELATIONSHIP_OPERATOR_LIST: RelationshipOperator[] = [
  { token: "<|--", kind: "inheritance", headAt: "from", dashed: false },
  { token: "--|>", kind: "inheritance", headAt: "to", dashed: false },
  { token: "<|..", kind: "realization", headAt: "from", dashed: true },
  { token: "..|>", kind: "realization", headAt: "to", dashed: true },
  { token: "*--", kind: "composition", headAt: "from", dashed: false },
  { token: "--*", kind: "composition", headAt: "to", dashed: false },
  { token: "o--", kind: "aggregation", headAt: "from", dashed: false },
  { token: "--o", kind: "aggregation", headAt: "to", dashed: false },
  { token: "-->", kind: "association", headAt: "to", dashed: false },
  { token: "<--", kind: "association", headAt: "from", dashed: false },
  { token: "..>", kind: "dependency", headAt: "to", dashed: true },
  { token: "<..", kind: "dependency", headAt: "from", dashed: true },
  { token: "--", kind: "link", headAt: "none", dashed: false },
  { token: "..", kind: "link", headAt: "none", dashed: true },
]
const RELATIONSHIP_OPERATORS: RelationshipOperator[] = [...RELATIONSHIP_OPERATOR_LIST].sort(
  (left, right) => right.token.length - left.token.length,
)

export function isMermaidClassDiagram(content: string): boolean {
  return HEADER_RE.test(firstMeaningfulMermaidLine(content) ?? "")
}

export function parseMermaidClassDiagram(content: string): ClassDiagram {
  const firstLine = firstMeaningfulMermaidLine(content)
  if (!HEADER_RE.test(firstLine ?? "")) throw syntaxError(1, firstLine ?? "", "Class diagram header is required")

  const classes: ClassDefinition[] = []
  const byId = new Map<string, ClassDefinition>()
  const relationships: ClassRelationship[] = []
  let direction: ClassDiagramDirection = "TB"
  let current: ClassDefinition | undefined
  let inAccessibilityDescription = false
  let lastLineNumber = 1
  let lastLineText = firstLine ?? ""

  const ensureClass = (id: string): ClassDefinition => {
    let definition = byId.get(id)
    if (!definition) {
      definition = { id, members: [] }
      byId.set(id, definition)
      classes.push(definition)
    }
    return definition
  }

  for (const source of meaningfulNumberedMermaidLines(content)) {
    lastLineNumber = source.lineNumber
    const line = stripComment(source.text)
    lastLineText = line
    if (inAccessibilityDescription) {
      if (line === "}") inAccessibilityDescription = false
      continue
    }
    if (/^accDescr\s*\{$/i.test(line)) {
      inAccessibilityDescription = true
      continue
    }
    if (!line || ACCESSIBILITY_RE.test(line)) continue

    if (current) {
      if (line === "}") {
        current = undefined
        continue
      }
      const stereotype = line.match(STEREOTYPE_ONLY_RE)
      if (stereotype) {
        setStereotype(current, stereotype[1]!, source.lineNumber, line)
        continue
      }
      current.members.push(parseMember(line))
      continue
    }

    const header = line.match(HEADER_RE)
    if (header) {
      direction = (header[1]?.toUpperCase() as ClassDiagramDirection | undefined) ?? direction
      continue
    }

    const directionMatch = line.match(DIRECTION_RE)
    if (directionMatch) {
      direction = directionMatch[1]!.toUpperCase() as ClassDiagramDirection
      continue
    }

    const annotation = line.match(ANNOTATION_RE)
    if (annotation) {
      const id = normalizeClassName(annotation[2]!)
      if (!id) throw syntaxError(source.lineNumber, line, "Class annotation target is not a valid class name")
      setStereotype(ensureClass(id), annotation[1]!, source.lineNumber, line)
      continue
    }

    const classMatch = line.match(/^class\s+(.+)$/i)
    if (classMatch) {
      let raw = classMatch[1]!.trim()
      let openBody = false
      if (raw.endsWith("{")) {
        openBody = true
        raw = raw.slice(0, -1).trim()
      }
      const id = normalizeClassName(raw)
      if (!id) throw syntaxError(source.lineNumber, line, "Class name is not valid")
      const definition = ensureClass(id)
      if (openBody) current = definition
      continue
    }

    const found = findOperator(line)
    if (found) {
      relationships.push(parseRelationship(line, found.operator, found.index, source.lineNumber, ensureClass))
      continue
    }

    const colon = line.indexOf(":")
    if (colon > 0) {
      const id = normalizeClassName(line.slice(0, colon))
      if (id) {
        const right = line.slice(colon + 1).trim()
        const stereotype = right.match(STEREOTYPE_ONLY_RE)
        if (stereotype) setStereotype(ensureClass(id), stereotype[1]!, source.lineNumber, line)
        else if (right) ensureClass(id).members.push(parseMember(right))
        continue
      }
    }

    throw syntaxError(source.lineNumber, line, unsupportedReason(line))
  }

  if (current) throw syntaxError(lastLineNumber, lastLineText, "Unclosed class body")
  return { direction, classes, relationships }
}

function parseMember(text: string): ClassMember {
  const value = text.trim()
  return { text: value, method: value.includes("(") && value.includes(")") }
}

function setStereotype(definition: ClassDefinition, stereotype: string, lineNumber: number, line: string): void {
  const value = stereotype.trim()
  if (!value) throw syntaxError(lineNumber, line, "Class stereotype cannot be empty")
  definition.stereotype = value
}

function findOperator(line: string): { operator: RelationshipOperator; index: number } | undefined {
  let quote: '"' | "'" | undefined
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"' || char === "'") {
      if (quote === undefined) quote = char
      else if (quote === char) quote = undefined
      continue
    }
    // Cardinalities and quoted class names can contain operator-looking text such
    // as `"0..*"`, so never treat operator tokens inside quotes as the separator.
    if (quote !== undefined) continue
    for (const operator of RELATIONSHIP_OPERATORS) {
      if (line.startsWith(operator.token, index)) return { operator, index }
    }
  }
  return undefined
}

function parseRelationship(
  line: string,
  operator: RelationshipOperator,
  index: number,
  lineNumber: number,
  ensureClass: (id: string) => ClassDefinition,
): ClassRelationship {
  const leftRaw = line.slice(0, index).trim()
  const rightRaw = line.slice(index + operator.token.length).trim()

  let targetPart = rightRaw
  let label: string | undefined
  const colon = rightRaw.indexOf(":")
  if (colon >= 0) {
    targetPart = rightRaw.slice(0, colon).trim()
    label = stripMermaidQuotes(rightRaw.slice(colon + 1).trim()) || undefined
  }

  const from = splitSourceCardinality(leftRaw)
  const to = splitTargetCardinality(targetPart)
  if (!from.name) throw syntaxError(lineNumber, line, "Relationship source is missing")
  if (!to.name) throw syntaxError(lineNumber, line, "Relationship target is missing")
  const fromId = normalizeClassName(from.name)
  const toId = normalizeClassName(to.name)
  if (!fromId) throw syntaxError(lineNumber, line, "Relationship source is not a valid class name")
  if (!toId) throw syntaxError(lineNumber, line, "Relationship target is not a valid class name")
  ensureClass(fromId)
  ensureClass(toId)

  return {
    from: fromId,
    to: toId,
    kind: operator.kind,
    headAt: operator.headAt,
    dashed: operator.dashed,
    ...(label === undefined ? {} : { label }),
    ...(from.cardinality === undefined ? {} : { fromCardinality: from.cardinality }),
    ...(to.cardinality === undefined ? {} : { toCardinality: to.cardinality }),
  }
}

function splitSourceCardinality(value: string): { name: string; cardinality?: string } {
  const match = value.match(/^(.*?)\s*(?:"([^"]*)"|'([^']*)')$/)
  if (match?.[1]?.trim()) return { name: match[1].trim(), cardinality: match[2] ?? match[3] }
  return { name: value }
}

function splitTargetCardinality(value: string): { name: string; cardinality?: string } {
  const match = value.match(/^(?:"([^"]*)"|'([^']*)')\s+(.+)$/)
  if (match) return { name: match[3]!.trim(), cardinality: match[1] ?? match[2] }
  return { name: value }
}

function normalizeClassName(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  if (quoted) {
    const value = trimmed.slice(1, -1).trim()
    return value || undefined
  }
  return CLASS_NAME_RE.test(trimmed) ? trimmed : undefined
}

function stripComment(value: string): string {
  let quote: '"' | "'" | undefined
  for (let index = 0; index < value.length - 1; index += 1) {
    const char = value[index]
    if ((char === '"' || char === "'") && (quote === undefined || quote === char)) {
      quote = quote === char ? undefined : char
      continue
    }
    if (quote === undefined && char === "%" && value[index + 1] === "%") return value.slice(0, index).trim()
  }
  return value.trim()
}

function unsupportedReason(line: string): string {
  const keyword = line.split(/[\s:{]/, 1)[0]?.toLowerCase() ?? ""
  switch (keyword) {
    case "note":
      return "Class diagram notes are not supported"
    case "namespace":
      return "Class diagram namespaces are not supported"
    case "package":
      return "Class diagram packages are not supported"
    case "click":
    case "link":
    case "callback":
      return "Class diagram hyperlinks are not supported"
    case "style":
    case "classdef":
    case "cssclass":
      return "Class diagram styling is not supported"
    default:
      return "Unsupported class diagram syntax"
  }
}

function syntaxError(lineNumber: number, sourceLine: string, reason?: string): MermaidSyntaxError {
  return new MermaidSyntaxError("classDiagram", lineNumber, sourceLine, reason)
}
