#pragma glslify: pillow = require("./pillow.glsl")

uniform vec2 uResolution;

varying vec3 vViewPosition;

void main() {
  float d = vViewPosition.x;
  gl_FragColor = vec4(vec3(0.0), 1.0);
}
