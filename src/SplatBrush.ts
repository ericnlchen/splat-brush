import { PlyParser, SceneRevealMode, SplatBuffer, SplatBufferGenerator, Viewer } from './index.js';
import { UncompressedSplatArray } from './loaders/UncompressedSplatArray.js';
// @ts-ignore
import throttle from '../node_modules/lodash/throttle.js';
// @ts-ignore
import * as THREE from 'three';
import { get_waiting_for_render, set_waiting_for_render } from './Viewer.js';
import * as numeric from 'numeric';
import * as math from 'mathjs';
import * as SVD from 'svd-js';

// Config object to pass to splatBrush
export interface SplatBrushConfig {
    selectedStampArray : UncompressedSplatArray
}

const generator = SplatBufferGenerator.getStandardGenerator(1, 0);
let num_strokes = 0;
let new_stroke_flag = false;
export const get_num_strokes = () => num_strokes;
export const get_new_stroke_flag = () => new_stroke_flag;
export const set_new_stroke_flag = (v: boolean) => new_stroke_flag = v;


export class SplatBrush {
    strokeArray: UncompressedSplatArray;
    strokeBuffer: SplatBuffer;
    viewer: Viewer;
    config: SplatBrushConfig;
    throttleRate: number;
    raycaster: THREE.Raycaster;
    is_drawing: boolean = false;

    brush_og_arrays: UncompressedSplatArray[] = [];
    brush_up_vectors: THREE.Vector3[] = [];
    brush_num_subsamples = 8;
    brush_subsample_size = 1024;
    brush_subsample_arrays: number[][][][] = []; // [slot][subsample][splat index][params]
    selected_brush_slot = -1;

    constructor(viewer : Viewer, config : SplatBrushConfig) {
        this.strokeArray = new UncompressedSplatArray(2);
        this.strokeBuffer = new SplatBuffer();
        this.viewer = viewer;
        this.config = config;
        this.throttleRate = 50; // ms
        this.raycaster = new THREE.Raycaster();
        document.addEventListener('mousemove', throttle(this.handleMouseMove, this.throttleRate));
        document.addEventListener('keydown', (key) => {
            if(key.altKey){
                this.is_drawing = true;
                this.start_stroke();
            }
        });
        document.addEventListener('keyup', (key) => {
            this.is_drawing = false;
            this.end_stroke();
        });
    }

    loadBrush(array: UncompressedSplatArray){
        this.brush_og_arrays.push(array);
        this.selected_brush_slot = this.brush_og_arrays.length - 1;
        const current_brush_subsample_arrays = [];

        // compute up vector
        const per_max_scales: number[] = [];
        const positions: [number, number, number][] = [];
        for(let i = 0; i < array.splatCount; i++){
            let [x, y, z, scale0, scale1, scale2, rot0, rot1, rot2, rot3, r, g, b, opacity, ...rest] = array.splats[i];
            positions.push([x, y, z]);
            per_max_scales.push(Math.max(scale0, scale1, scale2));
        }
        const center = positions
            .reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0])
            .map(n => n / positions.length)
        const centered_positions = positions.map(([x, y, z], i) => [
            (x - center[0]), 
            (y - center[1]), 
            (z - center[2])
        ] as [number, number, number]);

        const mean_max_scale = per_max_scales.reduce((a, b) => a + b) / per_max_scales.length;
        const { Q1, Q3 } = findQuartiles(per_max_scales);
        console.log("SCALE BOUNDS", min_array(per_max_scales), max_array(per_max_scales))
        console.log("SCALE QUARTILES", Q1, Q3);

        const { u, v, q } = SVD.SVD(centered_positions);
        console.log('u, v, q', u, v, q)
        const index_smallest = q.map(((n, i) => [n, i])).sort((a, b) => b[0] - a[0])[0][1];
        const normal = v[index_smallest];
        const up_vector = new THREE.Vector3(normal[0], normal[2], normal[1]);
        // if(up_vector.dot(new THREE.Vector3(0, 1, 0)) < 0) up_vector.multiplyScalar(-1);
        up_vector.normalize();
        // this.brush_up_vectors.push(up_vector);

        const start = new THREE.Vector3(0, 0, 0);
        v.forEach(v => {
            const end = start.clone().add(new THREE.Vector3(...v));
            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const material = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red color
            const line = new THREE.Line(geometry, material);
            this.viewer.sceneHelper!.threeScene.add(line);
        })

        const sampled_normals: [number, number, number][] = [];
        while(sampled_normals.length < 100000) {
            const i0 = Math.random() * array.splatCount | 0;
            const i1 = Math.random() * array.splatCount | 0;
            const i2 = Math.random() * array.splatCount | 0;
            if(i0 == i1 || i1 == i2 || i2 == i0) continue;
            let [x_p0, y_p0, z_p0, scale0_p0, scale1_p0, scale2_p0, rot0_p0, rot1_p0, rot2_p0, rot3_p0, r_p0, g_p0, b_p0, ...rest_p0] = array.splats[i0];
            let [x_p1, y_p1, z_p1, scale0_p1, scale1_p1, scale2_p1, rot0_p1, rot1_p1, rot2_p1, rot3_p1, r_p1, g_p1, b_p1, ...rest_p1] = array.splats[i1];
            let [x_p2, y_p2, z_p2, scale0_p2, scale1_p2, scale2_p2, rot0_p2, rot1_p2, rot2_p2, rot3_p2, r_p2, g_p2, b_p2, ...rest_p2] = array.splats[i2];
            
            let max_scale_p0 = Math.max(scale0_p0, scale1_p0, scale2_p0); // filter out too large or too small
            let max_scale_p1 = Math.max(scale0_p1, scale1_p1, scale2_p1);
            let max_scale_p2 = Math.max(scale0_p2, scale1_p2, scale2_p2);
            if(max_scale_p0 < Q1 || max_scale_p0 > Q3) continue;
            if(max_scale_p1 < Q1 || max_scale_p1 > Q3) continue;
            if(max_scale_p2 < Q1 || max_scale_p2 > Q3) continue;
            if(r_p0 > 200 && g_p0 > 200 && b_p0 > 200) continue; // filter out white
            if(r_p1 > 200 && g_p1 > 200 && b_p1 > 200) continue; // filter out white
            if(r_p2 > 200 && g_p2 > 200 && b_p2 > 200) continue; // filter out white

            const p0 = new THREE.Vector3(x_p0, y_p0, z_p0);
            const p1 = new THREE.Vector3(x_p1, y_p1, z_p1);
            const p2 = new THREE.Vector3(x_p2, y_p2, z_p2);

            const e1 = p1.sub(p0);
            const e2 = p2.sub(p0);
            const normal = e1.cross(e2).normalize();
            if(normal.dot(new THREE.Vector3(0, 1, 0)) < 0) normal.multiplyScalar(-1);
            sampled_normals.push([normal.x, normal.y, normal.z]);
        }
        const avg_normal = sampled_normals
            .reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0])
            .map(n => n / sampled_normals.length);
        const end = start.clone().add(new THREE.Vector3(...avg_normal));
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Red color
        const line = new THREE.Line(geometry, material);
        this.viewer.sceneHelper!.threeScene.add(line);
        this.brush_up_vectors.push(new THREE.Vector3(...avg_normal));

        console.log('COMPUTED UP VECTOR', up_vector)

        // get subsamples
        for(let n = 0; n < this.brush_num_subsamples; n++){
            let subsample_splats: number[][] = [];
            while(subsample_splats.length < this.brush_subsample_size){
                let i = Math.random() * array.splatCount | 0;
                let [x, y, z, scale0, scale1, scale2, rot0, rot1, rot2, rot3, r, g, b, opacity, ...rest] = array.splats[i];

                let max_scale = Math.max(scale0, scale1, scale2); // filter out too large or too small
                if(max_scale < Q1 || max_scale > Q3) continue;
                if(r > 200 && g > 200 && b > 200) continue; // filter out white
                if(Math.max(r, g, b) == r &&                // filter out pink
                    (r > 150 && g < 150 && b < 150) ||
                    (r > 100 && g < 100 && b < 100) ||
                    (r >  75 && g <  75 && b <  75)
                ) continue;

                const [h, s, l] = rgbToHsl(r, g, b);
                const [nr, ng, nb] = hslToRgb(h, clamp(s * 1.5, 0, 100), l);

                subsample_splats.push([
                    x - center[0], 
                    y - center[1], 
                    z - center[2],
                    scale0, scale1, scale2,
                    rot0, rot1, rot2, rot3,
                    nr, ng, nb,
                    opacity,
                    ...rest
                ]);
            }
            current_brush_subsample_arrays.push(subsample_splats);
        }
        this.brush_subsample_arrays.push(current_brush_subsample_arrays);
    }

    // Update stroke buffer on mousemove
    addStamp(worldX: number, worldY: number, worldZ: number, rot_mat: THREE.Matrix4) {
        if(this.selected_brush_slot !== -1){
            let subsamples = this.brush_subsample_arrays[this.selected_brush_slot];
            let chosen_subsample = subsamples[Math.random() * subsamples.length | 0];
            console.log(Math.random() * subsamples.length |0)

            for (let i = 0; i < chosen_subsample.length; i++) {
                let [x, y, z, scale0, scale1, scale2, rot0, rot1, rot2, rot3, r, g, b, opacity, ...rest] = chosen_subsample[i];
                
                // Scale down
                const stampScale = 0.2;
                const sizing_scale = 5;
                scale0 = scale0 * stampScale * sizing_scale;
                scale1 = scale1 * stampScale * sizing_scale
                scale2 = scale2 * stampScale * sizing_scale
                x = x * stampScale;
                y = y * stampScale;
                z = z * stampScale;

                const old_pos = new THREE.Vector3(x, y, z);
                const new_pos = old_pos.applyMatrix4(rot_mat);
                x = new_pos.x;
                y = new_pos.y;
                z = new_pos.z;

                // Translate
                x = x + worldX;
                y = y + worldY;
                z = z + worldZ;

                this.strokeArray.addSplat([
                    x, y, z,
                    scale0, scale1, scale2,
                    rot0, rot1, rot2, rot3,
                    r, g, b,
                    opacity,
                    ...rest
                ]);
            }
        }
        else {
            // Create a stamp from random splats
            const jitter_radius = 0.2;
            const scale = 0.02;
            for (let i = 0; i < 2; i++) {
                this.strokeArray.addSplat([
                    // x, y, z
                    worldX + jitter_radius*2*(Math.random() - 0.5), worldY + jitter_radius*2*(Math.random() - 0.5), worldZ + jitter_radius*2*(Math.random() - 0.5), 
                    // s0, s1, s2
                    scale, scale, scale,      
                    // quaternion r0, r1, r2, r3
                    Math.random(), Math.random(), Math.random(), Math.random(),                 
                    // r, g, b
                    Math.random() * 255 | 0, Math.random() * 255 | 0, Math.random() * 255 | 0, 
                    // opacity
                    150,                                                                        
                    ...new Array(24).fill(0)
                ])
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

    start_stroke(){
        this.strokeArray = new UncompressedSplatArray(2);
        new_stroke_flag = true;
    }

    end_stroke(){
        num_strokes += 1;
    }

    // On mousemove, replace existing buffer with stroke buffer
    handleMouseMove = (e: any) => {
        if (this.is_drawing) {
            if(get_waiting_for_render() === true) return;
            set_waiting_for_render(true);

            let [worldX, worldY, worldZ] = this.screenToWorld(e.clientX, e.clientY);

            const xrcam_position = new THREE.Vector3();
            xrcam_position.setFromMatrixPosition(this.viewer.camera.matrixWorld);
            const brush_position = new THREE.Vector3(worldX, worldY, worldZ);
            // const look_vector = xrcam_position.sub(brush_position).normalize();
            const look_vector = new THREE.Vector3(0, 1, 0).normalize();
            const up_vector = this.brush_up_vectors[this.selected_brush_slot].normalize();

            // vector linine preview
            const start = new THREE.Vector3(worldX, worldY, worldZ);
            const end = start.clone().add(up_vector);
            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const material = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red color
            const line = new THREE.Line(geometry, material);
            this.viewer.sceneHelper!.threeScene.add(line);

            // do the actual rotation
            const rot_axis = look_vector.clone().cross(up_vector).normalize();
            const angle = look_vector.angleTo(up_vector);
            // const rot_mat4x4 = new THREE.Matrix4();
            const rot_mat4x4 = new THREE.Matrix4().makeRotationAxis(rot_axis, angle);
            const jitter_mat4x4 = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), Math.PI * 2 * Math.random());
            const final_mat = jitter_mat4x4.multiply(rot_mat4x4)

            this.addStamp(worldX, worldY, worldZ, final_mat);
            this.strokeBuffer = generator.generateFromUncompressedSplatArray(this.strokeArray);
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

function max_array(array: number[]) {
    let max = array[0];
    for(let n of array){
        if(n > max) max = n;
    }
    return max;
}
function min_array(array: number[]) {
    let min = array[0];
    for(let n of array){
        if(n < min) min = n;
    }
    return min;
}

function findQuartiles(numbers: number[]) {
    if (!Array.isArray(numbers) || numbers.length === 0) {
        throw new Error("Input must be a non-empty array of numbers.");
    }

    // Sort the numbers in ascending order
    const sorted = [...numbers].sort((a, b) => a - b);

    // Helper function to find percentile
    function percentile(sortedArr: number[], p: number) {
        const index = (sortedArr.length - 1) * p;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
    }

    // Find Q1 (25th percentile) and Q3 (75th percentile)
    const Q1 = percentile(sorted, 0.25);
    const Q3 = percentile(sorted, 0.75);

    return { Q1, Q3 };
}

function rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
  
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
  
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
  
      h /= 6;
    }
  
    return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number) {
    // Normalize h, s, and l values to be between 0 and 1
    h /= 360;
    s /= 100;
    l /= 100;
  
    let r, g, b;
  
    if (s === 0) {
      // achromatic (gray)
      r = g = b = l; 
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      }
  
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
  
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
  
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function clamp(n: number, min: number, max: number){
    return Math.min(max, Math.max(n, min));
}