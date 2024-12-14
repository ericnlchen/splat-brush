import { SceneRevealMode, Viewer, PlyParser, WebXRMode, SplatBufferGenerator } from './index.js';
import { UncompressedSplatArray } from './loaders/UncompressedSplatArray.js';
import { SplatBrush, SplatBrushConfig } from './SplatBrush'
// @ts-ignore
import * as THREE from 'three';
import { set_custom_update_injection } from './Viewer.js';
import { SplatUI } from './SplatUI.js'

console.log("HI!")

// UI
const threeScene = new THREE.Scene();
const UI = new SplatUI(threeScene);

// Start splat viewer
const viewer = new Viewer({
    'cameraUp': [0, 1, 0],
    'initialCameraPosition': [0, 2, 5],
    'initialCameraLookAt': [0, 0, 0],
    // 'sphericalHarmonicsDegree': 2, 
    // 'dynamicScene': true, # this breaks seeing the splats in VR for some reason
    'sceneRevealMode': SceneRevealMode.Instant,
    'threeScene': threeScene,
    // 'webXRMode': WebXRMode.AR
});
viewer.start();

const scene = viewer.sceneHelper!.threeScene;
const renderer = viewer.renderer;
const cursor = new THREE.Vector3();

setTimeout(() => {
    let is_selecting = false;

    function onSelectStart(this: any) {
        this.updateMatrixWorld( true );
        const pivot = this.getObjectByName('pivot');
        cursor.setFromMatrixPosition(pivot.matrixWorld);

        is_selecting = true;
    }

    function onSelectEnd() {
        is_selecting = false;
    }
    
    console.log(renderer.xr.enabled, "HUH??");
    const controller1 = renderer.xr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    scene.add(controller1);
    
    const controller2 = renderer.xr.getController( 1 );
    controller2.addEventListener( 'selectstart', onSelectStart );
    controller2.addEventListener( 'selectend', onSelectEnd );
    scene.add(controller2);

    const pivot = new THREE.Mesh( new THREE.IcosahedronGeometry( 0.01, 3 ) );
    pivot.name = 'pivot';
    pivot.position.z = -0.05;

    const group = new THREE.Group();
    group.add( pivot );
    controller1.add( group.clone() );
    controller2.add( group.clone() );

    function handleController(controller: any) {
        const pivot = controller.getObjectByName('pivot');
        cursor.setFromMatrixPosition(pivot.matrixWorld);
    }

    set_custom_update_injection(() => {
        handleController(controller1);
        handleController(controller2);

        if(is_selecting){
            const xrcam_position = new THREE.Vector3();
            xrcam_position.setFromMatrixPosition(viewer.camera.matrixWorld);
            const brush_position = new THREE.Vector3(cursor.x, cursor.y, cursor.z);

            // const look_vector = xrcam_position.sub(brush_position).normalize();
            const look_vector = new THREE.Vector3(0, 1, 0).normalize();
            const up_vector = splatBrush.brush_up_vectors[splatBrush.selected_brush_slot].normalize();

            const rot_axis = look_vector.clone().cross(up_vector).normalize();
            const angle = look_vector.angleTo(up_vector);
            const rot_mat4x4 = new THREE.Matrix4().makeRotationAxis(rot_axis, angle);
            const jitter_mat4x4 = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), Math.PI * 2 * Math.random());
            const final_mat = jitter_mat4x4.multiply(rot_mat4x4)

            splatBrush.addStamp(cursor.x, cursor.y, cursor.z, rot_mat4x4);
            splatBrush.strokeBuffer = SplatBufferGenerator.getStandardGenerator(1, 0).generateFromUncompressedSplatArray(splatBrush.strokeArray);
            splatBrush.viewer.addSplatBuffers([splatBrush.strokeBuffer], [], false, false, false, true);
        }
    });
    
}, 500);

let splatBrushConfig : SplatBrushConfig = {
    selectedStampArray: new UncompressedSplatArray()
};

// Get the user's selected file
const filePicker = document.getElementById("file-picker");
if (filePicker && filePicker instanceof HTMLInputElement) {
    filePicker.addEventListener("change", handlePickFile, false);
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
                splatBrush.loadBrush(stampArray);
            }
            else {
                console.log('Error: failed parseToUncompressedSplatArray.')
            }
            console.log(stampArray);
        }
    }
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