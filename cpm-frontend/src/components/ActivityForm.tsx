import { createRow } from '../lib/activities'
import type { ActivityRow } from '../types/cpm'

interface ActivityFormProps {
  rows: ActivityRow[]
  onRowsChange: (rows: ActivityRow[]) => void
  onSolve: () => void
  onReset: () => void
  isLoading: boolean
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100'

export function ActivityForm({
  rows,
  onRowsChange,
  onSolve,
  onReset,
  isLoading,
}: ActivityFormProps) {
  function updateRow(
    id: string,
    field: keyof Omit<ActivityRow, 'id'>,
    value: string,
  ) {
    onRowsChange(
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    )
  }

  function addRow() {
    onRowsChange([...rows, createRow()])
  }

  function removeRow(id: string) {
    if (rows.length === 1) {
      return
    }

    onRowsChange(rows.filter((row) => row.id !== id))
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Actividades</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa los predecesores separados por comas. Ejemplo: A, B.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          + Agregar actividad
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSolve()
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-16 px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Actividad</th>
                <th className="px-4 py-3 font-semibold">Predecesores</th>
                <th className="w-40 px-4 py-3 font-semibold">Duración</th>
                <th className="w-28 px-4 py-3 text-right font-semibold">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.id} className="align-middle">
                  <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    <input
                      value={row.name}
                      onChange={(event) =>
                        updateRow(row.id, 'name', event.target.value)
                      }
                      className={inputClass}
                      placeholder="A"
                      aria-label={`Nombre de la actividad ${index + 1}`}
                      autoComplete="off"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.predecessorsText}
                      onChange={(event) =>
                        updateRow(row.id, 'predecessorsText', event.target.value)
                      }
                      className={inputClass}
                      placeholder="A, B"
                      aria-label={`Predecesores de la actividad ${index + 1}`}
                      autoComplete="off"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={row.duration}
                      onChange={(event) =>
                        updateRow(row.id, 'duration', event.target.value)
                      }
                      className={inputClass}
                      placeholder="4"
                      aria-label={`Duración de la actividad ${index + 1}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="rounded-lg px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-slate-500">
            La duración debe ser un número mayor o igual a 0.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Resolviendo...' : 'Resolver CPM'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
