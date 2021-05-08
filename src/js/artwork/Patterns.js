import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import TWEEN from "@tweenjs/tween.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import * as dat from "dat.gui";
// Local imports
import PatternsTrack from "./PatternsTrack.js";
import createLineGeometry from "./createLineGeometry.js";
import { remap, sample, calculateFrame } from "../utils/geometry.js";
import patternsLogic, { PATTERNS_STATES } from "./logic.patterns.js";
// GLSL imports
import audioDataVS from "@glsl/audiodata.vert.glsl";
import audioDataFS from "@glsl/audiodata.frag.glsl";
import backgroundVS from "@glsl/background.vert.glsl";
import backgroundFS from "@glsl/background.frag.glsl";
import tubeVS from "@glsl/tubes.vert.glsl";
import tubeFS from "@glsl/tubes.frag.glsl";

const MAX_LOG = 5.541263545158426;

class Patterns {
  constructor(canvas, canvasWrapper) {
    this._canvas = canvas;
    this._canvasWrapper = canvasWrapper;
    this._size = this._canvasWrapper.getBoundingClientRect();
    console.log("Size: ", this._size);
    this._clock = new THREE.Clock();
    this._$t = this._clock.getElapsedTime();
    this._audioStartedAt = -1;
    this._$f = 0;

    this._thresholds = [0.1, 0.4, 0.35, 0.25, 0.15];

    this._colors = [
      new THREE.Color("#8cdabf"), // Bass
      new THREE.Color("#e8716e"), // Voice + Synth
      new THREE.Color("#b9a4e5"), // Pads & Chords
      new THREE.Color("#90a9ff"), // Percussion
      new THREE.Color("#ffc188"), // Guitar + Outro
    ];

    this._configuration = {
      Bass: {
        color: new THREE.Color("#8cdabf"),
        shape: "",
      },
      "Voice+Sythesizer": {
        color: new THREE.Color("#e8716e"),
      },
      "Pads+Chords": {
        color: new THREE.Color("#b9a4e5"),
      },
      Percussion: {
        color: new THREE.Color("#90a9ff"),
      },
      "Guitar+Outro": {
        color: new THREE.Color("#ffc188"),
      },
    };
    this._angles = [0, 72, 144, 216, 288];

    if (process.env.NODE_ENV === "development") {
      // Stats
      this._stats = new Stats();
      this._stats.dom.className = "stats";
      document.body.appendChild(this._stats.dom);
      // Gui
      this._gui = new dat.GUI();
      const toneMappingOptions = {
        None: THREE.NoToneMapping,
        Linear: THREE.LinearToneMapping,
        Reinhard: THREE.ReinhardToneMapping,
        Cineon: THREE.CineonToneMapping,
        ACESFilmic: THREE.ACESFilmicToneMapping,
        Custom: THREE.CustomToneMapping,
      };
      const effectController = {
        toneMappingExposure: 1.0,
        toneMapping: THREE.NoToneMapping,
      };
      const guiChanged = () => {
        this._renderer.toneMappingExposure = effectController.exposure;
        this._updateScene(this._scene);
      };
      this._gui
        .add(effectController, "toneMappingExposure", 0.0, 2.0, 0.001)
        .onChange(guiChanged);
      this._gui
        .add(effectController, "toneMapping", Object.keys(toneMappingOptions))
        .onChange((val) => {
          this._renderer.toneMapping = toneMappingOptions[val];
          this._updateScene(this._scene);
        });
    }

    this._allLoaded = false;

    this._init();
    this._initBackground();
    this._initGeometry();
    this._initRaycasting();
    this._setupAudioAnalysis();
    this._loadSounds();
  }

  _updateScene(node) {
    if (node.children.length === 0) {
      return;
    } else {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.material) {
          child.material.needsUpdate = true;
        }
        this._updateScene(child);
      }
    }
  }

  _setupAudioAnalysis() {
    this._renderTargetSize = new THREE.Vector2(512, 512);
    // this._renderTargetSize = new THREE.Vector2(128, 128);
    this._renderTargets = [0, 1].map(
      () =>
        new THREE.WebGLRenderTarget(
          this._renderTargetSize.x,
          this._renderTargetSize.y,
          {
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            stencilBuffer: false,
          }
        )
    );
    this._audioScene = new THREE.Scene();
    this._audioCamera = new THREE.OrthographicCamera(
      -2 / this._size.width,
      +2 / this._size.width,
      +2 / this._size.width,
      -2 / this._size.width,
      -1,
      100
    );
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    this._audioAnalysisBufferMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uFrame: { value: 0 },
        uFrequencies: { value: [] },
        uAverageFrequency: { value: 0.0 },
        uOffset: {
          value: new THREE.Vector2(0.0, 0),
        },
        uResolution: {
          value: new THREE.Vector2(
            this._renderTargetSize.x,
            this._renderTargetSize.y
          ),
        },
        uTexture: { value: this._renderTargets[0].texture },
      },
      vertexShader: audioDataVS,
      fragmentShader: audioDataFS,
    });
    const audioPlane = new THREE.Mesh(
      planeGeometry,
      this._audioAnalysisBufferMaterial
    );
    this._audioScene.add(audioPlane);

    // Audio data texture
    this._audioDataTextureSize =
      this._renderTargetSize.x * this._renderTargetSize.y;
    this._data = new Float32Array(3 * this._audioDataTextureSize);
    for (let i = 0; i < this._audioDataTextureSize; i++) {
      const stride = i * 3;
      this._data[stride] = 0;
      this._data[stride + 1] = 0;
      this._data[stride + 2] = 0;
    }
    this._audioDataTexture = new THREE.DataTexture(
      this._data,
      this._renderTargetSize.x,
      this._renderTargetSize.y,
      THREE.RGBFormat
    );
    this._audioDataTexture.type = THREE.FloatType;

    // Debug helper
    if (process.env.NODE_ENV === "development") {
      const previewPlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({
          map: this._audioDataTexture,
          side: THREE.DoubleSide,
        })
      );
      previewPlane.position.z = -3;
      // this._scene.add(previewPlane);
    }
  }

  _buildInstanceGeometries() {
    // Patterns geometries
    const buildProcess = new Promise((resolve, reject) => {
      this._patternTracks.map((patternTrack, i) => {
        const mesh = patternTrack.buildInstanceGeometry(
          this._audioDuration,
          this._startSphere,
          this._startHandle,
          this._endHandle,
          this._endSphere
        );
        this._scene.add(mesh);
        if (i === this._patternTracks.length - 1) {
          resolve();
        }
      });
    });
    buildProcess.then(() => {
      patternsLogic.actions.setState(PATTERNS_STATES.PATTERNS);
    });
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
    this._renderer.outputEncoding = THREE.LinearEncoding;
    this._renderer.setSize(this._size.width, this._size.height);
    this._renderer.autoClear = false;
    this._renderer.setAnimationLoop(this._renderLoop.bind(this));
    // Camera
    this._camera = new THREE.PerspectiveCamera(
      45,
      this._size.width / this._size.height,
      0.1,
      1000
    );
    // this._camera = new THREE.OrthographicCamera(
    //   this._size.width / -500,
    //   this._size.width / +500,
    //   this._size.height / +500,
    //   this._size.height / -500,
    //   -1000,
    //   +1000
    // );
    this._camera.position.set(0, 3, 2);
    // Controls
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.target.set(0, 0.5, 0);
    this._controls.update();
    this._controls.enableZoom = true;
    this._controls.enableZoom = true;
    this._controls.dampingFactor = 0.01;
    this._controls.minPolarAngle = 0.125;
    this._controls.maxPolarAngle = Math.PI - 0.125;
    // Event listener
    this._pointerMoveListener = this._canvas.addEventListener(
      "pointermove",
      this.handlePointerMove.bind(this),
      false
    );
    this._keyUpListener = document.addEventListener(
      "keyup",
      this.handleKeyUp.bind(this),
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
          value: new THREE.Vector2(
            this._size.width * window.devicePixelRatio,
            this._size.height * window.devicePixelRatio
          ),
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

    // Geometry
    this._handlesGroup = new THREE.Group();
    const geometry = new THREE.SphereGeometry(0.02, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xe8534f });
    const handleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      flatShading: true,
    });
    this._startSphere = new THREE.Mesh(geometry.clone(), material.clone());
    this._startSphere.position.copy(this._startPoint);
    this._endSphere = new THREE.Mesh(geometry, material);
    this._endSphere.position.copy(this._endPoint);
    this._scene.add(this._startSphere);
    this._scene.add(this._endSphere);
    this._handlesGroup.add(this._startSphere);
    this._handlesGroup.add(this._endSphere);

    const handleGeometry = new THREE.OctahedronGeometry(0.025, 0);
    this._startHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    const startHandlePosition = this._startPoint.clone().divideScalar(2.0);
    startHandlePosition.y = 1.0 * Math.sin(Math.random() * Math.PI * 2.0);
    startHandlePosition.z = 1.0 * Math.cos(Math.random() * Math.PI * 2.0);
    this._startHandle.position.copy(startHandlePosition);
    this._startHandle.scale.set(0.5, 3, 0.5);
    this._startHandle.lookAt(this._startPoint);
    this._handlesGroup.add(this._startHandle);

    this._endHandle = new THREE.Mesh(handleGeometry, handleMaterial.clone());
    const endHandlePosition = this._endPoint.clone().divideScalar(2.0);
    endHandlePosition.y = 1.0 * Math.sin(Math.random() * Math.PI * 2.0);
    endHandlePosition.z = 1.0 * Math.cos(Math.random() * Math.PI * 2.0);
    this._endHandle.position.copy(endHandlePosition);
    this._handlesGroup.add(this._endHandle);

    this._handlesGroup.children.forEach((h) => {
      h.material.color.set(0xe8534f);
      h.scale.set(1.0, 1.0, 1.0);
    });

    this._dragControls = new DragControls(
      [this._startHandle, this._endHandle, this._startSphere, this._endSphere],
      this._camera,
      this._renderer.domElement
    );
    this._dragControls.addEventListener("drag", () => {
      this._instTubeMaterial.uniforms.uPoints.value = [
        this._startSphere.position,
        this._startHandle.position,
        this._endHandle.position,
        this._endSphere.position,
      ];
      var samplePosition = sample(
        this._startSphere.position,
        this._startHandle.position,
        this._endHandle.position,
        this._endSphere.position,
        this._audioPlayProgress
      );
    });
    this._dragGroup = new THREE.Group();
    this._scene.add(this._handlesGroup);
    var handleLinesMaterial = new THREE.LineBasicMaterial({ color: 0x7a7a7a });
    var points = [];
    points.push(this._startSphere.position);
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

    // Tube/Bezier spline
    const numSides = 8;
    const subdivisions = 100;
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
    this._audioDuration = 0;
    this._audioPlayProgress = 0.0;

    this._patternTracks = [];
    this._audioTracks.slice(0, 5).map((track, i) => {
      audioLoader.load(
        `/assets/audio/patterns.instruments/${track}`,
        (buffer) => {
          const durationFPS = Math.ceil(buffer.duration) * 60;
          console.log("Audio name", track);
          console.log("Audio Buffer", buffer);
          console.log("Audio duration * 60 fps", durationFPS);
          this._audioDuration = buffer.duration;
          const color = this._colors[i];
          const colorChannel = i % 3;
          const yOffset = i % 2 === 1 ? 0.5 : 0.0;
          const trackName = track.replace(".mp3", "").replace(/[0-9]-/, "");
          const patternTrack = new PatternsTrack(
            this._audioListener,
            colorChannel,
            yOffset,
            this._configuration[trackName].color,
            i,
            this._renderTargetSize,
            this._audioDataTexture,
            trackName,
            this._thresholds[i]
          );
          patternTrack.audio.setBuffer(buffer);
          patternTrack.audio.setLoop(false);
          patternTrack.audio.setVolume(1.0);
          this._patternTracks.push(patternTrack);
          patternsLogic.actions.addPatternTrack(patternTrack);
          if (i === 0) {
            // Audio finished listener
            patternTrack.audio.onEnded = () => {
              patternsLogic.actions.setState(PATTERNS_STATES.FINISH);
            };
          }
        },
        (xhr) => {}
      );
    });

    // After loading all sounds
    this._loadingManager.onLoad = () => {};
    this._loadingManager.onProgress = (url, loaded, total) => {
      console.log((loaded / total) * 100 + "% loaded");
      if (loaded / total >= 1.0) {
        this._allLoaded = true;
        console.log("All sounds loaded...");
      }
    };
  }

  _lookAtCenter() {
    const boundingBox = new THREE.Box3().setFromPoints([
      this._startSphere.position,
      this._startHandle.position,
      this._endHandle.position,
      this._endSphere.position,
    ]);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    const fromTarget = {
      x: this._controls.target.x,
      y: this._controls.target.y,
      z: this._controls.target.z,
    };
    const toTarget = {
      x: center.x,
      y: center.y,
      z: center.z,
    };
    const fromCamera = {
      x: this._camera.position.x,
      y: this._camera.position.y,
      z: this._camera.position.z,
    };
    const toCamera = {
      x: 0,
      y: 1.5,
      z: 2,
    };
    const controlsTween = new TWEEN.Tween(fromTarget).to(toTarget, 3000);
    controlsTween
      .onStart(() => {
        this._controls.enabled = false;
      })
      .onUpdate(() => {
        this._controls.target.set(fromTarget.x, fromTarget.y, fromTarget.z);
        this._controls.update();
      })
      .easing(TWEEN.Easing.Quadratic.InOut)
      .delay(1500);
    const cameraTween = new TWEEN.Tween(fromCamera).to(toCamera, 3000);
    cameraTween
      .onUpdate(() => {
        this._camera.position.set(fromCamera.x, fromCamera.y, fromCamera.z);
      })
      .onComplete(() => {
        this._controls.enabled = true;
      })
      .easing(TWEEN.Easing.Quadratic.InOut)
      .delay(1500);
    cameraTween.start();
    controlsTween.start();
  }

  _lookAtSamplePosition() {
    const samplePosition = sample(
      this._startSphere.position,
      this._startHandle.position,
      this._endHandle.position,
      this._endSphere.position,
      this._audioPlayProgress - 0.05
    );
    this._controls.target.copy(samplePosition);
    this._controls.update();
  }

  handleKeyUp(e) {
    console.log(e);
    if (e.key === "e") {
      this._buildInstanceGeometries();
    }
    if (e.key === "c") {
      this._canvas.requestFullscreen();
    }
  }

  handlePointerDown(e) {
    this._mouseDown = true;
    this._raycaster.setFromCamera(this._mouse, this._camera);
    if (this._dragControls.enabled) {
      const intersects = this._raycaster.intersectObjects(
        this._handlesGroup.children
      );
      if (intersects.length > 0) {
        this._controls.enabled = false;
        this._controls.saveState();
      }
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

    if (this._dragControls.enabled) {
      this._raycaster.setFromCamera(this._mouse, this._camera);
      var intersects = this._raycaster.intersectObjects(
        this._handlesGroup.children
      );
      if (intersects.length > 0) {
        this._controls.enabled = false;
        // setIsDragging(true);
        intersects[0].object.material.color.set(0x2b13ff);
        intersects[0].object.scale.set(1.5, 1.5, 1.5);
      } else {
        this._controls.enabled = true;
        this._handlesGroup.children.forEach((h) => {
          h.material.color.set(0xe8534f);
          h.scale.set(1.0, 1.0, 1.0);
        });
      }
    }
  }

  handleResize() {
    let newSize = this._canvasWrapper.getBoundingClientRect();
    this._camera.aspect = newSize.width / newSize.height;
    this._camera.updateProjectionMatrix();
    this._backgroundCamera.aspect = newSize.width / newSize.height;
    this._backgroundCamera.updateProjectionMatrix();
    this._renderer.setSize(newSize.width, newSize.height);
    this._size = newSize;
  }

  pause() {
    this._renderer.setAnimationLoop(null);
    this._clock.stop();
    this._patternTracks.map((pt) => pt.audio.pause());
  }

  continue() {
    this._renderer.setAnimationLoop(this._renderLoop.bind(this));
    this._clock.start();
    this._patternTracks.map((pt) => pt.audio.play());
    this._audioStartedAt = this._patternTracks[0]?.audio?.context.currentTime;
  }

  reactOnStateChange() {
    switch (patternsLogic.values.state) {
      case PATTERNS_STATES.INIT:
        this._dragControls.enabled = false;
        this._dragControls.deactivate();
        break;
      case PATTERNS_STATES.BEZIER_SETUP:
        this._dragControls.enabled = true;
        this._dragControls.activate();
        this._controls.enableDamping = false;
        break;
      case PATTERNS_STATES.PREPARE:
        this._dragControls.enabled = false;
        this._dragControls.deactivate();
        this._buildInstanceGeometries();
        break;
      case PATTERNS_STATES.PATTERNS:
        this._controls.enableDamping = true;
        this.continue();
        break;
      case PATTERNS_STATES.FINISH:
        this._dragControls.enabled = false;
        this._dragControls.deactivate();
        break;
      case PATTERNS_STATES.OVERVIEW:
        this._controls.enableDamping = true;
        this._lookAtCenter();
        break;
      default:
        break;
    }
  }

  _renderLoop() {
    this._$t = this._clock.getElapsedTime();
    TWEEN.update();

    // Render background
    this._renderer.clear();
    this._renderer.render(this._backgroundScene, this._backgroundCamera);

    if (patternsLogic.values.state === PATTERNS_STATES.INIT) {
      return;
    }

    if (patternsLogic.values.state === PATTERNS_STATES.BEZIER_SETUP) {
      // Update bezier
      const { x, y, z } = this._startHandle.position;
      this._startHandleLine.geometry.attributes.position.array[0] = this._startSphere.position.x;
      this._startHandleLine.geometry.attributes.position.array[1] = this._startSphere.position.y;
      this._startHandleLine.geometry.attributes.position.array[2] = this._startSphere.position.z;

      this._startHandleLine.geometry.attributes.position.array[3] = x;
      this._startHandleLine.geometry.attributes.position.array[4] = y;
      this._startHandleLine.geometry.attributes.position.array[5] = z;

      this._startHandleLine.geometry.attributes.position.needsUpdate = true;

      this._endHandleLine.geometry.attributes.position.array[0] = this._endSphere.position.x;
      this._endHandleLine.geometry.attributes.position.array[1] = this._endSphere.position.y;
      this._endHandleLine.geometry.attributes.position.array[2] = this._endSphere.position.z;

      this._endHandleLine.geometry.attributes.position.array[3] = this._endHandle.position.x;
      this._endHandleLine.geometry.attributes.position.array[4] = this._endHandle.position.y;
      this._endHandleLine.geometry.attributes.position.array[5] = this._endHandle.position.z;
      this._endHandleLine.geometry.attributes.position.needsUpdate = true;
    }

    if (
      patternsLogic.values.state === PATTERNS_STATES.PREPARE ||
      patternsLogic.values.state === PATTERNS_STATES.PATTERNS
    ) {
      this._lookAtSamplePosition();
    }
    if (patternsLogic.values.state === PATTERNS_STATES.OVERVIEW) {
      this._controls.update();
    }

    for (let i = 0; i < this._patternTracks.length; i++) {
      const track = this._patternTracks[i];
      const analyzer = track ? track.analyzer : undefined;
      const avgFreq = analyzer ? analyzer.getAverageFrequency() : 0.0;

      const audioValue = Math.log(avgFreq) / MAX_LOG;
      const yOffset =
        track.yOffset * this._renderTargetSize.y * this._renderTargetSize.x * 3;
      this._data[yOffset + (this._$f * 3 + track.colorChannel)] =
        audioValue > track.threshold ? audioValue : 0.0;
      this._audioDataTexture.needsUpdate = true;

      // Update patterns material
      if (track.material) {
        track.material.uniforms.uProgress.value = this._audioPlayProgress;
        track.material.uniforms.uFrame.value = this._$f;
      }
    }

    // Render scene
    this._renderer.render(this._scene, this._camera);

    // Calculate audio things
    if (this._allLoaded) {
      const t = this._audioListener.context.currentTime;
      this._audioPlayProgress =
        (t - this._audioStartedAt) / this._audioDuration;
    }

    if (this._stats !== undefined) {
      this._stats.update();
    }
    if (this._audioPlayProgress <= 1.0 && this._audioStartedAt > 0) {
      patternsLogic.actions.updatePlayProgress(this._audioPlayProgress);
      this._$f++;
    }
  }

  dispose() {}
}

export default Patterns;
