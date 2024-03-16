import { Renderer, RendererInitializer } from '../types'
import { createBuffers, createProgram } from '../utils'
import { transferTomogramColors } from '../common'
import { Base2DRenderer } from '../base2d'

import shaderSourceVertex from './shaders/vertex.glsl'
import shaderSourceFragment from './shaders/fragment.glsl'

export const TextureRenderer: RendererInitializer = (gl: WebGLRenderingContext): Renderer => {
  let transferFunctionMin: number
  let transferFunctionWidth: number

  const { program, attribs, uniforms } = createProgram(
    gl,
    [
      { type: gl.VERTEX_SHADER, source: shaderSourceVertex },
      { type: gl.FRAGMENT_SHADER, source: shaderSourceFragment }
    ],
    (gl, program) => ({
      position: gl.getAttribLocation(program, 'a_position'),
      texcoord: gl.getAttribLocation(program, 'a_texcoord'),
    }),
    (gl, program) => ({
      resolution: gl.getUniformLocation(program, 'u_resolution')!,
      texture: gl.getUniformLocation(program, 'u_texture')!
    })
  )

  const buffers = createBuffers(gl, [
    'vertex',
    'texcoord',
  ])

  let textureBuffer: Uint8Array
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
      gl.vertexAttribPointer(attribs.position, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(attribs.position)

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
      ]), gl.STATIC_DRAW)
      gl.vertexAttribPointer(attribs.texcoord, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(attribs.texcoord)

      gl.useProgram(program)

      gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height)
      gl.uniform1i(uniforms.texture, 0)

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    changeTriggersCacheUpdate: [
      'transferFunctionMin',
      'transferFunctionWidth',
      'layer'
    ],
    updateCache({ tomogram, config, cache }) {
      if (transferFunctionMin != config.transferFunctionMin || transferFunctionWidth != config.transferFunctionWidth) {
        transferTomogramColors(tomogram, cache,
          config.transferFunctionMin,
          config.transferFunctionMin + config.transferFunctionWidth)

        transferFunctionMin = config.transferFunctionMin
        transferFunctionWidth = config.transferFunctionWidth
      }

      const size = tomogram.size.x * tomogram.size.y
      const pixels = size * 3
      const bufSize = 3 * pixels
      if (textureBuffer?.length != bufSize) {
        textureBuffer = new Uint8Array(bufSize)
      }
      for (let i = 0, offset = config.layer * size; i < pixels; i += 3, offset++) {
        textureBuffer[i + 0] = cache[offset]
        textureBuffer[i + 1] = cache[offset]
        textureBuffer[i + 2] = cache[offset]
      }
      console.log(textureBuffer.length)
      
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        tomogram.size.x,
        tomogram.size.y,
        0,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        textureBuffer,
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
