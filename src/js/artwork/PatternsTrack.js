import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
// Local imports
import { remap, sample, calculateFrame } from "../utils/geometry.js";
import patternsLogic from "./logic.patterns.js";
// GLSL imports
import patternVS from "@glsl/plane.vert.glsl";
import patternFS from "@glsl/plane.frag.glsl";

class PatternsTrack extends THREE.Group {
  constructor(
    audioListener,
    colorChannel,
    yOffset,
    color,
    index,
    renderTargetSize,
    audioDataTexture
  ) {
    super();

    this._colorChannel = colorChannel;
    this._yOffset = yOffset;
    this._color = color;
    this._index = index;

    this._material = new THREE.ShaderMaterial({
      vertexShader: patternVS,
      fragmentShader: patternFS,
      uniforms: {
        uFrame: { value: 0 },
        uColor: { value: this._color },
        uOffset: {
          value: new THREE.Vector2(this._colorChannel, this._yOffset),
        },
        uSampleCount: { value: 0 },
        uCount: { value: 0 },
        uProgress: { value: 0.0 },
        uResolution: {
          value: new THREE.Vector2(renderTargetSize.x, renderTargetSize.y),
        },
        uAudioDataTexture: { value: audioDataTexture },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
    });

    console.group("New Patterns Track");
    console.log("Index", this._index);
    console.log("Color channel", this._colorChannel);
    console.log("Y offset", this._yOffset);
    console.log("Color", this._color);
    console.groupEnd();

    this._setupAudio(audioListener);
  }

  _setupAudio(audioListener) {
    this._audio = new THREE.Audio(audioListener);
    this._analyzer = new THREE.AudioAnalyser(this._audio, 32);
  }

  buildInstanceGeometry(
    audioDuration,
    startSphere,
    startHandle,
    endHandle,
    endSphere
  ) {
    const geometries = [];

    const COUNT = Math.ceil(audioDuration);
    const sampleCount = Math.ceil(audioDuration) * 60.0;
    this._material.uniforms.uSampleCount.value = sampleCount;
    this._material.uniforms.uCount.value = COUNT;
    this._material.needsUpdate = true;

    console.log("Count: ", COUNT);
    console.log("sampleCount: ", sampleCount);

    let matrix = new THREE.Matrix4();
    let position = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    let quaternion = new THREE.Quaternion();
    let scale = new THREE.Vector3(1, 1, 1);

    for (let i = 0; i < COUNT; i++) {
      let instanceGeometry;
      switch (this._index) {
        case 0:
          // Planes
          instanceGeometry = new THREE.PlaneBufferGeometry(0.05, 0.5, 1);
          instanceGeometry.translate(0, 0.25 + 0.25, 0);
          break;
        case 1:
          // Triangles
          instanceGeometry = new THREE.CircleBufferGeometry(0.1, 3);
          instanceGeometry.translate(0, 0.25, 0);
          break;
        case 2:
          // Circles
          instanceGeometry = new THREE.CircleBufferGeometry(0.1, 32);
          instanceGeometry.translate(0, 0.25, 0);
          break;
        default:
          instanceGeometry = new THREE.PlaneBufferGeometry(0.05, 0.5, 1);
          instanceGeometry.translate(0, 0.25, 0);
          break;
      }

      // Random offset
      const randomScale = 1.0 + (Math.random() - 0.5) / 2.0;
      instanceGeometry.translate(0, 0.25 * Math.random(), 0);
      instanceGeometry.scale(randomScale, randomScale, randomScale);

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
      const worldRotation =
        this._index * ((Math.PI * 2.0) / patternsLogic.values.trackCount);
      // Math.sin((i / COUNT) * Math.PI * 20.0) * 0.2
      offsetRotationMatrix.makeRotationX(worldRotation);
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
            .map(() => [samplePosition.x, samplePosition.y, samplePosition.z])
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
    this._instanceMesh = new THREE.Mesh(patternsGeometry, this._material);
    return this._instanceMesh;
  }

  get audio() {
    return this._audio;
  }

  get analyzer() {
    return this._analyzer;
  }

  get colorChannel() {
    return this._colorChannel;
  }

  get yOffset() {
    return this._yOffset;
  }

  get color() {
    return this._color;
  }

  get material() {
    return this._material;
  }
}

export default PatternsTrack;
