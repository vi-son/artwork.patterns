const remap = (v, a, b, c, d) => {
  const newval = ((v - a) / (b - a)) * (d - c) + c;
  return newval;
};

const calculateFrame = (start, ctrlA, ctrlB, end, t) => {
  // find next sample along curve
  const nextT = t + 0.001;

  // sample the curve in two places
  const current = sample(start, ctrlA, ctrlB, end, t);
  const next = sample(start, ctrlA, ctrlB, end, nextT);

  // compute the TBN matrix
  const T = next.sub(current).normalize();
  const B = T.clone().cross(next.clone().add(current)).normalize();
  const N = B.clone().cross(T).normalize();

  return { normal: N, bitangent: B, tangent: T };
};

const sample = (start, ctrlA, ctrlB, end, t) => {
  return start
    .clone()
    .multiplyScalar(Math.pow(1.0 - t, 3.0))
    .add(ctrlA.clone().multiplyScalar(3.0 * Math.pow(1.0 - t, 2.0) * t))
    .add(ctrlB.clone().multiplyScalar(3.0 * (1.0 - t) * Math.pow(t, 2.0)))
    .add(end.clone().multiplyScalar(Math.pow(t, 3.0)));
};

export { remap, calculateFrame, sample };
