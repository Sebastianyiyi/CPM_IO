import cytoscape from 'cytoscape'
import nodeHtmlLabel, {
  type NodeHtmlLabelOptions,
} from 'cytoscape-node-html-label'
import { useEffect, useRef } from 'react'
import type {
  Core,
  ElementDefinition,
  StylesheetJsonBlock,
} from 'cytoscape'
import { formatNumber } from '../lib/format'
import type { CpmResponse, GraphNode } from '../types/cpm'

nodeHtmlLabel(cytoscape)

type NodeHtmlLabelCore = Core & {
  nodeHtmlLabel: (options: NodeHtmlLabelOptions[]) => void
}

interface CpmGraphProps {
  data: CpmResponse | null
}

const graphStyles: StylesheetJsonBlock[] = [
  {
    selector: 'node',
    style: {
      width: 54,
      height: 54,
      'background-color': '#ffffff',
      'background-opacity': 1,
      'border-width': 2,
      'border-color': '#cbd5e1',
      label: 'data(label)',
      color: '#0f172a',
      'font-size': 18,
      'font-weight': 700,
      'text-valign': 'center',
      'text-halign': 'center',
      'text-outline-width': 0,
      'overlay-opacity': 0,
      'z-index': 10,
    },
  },
  {
    selector: 'node.critical',
    style: {
      'background-color': '#fff7ed',
      'border-color': '#ea580c',
      'border-width': 3,
      color: '#c2410c',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#64748b',
      'target-arrow-color': '#64748b',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.1,
      'curve-style': 'bezier',
      label: 'data(label)',
      color: '#475569',
      'font-size': 12,
      'font-weight': 600,
      'text-rotation': 'autorotate',
      'text-margin-y': -10,
      'text-background-opacity': 1,
      'text-background-color': '#ffffff',
      'text-background-padding': '3px',
      'text-background-shape': 'roundrectangle',
      'overlay-opacity': 0,
    },
  },
  {
    selector: 'edge.dummy',
    style: {
      'line-style': 'dashed',
      'line-dash-pattern': [6, 4],
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      color: '#64748b',
    },
  },
  {
    selector: 'edge.critical',
    style: {
      width: 3,
      'line-color': '#ea580c',
      'target-arrow-color': '#ea580c',
      color: '#c2410c',
      'text-background-color': '#fff7ed',
    },
  },
]

const nodeLabelOptions: NodeHtmlLabelOptions[] = [
  {
    query: 'node',
    cssClass: 'cpm-node-label',
    halign: 'center',
    valign: 'center',
    halignBox: 'center',
    valignBox: 'center',
    tpl: (node) => `
      <div class="cpm-node-stack">
        <span class="cpm-node-e${node.critical ? ' is-critical' : ''}">E ${formatNumber(node.Ei)}</span>
        <span class="cpm-node-l${node.critical ? ' is-critical' : ''}">L ${formatNumber(node.Lj)}</span>
      </div>
    `,
  },
]

function buildPositions(
  nodes: GraphNode[],
): Record<string, { x: number; y: number }> {
  const groups = new Map<number, GraphNode[]>()

  for (const node of nodes) {
    const group = groups.get(node.level) ?? []
    group.push(node)
    groups.set(node.level, group)
  }

  const positions: Record<string, { x: number; y: number }> = {}
  const horizontalGap = 190
  const verticalGap = 130

  for (const [level, group] of groups) {
    group.sort((left, right) => Number(left.id) - Number(right.id))
    const middle = (group.length - 1) / 2

    group.forEach((node, index) => {
      positions[node.id] = {
        x: level * horizontalGap,
        y: (index - middle) * verticalGap,
      }
    })
  }

  return positions
}

export function CpmGraph({ data }: CpmGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: graphStyles,
      layout: { name: 'preset' },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.2,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: true,
    }) as NodeHtmlLabelCore

    cy.nodeHtmlLabel(nodeLabelOptions)
    cyRef.current = cy

    const resizeObserver = new ResizeObserver(() => {
      cy.resize()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      cy.destroy()
      cyRef.current = null
    }
  }, [])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    cy.batch(() => {
      cy.elements().remove()
    })

    if (!data) {
      return
    }

    const positions = buildPositions(data.nodes)
    const elements: ElementDefinition[] = [
      ...data.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          Ei: node.Ei,
          Lj: node.Lj,
          critical: node.critical,
        },
        classes: node.critical ? 'critical' : '',
      })),
      ...data.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          dummy: edge.dummy,
          critical: edge.critical,
        },
        classes: [edge.dummy ? 'dummy' : '', edge.critical ? 'critical' : '']
          .filter(Boolean)
          .join(' '),
      })),
    ]

    cy.batch(() => {
      cy.add(elements)
    })

    cy.layout({ name: 'preset', positions }).run()
    cy.resize()
    cy.fit(undefined, 80)
  }, [data])

  function handleFit() {
    const cy = cyRef.current
    if (!cy) {
      return
    }

    cy.resize()
    cy.fit(undefined, 80)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Red AOA</h2>
          <p className="mt-1 text-sm text-slate-500">
            Nodos numerados con E arriba y L abajo. Arrastra los nodos o usa la
            rueda para hacer zoom.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 bg-slate-500" />
              Actividad real
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-6 border-t-2 border-dashed border-slate-400" />
              Ficticia
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 bg-orange-500" />
              Crítica
            </span>
          </div>

          <button
            type="button"
            onClick={handleFit}
            disabled={!data}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ajustar vista
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="h-[560px] w-full"
          aria-label="Grafo de la red AOA"
        />
        {!data && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500">
            Resuelve el CPM para visualizar la red AOA.
          </div>
        )}
      </div>
    </section>
  )
}
