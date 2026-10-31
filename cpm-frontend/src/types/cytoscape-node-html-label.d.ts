declare module 'cytoscape-node-html-label' {
  export interface NodeHtmlLabelData {
    id: string
    label: string
    Ei: number
    Lj: number
    critical: boolean
  }

  export interface NodeHtmlLabelOptions {
    query?: string
    halign?: 'left' | 'center' | 'right'
    valign?: 'top' | 'center' | 'bottom'
    halignBox?: 'left' | 'center' | 'right'
    valignBox?: 'top' | 'center' | 'bottom'
    cssClass?: string
    tpl?: (data: NodeHtmlLabelData) => string
  }

  const register: (cy: unknown) => void
  export default register
}
