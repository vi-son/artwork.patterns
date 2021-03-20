import * as THREE from "three";
import TWEEN from "tween.js";
// GLSL imports
import patternVS from "@glsl/basic.vert.glsl";
import patternFS from "@glsl/plane.frag.glsl";

class PatternGroup extends THREE.Group {
  constructor(props) {
    super();
    this._angle = props.angle;
    this._color = props.color;
    this._createRepresentation();
  }

  _createRepresentation() {
    // Setup geometry
    this._geometry = new THREE.PlaneBufferGeometry(0.03, 1, 1);
    this._geometry.translate(0, 0.5, 0);
    // Setup shader material
    this._material = new THREE.ShaderMaterial({
      vertexShader: patternVS,
      fragmentShader: patternFS,
      uniforms: {
        uColor: { value: this._color },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    // Create the pattern mesh
    this._template = new THREE.Mesh(this._geometry, this._material);
  }

  addPattern(scene, size, position, basis) {
    const { tangent, normal, bitangent } = basis;
    const group = new THREE.Group();
    group.position.set(0, size / 2.0, 0);
    const pattern = this._template.clone();
    group.add(pattern);
    group.scale.set(1, size, 1);
    pattern.scale.set(1, size, 1);
    pattern.applyMatrix4(new THREE.Matrix4().makeTranslation(0, size / 2.0, 0));
    var scale = { x: 0.01 };
    // Rotation
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeBasis(
      tangent.normalize(),
      normal.normalize(),
      bitangent.normalize()
    );
    // Position
    group.position.copy(position);
    group.quaternion.setFromRotationMatrix(rotationMatrix);
    group.rotateOnWorldAxis(tangent, (this._angle / 180.0) * Math.PI);
    // Animate
    const tween = new TWEEN.Tween(scale)
      .to({ x: 1.0 }, 50)
      .onUpdate(() => pattern.scale.set(1, scale.x, 1))
      .start();
    // Add to the scene
    scene.add(group);
  }
}

export default PatternGroup;
