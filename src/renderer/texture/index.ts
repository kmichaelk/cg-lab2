import { Renderer, RendererInitializer } from '../types'
import { createBuffers, createProgram } from '../utils'
import { transferTomogramColors } from '../common'
import { Base2DRenderer } from '../base2d'

import shaderSourceVertex from './shaders/vertex.glsl'
import shaderSourceFragment from './shaders/fragment.glsl'

export const TextureRenderer: RendererInitializer = (gl: WebGLRenderingContext): Renderer => {
  let transferFunctionMax: number

  const { program, attribs, uniforms } = createProgram(
    gl,
    [
      { type: gl.VERTEX_SHADER, source: shaderSourceVertex },
      { type: gl.FRAGMENT_SHADER, source: shaderSourceFragment }
    ],
    (gl, program) => ({
      vertexPosition: gl.getAttribLocation(program, 'a_position'),
      vertexTexcoord: gl.getAttribLocation(program, 'a_texcoord'),
    }),
    (gl, program) => ({
      texture: gl.getUniformLocation(program, 'u_texture')!
    })
  )

  const buffers = createBuffers(gl, [
    'vertex',
    'texcoord',
  ])

  const texture = gl.createTexture()!

  return Base2DRenderer({
    render({ tomogram }) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 0,
        tomogram.size.x, 0,
        0, tomogram.size.y,
        0, tomogram.size.y,
        tomogram.size.x, 0,
        tomogram.size.x, tomogram.size.y,
      ]), gl.STATIC_DRAW)
      gl.vertexAttribPointer(attribs.vertexPosition, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(attribs.vertexPosition)

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
      ]), gl.STATIC_DRAW)
      gl.vertexAttribPointer(attribs.vertexTexcoord, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(attribs.vertexTexcoord)

      gl.useProgram(program)

      gl.uniform1i(uniforms.texture, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    changeTriggersCacheUpdate: [
      'transferFunctionMax',
      'layer'
    ],
    updateCache({ tomogram, config, cache }) {
      if (transferFunctionMax != config.transferFunctionMax) {
        transferTomogramColors(tomogram, cache, 0, config.transferFunctionMax)
        transferFunctionMax = config.transferFunctionMax
      }

      gl.bindTexture(gl.TEXTURE_2D, texture)
      //
      const size = tomogram.size.x * tomogram.size.y
      const texBuffer = new Uint8Array(3 * size)
      for (let i = 0, offset = config.layer * size; i < size; i += 4, offset++) {
        texBuffer[i + 0] = cache[offset]
        texBuffer[i + 1] = cache[offset]
        texBuffer[i + 2] = cache[offset]
      }
      //
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        1,
        1,
        0,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        texBuffer,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    },
    dispose() {
      gl.deleteProgram(program)
      gl.deleteTexture(texture)
      Object.values(buffers).forEach(buf => gl.deleteBuffer(buf))
    }
  })
}
