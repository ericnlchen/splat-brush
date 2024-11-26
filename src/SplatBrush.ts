import { SceneRevealMode, SplatBuffer, SplatBufferGenerator, Viewer } from './index.js';
import { UncompressedSplatArray } from './loaders/UncompressedSplatArray.js';
import throttle from '../node_modules/lodash/throttle.js';

export class SplatBrush {
    strokeSplatArray: UncompressedSplatArray;
    strokeSplatBuffer: SplatBuffer;
    viewer: Viewer;
    throttleRate: number;

    constructor(viewer : Viewer, throttleRate : number = 50) {
        this.strokeSplatArray = new UncompressedSplatArray(2);
        this.strokeSplatBuffer = new SplatBuffer();
        this.viewer = viewer;
        this.throttleRate = throttleRate;
        document.addEventListener('mousemove', throttle(this.handleMouseMove, this.throttleRate));
    }

    // Update stroke buffer on mousemove
    addStamp(x: number, y: number, z: number) {
        // Create 10 splats representing a stamp
        for(let i = 0; i < 10; i++){
            this.strokeSplatArray.addSplatFromComonents(
                // x, y, z
                x + 0.5*(Math.random() - 0.5), y + 0.5*(Math.random() - 0.5), z + 0.5*(Math.random() - 0.5), 
        
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

    screenToWorld(mX: number, mY: number) {

        return [mX, mY, 0] //TODO
    }

    // On mousemove, replace existing buffer with stroke buffer
    handleMouseMove = (e: any) => {
        if (e.metaKey) {

            let mX = 2 * e.clientX / window.innerWidth;
            let mY = 2 * e.clientY / window.innerHeight;

            let [worldX, worldY, worldZ] = this.screenToWorld(mX, mY);

            this.addStamp(worldX, worldY, worldZ);
        
            this.strokeSplatBuffer = SplatBufferGenerator.getStandardGenerator(1, 0).generateFromUncompressedSplatArray(this.strokeSplatArray);
            this.viewer.addSplatBuffers([this.strokeSplatBuffer], [], false, false, false, true);
        }
    }

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