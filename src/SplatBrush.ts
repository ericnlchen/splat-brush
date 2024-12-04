import { PlyParser, SceneRevealMode, SplatBuffer, SplatBufferGenerator, Viewer } from './index.js';
import { UncompressedSplatArray } from './loaders/UncompressedSplatArray.js';
import throttle from '../node_modules/lodash/throttle.js';
import * as THREE from 'three';

// Config object to pass to splatBrush
export interface SplatBrushConfig {
    selectedStampArray : UncompressedSplatArray
}
 
export class SplatBrush {
    strokeArray: UncompressedSplatArray;
    strokeBuffer: SplatBuffer;
    viewer: Viewer;
    config: SplatBrushConfig;
    throttleRate: number;
    raycaster: THREE.Raycaster;

    constructor(viewer : Viewer, config : SplatBrushConfig) {
        this.strokeArray = new UncompressedSplatArray(2);
        this.strokeBuffer = new SplatBuffer();
        this.viewer = viewer;
        this.config = config;
        this.throttleRate = 50;
        this.raycaster = new THREE.Raycaster();
        document.addEventListener('mousemove', throttle(this.handleMouseMove, this.throttleRate));
    }

    // Update stroke buffer on mousemove
    addStamp(worldX: number, worldY: number, worldZ: number) {

        if (this.config.selectedStampArray.splatCount > 0) {
            // Add the loaded stamp splats
            for (let i = 0; i < this.config.selectedStampArray.splatCount; i++) {
                let [x, y, z, scale0, scale1, scale2, rot0, rot1, rot2, rot3, r, g, b, opacity, ...rest] = this.config.selectedStampArray.splats[i];
                
                // Scale down
                const stampScale = 0.2;
                scale0 = scale0 * stampScale;
                scale1 = scale1 * stampScale
                scale2 = scale2 * stampScale
                x = x * stampScale;
                y = y * stampScale;
                z = z * stampScale;

                // Translate
                x = x + worldX;
                y = y + worldY;
                z = z + worldZ;

                this.strokeArray.addSplatFromComonents(
                    x, y, z,
                    scale0, scale1, scale2,
                    rot0, rot1, rot2, rot3,
                    r, g, b,
                    opacity,
                    ...rest
                )
            }
        }
        else {
            // Create a stamp from random splats
            for (let i = 0; i < 10; i++) {
                this.strokeArray.addSplatFromComonents(
                    // x, y, z
                    worldX + 0.5*(Math.random() - 0.5), worldY + 0.5*(Math.random() - 0.5), worldZ + 0.5*(Math.random() - 0.5), 
            
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
    }

    screenToWorld(mX: number, mY: number) {
        const pointer = new THREE.Vector2();

        // To normalized device coords (-1 to +1)
        pointer.x = (mX / window.innerWidth) * 2 - 1;
        pointer.y = -(mY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(pointer, this.viewer.camera);

        // Draw on an orthogonal plane at a constant distance from the camera
        const ray = this.raycaster.ray;
        const worldPt = ray.origin.addScaledVector(ray.direction, 10).toArray()

        return worldPt
    }

    // On mousemove, replace existing buffer with stroke buffer
    handleMouseMove = (e: any) => {
        if (e.metaKey) {
            let [worldX, worldY, worldZ] = this.screenToWorld(e.clientX, e.clientY);

            this.addStamp(worldX, worldY, worldZ);
        
            this.strokeBuffer = SplatBufferGenerator.getStandardGenerator(1, 0).generateFromUncompressedSplatArray(this.strokeArray);
            this.viewer.addSplatBuffers([this.strokeBuffer], [], false, false, false, true);
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