attribute vec3 scale;
attribute vec3 translation;
attribute vec4 rotation;

varying vec2 vUV;

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

  mat4 offsetMatrix = mat4(1.0, 0.0, 0.0, 0.0,
                           0.0, 1.0, 0.0, 0.0,
                           0.0, 0.0, 1.0, 0.0,
                           0.0, 0.0, 0.0, 1.0);

  mat4 scaleMatrix = mat4(scale.x, 0.0, 0.0, 0.0,
                          0.0, scale.y, 0.0, 0.0,
                          0.0, 0.0, scale.z, 0.0,
                          0.0, 0.0, 0.0, 1.0);

  mat4 translationMatrix = mat4(1.0, 0.0, 0.0, 0.0,
                                0.0, 1.0, 0.0, 0.0,
                                0.0, 0.0, 1.0, 0.0,
                                translation.x, translation.y, translation.z, 1.0);

  float angle = rotation.w;
  vec3 rotationAxis = vec3(rotation.x, rotation.y, rotation.z);
  mat4 rot = rotationMatrix(rotationAxis, angle);

  vec4 translatedPosition = translationMatrix * rot * scaleMatrix * vec4(position, 1.0);

  vec4 scaledPosition = modelViewMatrix * translatedPosition;

  gl_Position = projectionMatrix * scaledPosition;
}
