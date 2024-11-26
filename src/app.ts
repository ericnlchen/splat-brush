import { SceneRevealMode, SplatBuffer, SplatBufferGenerator, Viewer } from './index.js';
import { UncompressedSplatArray } from './loaders/UncompressedSplatArray.js';
import throttle from '../node_modules/lodash/throttle.js';

console.log("HI!")

const viewer = new Viewer({
    'cameraUp': [0.01933, -0.75830, -0.65161],
    'initialCameraPosition': [1.54163, 2.68515, -6.37228],
    'initialCameraLookAt': [0.45622, 1.95338, 1.51278],
    'sphericalHarmonicsDegree': 2,
    'dynamicScene': true,
    'sceneRevealMode': SceneRevealMode.Instant
});

viewer.start();


// how to load a ply, we probs can ignore
// let path = './assets/data/auditorium_by_the_sea.ply';
// viewer.addSplatScene(path, {
//   'progressiveLoad': false
// })
// .then(() => {
//     viewer.start();
// });

const uncompressed_splats = new UncompressedSplatArray(2);

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

class SplatBrush {
    strokeSplatArray: UncompressedSplatArray;
    strokeSplatBuffer: SplatBuffer;

    constructor() {
        this.strokeSplatArray = new UncompressedSplatArray(2);
        this.strokeSplatBuffer = new SplatBuffer();
    }

    // Update stroke buffer on mousemove
    updateStrokeBuffer(x: number, y: number) {
        // Create 10 splats representing a stamp
        for(let i = 0; i < 10; i++){
            this.strokeSplatArray.addSplatFromComonents(
                // x, y, z
                x + 0.5*(Math.random() - 0.5), y + 0.5*(Math.random() - 0.5), 0, 
        
                // s0, s1, s2
                0.05, 0.05, 0.05,      
        
                // quaternion r0, r1, r2, r3
                Math.random(), Math.random(), Math.random(), Math.random(),                 
        
                // r, g, b
                Math.random() * 255 | 0, Math.random() * 255 | 0, Math.random() * 255 | 0, 
        
                // opacity
                150,                                                                        
                ...new Array(24).fill(0)
            )
        }
    }

    // On mousemove, replace existing buffer with stroke buffer
    handleMouseMove = (e: any) => {
        if (e.metaKey) {

            let mX = 2 * e.clientX / window.innerWidth;
            let mY = 2 * e.clientY / window.innerHeight;

            this.updateStrokeBuffer(mX, mY);
        
            this.strokeSplatBuffer = SplatBufferGenerator.getStandardGenerator(1, 0).generateFromUncompressedSplatArray(this.strokeSplatArray);
            viewer.addSplatBuffers([this.strokeSplatBuffer], [], false, false, false, true);
        }
    }

    throttledHandleMouseMove = throttle(this.handleMouseMove, 50)


    /* NOTES:

    - when sceneRevealMode is not instant, the Gaussians loaded later never get fully opaque for some reason

    - when we load in a bunch of spherical Gaussians, why is one of them always stretched thin?? It's the last Gaussian added
        ==> every time we add Gaussians, we should add one more at the end that is completely transparent
        - Or maybe it's the first Gaussian that's thin??

    - with less than 5 gaussians, they behave super weird, looking like semicircles that always face forward
        this has to do with total gaussians in the scene, doesn't matter if they are added in multiple batches

    - with less than 3 Gaussians, nothing shows up at all

    - after adding a bunch of Gaussians randomly get RangeError
        - something to do with sortWorker, which gets transforms?
        - it's because there's a constant MaxScenes which limits the amount of scenes we can load (currently 32)

    */
}

const splatBrush = new SplatBrush()
document.addEventListener('mousemove', splatBrush.throttledHandleMouseMove)