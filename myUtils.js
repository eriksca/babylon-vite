import { WebXREnterExitUIButton } from "@babylonjs/core";

let xrButton;

export function createXRButton() {
  const btn = document.createElement("button");
  btn.className = "custom-xr-button";
  document.body.appendChild(btn);
  xrButton = new WebXREnterExitUIButton(btn, "immersive-ar", "local-floor");
  return xrButton;
};