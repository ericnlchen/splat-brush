import ThreeMeshUI from 'three-mesh-ui';
import * as THREE from 'three';

export class SplatUI {
    constructor(scene) {
        this.scene = scene;
        this.width = 1;
        this.height = 0.5;

        window.addEventListener('load', () => {
            this.makeTextPanel();
            this.animate();
        })
    }

    makeTextPanel() {
        const container = new ThreeMeshUI.Block({
            width: this.width,
            height: this.height,
            padding: 0.05,
            fontFamily: 'https://unpkg.com/three-mesh-ui/examples/assets/Roboto-msdf.json',
            fontTexture: 'https://unpkg.com/three-mesh-ui/examples/assets/Roboto-msdf.png'
        });
        container.position.set( 0, 0, 0 );
        container.rotation.x = -0.3;

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
            container.add( circle );
        }
    
        container.add(
            new ThreeMeshUI.Text({
                content: "Select a Stamp",
                fontSize: 0.055
            }),
        );

        this.scene.add( container );
    };
    
    animate = () => {
      requestAnimationFrame( this.animate );
      ThreeMeshUI.update();
    };
}