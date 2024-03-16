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
      position: gl.getAttribLocation(program, 'a_position'),
      color: gl.getAttribLocation(program, 'a_color')
    }),
    (gl, program) => ({
      resolution: gl.getUniformLocation(program, 'u_resolution')!
    })
  )

  // prettier-ignore
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
    colors: Uint8Array
  }) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    gl.vertexAttribPointer(attribs.position, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(attribs.position)

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
    gl.vertexAttribPointer(attribs.color, 1, gl.UNSIGNED_BYTE, true, 0, 0)
    gl.enableVertexAttribArray(attribs.color)

    gl.useProgram(program)

    gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height)

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0)
  }

  let quads: number
  let vertices: Float32Array
  let indices: Uint32Array
  let colors: Uint8Array

  return Base2DRenderer({
    render({ tomogram, config, cache }) {
      const { x: sizeX, y: sizeY } = tomogram.size

      let idx = 0
      for (let x = 0; x < sizeX; x++) {
        const bOffset = config.layer! * sizeX
        for (let y = 0; y < sizeY; y++) {
          const offset = bOffset * sizeY

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
          colors[4 * idx + 2] = cache[(x + 1) + (y + 1) * sizeX + offset]
          colors[4 * idx + 3] = cache[(x + 1) + y * sizeX + offset]

          idx++
        }
      }

      drawQuads({ vertices, indices, colors })
    },
    // prettier-ignore
    changeTriggersCacheUpdate: [
      'transferFunctionMin',
      'transferFunctionWidth',
    ],
    updateCache({ tomogram, config, cache }) {
      transferTomogramColors(
        tomogram,
        cache,
        config.transferFunctionMin,
        config.transferFunctionMin + config.transferFunctionWidth
      )

      const _quads = tomogram.size.x * tomogram.size.y
      if (quads != _quads) {
        quads = _quads
        vertices = new Float32Array(quads * 8)
        indices = new Uint32Array(quads * 6)
        colors = new Uint8Array(quads * 4)
      }
    },
    dispose() {
      gl.deleteProgram(program)
      Object.values(buffers).forEach((buf) => gl.deleteBuffer(buf))
    }
  })
}
