import { formatNumber } from '../lib/format'
import type { CpmResponse } from '../types/cpm'

interface ResultsTableProps {
  data: CpmResponse | null
}

export function ResultsTable({ data }: ResultsTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-950">Resultados</h2>
      </div>

      {!data ? (
        <div className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">
          Resuelve el CPM para generar la tabla de resultados.
        </div>
      ) : (
        <>
          <div className="grid gap-3 border-b border-slate-100 px-4 py-4 sm:grid-cols-3 sm:px-6">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Duración total
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">
                {formatNumber(data.project_duration)}
              </p>
            </div>
            <div className="rounded-xl bg-orange-50 px-4 py-3 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
                Actividades críticas
              </p>
              <p className="mt-1 text-sm font-semibold text-orange-900">
                {data.critical_activities.join(', ') ||
                  'Sin actividades críticas'}
              </p>
              <p className="mt-1 text-xs text-orange-800">
                Ruta crítica: {data.critical_path.join(' → ') || '—'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Actividad</th>
                  <th className="px-4 py-3 font-semibold">Ei</th>
                  <th className="px-4 py-3 font-semibold">Lj</th>
                  <th className="px-4 py-3 font-semibold">Dij</th>
                  <th className="px-4 py-3 font-semibold">H</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((row) => (
                  <tr
                    key={`${row.dummy ? 'dummy' : 'activity'}-${row.activity}`}
                    className={
                      row.critical
                        ? 'bg-orange-50/70'
                        : row.dummy
                          ? 'bg-slate-50/70'
                          : ''
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className={row.dummy ? 'italic text-slate-600' : ''}>
                          {row.activity}
                        </span>
                        {row.dummy && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            Ficticia
                          </span>
                        )}
                        {row.critical && (
                          <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Crítica
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {formatNumber(row.Ei)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {formatNumber(row.Lj)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {formatNumber(row.Dij)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {formatNumber(row.H)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
