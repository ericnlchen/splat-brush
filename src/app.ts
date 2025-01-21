import { SceneRevealMode, Viewer, PlyParser, WebXRMode, SplatBufferGenerator } from './index.js';
import { UncompressedSplatArray } from './loaders/UncompressedSplatArray.js';
import { SplatBrush, SplatBrushConfig } from './SplatBrush'
// @ts-ignore
import * as THREE from 'three';
import { SplatUI } from './SplatUI.js'

console.log("HI!")

// Start splat viewer
const viewer = new Viewer({
    'cameraUp': [0, 1, 0],
    'initialCameraPosition': [0, 2, 5],
    'initialCameraLookAt': [0, 0, 0],
    // 'sphericalHarmonicsDegree': 2, 
    // 'dynamicScene': true, # this breaks seeing the splats in VR for some reason
    'sceneRevealMode': SceneRevealMode.Instant,
    'webXRMode': WebXRMode.AR
});
viewer.start();

let splatBrushConfig : SplatBrushConfig = {
    selectedStampArray: new UncompressedSplatArray()
};

// File paths for the pre-loaded stamps
const plyFiles = [
    './assets/stamp1.ply',
    './assets/stamp2.ply',
    './assets/stamp3.ply',
    './assets/stamp4.ply',
    './assets/stamp5.ply'
];


// preload all .ply files and store them in splatBrush.brush_og_arrays
async function preloadAllStampFiles(plyFiles: string[], splatBrush: SplatBrush) {
    
    for (const filePath of plyFiles) {
        try {
            const response = await fetch(filePath);
            const arrayBuffer = await response.arrayBuffer();

            // Parse the ArrayBuffer into an UncompressedSplatArray
            const stampArray = PlyParser.parseToUncompressedSplatArray(arrayBuffer, undefined);
            
            if (stampArray) {
                splatBrush.loadBrush(stampArray)
                console.log(`Successfully loaded stamp from ${filePath}`);
            } else {
                console.error(`Failed to parse .ply file into splat array: ${filePath}`);
            }
        } catch (error) {
            console.error(`Error loading .ply file ${filePath}:`, error);
        }
    }

    // Store all the preloaded stamp arrays in splatBrush.brush_og_arrays
    console.log('All files preloaded into splatBrush.brush_og_arrays');
}

// Button event listeners for loading the selected .ply file
document.getElementById("button1")?.addEventListener("click", () => splatBrush.selected_brush_slot = 0);
document.getElementById("button2")?.addEventListener("click", () => splatBrush.selected_brush_slot = 1);
document.getElementById("button3")?.addEventListener("click", () => splatBrush.selected_brush_slot = 2);
document.getElementById("button4")?.addEventListener("click", () => splatBrush.selected_brush_slot = 3);
document.getElementById("button5")?.addEventListener("click", () => splatBrush.selected_brush_slot = 4);

const splatBrush = new SplatBrush(viewer, splatBrushConfig);
preloadAllStampFiles(plyFiles, splatBrush);

// Create the UI
const UI = new SplatUI(splatBrush);

// const viewer = new Viewer({
//     'cameraUp': [0.01933, -0.75830, -0.65161],
//     'initialCameraPosition': [1.54163, 2.68515, -6.37228],
//     'initialCameraLookAt': [0.45622, 1.95338, 1.51278],
//     'sphericalHarmonicsDegree': 2,
//     'dynamicScene': true,
//     'sceneRevealMode': SceneRevealMode.Instant
// });

// viewer.start();


// how to load a ply, we probs can ignore
// let path = './assets/data/auditorium_by_the_sea.ply';
// viewer.addSplatScene(path, {
//   'progressiveLoad': false
// })
// .then(() => {
//     viewer.start();
// });

// const uncompressed_splats = new UncompressedSplatArray(2);

// DEMO 1: RANDOM SPLATS
// for(let i = 0; i < 100; i++){
//     uncompressed_splats.addSplatFromComonents(
//         // x, y, z
//         Math.random() * 2, Math.random() * 2, Math.random() * 2, 

//         // s0, s1, s2
//         Math.random() * 0.1, Math.random() * 0.1, Math.random() * 0.1,  

//         // quaternion r0, r1, r2, r3
//         Math.random(), Math.random(), Math.random(), Math.random(),                 

//         // r, g, b
//         Math.random() * 255 | 0, Math.random() * 255 | 0, Math.random() * 255 | 0,

//         // opacity
//         255,                                                                        
//         ...new Array(24).fill(0)
//     )
// }

// // DEMO 2: ATTRACTOR
// const p = 3, o = 2.7, r = 1.7, c = 2, e = 9;
// let x = 1, y = 1, z = 0, t = 0;
// let dx = 0, dy = 0, dz = 0;
// const dt = 0.01;
// const step = () => {
//     dx = (y - p * x + o * y * z) * dt;
//     dy = (r * y - x * z + z) * dt;
//     dz = (c * x * y - e * z) * dt;
//     x += dx; y += dy; z += dz; t += dt;
// }
// for(let i = 0; i < 10000; i++){
//     step();

//     const up = [0, 1, 0]; // axis alignment to quaterion computation
//     const norm = Math.sqrt(dx*dx + dy*dy + dz*dz);
//     const target = [dx / norm, dy / norm, dz / norm];
//     const v = [
//         up[1] * target[2] - up[2] * target[1],
//         up[2] * target[0] - up[0] * target[2],
//         up[0] * target[1] - up[1] * target[0] 
//     ];
//     const d = up[0]*target[0] + up[1]*target[1] + up[2]*target[2];
//     let q = [v[0], v[1], v[2], 1 + d];
//     let qnorm = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
//     q = q.map(n => n / qnorm);

//     if(i != 0) uncompressed_splats.addSplatFromComonents(
//         x * 0.5, y * 0.5, z * 0.5,    
//         0.05, 0.2, 0.05,
//         q[3],  q[0], q[1], q[2],               
//         (Math.sin(t) * 0.5 + 0.5) * 255 | 0, (Math.cos(t) * 0.5 + 0.5) * 255 | 0, 0.5 * 255 | 0, 
//         255, ...new Array(24).fill(0)
//     )
// }

// const custom_splats = SplatBufferGenerator.getStandardGenerator(1, 0).generateFromUncompressedSplatArray(uncompressed_splats);
// viewer.addSplatBuffers([custom_splats], [], false, false, false);