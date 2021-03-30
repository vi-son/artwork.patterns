uniform vec3 uColor;

varying vec2 vUV;

void main() {
  gl_FragColor = vec4(uColor, 1.0 - vUV.y);
  // gl_FragColor = vec4(uColor, 1.0);
}
