precision highp float;

#pragma glslify: rand = require("./rand.glsl")
#pragma glslify: noise = require("./noise.glsl")
#pragma glslify: grain = require("./grain.glsl")

uniform int uFrame;
uniform float uCount;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform sampler2D uAudioDataTexture;

varying vec2 vUV;
varying float vAudioData;

void main() {
  vec3 color = uColor;

  float amount = 0.5;
  vec2 uvRandom = gl_FragCoord.xy / uResolution;
  uvRandom.y *= grain(vec2(uvRandom.y, amount));
  color.rgb += grain(uvRandom) * 0.1;

  // gl_FragColor = vec4(color, (1.0 - vUV.y) * vAudioData);
  gl_FragColor = vec4(color, vUV.y);
}
