precision highp float;
precision highp int;

attribute float index;
attribute vec3 scale;
attribute vec3 translation;
attribute vec4 rotation;

uniform int uFrame;
uniform float uCount;
uniform float uSampleCount;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec2 uOffset;
uniform sampler2D uAudioDataTexture;

varying vec2 vUV;
varying float vAudioData;

highp mat4 rotationMatrix(highp vec3 n, highp float theta) {
  // Using Rodrigues' formula, find a matrix which performs a rotation
  // about the axis n by theta radians
  float ct = cos(-theta);
  float st = sin(-theta);

  mat3 rod;
  rod[0][0] = (1.0 - ct) * n.x * n.x + ct;
  rod[1][0] = (1.0 - ct) * n.x * n.y + n.z * st;
  rod[2][0] = (1.0 - ct) * n.x * n.z - n.y * st;

  rod[0][1] = (1.0 - ct) * n.x * n.y - n.z * st;
  rod[1][1] = (1.0 - ct) * n.y * n.y + ct;
  rod[2][1] = (1.0 - ct) * n.y * n.z + n.x * st;

  rod[0][2] = (1.0 - ct) * n.x * n.z + n.y * st;
  rod[1][2] = (1.0 - ct) * n.y * n.z - n.x * st;
  rod[2][2] = (1.0 - ct) * n.z * n.z + ct;
  mat4 rotmatrix = mat4(rod);
  return rotmatrix;
}

void main() {
  vUV = uv;

  vec2 pixSize = 1.0 / uResolution;
  float idx = (index / uCount) * (uSampleCount - 1.0);
  float pixelX = mod(idx, uResolution.x) / uResolution.x;
  float pixelY = 1.0 - (float(int(idx) / int(uResolution.x)) / (uResolution.y - 1.0));
  vec2 uvS = vec2(pixelX, pixelY) ;
  float yOffset = uOffset.y;
  vec3 audioData = texture2D(uAudioDataTexture, uvS + vec2(-1.0 / uResolution.y, yOffset)).rgb;
  if (uOffset.x == 0.0) {
    vAudioData = audioData.r;
  }
  if (uOffset.x == 1.0) {
    vAudioData = audioData.g;
  }
  if (uOffset.x == 2.0) {
    vAudioData = audioData.b;
  }

  vec3 scaling = vec3(0.0);
  scaling = vec3(clamp(pow(vAudioData, 3.0), 0.0, 3.0));

  mat4 offsetMatrix = mat4(1.0, 0.0, 0.0, 0.0,
                           0.0, 1.0, 0.0, 0.0,
                           0.0, 0.0, 1.0, 0.0,
                           0.0, 0.0, 0.0, 1.0);

  mat4 scaleMatrix = mat4(scaling.x, 0.0, 0.0, 0.0,
                          0.0, scaling.y, 0.0, 0.0,
                          0.0, 0.0, scaling.z, 0.0,
                          0.0, 0.0, 0.0, 1.0);

  mat4 translationMatrix = mat4(1.0, 0.0, 0.0, 0.0,
                                0.0, 1.0, 0.0, 0.0,
                                0.0, 0.0, 1.0, 0.0,
                                translation.x, translation.y, translation.z, 1.0);

  float angle = rotation.w;
  vec3 rotationAxis = vec3(rotation.x, rotation.y, rotation.z);
  mat4 rot = rotationMatrix(rotationAxis, angle);

  vec4 translatedPosition = offsetMatrix * translationMatrix * rot * scaleMatrix * vec4(position, 1.0);

  vec4 scaledPosition = modelViewMatrix * translatedPosition;

  gl_Position = projectionMatrix * scaledPosition;
}
