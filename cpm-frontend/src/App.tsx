import { useState } from 'react'
import { ActivityForm } from './components/ActivityForm'
import { CpmGraph } from './components/CpmGraph'
import { ResultsTable } from './components/ResultsTable'
import { sampleActivities } from './data/sample'
import { createRow, parseRows, rowsFromActivities } from './lib/activities'
import { solveCpm } from './lib/api'
import type { ActivityRow, CpmResponse } from './types/cpm'

function App() {
  const [rows, setRows] = useState<ActivityRow[]>(() =>
    rowsFromActivities(sampleActivities),
  )
  const [result, setResult] = useState<CpmResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSolve() {
    setError(null)

    const parsed = parseRows(rows)
    if ('error' in parsed) {
      setResult(null)
      setError(parsed.error)
      return
    }

    setIsLoading(true)

    try {
      const response = await solveCpm(parsed.activities)
      setResult(response)
    } catch (requestError) {
      setResult(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo resolver el CPM.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleReset() {
    setRows([createRow()])
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
              Investigación de Operaciones
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Método CPM
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Resolución determinística en red AOA con tiempos tempranos,
              tardíos, holguras y ruta crítica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
              FastAPI
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
              NetworkX
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
              Cytoscape.js
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <ActivityForm
          rows={rows}
          onRowsChange={setRows}
          onSolve={handleSolve}
          onReset={handleReset}
          isLoading={isLoading}
        />

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 font-bold">!</span>
              <p className="whitespace-pre-line">{error}</p>
            </div>
          </div>
        )}

        <CpmGraph data={result} />
        <ResultsTable data={result} />
      </main>
    </div>
  )
}

export default App
