import { Renderer, TomogramRenderingContext } from './types'

export const createRenderingContext = (canvas: HTMLCanvasElement): TomogramRenderingContext => {
  const gl = canvas.getContext('webgl') as WebGLRenderingContext

  gl.getExtension('OES_element_index_uint')

  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.enable(gl.DEPTH_TEST)

  let renderer!: Renderer

  return {
    setRenderer(initializer) {
      renderer?.dispose()
      renderer = initializer(gl)
    },
    configure(tomogram, config) {
      renderer!.configure(tomogram, config)
    },

    clear() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    },
    render() {
      renderer!.render()
    },
    flush() {
      gl.flush()
    }
  }
}
