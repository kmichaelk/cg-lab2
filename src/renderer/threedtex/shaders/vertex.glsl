#version 300 es

in vec3 a_position;
in vec3 a_texcoord;

uniform vec3 u_resolution;

out vec3 v_texcoord;

void main(void) {
    gl_Position = vec4((((a_position / u_resolution) * 2.0) - 1.0), 1.0);
    v_texcoord = a_texcoord;
}
