import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";

class PatternsTrack extends THREE.Group {
  constructor() {
    super();
  }

  buildGeometry(count = 1) {
    let instanceGeometry;
    const geometries = [];

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3(0, 0, 0);
    const rotationMatrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    for (let i = 0; i < count; i++) {
      // if (randomIndex === 0) {
      // instanceGeometry = new THREE.PlaneBufferGeometry(0.05, 1.0, 1);

      // Triangle
      instanceGeometry = new THREE.CircleBufferGeometry(0.05, 3);
      instanceGeometry.translate(0, 1.0, 0);

      // }
      // if (randomIndex === 1) {
      //   instanceGeometry = new THREE.BoxBufferGeometry(0.05, 0.1, 0.05);
      // }
      // if (randomIndex === 2) {
      //   instanceGeometry = new THREE.SphereGeometry(0.1, 10, 10);
      // }
      const samplePosition = sample(
        this._startSphere.position,
        this._startHandle.position,
        this._endHandle.position,
        this._endSphere.position,
        i / count
      );
      const basis = calculateFrame(
        this._startSphere.position,
        this._startHandle.position,
        this._endHandle.position,
        this._endSphere.position,
        i / count
      );

      // Rotation
      const { tangent, normal, bitangent } = basis;
      rotationMatrix.makeBasis(
        tangent.normalize(),
        normal.normalize(),
        bitangent.normalize()
      );

      const offsetRotationMatrix = new THREE.Matrix4();
      offsetRotationMatrix.makeRotationX(
        Math.sin((i / count) * Math.PI * 20.0) * 0.2
      );
      quaternion.setFromRotationMatrix(offsetRotationMatrix);
      matrix.compose(position, quaternion, scale);
      instanceGeometry.applyMatrix4(matrix);

      // Shader attributes
      instanceGeometry.setAttribute(
        "index",
        new THREE.Float32BufferAttribute(
          new Array(instanceGeometry.getAttribute("position").count)
            .fill(0)
            .map(() => [i, i, i])
            .reduce((a, v) => a.concat(v)),
          3
        ).setUsage(THREE.DynamicDrawUsage)
      );

      const yScale = 1.0;
      instanceGeometry.setAttribute(
        "scale",
        new THREE.Float32BufferAttribute(
          new Array(instanceGeometry.getAttribute("position").count)
            .fill(0)
            .map(() => [yScale, yScale, yScale])
            .reduce((a, v) => a.concat(v)),
          3
        ).setUsage(THREE.DynamicDrawUsage)
      );

      instanceGeometry.setAttribute(
        "translation",
        new THREE.Float32BufferAttribute(
          new Array(instanceGeometry.getAttribute("position").count)
            .fill(0)
            .map(() => [
              samplePosition.x,
              0.05 + samplePosition.y,
              samplePosition.z,
            ])
            .reduce((a, v) => a.concat(v)),
          3
        ).setUsage(THREE.DynamicDrawUsage)
      );

      quaternion.setFromRotationMatrix(rotationMatrix);
      instanceGeometry.setAttribute(
        "rotation",
        new THREE.Float32BufferAttribute(
          new Array(instanceGeometry.getAttribute("position").count)
            .fill(0)
            .map(() => [quaternion.x, quaternion.y, quaternion.z, quaternion.w])
            .reduce((a, v) => a.concat(v)),
          4
        ).setUsage(THREE.DynamicDrawUsage)
      );

      geometries.push(instanceGeometry);
    }
    const patternsGeometry = BufferGeometryUtils.mergeBufferGeometries(
      geometries
    );
    const mesh = new THREE.Mesh(patternsGeometry, this._patternMaterial);
    console.log("GEOMETRY", patternsGeometry);
  }
}

export default PatternsTrack;
