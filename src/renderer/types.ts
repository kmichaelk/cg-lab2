import { Tomogram } from '@/data'

export interface TomogramRenderingContext {
  setRenderer: (initializer: RendererInitializer) => void
  configure: (tomogram: Tomogram, config: RendererConfiguration) => void

  clear: () => void
  render: () => void
  flush: () => void
}

export type RendererInitializer = (gl: WebGL2RenderingContext) => Renderer

export interface Renderer {
  render: () => void
  configure: (tomogram: Tomogram, config: RendererConfiguration) => void
  dispose: () => void
}

export interface RendererConfiguration {
  layer: number

  transferFunctionMin: number
  transferFunctionWidth: number
}

export type RendererConfigurationProperty = keyof RendererConfiguration
