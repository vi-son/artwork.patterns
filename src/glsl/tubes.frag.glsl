#pragma glslify: rand = require("./rand.glsl")
#pragma glslify: pillow = require("./pillow.glsl")
#pragma glslify: noise = require("./noise.glsl")
#pragma glslify: grain = require("./grain.glsl")

uniform vec2 uResolution;

varying vec3 vViewPosition;

void main() {
  float d = vViewPosition.x;
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 color = vec3(0.0235, 0.0235, 0.035294118);

  vec3 grainColor = vec3(0.596078431, 0.588235294, 0.670588235);

  float amount = 0.5;
  vec2 uvRandom = uv;
  uvRandom.y *= grain(vec2(uvRandom.y, amount));
  color.rgb += grain(uvRandom) * 0.2 * grainColor;

  gl_FragColor = vec4(color, 1.0);
}
