import type { ActivityInput } from '../types/cpm'

export const sampleActivities: ActivityInput[] = [
  { name: 'A', predecessors: [], duration: 2 },
  { name: 'B', predecessors: [], duration: 3 },
  { name: 'C', predecessors: ['A'], duration: 4 },
  { name: 'D', predecessors: ['B'], duration: 2 },
  { name: 'E', predecessors: ['C', 'D'], duration: 3 },
]
