import ThreeMeshUI from 'three-mesh-ui';
import * as THREE from 'three';
import { set_custom_update_injection } from './Viewer.js';
import { SplatBufferGenerator } from './index.js';

export class SplatUI {
    constructor(splatBrush) {
        this.splatBrush = splatBrush;
        this.viewer = this.splatBrush.viewer;
        this.scene = this.viewer.sceneHelper.threeScene;
        this.renderer = this.viewer.renderer;
        this.cursor = new THREE.Vector3();

        this.width = 1;
        this.height = 0.5;

        this.makeUIPanel();
        setTimeout(() => {this.init()}, 500);

        this.onSelectStart = this.onSelectStart.bind(this);
        this.onSelectEnd = this.onSelectEnd.bind(this);
    }

    onSelectStart(controller) {
        controller.updateMatrixWorld( true );
        const pivot = controller.getObjectByName('pivot');
        this.cursor.setFromMatrixPosition(pivot.matrixWorld);
        this.is_selecting = true;
    }

    onSelectEnd() {
        this.is_selecting = false;
    }

    handleController(controller) {
        const pivot = controller.getObjectByName('pivot');
        this.cursor.setFromMatrixPosition(pivot.matrixWorld);
    }

    init() {
        this.is_selecting = false;

        console.log(this.renderer.xr.enabled, "HUH??");
        const controller1 = this.renderer.xr.getController( 0 );
        controller1.addEventListener( 'selectstart', () => this.onSelectStart(controller1) );
        controller1.addEventListener( 'selectend', () => this.onSelectEnd(controller1));
        this.scene.add(controller1);
        
        const controller2 = this.renderer.xr.getController( 1 );
        controller2.addEventListener( 'selectstart', () => this.onSelectStart(controller2) );
        controller2.addEventListener( 'selectend', () => this.onSelectEnd(controller2) );
        this.scene.add(controller2);
    
        const pivot = new THREE.Mesh( new THREE.IcosahedronGeometry( 0.01, 3 ) );
        pivot.name = 'pivot';
        pivot.position.z = -0.05;
    
        const group = new THREE.Group();
        group.add( pivot );
        controller1.add( group.clone() );
        controller2.add( group.clone() );

        set_custom_update_injection(() => {
            this.handleController(controller1);
            this.handleController(controller2);
            this.handlePanelMove();

            if (this.is_selecting) {
                this.splatBrush.addStamp(this.cursor.x, this.cursor.y, this.cursor.z);
                this.splatBrush.strokeBuffer = SplatBufferGenerator.getStandardGenerator(1, 0).generateFromUncompressedSplatArray(this.splatBrush.strokeArray);
                this.splatBrush.viewer.addSplatBuffers([this.splatBrush.strokeBuffer], [], false, false, false, true);
            }
        });

        console.log('done with init')

        setTimeout(() => {
            this.splatBrush.addStamp(10, 10, 10);
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
        const lookVector = new THREE.Vector3();
        const position = new THREE.Vector3();
    
        position.setFromMatrixPosition(this.viewer.camera.matrixWorld);
    
        lookVector.set(0, 0, -1); // Default forward direction in local space
        lookVector.applyMatrix4(this.viewer.camera.matrixWorld).sub(position).normalize();
    
        this.container.position.copy(
            position.clone().add(lookVector.clone().multiplyScalar(5))
        );
        // requestAnimationFrame(this.animate);
        ThreeMeshUI.update();
        // this.viewer.renderer.render(this.scene, this.viewer.camera);
    };
    
}