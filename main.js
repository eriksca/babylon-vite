import "./style.css";
import earcut from "earcut";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Vector3, Vector2 } from "@babylonjs/core/Maths/math.vector.js";
import {
  FreeCamera,
  Scene,
  PolygonMeshBuilder,
  StandardMaterial,
  Color3,
  Quaternion,
  SceneLoader,
  ShadowGenerator,
  CreateTorus,
  AnimationPropertiesOverride,
  DirectionalLight,
} from "@babylonjs/core";
import {
  WebXRExperienceHelper,
  WebXRBackgroundRemover,
  WebXRState,
  WebXREnterExitUIButton,
  WebXRPlaneDetector,
  WebXRHitTest,
  WebXRAnchorSystem,
} from "@babylonjs/core/XR";
// Required for EnvironmentHelper
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

let camera = new FreeCamera("myCamera", new Vector3(0, 1, -5), scene);
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

const model = await SceneLoader.ImportMeshAsync(
  "",
  "./scenes/",
  "dummy3.babylon",
  scene
);

console.log(model);

const backgroundRemover = fm.enableFeature(
  WebXRBackgroundRemover.Name,
  "latest"
);
const xrPlanes = fm.enableFeature(WebXRPlaneDetector.Name, "latest");
const xrTest = fm.enableFeature(WebXRHitTest.Name, "latest");
const anchors = fm.enableFeature(WebXRAnchorSystem.Name, "latest");

let b = model.meshes[0];
b.rotationQuaternion = new Quaternion();
shadowGenerator.addShadowCaster(b, true);

const marker = CreateTorus("marker", { diameter: 0.15, thickness: 0.05 });
marker.isVisible = false;
marker.rotationQuaternion = new Quaternion();

var skeleton = model.skeletons[0];
// ROBOT
skeleton.animationPropertiesOverride = new AnimationPropertiesOverride();
skeleton.animationPropertiesOverride.enableBlending = true;
skeleton.animationPropertiesOverride.blendingSpeed = 0.05;
skeleton.animationPropertiesOverride.loopMode = 1;

var idleRange = skeleton.getAnimationRange("YBot_Idle");
var walkRange = skeleton.getAnimationRange("YBot_Walk");
var runRange = skeleton.getAnimationRange("YBot_Run");
var leftRange = skeleton.getAnimationRange("YBot_LeftStrafeWalk");
var rightRange = skeleton.getAnimationRange("YBot_RightStrafeWalk");
scene.beginAnimation(skeleton, idleRange.from, idleRange.to, true);

let hitTest;
b.isVisible = false;
xrTest.onHitTestResultObservable.add((results) => {
  if (results.length) {
    marker.isVisible = true;
    hitTest = results[0];
    hitTest.transformationMatrix.decompose(
      undefined,
      b.rotationQuaternion,
      b.position
    );
    hitTest.transformationMatrix.decompose(
      undefined,
      marker.rotationQuaternion,
      marker.position
    );
  } else {
    marker.isVisible = false;
    hitTest = undefined;
  }
});
const mat1 = new StandardMaterial("1", scene);
mat1.diffuseColor = Color3.Red();
const mat2 = new StandardMaterial("1", scene);
mat2.diffuseColor = Color3.Blue();

if (anchors) {
  console.log("anchors attached");
  anchors.onAnchorAddedObservable.add((anchor) => {
    console.log("attaching", anchor);
    b.isVisible = true;
    anchor.attachedNode = b.clone("mensch");
    anchor.attachedNode.skeleton = skeleton.clone("skelet");
    shadowGenerator.addShadowCaster(anchor.attachedNode, true);
    scene.beginAnimation(
      anchor.attachedNode.skeleton,
      idleRange.from,
      idleRange.to,
      true
    );
    b.isVisible = false;
  });

  anchors.onAnchorRemovedObservable.add((anchor) => {
    console.log("disposing", anchor);
    if (anchor) {
      anchor.attachedNode.isVisible = false;
      anchor.attachedNode.dispose();
    }
  });
}

scene.onPointerDown = (evt, pickInfo) => {
  if (hitTest && anchors && xr.state === WebXRState.IN_XR) {
    anchors.addAnchorPointUsingHitTestResultAsync(hitTest);
  }
};

const planes = [];

xrPlanes.onPlaneAddedObservable.add((plane) => {
  plane.polygonDefinition.push(plane.polygonDefinition[0]);
  var polygon_triangulation = new PolygonMeshBuilder(
    "name",
    plane.polygonDefinition.map((p) => new Vector2(p.x, p.z)),
    scene,
    earcut
  );
  var polygon = polygon_triangulation.build(false, 0.01);
  plane.mesh = polygon; //BABYLON.TubeBuilder.CreateTube("tube", { path: plane.polygonDefinition, radius: 0.02, sideOrientation: BABYLON.Mesh.FRONTSIDE, updatable: true }, scene);
  //}
  planes[plane.id] = plane.mesh;
  const mat = new StandardMaterial("mat", scene);
  mat.alpha = 0.5;
  mat.diffuseColor = Color3.Random();
  polygon.createNormals();
  // polygon.receiveShadows = true;
  plane.mesh.material = mat;

  plane.mesh.rotationQuaternion = new Quaternion();
  plane.transformationMatrix.decompose(
    plane.mesh.scaling,
    plane.mesh.rotationQuaternion,
    plane.mesh.position
  );
});

xrPlanes.onPlaneUpdatedObservable.add((plane) => {
  let mat;
  if (plane.mesh) {
    mat = plane.mesh.material;
    plane.mesh.dispose(false, false);
  }
  const some = plane.polygonDefinition.some((p) => !p);
  if (some) {
    return;
  }
  plane.polygonDefinition.push(plane.polygonDefinition[0]);
  var polygon_triangulation = new PolygonMeshBuilder(
    "name",
    plane.polygonDefinition.map((p) => new Vector2(p.x, p.z)),
    scene,
    earcut
  );
  var polygon = polygon_triangulation.build(false, 0.01);
  polygon.createNormals();
  plane.mesh = polygon; // BABYLON.TubeBuilder.CreateTube("tube", { path: plane.polygonDefinition, radius: 0.02, sideOrientation: BABYLON.Mesh.FRONTSIDE, updatable: true }, scene);
  //}
  planes[plane.id] = plane.mesh;
  plane.mesh.material = mat;
  plane.mesh.rotationQuaternion = new Quaternion();
  plane.transformationMatrix.decompose(
    plane.mesh.scaling,
    plane.mesh.rotationQuaternion,
    plane.mesh.position
  );
  plane.mesh.receiveShadows = true;
});

xrPlanes.onPlaneRemovedObservable.add((plane) => {
  if (plane && planes[plane.id]) {
    planes[plane.id].dispose();
  }
});

sessionManager?.onXRSessionInit.add(() => {
  planes.forEach((plane) => plane.dispose());
  while (planes.pop()) {}
});

// Run render loop
babylonEngine.runRenderLoop(() => {
  if (scene) scene.render();
});
