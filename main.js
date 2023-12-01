import "./style.css";

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { ArcRotateCamera, Scene, CreateSphere } from "@babylonjs/core";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import {
  WebXRExperienceHelper,
  WebXRBackgroundRemover,
  WebXRState,
  WebXREnterExitUIButton,
  WebXRHitTest,
  // Required for EnvironmentHelper
} from "@babylonjs/core/XR";
import "@babylonjs/core/Materials/Textures/Loaders";
// Enable GLTF/GLB loader for loading controller models from WebXR Input registry
import "@babylonjs/loaders/glTF";

// Without this next import, an error message like this occurs loading controller models:
//  Build of NodeMaterial failed" error when loading controller model
//  Uncaught (in promise) Build of NodeMaterial failed: input rgba from block
//  FragmentOutput[FragmentOutputBlock] is not connected and is not optional.
import "@babylonjs/core/Materials/Node/Blocks";

//defining global variables
let xrButton = null;
let sessionManager = null;
let xr = null;

//retrieves the canvas element in which the scene will be rendered
const canvas = document.getElementById("renderCanvas");

// Creates engine and a scene
const babylonEngine = new Engine(canvas, true);
const scene = new Scene(babylonEngine);

// Add a basic light
const directionalLight = new HemisphericLight(
  "light1",
  new Vector3(0, 2, 0),
  scene
);

const camera = new ArcRotateCamera(
  "myCamera",
  0,
  Math.PI / 3,
  10,
  Vector3.Zero(),
  scene
);
camera.setTarget(new Vector3(0, 2, 5));
camera.attachControl(canvas, true);

//retrieves a XRSystem object from navigator --> if it's present that means you can use WebXR API
const xrNavigator = navigator.xr;

//checks if ar is supported
const immersiveOK = await xrNavigator?.isSessionSupported("immersive-ar");

if (immersiveOK) {
  try {
    xr = await WebXRExperienceHelper.CreateAsync(scene).then(
      console.log("ar initialized")
    );
  } catch (e) {
    // no XR support
    window.alert("failed to create ar session" + e);
  }
}

//listen for state changes in xr state
xr?.onStateChangedObservable.add((state) => {
  switch (state) {
    case WebXRState.IN_XR:
    // XR is initialized and already submitted one frame
    case WebXRState.ENTERING_XR:
    // xr is being initialized, enter XR request was made
    case WebXRState.EXITING_XR:
    // xr exit request was made. not yet done.
    case WebXRState.NOT_IN_XR:
    // self explanatory - either out or not yet in XR
  }
  console.log(state);
});

let btn = document.createElement("button");
btn.className = "custom-xr-button";
document.body.appendChild(btn);
xrButton = new WebXREnterExitUIButton(btn, "immersive-ar", "local-floor");

xrButton.element.onclick = async function () {
  sessionManager = await xr?.enterXRAsync("immersive-ar", "local-floor");
  return sessionManager;
};

const fm = xr?.featuresManager;

fm.enableFeature(WebXRBackgroundRemover.Name, "latest");

const dot = CreateSphere("dot", { diameter: 0.05 }, scene);
dot.isVisible = false;

// const hitTetsOptions = {
//   disablePermanentHitTest: false,
//   enableTransientHitTest: true,
//   useReferenceSpace: true,
// };

const hitTest = fm.enableFeature(WebXRHitTest.Name, "latest");

hitTest.onHitTestResultObservable.add((results) => {
  if (results.length) {
    dot.isVisible = true;
    results[0].transformationMatrix.decompose(
      dot.scaling,
      dot.rotationQuaternion,
      dot.position
    );
  } else {
    dot.isVisible = false;
  }
});
// console.log(`fm: ${fm.getEnabledFeatures()}`);

// Run render loop
babylonEngine.runRenderLoop(() => {
  if (scene) scene.render();
});
