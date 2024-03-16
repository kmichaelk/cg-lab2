attribute vec2 a_position;
attribute float a_color;

varying mediump float v_color;

void main(void) {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_color = a_color;
}
