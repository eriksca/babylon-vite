import "./style.css";

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import {
  Scene,
  Quaternion,
  SceneLoader,
  ShadowGenerator,
  DirectionalLight,
  ArcRotateCamera,
  CreateGround,
} from "@babylonjs/core";
// Required for EnvironmentHelper
import "@babylonjs/core/Materials/Textures/Loaders";
// Enable GLTF/GLB loader for loading controller models from WebXR Input registry
import "@babylonjs/loaders/glTF";

// Without this next import, an error message like this occurs loading controller models:
//  Build of NodeMaterial failed" error when loading controller model
//  Uncaught (in promise) Build of NodeMaterial failed: input rgba from block
//  FragmentOutput[FragmentOutputBlock] is not connected and is not optional.
import "@babylonjs/core/Materials/Node/Blocks";

//retrieves the canvas element in which the scene will be rendered
const canvas = document.getElementById("renderCanvas");

// Creates engine and a scene
const babylonEngine = new Engine(canvas, true);
const scene = new Scene(babylonEngine);

let camera = new ArcRotateCamera(
  "myCamera",
  -Math.PI,
  Math.PI / 2,
  0.5,
  new Vector3(0, 1, -5),
  scene
);
camera.setTarget(new Vector3(0, 2, 5));
camera.attachControl(canvas, true);

// This creates a light, aiming 0,1,0 - to the sky (non-mesh)
let light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);
light.intensity = 0.7;

let dirLight = new DirectionalLight("light", new Vector3(0, -1, -0.5), scene);
dirLight.position = new Vector3(0, 5, -5);

let shadowGenerator = new ShadowGenerator(1024, dirLight);
shadowGenerator.useBlurExponentialShadowMap = true;
shadowGenerator.blurKernel = 32;

const ground = CreateGround(
  "gorund",
  {
    width: 3,
    height: 3,
  },
  scene
);
ground.receiveShadows = true;

const model = await SceneLoader.ImportMeshAsync(
  "",
  "./scenes/",
  "avatar.glb",
  scene
);

let b = model.meshes[0];
b.rotationQuaternion = new Quaternion();
shadowGenerator.addShadowCaster(b, true);

camera.setTarget(b.position);
b.isVisible = true;
model.isVisible = false;

// Run render loop
babylonEngine.runRenderLoop(() => {
  if (scene) scene.render();
});

//adjust canvas to resize event
window.addEventListener("resize", function () {
  babylonEngine.resize();
});
