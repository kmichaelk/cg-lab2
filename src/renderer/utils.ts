export const initShader = (gl: WebGLRenderingContext, type: GLenum, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) {
    throw new Error('Failed to create shader')
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(source)
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    throw new Error('Failed to compile shader')
  }

  return shader
}

export const createProgram = <A extends Record<string, number>, U extends Record<string, WebGLUniformLocation>>(
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
    attribs: attribLocationsExtractor(gl, program),
    uniforms: uniformLocationsExtractor(gl, program)
  }
}

export const createBuffers = <K extends string>(gl: WebGLRenderingContext, keys: K[]): Record<K, WebGLBuffer> =>
  keys.reduce((acc, cur) => ((acc[cur] = gl.createBuffer()!), acc), <Record<K, WebGLBuffer>>{})
