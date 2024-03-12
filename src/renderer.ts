import vertexShaderSource from './shaders/vertex.glsl'
import fragmentShaderSource from './shaders/fragment.glsl'

import { CachedTomogram } from './types'

const initShader = (gl: WebGLRenderingContext, type: GLenum, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) {
    throw new Error('Failed to create shader')
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    throw new Error('Failed to compile shader')
  }

  return shader
}

const createProgram = <A, U>(
  gl: WebGLRenderingContext,
  shaders: {
    type: GLenum
    source: string
  }[],
  attribLocationsExtractor: (gl: WebGLRenderingContext, program: WebGLProgram) => A,
  uniformLocationsExtractor: (gl: WebGLRenderingContext, program: WebGLProgram) => U
) => {
  const program = gl.createProgram()!
  shaders.forEach(({ type, source }) => gl.attachShader(program, initShader(gl, type, source)))
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    throw new Error('Failed to link program')
  }

  return {
    program,
    attribLocations: attribLocationsExtractor(gl, program),
    uniformLocations: uniformLocationsExtractor(gl, program)
  }
}

export const createRenderer = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl') as WebGLRenderingContext

  gl.getExtension('OES_element_index_uint')

  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.enable(gl.DEPTH_TEST)

  const { program, ...programData } = createProgram(
    gl,
    [
      { type: gl.VERTEX_SHADER, source: vertexShaderSource },
      { type: gl.FRAGMENT_SHADER, source: fragmentShaderSource }
    ],
    (gl, program) => ({
      vertexPosition: gl.getAttribLocation(program, 'a_position'),
      vertexColor: gl.getAttribLocation(program, 'a_color')
    }),
    (gl, program) => ({})
  )

  const drawQuads = ({
    vertices,
    indices,
    colors
  }: {
    vertices: Float32Array
    indices: Uint32Array
    colors: Float32Array
  }) => {
    const bufferVertex = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertex)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    gl.vertexAttribPointer(programData.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(programData.attribLocations.vertexPosition)

    const bufferIndex = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndex)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    const bufferColor = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferColor)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
    gl.vertexAttribPointer(programData.attribLocations.vertexColor, 1, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(programData.attribLocations.vertexColor)

    gl.useProgram(program)

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0)
  }

  return {
    clearView() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    },
    drawQuads(tomogram: CachedTomogram, layer: number) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      // drawQuads({
      //   vertices: [
      //     -0.2, 0.2, // Top Left
      //     -0.8, -0.8, // Bottom Left
      //     0.1, -0.1, // Bottom Right
      //     0.5, 0.5, // Top Right
      //   ],
      //   indices: [3, 2, 1, 3, 1, 0]
      // })

      const { x: sizeX, y: sizeY } = tomogram.size
      const quads = sizeX * sizeY

      const vertices = new Float32Array(quads * 8)
      const indices = new Uint32Array(quads * 6)
      const colors = new Float32Array(quads * 4)

      let idx = 0
      for (let x = 0; x < sizeX - 1; x++) {
        for (let y = 0; y < sizeY - 1; y++) {
          const offset = layer * sizeX * sizeY

          vertices[8 * idx + 0] = x
          vertices[8 * idx + 1] = y
          //
          vertices[8 * idx + 2] = x
          vertices[8 * idx + 3] = y + 1
          //
          vertices[8 * idx + 4] = x + 1
          vertices[8 * idx + 5] = y + 1
          //
          vertices[8 * idx + 6] = x + 1
          vertices[8 * idx + 7] = y

          indices[6 * idx + 0] = 4 * idx + 3
          indices[6 * idx + 1] = 4 * idx + 2
          indices[6 * idx + 2] = 4 * idx + 1
          indices[6 * idx + 3] = 4 * idx + 3
          indices[6 * idx + 4] = 4 * idx + 1
          indices[6 * idx + 5] = 4 * idx + 0

          colors[4 * idx + 0] = tomogram.cache[x + y * sizeX + offset]
          colors[4 * idx + 1] = tomogram.cache[x + (y + 1) * sizeX + offset]
          colors[4 * idx + 2] = tomogram.cache[x + 1 + (y + 1) * sizeX + offset]
          colors[4 * idx + 3] = tomogram.cache[x + 1 + y * sizeX + offset]

          idx++
        }
      }

      for (let i = 0; i < vertices.length - 1; i += 2) {
        vertices[i + 0] = (2 * vertices[i + 0]) / sizeX - 1
        vertices[i + 1] = (2 * vertices[i + 1]) / sizeY - 1
      }
      for (let i = 0; i < colors.length; i++) {
        colors[i] /= 255
      }

      drawQuads({ vertices, indices, colors })
    },
    flush() {
      gl.flush()
    }
  }
}
