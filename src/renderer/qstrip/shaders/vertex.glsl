attribute vec2 a_position;
attribute float a_color;

uniform vec2 u_resolution;

varying mediump float v_color;

void main(void) {
    gl_Position = vec4((((a_position / u_resolution) * 2.0) - 1.0), 0.0, 1.0);
    v_color = a_color;
}
