varying highp float v_color;

void main(void) {
    gl_FragColor = vec4(v_color, v_color, v_color, 1);
}