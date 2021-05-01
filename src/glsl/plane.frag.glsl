precision highp float;

#pragma glslify: rand = require("./rand.glsl")
#pragma glslify: noise = require("./noise.glsl")
#pragma glslify: grain = require("./grain.glsl")

uniform bool uGradient;
uniform int uFrame;
uniform float uCount;
uniform float uThreshold;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform vec3 uColorOffset;
uniform sampler2D uAudioDataTexture;

varying vec2 vUV;
varying float vAudioData;

float remap(in float value, in float min1, in float max1, in float min2, in float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main() {
  float mixer = remap(vAudioData, uThreshold, 1.0, 0.0, 1.0);
  vec3 color = mix(uColorOffset, uColor, mixer);

  float amount = 0.5;
  vec2 uvRandom = gl_FragCoord.xy / uResolution;
  uvRandom.y *= grain(vec2(uvRandom.y, amount));
  color.rgb += grain(uvRandom) * 0.1;

  if (uGradient) {
    gl_FragColor = vec4(color, vUV.y);
  } else {
    gl_FragColor = vec4(color, 1.0);
  }
}
