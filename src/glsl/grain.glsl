precision highp float;

float grain(vec2 p) {
  vec2 K1 = vec2(
    23.14069263277926, // e^pi (Gelfond's constant)
    2.665144142690225  // 2^sqrt(2) (Gelfond–Schneider constant)
  );
  return fract(cos(dot(p,K1) ) * 12345.6789);
}

#pragma glslify: export(grain)
