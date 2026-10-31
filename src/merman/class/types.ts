export type ClassDiagramDirection = "TB" | "BT" | "LR" | "RL"

export type ClassRelationshipKind =
  | "inheritance"
  | "composition"
  | "aggregation"
  | "association"
  | "dependency"
  | "realization"
  | "link"

export interface ClassMember {
  /** Display text exactly as written, e.g. `+String name` or `+getAge()`. */
  text: string
  /** Members written with a call shape are methods. */
  method: boolean
}

export interface ClassDefinition {
  id: string
  /** Display label from `class Id["Readable label"]`. */
  label?: string
  /** Annotation written between `<<` and `>>`, e.g. `interface`. */
  stereotype?: string
  /** Notes attached with `note for Id "..."`. */
  notes?: string[]
  members: ClassMember[]
}

export interface ClassRelationship {
  from: string
  to: string
  kind: ClassRelationshipKind
  /** Which endpoint carries the triangle/diamond/arrowhead marker. */
  headAt: "from" | "to" | "none"
  /** Dependency and realization edges draw as dashed lines. */
  dashed: boolean
  label?: string
  fromCardinality?: string
  toCardinality?: string
}

export interface ClassDiagram {
  direction: ClassDiagramDirection
  classes: ClassDefinition[]
  relationships: ClassRelationship[]
}

export interface ClassDiagramRenderOptions {
  /** Fold horizontally over this many columns. Defaults to 120. */
  layoutMaxWidth?: number
}

export type ClassCellStyle = "border" | "title" | "stereotype" | "member" | "edge" | "label"
