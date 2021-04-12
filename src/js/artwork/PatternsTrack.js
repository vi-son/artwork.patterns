import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
// Local imports
import { remap, sample, calculateFrame } from "../utils/geometry.js";

class PatternsTrack extends THREE.Group {
  constructor(audioListener, colorChannel, yOffset) {
    super();

    this._colorChannel = colorChannel;
    this._yOffset = yOffset;

    this._setupAudio(audioListener);
  }

  _setupAudio(audioListener) {
    this._audio = new THREE.Audio(audioListener);
    this._analyzer = new THREE.AudioAnalyser(this._audio, 32);
  }

  buildInstanceGeometry(
    color,
    COUNT,
    material,
    startSphere,
    startHandle,
    endHandle,
    endSphere
  ) {
    const geometries = [];

    let matrix = new THREE.Matrix4();
    let position = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    let quaternion = new THREE.Quaternion();
    let scale = new THREE.Vector3(1, 1, 1);

    let instanceGeometry;
    const randomIndex = parseInt(Math.random() * 3);
    for (let i = 0; i < COUNT; i++) {
      // Planes
      instanceGeometry = new THREE.PlaneBufferGeometry(0.05, 0.5, 1);
      instanceGeometry.translate(0, 0.75, 0);
      // Triangle
      // instanceGeometry = new THREE.CircleBufferGeometry(0.05, 3);
      // instanceGeometry.translate(0, 0.0, 0);
      // }
      // if (randomIndex === 1) {
      //   instanceGeometry = new THREE.BoxBufferGeometry(0.05, 0.1, 0.05);
      // }
      // if (randomIndex === 2) {
      //   instanceGeometry = new THREE.SphereGeometry(0.1, 10, 10);
      // }
      const samplePosition = sample(
        startSphere.position,
        startHandle.position,
        endHandle.position,
        endSphere.position,
        i / COUNT
      );
      const basis = calculateFrame(
        startSphere.position,
        startHandle.position,
        endHandle.position,
        endSphere.position,
        i / COUNT
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
        Math.sin((i / COUNT) * Math.PI * 20.0) * 0.2
      );
      quaternion.setFromRotationMatrix(offsetRotationMatrix);
      matrix.compose(position, quaternion, scale);
      instanceGeometry.applyMatrix4(matrix);

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
      geometries.push(instanceGeometry);
    }
    const patternsGeometry = BufferGeometryUtils.mergeBufferGeometries(
      geometries
    );
    const instanceMesh = new THREE.Mesh(patternsGeometry, material);
    return instanceMesh;
  }

  get audio() {
    return this._audio;
  }

  get analyzer() {
    return this._analyzer;
  }
}

export default PatternsTrack;
