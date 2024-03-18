import { mat4 } from 'gl-matrix'

import { Renderer, RendererInitializer } from '../types'
import { createBuffers, createProgram } from '../utils'
import { transferTomogramColors } from '../common'
import { BaseRenderer } from '../base'

import shaderSourceVertex from './shaders/vertex.glsl'
import shaderSourceFragment from './shaders/fragment.glsl'

export const ThreeDTextureRenderer: RendererInitializer = (gl: WebGL2RenderingContext): Renderer => {
  let transferFunctionMin: number
  let transferFunctionWidth: number

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.enable(gl.BLEND)

  const matrices = {
    projection: mat4.perspectiveFromFieldOfView(mat4.create(), Math.PI / 4, 1, 64),
    model: mat4.lookAt(mat4.create(), [0, 0, 3.5], [0, 0, 0], [0, 1, 0]),
    texProjection: mat4.create()
  }

  let angle = 0

  const { program, attribs, uniforms, shaders } = createProgram(
    gl, {
    shaders: [
      { type: gl.VERTEX_SHADER, source: shaderSourceVertex },
      { type: gl.FRAGMENT_SHADER, source: shaderSourceFragment }
    ],
    attribs: {
      position: 'a_position',
      texcoord: 'a_texcoord'
    },
    uniforms: {
      resolution: 'u_resolution',
      texture: 'u_texture',
      projection: 'u_projection',
      model: 'u_model',
      texProjection: 'u_texProjection'
    }
  })

  // prettier-ignore
  const buffers = createBuffers(gl, [
    'vertex',
    'texcoord',
  ])

  let verticesCount: number
  let vertices: Float32Array
  // [
  //   0, 0, z,   x, 0, z,   0, y, z,
  //   0, y, z,   x, 0, z,   x, y, z,
  // ]
  // [
  //   0,  1,  2,    3,  4,  5,    6,  7,  8,
  //   9, 10, 11,   12, 13, 14,   15, 16, 17,
  // ]

  // prettier-ignore
  let texcoord: Float32Array
  // [
  //   0.0, 0.0, z,   1.0, 0.0, z,   0.0, 1.0, z,
  //   0.0, 1.0, z,   1.0, 0.0, z,   1.0, 1.0, z,
  // ]
  // [
  //   0,  1,  2,    3,  4,  5,    6,  7,  8,
  //   9, 10, 11,   12, 13, 14,   15, 16, 17,
  // ]

  let textureBuffer: Uint8Array
  const texture = gl.createTexture()!

  return BaseRenderer({
    render({ tomogram }) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex)
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
      gl.vertexAttribPointer(attribs.position, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(attribs.position)

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord)
      gl.bufferData(gl.ARRAY_BUFFER, texcoord, gl.STATIC_DRAW)
      gl.vertexAttribPointer(attribs.texcoord, 3, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(attribs.texcoord)

      gl.useProgram(program)

      gl.uniform3f(uniforms.resolution, 1, 1, tomogram.size.z)
      gl.uniformMatrix4fv(uniforms.projection, false, matrices.projection)
      gl.uniformMatrix4fv(uniforms.model, false, matrices.model)

      angle += 0.1;
      mat4.translate(matrices.texProjection, matrices.texProjection, [.5, .5, 0]);
      mat4.rotateY(matrices.texProjection, matrices.texProjection, 0.01)
      mat4.translate(matrices.texProjection, matrices.texProjection, [-.5, -.5, 0])
      gl.uniformMatrix4fv(uniforms.texProjection, false, matrices.texProjection)

      gl.uniform1i(uniforms.texture, 0)

      gl.drawArrays(gl.TRIANGLES, 0, verticesCount)
    },
    // prettier-ignore
    changeTriggersCacheUpdate: [
      'transferFunctionMin',
      'transferFunctionWidth',
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

      const _verticesCount = tomogram.size.z * 6
      if (verticesCount != _verticesCount) {
        verticesCount = _verticesCount

        vertices = new Float32Array(verticesCount * 3)
        for (let i = 0, z = 0.8; i < vertices.length; i += 18, z -= 0.2) {
          vertices[i + 2] = z
  
          vertices[i + 3] = 1
          vertices[i + 5] = z
  
          vertices[i + 7] = 1
          vertices[i + 8] = z
  
          vertices[i + 10] = 1
          vertices[i + 11] = z
  
          vertices[i + 12] = 1
          vertices[i + 14] = z
  
          vertices[i + 15] = 1
          vertices[i + 16] = 1
          vertices[i + 17] = z
        }

        texcoord = new Float32Array(verticesCount * 3)
        for (let i = 0, z = 0.8; i < vertices.length; i += 18, z -= 0.2) {
          texcoord[i + 2] = z
  
          texcoord[i + 3] = 1
          texcoord[i + 5] = z
  
          texcoord[i + 7] = 1
          texcoord[i + 8] = z
  
          texcoord[i + 10] = 1
          texcoord[i + 11] = z
  
          texcoord[i + 12] = 1
          texcoord[i + 14] = z
  
          texcoord[i + 15] = 1
          texcoord[i + 16] = 1
          texcoord[i + 17] = z
        }
      }

      const size = tomogram.size.x * tomogram.size.y * tomogram.size.z
      const bufSize = size * 4
      if (textureBuffer?.length != bufSize) {
        textureBuffer = new Uint8Array(bufSize)
      }
      for (let i = 0, offset = 0; i < bufSize; i += 4, offset++) {
        textureBuffer[i + 0] = cache[offset]
        textureBuffer[i + 1] = cache[offset]
        textureBuffer[i + 2] = cache[offset]
        textureBuffer[i + 3] = cache[offset]
      }

      gl.bindTexture(gl.TEXTURE_3D, texture)
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        gl.RGBA,
        tomogram.size.x,
        tomogram.size.y,
        tomogram.size.z,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        textureBuffer
      )

      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
    },
    dispose() {
      gl.deleteProgram(program)
      gl.deleteTexture(texture)
      shaders.forEach((shader) => gl.deleteShader(shader))
      Object.values(buffers).forEach((buf) => gl.deleteBuffer(buf))
    }
  })
}
