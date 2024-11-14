import { SplatBuffer, Viewer } from './index.js';

console.log("HI")

const viewer = new Viewer({
    'cameraUp': [0.01933, -0.75830, -0.65161],
    'initialCameraPosition': [1.54163, 2.68515, -6.37228],
    'initialCameraLookAt': [0.45622, 1.95338, 1.51278],
    'sphericalHarmonicsDegree': 2
});

let path = './assets/data/bonsai/bonsai_trimmed.ksplat';
viewer.addSplatScene(path, {
  'progressiveLoad': false
})
.then(() => {
    viewer.start();
});

const custom_splats = new SplatBuffer();