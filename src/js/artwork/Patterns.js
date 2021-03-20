import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import TWEEN from "@tweenjs/tween.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import * as dat from "dat.gui";
// Local imports
import createLineGeometry from "./createLineGeometry.js";
import PatternGroup from "./PatternGroup.js";
// GLSL imports
import backgroundVS from "@glsl/background.vert.glsl";
import backgroundFS from "@glsl/background.frag.glsl";
import tubeVS from "@glsl/tubes.vert.glsl";
import tubeFS from "@glsl/tubes.frag.glsl";

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

class Patterns {
  constructor(canvas, canvasWrapper) {
    this._canvas = canvas;
    this._canvasWrapper = canvasWrapper;
    this._size = this._canvasWrapper.getBoundingClientRect();
    console.log("Size: ", this._size);
    this._clock = new THREE.Clock();
    this._$t = this._clock.getElapsedTime();
    this._$f = 0;

    this._freqIndex = 3;
    this._threshholds = [10, 10, 10, 10, 10];

    this._colors = [
      new THREE.Color(0x2b13ff),
      new THREE.Color(0xd70c5c),
      new THREE.Color(0xff961e),
      new THREE.Color(0x0de2be),
      new THREE.Color(0x6019ea),
    ];
    this._angles = [0, 72, 144, 216, 288];

    if (process.env.NODE_ENV === "development") {
      // Stats
      this._stats = new Stats();
      document.body.appendChild(this._stats.dom);
      // Gui
      this._gui = new dat.GUI();
    }

    this._allLoaded = false;

    this._init();
    this._initBackground();
    this._initGeometry();
    this._initRaycasting();
    this._loadSounds();
  }

  _init() {
    // Scene
    this._scene = new THREE.Scene();
    // Renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: 1,
      alpha: true,
    });
    this._renderer.setSize(this._size.width, this._size.height);
    this._renderer.autoClear = false;
    this._renderer.setAnimationLoop(this._renderLoop.bind(this));
    // Camera
    this._camera = new THREE.PerspectiveCamera(
      60,
      this._size.width / this._size.height,
      0.1,
      100
    );
    this._camera.position.set(0, 3, -2);
    // Controls
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.target.set(0, 0.5, 0);
    this._controls.update();
    this._controls.enableZoom = true;
    this._controls.dampingFactor = 0.9;
    // Event listener
    this._pointerMoveListener = this._canvas.addEventListener(
      "pointermove",
      this.handlePointerMove.bind(this),
      false
    );
    this._pointerDownListener = this._canvas.addEventListener(
      "pointerdown",
      this.handlePointerDown.bind(this),
      false
    );
    const pointerUpListener = this._canvas.addEventListener(
      "pointerup",
      this.handlePointerUp.bind(this),
      false
    );
    const windowResizeListener = window.addEventListener(
      "resize",
      this.handleResize.bind(this),
      false
    );
  }

  _initBackground() {
    // Background
    this._backgroundCamera = new THREE.OrthographicCamera(
      -2 / this._size.width,
      +2 / this._size.width,
      +2 / this._size.width,
      -2 / this._size.width,
      -1,
      100
    );
    this._backgroundScene = new THREE.Scene();
    const backgroundMaterial = new THREE.ShaderMaterial({
      vertexShader: backgroundVS,
      fragmentShader: backgroundFS,
      uniforms: {
        uResolution: {
          value: new THREE.Vector2(this._size.width, this._size.height),
        },
      },
      depthWrite: false,
    });
    var planeGeometry = new THREE.PlaneGeometry(2, 2);
    var backgroundPlane = new THREE.Mesh(planeGeometry, backgroundMaterial);
    this._backgroundScene.add(backgroundPlane);
  }

  _initGeometry() {
    // Start- & end point
    this._startPoint = new THREE.Vector3(-1, 0, 0);
    this._endPoint = new THREE.Vector3(+1, 0, 0);

    // Play head
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this._playhead = new THREE.Mesh(boxGeometry, boxMaterial);
    const playheadSize = 0.05;
    this._playhead.scale.set(playheadSize, playheadSize, playheadSize);
    this._scene.add(this._playhead);

    // Geometry
    this._handlesGroup = new THREE.Group();
    const geometry = new THREE.SphereGeometry(0.02, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const handleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const startSphere = new THREE.Mesh(geometry, material);
    startSphere.position.copy(this._startPoint);
    const endSphere = new THREE.Mesh(geometry, material);
    endSphere.position.copy(this._endPoint);
    this._scene.add(startSphere);
    this._scene.add(endSphere);

    const handleGeometry = new THREE.BoxGeometry(0.025, 0.025, 0.025);
    this._startHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    const startHandlePosition = this._startPoint.clone().divideScalar(2.0);
    startHandlePosition.y = 1.0;
    startHandlePosition.z = 0.75;
    this._startHandle.position.copy(startHandlePosition);
    this._handlesGroup.add(this._startHandle);

    this._endHandle = new THREE.Mesh(handleGeometry, handleMaterial.clone());
    const endHandlePosition = this._endPoint.clone().divideScalar(2.0);
    endHandlePosition.y = 1.0;
    endHandlePosition.z = -0.5;
    this._endHandle.position.copy(endHandlePosition);
    this._handlesGroup.add(this._endHandle);

    const dragControls = new DragControls(
      [this._startHandle, this._endHandle],
      this._camera,
      this._renderer.domElement
    );
    dragControls.addEventListener("drag", () => {});
    this._dragGroup = new THREE.Group();
    this._scene.add(this._handlesGroup);
    var handleLinesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    var points = [];
    points.push(this._startPoint);
    points.push(startHandlePosition);
    var startHandleLinesGeometry = new THREE.BufferGeometry().setFromPoints(
      points
    );
    this._startHandleLine = new THREE.Line(
      startHandleLinesGeometry,
      handleLinesMaterial
    );
    this._scene.add(this._startHandleLine);
    points = [];
    points.push(this._endPoint);
    points.push(endHandlePosition);
    var endHandleLinesGeometry = new THREE.BufferGeometry().setFromPoints(
      points
    );
    this._endHandleLine = new THREE.Line(
      endHandleLinesGeometry,
      handleLinesMaterial
    );
    this._scene.add(this._endHandleLine);

    // Pattern groups
    const patternGroups = this._angles.map((a, i) => {
      return new PatternGroup({
        angle: a,
        color: this._colors[i],
      });
    });

    // Tube/Bezier spline
    const numSides = 8;
    const subdivisions = 50;
    const tubeMaterial = new THREE.RawShaderMaterial({
      vertexShader: tubeVS,
      fragmentShader: tubeFS,
      side: THREE.FrontSide,
      extensions: {
        deriviatives: true,
      },
      defines: {
        lengthSegments: subdivisions.toFixed(1),
        FLAT_SHADED: false,
      },
      uniforms: {
        uResolution: {
          type: "vec2",
          value: new THREE.Vector2(this._size.width, this._size.height),
        },
        uThickness: { type: "f", value: 0.005 },
        uTime: { type: "f", value: 2.5 },
        uRadialSegments: { type: "f", value: numSides },
        uPoints: {
          type: "a",
          value: [
            this._startPoint,
            startHandlePosition,
            endHandlePosition,
            this._endPoint,
          ],
        },
      },
    });
    const tubeGeometry = createLineGeometry(numSides, subdivisions);
    this._instTubeMaterial = tubeMaterial.clone();
    const straightLineTubeMaterial = tubeMaterial.clone();
    const tubeMesh = new THREE.Mesh(tubeGeometry, this._instTubeMaterial);
    tubeMesh.frustumCulled = false;
    this._scene.add(tubeMesh);

    // Arrow Helper
    const dir = new THREE.Vector3(0, 1, 0);
    // normalize the direction vector (convert to vector of length 1)
    dir.normalize();
    const origin = new THREE.Vector3(0, 0, 0);
    const length = 0.2;
    const hexN = 0xff0000;
    const hexT = 0x00ff00;
    const hexBT = 0x0000ff;
    // Arrow Helper
    this._arrowHelperNormal = new THREE.ArrowHelper(dir, origin, length, hexN);
    this._scene.add(this._arrowHelperNormal);
    this._arrowHelperTangent = new THREE.ArrowHelper(dir, origin, length, hexT);
    this._scene.add(this._arrowHelperTangent);
    this._arrowHelperBitangent = new THREE.ArrowHelper(
      dir,
      origin,
      length,
      hexBT
    );
    this._scene.add(this._arrowHelperBitangent);
  }

  _initRaycasting() {
    // Raycasting
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._selectedHandle = null;
    this._mouseDown = false;
  }

  _loadSounds() {
    // Audio
    this._audioTracks = process.env.TRACKS;
    console.log("Audio Tracks", this._audioTracks);

    this._loadingManager = new THREE.LoadingManager();

    this._audioListener = new THREE.AudioListener();
    this._camera.add(this._audioListener);

    // create a global audio source
    // load a sound and set it as the Audio object's buffer
    var audioLoader = new THREE.AudioLoader(this._loadingManager);
    let audioDuration = 0;
    this._audioPlayProgress = 0;

    // Audio analyze
    // Audio debug helper
    this._audioFreqHelperArray = new Array(this._audioTracks.length)
      .fill(0)
      .map((_) => new Array(32).fill(undefined));
    this._audioFreqHelperMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    });

    this._sounds = new Array(this._audioTracks.length)
      .fill(undefined)
      .map(() => new THREE.Audio(this._audioListener));
    this._audioTracks.map((track, i) => {
      audioLoader.load(
        `/assets/audio/patterns.frequencies/${track}`,
        (buffer) => {
          audioDuration = buffer.duration;
          this._sounds[i].setBuffer(buffer);
          this._sounds[i].setLoop(false);
          this._sounds[i].setVolume(1.0);
          this._sounds[i].play();
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        }
      );
    });
    // After loading all sounds
    this._analysers = new Array(this._audioTracks.length).fill(undefined);
    this._loadingManager.onLoad = () => {
      this._sounds.forEach((s, i) => {
        const analyzer = new THREE.AudioAnalyser(s, 32);
        this._analysers[i] = analyzer;
        this._freqData = this._analysers[i].getFrequencyData();
        // Frequency helper
        this._freqData.map((f, j) => {
          const geometry = new THREE.PlaneBufferGeometry(0.1, 1, 1);
          let freqHelperQuad;
          if (j === this._freqIndex) {
            const material = this._audioFreqHelperMaterial.clone();
            material.color.set(0xff0000);
            freqHelperQuad = new THREE.Mesh(geometry, material);
          } else {
            freqHelperQuad = new THREE.Mesh(
              geometry,
              this._audioFreqHelperMaterial
            );
          }
          this._audioFreqHelperArray[i][j] = freqHelperQuad;
          freqHelperQuad.position.set(-0.5 + j * 0.11, 0, 3 + 1 * i);
          this._scene.add(freqHelperQuad);
        });
      });
      this._allLoaded = true;
    };
  }

  _processAudio() {
    return;
    // Get the average frequency of the sound
    // let avgCopy = [...avgFreqData];
    // this._analysers.forEach((a, i) => {
    //   const freq = a.getAverageFrequency();
    //   avgCopy[i] = freq;
    // });
    // setAvgFreqData(avgCopy);

    let copy = [...this._freqData];
    this._analysers.forEach((a, i) => {
      const freqData = a.getFrequencyData();
      let data = 0;
      var samplePosition = sample(
        this._startPoint,
        this._startHandle.position,
        this._endHandle.position,
        this._endPoint,
        this._audioPlayProgress
      );
      const basis = calculateFrame(
        this._startPoint,
        this._startHandle.position,
        this._endHandle.position,
        this._endPoint,
        this._audioPlayProgress
      );

      // Frequency helper
      for (var j = 0; j < this._freqData.length; j++) {
        this._audioFreqHelperArray[i][j].scale.set(
          1,
          Math.log(this._freqData[j]) / 3.0,
          1
        );
        copy[i][j] = freqData[j];
      }

      if (this._$f % 60 === 0) {
        data = freqData[this._freqIndex];
        const size = remap(data, 0, 200, 0.01, 1);
        if (data > this._thresholds[i]) {
          this._patternGroups[i].addPattern(
            this._scene,
            size,
            samplePosition,
            basis
          );
        }
      }
    });
    // setFreqData(copy);
  }

  _updatePlane(t) {
    // Update normals
    const samplePosition = sample(
      this._startPoint,
      this._startHandle.position,
      this._endHandle.position,
      this._endPoint,
      t
    );
    const { normal, bitangent, tangent } = calculateFrame(
      this._startPoint,
      this._startHandle.position,
      this._endHandle.position,
      this._endPoint,
      t
    );

    this._arrowHelperNormal.position.copy(samplePosition);
    this._arrowHelperNormal.setDirection(normal);
    this._arrowHelperTangent.position.copy(samplePosition);
    this._arrowHelperTangent.setDirection(tangent);
    this._arrowHelperBitangent.position.copy(samplePosition);
    this._arrowHelperBitangent.setDirection(bitangent);

    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeBasis(
      tangent.normalize(),
      normal.normalize(),
      bitangent.normalize()
    );

    this._playhead.position.copy(samplePosition);
    this._playhead.quaternion.setFromRotationMatrix(rotationMatrix);

    if (this._controls) {
      this._controls.target.copy(samplePosition);
      this._controls.update();
    }
  }

  handlePointerDown(e) {
    this._mouseDown = true;
    this._raycaster.setFromCamera(this._mouse, this._camera);
    var intersects = this._raycaster.intersectObjects(
      this._handlesGroup.children
    );
    if (intersects.length > 0) {
      this._controls.enabled = false;
      this._controls.saveState();
    }
  }

  handlePointerUp(e) {
    if (!this._controls.enabled) {
      this._controls.reset();
      this._controls.enabled = true;
    }
    this._mouseDown = false;
  }

  handlePointerMove(e) {
    e.preventDefault();
    if (this._mouseDown) {
      return;
    }
    this._mouse.x = ((e.clientX - this._size.x) / this._size.width) * 2 - 1;
    this._mouse.y = -((e.clientY - this._size.y) / this._size.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this._camera);
    var intersects = this._raycaster.intersectObjects(
      this._handlesGroup.children
    );
    if (intersects.length > 0) {
      this._controls.enabled = false;
      // setIsDragging(true);
      intersects[0].object.material.color.set(0xff0000);
      intersects[0].object.scale.set(1.5, 1.5, 1.5);
    } else {
      this._controls.enabled = true;
      this._handlesGroup.children.forEach((h) => {
        h.material.color.set(0xffffff);
        h.scale.set(1.0, 1.0, 1.0);
      });
      // setIsDragging(false);
      // setIsHovering(false);
    }
  }

  handleResize() {
    let newSize = this._canvasWrapper.getBoundingClientRect();
    this._camera.aspect = (newSize.width + 300) / newSize.height;
    this._camera.updateProjectionMatrix();
    this._backgroundCamera.aspect = newSize.width / newSize.height;
    this._backgroundCamera.updateProjectionMatrix();
    this._renderer.setSize(newSize.width, newSize.height);
    this._size = newSize;
  }

  pause() {
    this._renderer.setAnimationLoop(null);
    this._clock.stop();
    this._sounds.map((s) => s.pause());
  }

  continue() {
    this._renderer.setAnimationLoop(this._renderLoop.bind(this));
    this._clock.start();
    this._sounds.map((s) => s.play());
  }

  _renderLoop() {
    this._$t = this._clock.getElapsedTime();
    TWEEN.update();

    // this._updatePlane(this._audioPlayProgress);

    // Update bezier
    this._instTubeMaterial.uniforms.uPoints.value = [
      this._startPoint,
      this._startHandle.position,
      this._endHandle.position,
      this._endPoint,
    ];

    this._renderer.clear();
    this._renderer.render(this._backgroundScene, this._backgroundCamera);
    this._renderer.render(this._scene, this._camera);

    const { x, y, z } = this._startHandle.position;
    this._startHandleLine.geometry.attributes.position.array[3] = x;
    this._startHandleLine.geometry.attributes.position.array[4] = y;
    this._startHandleLine.geometry.attributes.position.array[5] = z;
    this._startHandleLine.geometry.attributes.position.needsUpdate = true;

    this._endHandleLine.geometry.attributes.position.array[3] = this._endHandle.position.x;
    this._endHandleLine.geometry.attributes.position.array[4] = this._endHandle.position.y;
    this._endHandleLine.geometry.attributes.position.array[5] = this._endHandle.position.z;
    this._endHandleLine.geometry.attributes.position.needsUpdate = true;

    // Calculate audio things
    if (
      this._allLoaded &&
      this._sounds.length > 0 &&
      this._sounds[0].isPlaying
    ) {
      const t = this._audioListener.context.currentTime;
      this._audioPlayProgress = t / this._audioDuration;
      // setProgress(audioPlayProgress); // @TODO
      // this._processAudio();
    }
    if (this._allLoaded) {
      // this._processAudio();
    }

    if (this._stats !== undefined) this._stats.update();
    this._$f++;
  }

  dispose() {}
}

export default Patterns;
