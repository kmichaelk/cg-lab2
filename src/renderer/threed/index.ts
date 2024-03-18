import { Renderer, RendererInitializer } from '../types'
import { createBuffers, createProgram } from '../utils'
import { transferTomogramColors } from '../common'
import { BaseRenderer } from '../base'

import shaderSourceVertex from './shaders/vertex.glsl'
import shaderSourceFragment from './shaders/fragment.glsl'

export const ThreeDRenderer: RendererInitializer = (gl: WebGLRenderingContext): Renderer => {
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
      texcoord: gl.getAttribLocation(program, 'a_texcoord')
    }),
    (gl, program) => ({
      resolution: gl.getUniformLocation(program, 'u_resolution')!,
      texture: gl.getUniformLocation(program, 'u_texture')!
    })
  )

  // prettier-ignore
  const buffers = createBuffers(gl, [
    'vertex',
    'texcoord',
  ])

  const verticesCount = 32 * 6 //78 * 6
  const vertices = new Float32Array(verticesCount * 3)
  // [
  //   0, 0, z,   x, 0, z,   0, y, z,
  //   0, y, z,   x, 0, z,   x, y, z,
  // ]
  // [
  //   0,  1,  2,    3,  4,  5,    6,  7,  8,
  //   9, 10, 11,   12, 13, 14,   15, 16, 17,
  // ]

  // prettier-ignore
  const texcoord = new Float32Array(verticesCount * 2)
  // [
  //   0.0, 0.0,   1.0, 0.0,   0.0, 1.0,
  //   0.0, 1.0,   1.0, 0.0,   1.0, 1.0,
  // ]
  // [
  //   0, 1,   2, 3,    4,  5,
  //   6, 7,   8, 9,   10, 11,
  // ]

  let textureBuffer: Uint8Array
  const texture = gl.createTexture()!

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.BLEND)
  
  return BaseRenderer({
    render({ tomogram }) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex)
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
      gl.vertexAttribPointer(attribs.position, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(attribs.position)

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord)
      gl.bufferData(gl.ARRAY_BUFFER, texcoord, gl.STATIC_DRAW)
      // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      //   0.0, 0.0,   1.0, 0.0,   0.0, 1.0,
      //   0.0, 1.0,   1.0, 0.0,   1.0, 1.0,
      // ]), gl.STATIC_DRAW)
      // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      //   0.0, 0.0,   0.25, 0.0,   0.0, 1.0,
      //   0.0, 1.0,   0.25, 0.0,   0.25, 1.0,

      //   0.25, 0.0,   0.5, 0.0,   0.25, 1.0,
      //   0.25, 1.0,   0.5, 0.0,   0.5, 1.0,

      //   0.5, 0.0,   1.0, 0.0,   0.5, 1.0,
      //   0.5, 1.0,   1.0, 0.0,   1.0, 1.0,

      //   0.5, 0.0,   1.0, 0.0,   0.5, 1.0,
      //   0.5, 1.0,   1.0, 0.0,   1.0, 1.0,
      // ]), gl.STATIC_DRAW)
      gl.vertexAttribPointer(attribs.texcoord, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(attribs.texcoord)

      gl.useProgram(program)

      gl.uniform3f(uniforms.resolution, 1, 1, 1)
      gl.uniform1i(uniforms.texture, 0)

      gl.drawArrays(gl.TRIANGLES, 0, verticesCount)
    },
    // prettier-ignore
    changeTriggersCacheUpdate: [
      'transferFunctionMin',
      'transferFunctionWidth'
    ],
    updateCache({ tomogram, config, cache }) {
      if (transferFunctionMin != config.transferFunctionMin || transferFunctionWidth != config.transferFunctionWidth) {
        transferTomogramColors(
          tomogram,
          cache,
          config.transferFunctionMin,
          config.transferFunctionMin + config.transferFunctionWidth
        )

        transferFunctionMin = config.transferFunctionMin
        transferFunctionWidth = config.transferFunctionWidth
      }

      //vertices[3] = tomogram.size.x
      //vertices[7] = tomogram.size.y
      //vertices[10] = tomogram.size.y
      //vertices[12] = tomogram.size.x
      //vertices[15] = tomogram.size.x
      //vertices[16] = tomogram.size.y

      let _test_ = 1//0.25
      for (let i = 0, z = 0.9; i < vertices.length; i += 18, z -= 0.2) {
        vertices[i + 2] = z
        vertices[i + 3] = _test_
        vertices[i + 5] = z
        vertices[i + 7] = _test_
        vertices[i + 8] = z
        vertices[i + 10] = _test_
        vertices[i + 11] = z
        vertices[i + 12] = _test_
        vertices[i + 14] = z
        vertices[i + 15] = _test_
        vertices[i + 16] = _test_
        vertices[i + 17] = z

        //_test_ += 0.25
      }

      const layers = 32
      
      const size = tomogram.size.x * tomogram.size.y * layers//tomogram.size.z
      const bufSize = size * 4
      if (textureBuffer?.length != bufSize) {
        textureBuffer = new Uint8Array(bufSize)
      }
      for (let i = 0, offset = tomogram.size.x * tomogram.size.y * (78 - 32); i < bufSize; i += 4, offset++) {
        textureBuffer[i + 0] = cache[offset]
        textureBuffer[i + 1] = cache[offset]
        textureBuffer[i + 2] = cache[offset]
        textureBuffer[i + 3] = 128//clamp(cache[offset], 0, 255)
      }
      
      
      // const atlasSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), tomogram.size.x * tomogram.size.z)
      const atlasSize = tomogram.size.x

      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        atlasSize,
        tomogram.size.y * layers,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        textureBuffer
      )
      //gl.texImage2D(
      //  gl.TEXTURE_2D,
      //  0,
      //  gl.RGBA,
      //  gl.RGBA,
      //  gl.UNSIGNED_BYTE,
      //  img
      //);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      const atlasUnit = 1 / layers // tomogram.size.y / 4
      for (let i = 0, atlasPtr = 0; i < texcoord.length; i += 12, atlasPtr += atlasUnit) {
        
        texcoord[i + 1]  = atlasPtr
        texcoord[i + 0]  = 0
        //
        texcoord[i + 3]  = atlasPtr + atlasUnit
        texcoord[i + 2]  = 0
        //
        texcoord[i + 5]  = atlasPtr
        texcoord[i + 4]  = 1
        //
        texcoord[i + 7]  = atlasPtr
        texcoord[i + 6]  = 1
        //
        texcoord[i + 9]  = atlasPtr + atlasUnit
        texcoord[i + 8]  = 0
        //
        texcoord[i + 11] = atlasPtr + atlasUnit
        texcoord[i + 10] = 1
      }

      //console.log('texcoord', texcoord)
      //console.log('vertices', vertices)
    },
    dispose() {
      gl.deleteProgram(program)
      gl.deleteTexture(texture)
      Object.values(buffers).forEach((buf) => gl.deleteBuffer(buf))
    }
  })
}
