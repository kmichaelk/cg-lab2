import { Renderer, RendererInitializer } from '../types'
import { createBuffers, createProgram } from '../utils'
import { transferTomogramColors } from '../common'
import { Base2DRenderer } from '../base2d'

import shaderSourceVertex from './shaders/vertex.glsl'
import shaderSourceFragment from './shaders/fragment.glsl'

export const QuadsRenderer: RendererInitializer = (gl: WebGLRenderingContext): Renderer => {
  const { program, attribs, uniforms } = createProgram(
    gl,
    [
      { type: gl.VERTEX_SHADER, source: shaderSourceVertex },
      { type: gl.FRAGMENT_SHADER, source: shaderSourceFragment }
    ],
    (gl, program) => ({
      vertexPosition: gl.getAttribLocation(program, 'a_position'),
      vertexColor: gl.getAttribLocation(program, 'a_color')
    }),
    (gl, program) => ({})
  )

  const buffers = createBuffers(gl, [
    'vertex',
    'index',
    'color',
  ])

  const drawQuads = ({
    vertices,
    indices,
    colors
  }: {
    vertices: Float32Array
    indices: Uint32Array
    colors: Float32Array
  }) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    gl.vertexAttribPointer(attribs.vertexPosition, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(attribs.vertexPosition)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
    gl.vertexAttribPointer(attribs.vertexColor, 1, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(attribs.vertexColor)

    gl.useProgram(program)

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0)
  }

  return Base2DRenderer({
    render({ tomogram, config, cache }) {
      const { x: sizeX, y: sizeY } = tomogram.size
      const quads = sizeX * sizeY

      const vertices = new Float32Array(quads * 8)
      const indices = new Uint32Array(quads * 6)
      const colors = new Float32Array(quads * 4)

      let idx = 0
      for (let x = 0; x < sizeX - 1; x++) {
        for (let y = 0; y < sizeY - 1; y++) {
          const offset = config.layer! * sizeX * sizeY

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

          colors[4 * idx + 0] = cache[x + y * sizeX + offset]
          colors[4 * idx + 1] = cache[x + (y + 1) * sizeX + offset]
          colors[4 * idx + 2] = cache[x + 1 + (y + 1) * sizeX + offset]
          colors[4 * idx + 3] = cache[x + 1 + y * sizeX + offset]

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
    changeTriggersCacheUpdate: [
      'transferFunctionMax'
    ],
    updateCache({ tomogram, config, cache }) {
      transferTomogramColors(tomogram, cache, 0, config.transferFunctionMax)
    },
    dispose() {
      gl.deleteProgram(program)
      Object.values(buffers).forEach(buf => gl.deleteBuffer(buf))
    }
  })
}