import type { ActivityInput, ActivityRow } from '../types/cpm'

let rowCounter = 0

export function createRow(activity?: ActivityInput): ActivityRow {
  rowCounter += 1

  return {
    id: `activity-row-${rowCounter}`,
    name: activity?.name ?? '',
    predecessorsText: activity?.predecessors.join(', ') ?? '',
    duration: activity ? String(activity.duration) : '',
  }
}

export function rowsFromActivities(activities: ActivityInput[]): ActivityRow[] {
  return activities.map((activity) => createRow(activity))
}

export function parseRows(
  rows: ActivityRow[],
): { activities: ActivityInput[] } | { error: string } {
  if (rows.length === 0) {
    return { error: 'Agrega al menos una actividad.' }
  }

  const activities: ActivityInput[] = []

  for (const [index, row] of rows.entries()) {
    const name = row.name.trim()
    if (!name) {
      return { error: `La fila ${index + 1} no tiene nombre de actividad.` }
    }

    const durationText = row.duration.trim()
    if (!durationText) {
      return { error: `La actividad ${name} no tiene duración.` }
    }

    const duration = Number(durationText)
    if (!Number.isFinite(duration) || duration < 0) {
      return {
        error: `La duración de ${name} debe ser un número mayor o igual a 0.`,
      }
    }

    const predecessors = row.predecessorsText
      .split(',')
      .map((predecessor) => predecessor.trim())
      .filter(Boolean)

    activities.push({ name, predecessors, duration })
  }

  return { activities }
}
