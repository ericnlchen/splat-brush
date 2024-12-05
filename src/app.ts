import { SceneRevealMode, Viewer, PlyParser } from './index.js';
import { UncompressedSplatArray } from './loaders/UncompressedSplatArray.js';
import { SplatBrush, SplatBrushConfig } from './SplatBrush'

console.log("HI!")

// Start splat viewer
const viewer = new Viewer({
    'cameraUp': [0.01933, -0.75830, -0.65161],
    'initialCameraPosition': [1.54163, 2.68515, -6.37228],
    'initialCameraLookAt': [0.45622, 1.95338, 1.51278],
    'sphericalHarmonicsDegree': 2,
    'dynamicScene': true,
    'sceneRevealMode': SceneRevealMode.Instant
});
viewer.start();

let splatBrushConfig : SplatBrushConfig = {
    selectedStampArray: new UncompressedSplatArray()
};

// Get the user's selected file
const filePicker = document.getElementById("file-picker");
if (filePicker && filePicker instanceof HTMLInputElement) {
    filePicker.addEventListener("change", handlePickFile, false);
}
async function handlePickFile(this : HTMLInputElement) {
    const files = this.files;
    if (files) {
        const selectedFile = files[0];
        const result = await readFileToArrayBuffer(selectedFile);
        if (result && result instanceof ArrayBuffer) {
            const arrayBuffer : ArrayBuffer = result;
            // Load the scene into a splat array
            let stampArray = PlyParser.parseToUncompressedSplatArray(arrayBuffer, undefined);
            if (stampArray) {
                splatBrushConfig.selectedStampArray = stampArray;
            }
            else {
                console.log('Error: failed parseToUncompressedSplatArray.')
            }
            console.log(stampArray);
        }
    }
}
async function readFileToArrayBuffer(file : File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
}

const splatBrush = new SplatBrush(viewer, splatBrushConfig);

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