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
    audioDataTexture,
    name,
    threshold
  ) {
    super();
    this.setupAudio(audioListener);
    this._colorChannel = colorChannel;
    this._yOffset = yOffset;
    this._color = color;
    this._index = index;
    this._trackName = name;
    this._threshold = threshold;
    this._material = new THREE.ShaderMaterial({
      vertexShader: patternVS,
      fragmentShader: patternFS,
      uniforms: {
        uGradient: { value: false },
        uFrame: { value: 0 },
        uThreshold: { value: this._threshold },
        uColor: { value: this._color },
        uColorOffset: {
          value: this._color.clone().offsetHSL(0.0, -0.25, -0.25),
        },
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
      alhpaToCoverage: true,
      depthWrite: true,
      depthTest: true,
      // blending: THREE.SubtractiveBlending,
    });

    console.group("New Patterns Track");
    console.log("Index", this._index);
    console.log("Color channel", this._colorChannel);
    console.log("Y offset", this._yOffset);
    console.log("Color", this._color);
    console.groupEnd();
  }

  setupAudio(audioListener) {
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

    const COUNT = Math.ceil(audioDuration) * 10;
    const sampleCount = Math.ceil(audioDuration) * 60.0;
    this._material.uniforms.uSampleCount.value = sampleCount;
    this._material.uniforms.uCount.value = COUNT;
    this._material.needsUpdate = true;

    let matrix = new THREE.Matrix4();
    let position = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    let quaternion = new THREE.Quaternion();
    let scale = new THREE.Vector3(1, 1, 1);

    for (let i = 0; i < COUNT; i++) {
      let instanceGeometry;
      switch (this._index) {
        case 0:
          // Planes/Flags
          this._material.uniforms.uGradient.value = true;
          instanceGeometry = new THREE.PlaneBufferGeometry(0.2, 1.25, 1);
          instanceGeometry.translate(
            (Math.random() - 0.5) / 6.0,
            1.25,
            (Math.random() - 0.5) / 6.0
          );
          break;
        case 1:
          // Triangles
          instanceGeometry = new THREE.CircleBufferGeometry(0.1, 3);
          instanceGeometry.rotateX(Math.PI * Math.random());
          instanceGeometry.rotateZ(Math.random() * Math.PI * 2.0);
          instanceGeometry.translate(
            (Math.random() - 0.5) / 6.0,
            0.5,
            (Math.random() - 0.5) / 6.0
          );
          break;
        case 2:
          // Polygon
          instanceGeometry = new THREE.CircleBufferGeometry(0.1, 5);
          instanceGeometry.rotateX(Math.PI * Math.random());
          instanceGeometry.rotateZ(Math.random() * Math.PI * 2.0);
          instanceGeometry.translate(
            (Math.random() - 0.5) / 6.0,
            0.5,
            (Math.random() - 0.5) / 6.0
          );
          break;
        case 3:
          // Circles
          instanceGeometry = new THREE.CircleBufferGeometry(0.1, 32);
          instanceGeometry.rotateX(Math.PI * Math.random());
          instanceGeometry.rotateZ(Math.random() * Math.PI * 2.0);
          instanceGeometry.translate(
            (Math.random() - 0.5) / 6.0,
            0.5,
            (Math.random() - 0.5) / 6.0
          );
          break;
        case 4:
          // Sticks
          this._material.uniforms.uGradient.value = true;
          instanceGeometry = new THREE.PlaneBufferGeometry(0.03, 0.6, 1);
          instanceGeometry.translate(
            (Math.random() - 0.5) / 6.0,
            0.5,
            (Math.random() - 0.5) / 6.0
          );
        default:
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
      const rotationAlongPath = (i / COUNT) * Math.PI * 1.25;
      const extraRotation = Math.sin((i / COUNT) * Math.PI * 20.0) * 0.5;
      offsetRotationMatrix.makeRotationX(
        worldRotation + rotationAlongPath + extraRotation
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
    const patternsGeometry =
      BufferGeometryUtils.mergeBufferGeometries(geometries);
    this._instanceMesh = new THREE.Mesh(patternsGeometry, this._material);
    return this._instanceMesh;
  }

  get index() {
    return this._index;
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

  get trackName() {
    return this._trackName;
  }

  get threshold() {
    return this._threshold;
  }
}

export default PatternsTrack;
