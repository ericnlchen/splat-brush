import ThreeMeshUI from 'three-mesh-ui';
import * as THREE from 'three';
import { set_custom_update_injection } from './Viewer.js';
import { SplatBufferGenerator } from './index.js';

const raycaster = new THREE.Raycaster();

export class SplatUI {
    constructor(splatBrush) {
        this.splatBrush = splatBrush;
        this.viewer = this.splatBrush.viewer;
        this.scene = this.viewer.sceneHelper.threeScene;
        this.renderer = this.viewer.renderer;
        this.cursor = new THREE.Vector3();
        this.palette = new THREE.Vector3();
        this.ui_circle_array = [];

        this.width = 0.7;
        this.height = 0.4;

        this.selectModeOn = false; // shows ray, allows picking stamps

        this.makeUIPanel();
        setTimeout(() => {this.init()}, 500);

        this.onSelectStart = this.onSelectStart.bind(this);
        this.onSelectEnd = this.onSelectEnd.bind(this);
    }

    onSelectStart(controller) {
        controller.updateMatrixWorld( true );
        const pivot = controller.getObjectByName('pivot');
        this.cursor.setFromMatrixPosition(pivot.matrixWorld);
        this.is_drawing = true;

	    // raycaster.setFromXRController(this.controller1);
        if (this.selectModeOn) {
            const rotationMatrix3 = new THREE.Matrix3();
            rotationMatrix3.setFromMatrix4(pivot.matrixWorld);
            raycaster.set(this.cursor, new THREE.Vector3(0, 0, -1).applyMatrix3(rotationMatrix3)); // ??
    
            const intersects = raycaster.intersectObjects([this.container], true );
            if(intersects.length > 0){
    
                // color selection logic here
                for(let i = 0; i < this.ui_circle_array.length; i++){
                    const intersects_ui_button = raycaster.intersectObjects([this.ui_circle_array[i]], true );
                    if(intersects_ui_button.length > 0){
                        this.splatBrush.selected_brush_slot = i;
                    }
                }
            }
        }
    }

    onSelectEnd() {
        this.is_drawing = false;
    }

    handleController1(controller) {
        const pivot = controller.getObjectByName('pivot');
        this.cursor.setFromMatrixPosition(pivot.matrixWorld);
    }

    handleController2(controller) {
        const pivotL = controller.getObjectByName('pivotL');
        this.palette.setFromMatrixPosition(pivotL.matrixWorld);
    }

    handleControllerGamepad() {
        // On metaquest pro:
        // - buttons[0] is main trigger
        // - buttons[1] is secondary trigger (squeeze?)
        // - buttons[2] is nothing?
        // - buttons[3] is joystick press
        // - buttons[4] is A button
        if (this.renderer.xr && this.renderer.xr.getSession()) {
            const sources = this.renderer.xr.getSession().inputSources;
            for (let i = 0; i < sources.length; i++) {
                if (i == 1) { // right controller
                    const gamepad = sources[i].gamepad;
                    if (gamepad) {
                        const buttons = gamepad.buttons;
                        if (buttons.length > 0) {
                            if (buttons[4].pressed) {
                                this.selectModeOn = true;
                            }
                            else {
                                this.selectModeOn = false;
                            }
                        }
                    }
                }
            }

        }
    }

    handleDrawSelectionRay(controller) {
        if (this.selectModeOn) {
            if (!this.selectionRay) {
                const rotationMatrix3 = new THREE.Matrix3();
                const pivot = controller.getObjectByName('pivot');
                this.cursor.setFromMatrixPosition(pivot.matrixWorld);
                rotationMatrix3.setFromMatrix4(pivot.matrixWorld);
                raycaster.set(this.cursor, new THREE.Vector3(0, 0, -1).applyMatrix3(rotationMatrix3));
        
                const rayGeometry = new THREE.BufferGeometry().setFromPoints([
                    raycaster.ray.origin,
                    raycaster.ray.origin.clone().add(raycaster.ray.direction.clone())
                ]);
                const rayMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red line
                this.selectionRay = new THREE.Line(rayGeometry, rayMaterial);
                this.scene.add(this.selectionRay);
            }
            else {
                // update selectionRay coords
                const rotationMatrix3 = new THREE.Matrix3();
                const pivot = controller.getObjectByName('pivot');
                this.cursor.setFromMatrixPosition(pivot.matrixWorld);
                rotationMatrix3.setFromMatrix4(pivot.matrixWorld);
                raycaster.set(this.cursor, new THREE.Vector3(0, 0, -1).applyMatrix3(rotationMatrix3));
                this.selectionRay.geometry?.setFromPoints([
                    raycaster.ray.origin,
                    raycaster.ray.origin.clone().add(raycaster.ray.direction.clone())
                ]);

                if(this.selectionRay.geometry) this.selectionRay.geometry.attributes.position.needsUpdate = true;
            }
        }
        else {
            this.scene.remove(this.selectionRay);
            this.selectionRay = undefined;
        }
    }

    init() {
        this.is_drawing = false;

        console.log(this.renderer.xr.enabled, "HUH??");
        this.controller1 = this.renderer.xr.getController( 1 );
        this.controller1.addEventListener( 'selectstart', () => this.onSelectStart(this.controller1) );
        this.controller1.addEventListener( 'selectend', () => this.onSelectEnd(this.controller1));
        this.scene.add(this.controller1);
        
        this.controller2 = this.renderer.xr.getController( 0 );
        this.controller2.addEventListener( 'selectstart', () => this.onSelectStart(this.controller2) );
        this.controller2.addEventListener( 'selectend', () => this.onSelectEnd(this.controller2) );
        this.scene.add(this.controller2);
    
        const pivot = new THREE.Mesh( new THREE.IcosahedronGeometry( 0.01, 3 ) );
        pivot.name = 'pivot';
        pivot.position.z = -0.05;
        const pivotL = new THREE.Mesh( new THREE.IcosahedronGeometry( 0.01, 3 ) );
        pivotL.name = 'pivotL';
        pivotL.position.z = -0.05;
    
        const group = new THREE.Group();
        group.add( pivot );
        const groupL = new THREE.Group();
        groupL.add( pivotL );
        this.controller1.add( group.clone() );
        this.controller2.add( groupL.clone() );

        set_custom_update_injection(() => {
            this.handleController1(this.controller1);
            this.handleController2(this.controller2);
            this.handleControllerGamepad();
            this.handleDrawSelectionRay(this.controller1);
            this.handlePanelMove();


            if (this.is_drawing && !this.selectModeOn) {
                // const xrcam_position = new THREE.Vector3();
                // xrcam_position.setFromMatrixPosition(this.viewer.camera.matrixWorld);
                // const brush_position = new THREE.Vector3(this.cursor.x, this.cursor.y, this.cursor.z);
                // const look_vector = xrcam_position.sub(brush_position).normalize();
                // const look_vector = new THREE.Vector3(0, 1, 0).normalize();
                const up_vector = this.splatBrush.brush_up_vectors[this.splatBrush.selected_brush_slot].normalize();
    
                const rotationMatrix3 = new THREE.Matrix3();
                const pivot = this.controller1.getObjectByName('pivot');
                this.cursor.setFromMatrixPosition(pivot.matrixWorld);
                rotationMatrix3.setFromMatrix4(pivot.matrixWorld);
                const look_vector = new THREE.Vector3(0, 1, 0).applyMatrix3(rotationMatrix3);

                // vector linine preview
                // const start = new THREE.Vector3(worldX, worldY, worldZ);
                // const end = start.clone().add(up_vector);
                // const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
                // const material = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red color
                // const line = new THREE.Line(geometry, material);
                // this.viewer.sceneHelper!.threeScene.add(line);
    
                // do the actual rotation
                const rot_axis = look_vector.clone().cross(up_vector).normalize();
                const angle = look_vector.angleTo(up_vector);
                const rot_mat4x4 = new THREE.Matrix4().makeRotationAxis(rot_axis, angle);
                // const jitter_mat4x4 = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), Math.PI * 2 * Math.random());
                // const final_mat = jitter_mat4x4.multiply(rot_mat4x4);
                const final_mat = rot_mat4x4;

                this.splatBrush.addStamp(this.cursor.x, this.cursor.y, this.cursor.z, final_mat);
                this.splatBrush.strokeBuffer = SplatBufferGenerator.getStandardGenerator(1, 0).generateFromUncompressedSplatArray(this.splatBrush.strokeArray);
                this.splatBrush.viewer.addSplatBuffers([this.splatBrush.strokeBuffer], [], false, false, false, true);
            }
        });

        console.log('done with init')

        setTimeout(() => {
            this.splatBrush.addStamp(10, 10, 10, new THREE.Matrix4());
            this.splatBrush.strokeBuffer = SplatBufferGenerator.getStandardGenerator(1, 0).generateFromUncompressedSplatArray(this.splatBrush.strokeArray);
            this.splatBrush.viewer.addSplatBuffers([this.splatBrush.strokeBuffer], [], false, false, false, true);
        }, 1000);
    }

    makeUIPanel() {
        this.container = new ThreeMeshUI.Block({
            width: this.width,
            height: this.height,
            padding: 0.05,
            fontFamily: 'https://unpkg.com/three-mesh-ui/examples/assets/Roboto-msdf.json',
            fontTexture: 'https://unpkg.com/three-mesh-ui/examples/assets/Roboto-msdf.png'
        });
        this.container.position.set( 0, 0, 0 );
        this.container.rotation.x = -0.3;

        // Add circular buttons
        const geometry = new THREE.CircleGeometry( 0.05, 32 ); 
        const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );

        const num_buttons = 5;
        const materials = [
            new THREE.MeshBasicMaterial( { color: 0xffff00 } ),
            new THREE.MeshBasicMaterial( { color: 0x00ffff } ),
            new THREE.MeshBasicMaterial( { color: 0xff00ff } ),
            new THREE.MeshBasicMaterial( { color: 0xf0f0f0 } ),
            new THREE.MeshBasicMaterial( { color: 0x0f0f0f } )
        ]

        for (let i = 0; i < num_buttons; i++) {
            let circle = new THREE.Mesh( geometry, materials[i] );
            let cx_0_1 = i / (num_buttons - 1);
            let cx_neg1_1 = 2 * (cx_0_1 - 0.5);
            let cx = cx_neg1_1 * ((this.width / 2) - (this.width / (2 * num_buttons)))
            circle.position.copy(new THREE.Vector3(cx, 0, 0.01)); // offset in front of the panel
            this.container.add( circle );
            this.ui_circle_array.push(circle);
        }
    
        this.container.add(
            new ThreeMeshUI.Text({
                content: "Select a Stamp",
                fontSize: 0.055
            }),
        );

        this.scene.add( this.container );
    };
    
    handlePanelMove = () => {
        // const lookVector = new THREE.Vector3();
        // const position = new THREE.Vector3();
    
        // position.setFromMatrixPosition(this.viewer.camera.matrixWorld);
    
        // lookVector.set(0, 0, -1); // Default forward direction in local space
        // lookVector.applyMatrix4(this.viewer.camera.matrixWorld).sub(position).normalize();
    
        // this.container.position.copy(
        //     position.clone().add(lookVector.clone().multiplyScalar(5))
        // );
        // ThreeMeshUI.update();

        this.container.position.copy(
            this.palette.clone()
        )
        const pivotL = this.controller2.getObjectByName('pivotL');
        this.container.quaternion.setFromRotationMatrix(pivotL.matrixWorld);

        ThreeMeshUI.update();
    };
    
}