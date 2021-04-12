precision highp float;

uniform int uFrame;
uniform float uAverageFrequency;
uniform vec2 uResolution;
uniform vec2 uOffset;
uniform sampler2D uTexture;

varying vec2 vUv;

float MAX_LOG = 5.541263545158426;

void main() {
  vec2 uv = vUv;
  vec3 oldState = texture2D(uTexture, uv).rgb;
  vec3 color = oldState;
  float average = clamp(log(uAverageFrequency) / MAX_LOG, 0.0, MAX_LOG);

  float pixelX = mod(float(uFrame), uResolution.x);
  float pixelY = float(uFrame) / uResolution.x;
  float offsetY = uOffset.y;
  vec2 uvS = vec2(uv.x * uResolution.x, (1.0 - uv.y - offsetY) * uResolution.y);
  float threshold = 0.0;
  if (floor(uvS.x) == floor(pixelX) &&
      floor(uvS.y) == floor(pixelY) &&
      average > threshold) {
    if (uOffset.x == 0.0) {
      color.r += average;
    }
    if (uOffset.x == 1.0) {
      color.g += average;
    }
    if (uOffset.x == 2.0) {
      color.b += average;
    }
  }
  gl_FragColor = vec4(color, 1.0);
}
