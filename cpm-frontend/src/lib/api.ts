import type { ActivityInput, CpmResponse } from '../types/cpm'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function formatValidationDetail(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          const record = item as Record<string, unknown>
          const location = Array.isArray(record.loc)
            ? record.loc
                .filter((part: unknown) => part !== 'body')
                .map(String)
                .join(' → ')
            : ''
          const message = String(record.msg)

          return location ? `${location}: ${message}` : message
        }

        return String(item)
      })
      .join('\n')
  }

  return 'No se pudo procesar la solicitud.'
}

export async function solveCpm(
  activities: ActivityInput[],
): Promise<CpmResponse> {
  let response: Response

  try {
    response = await fetch(`${API_URL}/api/cpm/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities }),
    })
  } catch {
    throw new ApiError(
      `No se pudo conectar con el backend. Verifica que esté corriendo en ${API_URL}.`,
    )
  }

  if (!response.ok) {
    let message = `Error ${response.status} al resolver el CPM.`

    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && 'detail' in body) {
        message = formatValidationDetail((body as { detail: unknown }).detail)
      }
    } catch {
      message = `Error ${response.status} al resolver el CPM.`
    }

    throw new ApiError(message)
  }

  return (await response.json()) as CpmResponse
}
