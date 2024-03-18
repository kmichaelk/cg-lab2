#version 300 es

precision mediump float;
precision mediump sampler3D;

in vec3 v_texcoord;
out vec4 fragColor;

uniform sampler3D u_texture;

void main() {
    fragColor = texture(u_texture, v_texcoord);
}
