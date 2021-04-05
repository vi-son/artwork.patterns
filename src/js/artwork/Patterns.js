import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import TWEEN from "@tweenjs/tween.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import * as dat from "dat.gui";
// Local imports
import createLineGeometry from "./createLineGeometry.js";
import { remap, sample, calculateFrame } from "../utils/geometry.js";
// GLSL imports
import audioDataVS from "@glsl/audiodata.vert.glsl";
import audioDataFS from "@glsl/audiodata.frag.glsl";
import backgroundVS from "@glsl/background.vert.glsl";
import backgroundFS from "@glsl/background.frag.glsl";
import tubeVS from "@glsl/tubes.vert.glsl";
import tubeFS from "@glsl/tubes.frag.glsl";
import patternVS from "@glsl/plane.vert.glsl";
import patternFS from "@glsl/plane.frag.glsl";

class Patterns {
  constructor(canvas, canvasWrapper) {
    this._canvas = canvas;
    this._canvasWrapper = canvasWrapper;
    this._size = this._canvasWrapper.getBoundingClientRect();
    console.log("Size: ", this._size);
    this._clock = new THREE.Clock();
    this._$t = this._clock.getElapsedTime();
    this._$f = 0;
    this._TRACK_INDEX = 0;

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
      this._stats.dom.className = "stats";
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

  _setupAudioAnalysis() {
    this._renderTargetSize = new THREE.Vector2(512, 512);
    // this._renderTargetSize = new THREE.Vector2(12, 12);
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

    const previewPlane = new THREE.Mesh(
      planeGeometry,
      new THREE.MeshBasicMaterial({
        map: this._renderTargets[0].texture,
        side: THREE.DoubleSide,
      })
    );
    previewPlane.position.z = -3;
    this._scene.add(previewPlane);
  }

  _buildInstanceGeometries() {
    // Patterns geometries
    const COUNT = Math.ceil(this._audioDuration) * 10;
    const color = this._colors[parseInt(Math.random() * this._colors.length)];
    this._patternMaterial = new THREE.ShaderMaterial({
      vertexShader: patternVS,
      fragmentShader: patternFS,
      uniforms: {
        uFrame: { value: 0 },
        uColor: { value: color },
        uSampleCount: { value: Math.ceil(this._audioDuration) * 60.0 },
        uCount: { value: COUNT },
        uProgress: { value: 0.0 },
        uResolution: {
          value: new THREE.Vector2(
            this._renderTargetSize.x,
            this._renderTargetSize.y
          ),
        },
        uAudioDataTexture: { value: this._renderTargets[0].texture },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    const geometries = [];
    let matrix = new THREE.Matrix4();
    let position = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    let quaternion = new THREE.Quaternion();
    let scale = new THREE.Vector3(1, 1, 1);

    let instanceGeometry;

    const randomIndex = parseInt(Math.random() * 3);
    console.log(randomIndex);

    for (let i = 0; i < COUNT; i++) {
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
        i / COUNT
      );
      const basis = calculateFrame(
        this._startSphere.position,
        this._startHandle.position,
        this._endHandle.position,
        this._endSphere.position,
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
    const mesh = new THREE.Mesh(patternsGeometry, this._patternMaterial);
    console.log("GEOMETRY", patternsGeometry);
    this._scene.add(mesh);
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
    this._controls.dampingFactor = 0.9;
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
    startHandlePosition.y = 1.0;
    startHandlePosition.z = 0.75;
    this._startHandle.position.copy(startHandlePosition);
    this._startHandle.scale.set(0.5, 3, 0.5);
    this._startHandle.lookAt(this._startPoint);
    this._handlesGroup.add(this._startHandle);

    this._endHandle = new THREE.Mesh(handleGeometry, handleMaterial.clone());
    const endHandlePosition = this._endPoint.clone().divideScalar(2.0);
    endHandlePosition.y = 1.0;
    endHandlePosition.z = -0.5;
    this._endHandle.position.copy(endHandlePosition);
    this._handlesGroup.add(this._endHandle);

    this._handlesGroup.children.forEach((h) => {
      h.material.color.set(0xe8534f);
      h.scale.set(1.0, 1.0, 1.0);
    });

    const dragControls = new DragControls(
      [this._startHandle, this._endHandle, this._startSphere, this._endSphere],
      this._camera,
      this._renderer.domElement
    );
    dragControls.addEventListener("drag", () => {
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
      this._playhead.position.copy(samplePosition);
      const boundingBox = new THREE.Box3().setFromPoints([
        this._startSphere.position,
        this._startHandle.position,
        this._endHandle.position,
        this._endSphere.position,
      ]);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      console.log(center);
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

    // Play head
    this._playhead = new THREE.Group();

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x2b13ff });
    const playheadMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    const playheadSize = 0.05;
    playheadMesh.scale.set(playheadSize, playheadSize, playheadSize);

    const samplePosition = sample(
      this._startSphere.position,
      this._startHandle.position,
      this._endHandle.position,
      this._endSphere.position,
      this._audioPlayProgress
    );
    this._playhead.position.copy(samplePosition);
    this._playhead.add(playheadMesh);
    this._scene.add(this._playhead);

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
    this._arrowHelperTangent = new THREE.ArrowHelper(dir, origin, length, hexT);
    this._arrowHelperBitangent = new THREE.ArrowHelper(
      dir,
      origin,
      length,
      hexBT
    );
    this._playhead.add(this._arrowHelperNormal);
    this._playhead.add(this._arrowHelperTangent);
    this._playhead.add(this._arrowHelperBitangent);

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

    // Audio analyze
    // Audio debug helper
    /*
    this._audioFreqHelperArray = new Array(this._audioTracks.length)
      .fill(0)
      .map((_) => new Array(32).fill(undefined));
    this._audioFreqHelperMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
    });
    */

    this._sounds = new Array(this._audioTracks.length)
      .fill(undefined)
      .map(() => new THREE.Audio(this._audioListener));
    this._audioTracks.map((track, i) => {
      audioLoader.load(
        `/assets/audio/patterns.instruments/${track}`,
        (buffer) => {
          console.log("Audio Buffer", buffer);
          console.log(
            "Audio duration * 60 fps",
            Math.ceil(buffer.duration) * 60
          );
          this._audioDuration = buffer.duration;
          this._sounds[i].setBuffer(buffer);
          this._sounds[i].setLoop(false);
          this._sounds[i].setVolume(1.0);
          this._setupAudioAnalysis();
        },
        (xhr) => {}
      );
    });

    // After loading all sounds
    this._analysers = new Array(this._audioTracks.length).fill(undefined);
    this._freqData = new Array(this._audioTracks.length).fill(undefined);
    this._avgFreqData = new Array(this._audioTracks.length).fill(undefined);
    this._loadingManager.onLoad = () => {
      this._sounds.forEach((s, i) => {
        const analyzer = new THREE.AudioAnalyser(s, 32);
        this._analysers[i] = analyzer;
        this._freqData[i] = this._analysers[i].getFrequencyData();
        this._avgFreqData[i] = this._analysers[i].getAverageFrequency();

        // Frequency helper
        /*
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
        */
      });
    };

    this._loadingManager.onProgress = (url, loaded, total) => {
      console.log((loaded / total) * 100 + "% loaded");
      if (loaded / total >= 1.0) {
        this._allLoaded = true;
        this.continue();
        console.log("All sounds loaded... playing", this._sounds);
      }
    };
  }

  _processAudio() {
    // Get the average frequency of the sound
    // let avgCopy = [...avgFreqData];
    this._analysers.forEach((a, i) => {
      const freq = a.getAverageFrequency();
      // avgCopy[i] = freq;
    });
    // setAvgFreqData(avgCopy);

    // let copy = [...this._freqData];
    this._analysers.forEach((a, i) => {
      const freqData = a.getFrequencyData();
      let data = 0;
      var samplePosition = sample(
        this._startSphere.position,
        this._startHandle.position,
        this._endHandle.position,
        this._endSphere.position,
        this._audioPlayProgress
      );
      const basis = calculateFrame(
        this._startSphere.position,
        this._startHandle.position,
        this._endHandle.position,
        this._endSphere.position,
        this._audioPlayProgress
      );

      // Frequency helper
      /*
      for (var j = 0; j < this._freqData.length; j++) {
        this._audioFreqHelperArray[i][j].scale.set(
          1,
          Math.max(0.01, Math.log(this._freqData[j]) / 3.0),
          1
        );
        if (this._freqData[i]) {
          // copy[i][j] = this._freqData[j];
        }
      }
      */

      /*
      if (this._$f % 60 === 0) {
        data = this._freqData[this._freqIndex];
        const size = remap(data, 0, 200, 0.01, 1);
        // if (data > this._thresholds[i]) {
        //   this._patternGroups[i].addPattern(
        //     this._scene,
        //     size,
        //     samplePosition,
        //     basis
        //   );
        // }
      }
      */
    });
    // setFreqData(copy);
  }

  _updatePlane(t) {
    // Update normals
    const samplePosition = sample(
      this._startSphere.position,
      this._startHandle.position,
      this._endHandle.position,
      this._endSphere.position,
      t
    );
    const { normal, bitangent, tangent } = calculateFrame(
      this._startSphere.position,
      this._startHandle.position,
      this._endHandle.position,
      this._endSphere.position,
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

    if (this._playhead) {
      this._playhead.position.copy(samplePosition);
      this._playhead.quaternion.setFromRotationMatrix(rotationMatrix);
    }

    // if (
    //   this._controls &&
    //   samplePosition.x !== NaN &&
    //   samplePosition.y !== NaN &&
    //   samplePosition.z !== NaN
    // ) {
    //   this._controls.target.copy(samplePosition);
    //   this._controls.update();
    // }
  }

  handleKeyUp(e) {
    console.log(e);
    if (e.key === "e") {
      this._buildInstanceGeometries();
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
    this._sounds.map((s) => s.pause());
  }

  continue() {
    this._renderer.setAnimationLoop(this._renderLoop.bind(this));
    this._clock.start();
    this._sounds.map((s) => s.play());
    this._$f = 0;
  }

  _renderLoop() {
    this._$t = this._clock.getElapsedTime();
    TWEEN.update();

    if (this._analysers[this._TRACK_INDEX]) {
      this._avgFreqData[this._TRACK_INDEX] = this._analysers[
        this._TRACK_INDEX
      ].getAverageFrequency();
      if (this._audioAnalysisBufferMaterial) {
        this._audioAnalysisBufferMaterial.uniforms.uAverageFrequency.value = this._avgFreqData[
          this._TRACK_INDEX
        ];
        this._audioAnalysisBufferMaterial.uniforms.uFrame.value = this._$f;
      }
    }

    if (this._renderTargets) {
      this._renderer.setRenderTarget(this._renderTargets[(this._$f + 1) % 2]);
      this._renderer.render(this._audioScene, this._audioCamera);
      this._renderer.setRenderTarget(null);

      if (this._$f % 2 === 0) {
        this._audioAnalysisBufferMaterial.uniforms.uTexture.value = this._renderTargets[1].texture;
      } else {
        this._audioAnalysisBufferMaterial.uniforms.uTexture.value = this._renderTargets[0].texture;
      }
    }

    // this._updatePlane(this._audioPlayProgress);

    // Update bezier
    this._renderer.clear();
    this._renderer.render(this._backgroundScene, this._backgroundCamera);
    this._renderer.render(this._scene, this._camera);

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

    // Calculate audio things
    if (
      this._allLoaded &&
      this._sounds.length > 0 &&
      this._sounds[0].isPlaying
    ) {
      const t = this._audioListener.context.currentTime;
      this._audioPlayProgress = t / this._audioDuration;
      if (this._patternMaterial) {
        this._patternMaterial.uniforms.uProgress.value = this._audioPlayProgress;
        this._patternMaterial.uniforms.uFrame.value = this._$f;
      }
      // setProgress(audioPlayProgress); // @TODO
      this._processAudio();
    }
    if (this._allLoaded) {
      this._processAudio();
    }

    if (this._stats !== undefined) this._stats.update();

    if (this._audioPlayProgress <= 1.0) {
      this._$f++;
    }
  }

  dispose() {}
}

export default Patterns;
