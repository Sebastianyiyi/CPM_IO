export interface ActivityInput {
  name: string
  predecessors: string[]
  duration: number
}

export interface ActivityRow {
  id: string
  name: string
  predecessorsText: string
  duration: string
}

export interface ActivityResult {
  activity: string
  Ei: number
  Lj: number
  Dij: number
  H: number
  critical: boolean
  dummy: boolean
}

export interface GraphNode {
  id: string
  label: string
  Ei: number
  Lj: number
  critical: boolean
  level: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
  activity: string | null
  duration: number
  dummy: boolean
  critical: boolean
  Ei: number
  Lj: number
  Dij: number
  H: number
}

export interface CpmResponse {
  project_duration: number
  critical_activities: string[]
  critical_path: string[]
  results: ActivityResult[]
  nodes: GraphNode[]
  edges: GraphEdge[]
}
