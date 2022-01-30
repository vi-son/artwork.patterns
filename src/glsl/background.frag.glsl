#pragma glslify: rand = require("./rand.glsl")
#pragma glslify: pillow = require("./pillow.glsl")
#pragma glslify: noise = require("./noise.glsl")
#pragma glslify: grain = require("./grain.glsl")

uniform float uPixelRatio;
uniform vec2 uResolution;

void main() {
  vec2 uv = gl_FragCoord.xy / (uResolution *  vec2(uPixelRatio / 2.0, uPixelRatio / 2.0));
  vec3 color = vec3(0.0);

  vec4 color_a = vec4(229.0 / 255.0, 198.0 / 255.0, 179.0 / 255.0, 1.0);
  vec4 color_b = vec4(239.0 / 255.0, 233.0 / 255.0, 231.0 / 255.0, 1.0);

  // vec4 color_a = vec4(1.0);
  // vec4 color_b = vec4(0.0);

  vec2 gamma = vec2(6.0);

  color = pillow(color_a, color_b, gamma, uv).rgb + rand(uv * 100.0) / 100.0;

  float amount = 0.5;
  vec2 uvRandom = uv;
  uvRandom.y *= grain(vec2(uvRandom.y, amount));
  color.rgb += grain(uvRandom) * 0.05;

  gl_FragColor = vec4(color, 1.0);
}
