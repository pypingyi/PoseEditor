/// <reference path="../typings/threejs/three.d.ts"/>
/// <reference path="../ext/TransformControls.d.ts"/>
/// <reference path="../ext/OrbitControls.d.ts"/>

module Bonedit {
    export class Editor {
        constructor() {
            this.width  = 600;
            this.height = 400;
            this.fov    = 60;
            this.aspect = this.width / this.height;
            this.near   = 1;
            this.far    = 1000;

            //
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(this.fov, this.aspect, this.near, this.far);
            this.camera.position.set(0, 0, 50);

            this.projector = new THREE.Projector();

            this.directionalLight = new THREE.DirectionalLight(0xffffff);
            this.directionalLight.position.set(0, 0.7, 0.7);
            this.scene.add(this.directionalLight);

            this.anbientLight = new THREE.AmbientLight(0xaaaaaa);
            this.scene.add(this.anbientLight);

            //
            this.scene2d = new THREE.Scene();
            this.camera2d = new THREE.OrthographicCamera(0, this.width, 0, this.height, 0.001, 10000);

            //
            this.renderer = new THREE.WebGLRenderer({
                preserveDrawingBuffer: true
            });
            this.renderer.setSize(this.width, this.height);
            this.renderer.setClearColor(0x000000, 1);
            this.renderer.autoClear = false;
            document.body.appendChild(this.renderer.domElement);

            //
            this.transformCtrl = new THREE.TransformControls(this.camera, this.renderer.domElement);
            this.transformCtrl.setMode("rotate");
            this.transformCtrl.setSpace("local");
            this.transformCtrl.detach();
            this.transformCtrl.addEventListener('change', () => this.onTransformCtrl());
            this.scene.add(this.transformCtrl);

            //
            this.controls = new THREE.OrbitControls(this.camera);
            this.controls.damping = 0.2;
            //this.controls.enabled = true;
            //this.controls.addEventListener('change', render);

            //
            this.setupModel();

            //
            this.renderer.domElement.addEventListener('mousedown', (e) => this.boneRay(e), false);

            //
            this.renderLoop();
        }

        public toDataUrl(type: string = 'png') {
            switch(type) {
            case "png":
                return this.renderer.domElement.toDataURL("image/png");

            case "jpeg":
                return this.renderer.domElement.toDataURL("image/jpeg");

            case "json":
                if ( this.model != null ) {
                    var obj = this.model.jointData();
                    return "data: text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));

                } else {
                    throw new Error("Model was not loaded");
                }

            default:
                throw new Error("File format '" + type + "' is not supported");
            }
        }

        public loadJointDataFromString(data: string) {
            var joint_data = <{ [key: number]: any; }>JSON.parse(data);
            this.model.loadJointData(joint_data);
        }

        private setupModel() {
            this.model = new Model('models/body_try2.js', this.scene, this.scene2d);
        }

        private onTransformCtrl() {
            if ( this.transformCtrl.axis != null ) {
                this.isOnManipurator = true;

                if ( this.selectedSphere != null ) {
                    var bone = this.model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];

                    var toto = new THREE.Matrix4().getInverse(this.selectedBaseRot);

                    var to_qq = new THREE.Matrix4().extractRotation(this.selectedSphere.matrixWorld).clone();

                    var to_q = new THREE.Quaternion().setFromRotationMatrix(toto.multiply(to_qq)).normalize();

                    bone.quaternion.copy(to_q);
                }

	        } else {
                this.isOnManipurator = false;
            }

            this.transformCtrl.update();
        }

        private boneRay(e: MouseEvent) {
            if (this.isOnManipurator) {
                return;
            }

            var dom_pos = this.renderer.domElement.getBoundingClientRect();

            var mouse_x = e.clientX - dom_pos.left;
            var mouse_y = e.clientY - dom_pos.top;
            var pos = this.screenToWorld(new THREE.Vector2(mouse_x, mouse_y));

            var ray = new THREE.Raycaster(
                this.camera.position,
                pos.sub(this.camera.position).normalize()
            );

            var conf_objs = ray.intersectObjects(this.model.joint_spheres);

            // reset color of markers
            this.model.joint_markers.forEach((marker) => {
                marker.material.color.setHex(this.model.normalColor);
            });

            this.selectedSphere = null;
            if ( conf_objs.length > 0 ) {
                var conf_obj = conf_objs[0];

                this.selectedSphere = conf_obj.object;

                //
                var index = this.selectedSphere.userData.jointIndex;
                this.model.joint_markers[index].material.color.setHex(this.model.selectedColor);
            }

            if ( this.selectedSphere == null ) {
                this.transformCtrl.detach();
                this.selectedBaseRot = null;

            } else {
                var bone = this.model.mesh.skeleton.bones[this.selectedSphere.userData.jointIndex];

                //
                var mat = new THREE.Matrix4().extractRotation(bone.matrixWorld);
                var to_q = new THREE.Quaternion().setFromRotationMatrix(mat);
                this.selectedSphere.quaternion.copy(to_q);

                this.transformCtrl.attach(this.selectedSphere);
                this.transformCtrl.update();

                var t_r = bone.rotation.clone();
                bone.rotation.x = 0.0;
                bone.rotation.y = 0.0;
                bone.rotation.z = 0.0;

                bone.updateMatrixWorld(true);

                this.selectedBaseRot = new THREE.Matrix4().extractRotation(bone.matrixWorld);

                bone.rotation.x = t_r.x;
                bone.rotation.y = t_r.y;
                bone.rotation.z = t_r.z;
                bone.updateMatrixWorld(true);
            }
        }

        private screenToWorld(screen_pos: THREE.Vector2): THREE.Vector3 {
            var window_half_x = this.width / 2.0;
            var window_half_y = this.height / 2.0;

            var world_pos = new THREE.Vector3();
            world_pos.x = screen_pos.x / window_half_x - 1;
            world_pos.y = -screen_pos.y / window_half_y + 1;
            this.projector.unprojectVector(world_pos, this.camera);

            return world_pos;
        }

        private worldToScreen(world_pos: THREE.Vector3): THREE.Vector2 {
            var window_half_x = this.width / 2.0;
            var window_half_y = this.height / 2.0;

            var screen_pos = world_pos.clone();
            this.projector.projectVector(screen_pos, this.camera);
            screen_pos.x = ( screen_pos.x + 1 ) * window_half_x;
            screen_pos.y = ( -screen_pos.y + 1) * window_half_y;

            return new THREE.Vector2(screen_pos.x, screen_pos.y);
        }


        private renderLoop = () => {
            requestAnimationFrame(this.renderLoop);

	        this.scene.updateMatrixWorld(true);
            this.scene2d.updateMatrixWorld(true);

            if ( this.model.isReady() ) {
                //
                this.model.mesh.skeleton.bones.forEach((bone, index) => {
                    var b_pos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
                    var s_b_pos = this.worldToScreen(b_pos);

                    this.model.joint_markers[index].position.set(s_b_pos.x, s_b_pos.y, -1);

                    this.model.joint_spheres[index].position.set(b_pos.x, b_pos.y, b_pos.z);
                });
            }

            this.renderer.clear();

            this.renderer.render(this.scene, this.camera);
            this.renderer.render(this.scene2d, this.camera2d);
        }


        //
        private width: number;
        private height: number;
        private fov: number;
        private aspect: number;
        private near: number;
        private far: number;

        //
        private model: Model = null;

        //
        private renderer: THREE.WebGLRenderer;

        //
        private scene: THREE.Scene;
        private camera: THREE.Camera;
        private projector: THREE.Projector;
        private directionalLight: THREE.DirectionalLight;
        private anbientLight: THREE.AmbientLight;
        private transformCtrl: THREE.TransformControls;
        private controls: THREE.OrbitControls;

        //
        private scene2d: THREE.Scene;
        private camera2d: THREE.Camera;

        //
        private isOnManipurator: boolean = false;
        private selectedSphere: THREE.Object3D = null;
        private selectedBaseRot: THREE.Matrix4 = null;
    }


    //
    class Model
    {
        constructor(path: string, main_scene: THREE.Scene, scene2d: THREE.Scene) {
            //
            var loader = new THREE.JSONLoader();
            loader.load(path, (geometry, materials/*unused*/) => {
                // TODO: change this
                var material = new THREE.MeshLambertMaterial({
                    color: 0xffffff,
                    skinning: true
                });

                //
                this.mesh = new THREE.SkinnedMesh(geometry, material);
                this.mesh.scale.set(4, 4, 4);
                main_scene.add(this.mesh);

                //skinnedMesh.position.y = 50;

                //
                this.mesh.skeleton.bones.forEach((bone) => {
                    bone.matrixWorldNeedsUpdate = true;
                });

                // load textures
                var texture = THREE.ImageUtils.loadTexture("images/marker.png");
                this.mesh.skeleton.bones.forEach((bone, index) => {
                    var material = new THREE.SpriteMaterial({map: texture, color: this.normalColor});
                    var sprite = new THREE.Sprite(material);
                    sprite.scale.set(16.0, 16.0, 1);

                    this.joint_markers.push(sprite);
                    this.scene2d.add(sprite);
                });

                // make sphere objects
                this.mesh.skeleton.bones.forEach((bone, index) => {
                    var sphere_geo = new THREE.SphereGeometry(3, 20, 20);
                    var material = new THREE.MeshBasicMaterial({wireframe: true});
                    var sphere = new THREE.Mesh(sphere_geo, material);
                    sphere.matrixWorldNeedsUpdate = true;
                    sphere.userData = {
                        jointIndex: index
                    };

                    sphere.visible = false;
                    this.joint_spheres.push(sphere);
                    this.scene.add(sphere);
                });

                this.ready = true;
            });

            //
            this.scene = main_scene;
            this.scene2d = scene2d;
        }

        destruct(): void {
            this.ready = false;
        }

        isReady(): boolean {
            return this.ready;
        }

        jointData() {
            var joint_data: { [key: number]: any; } = {};
            this.mesh.skeleton.bones.forEach((bone, index) => {
                joint_data[index] = {rotation: bone.quaternion};
            });

            return joint_data;
        }

        loadJointData(joint_data: { [key: number]: any; }) {
            for( var key in  joint_data ) {
                var raw_q = joint_data[key];
                var rot = raw_q['rotation'];
                var x = <number>rot['_x'];
                var y = <number>rot['_y'];
                var z = <number>rot['_z'];
                var w = <number>rot['_w'];

                this.mesh.skeleton.bones[key].quaternion.x = x;
                this.mesh.skeleton.bones[key].quaternion.y = y;
                this.mesh.skeleton.bones[key].quaternion.z = z;
                this.mesh.skeleton.bones[key].quaternion.w = w;
            }
        }

        //
        private ready: boolean = false;

        //
        selectedColor = 0xff0000;
        normalColor = 0x0000ff;

        //
        scene: THREE.Scene;
        scene2d: THREE.Scene;

        //
        mesh: THREE.SkinnedMesh = null;

        //
        joint_markers: Array<THREE.Sprite> = [];
        joint_spheres: Array<THREE.Mesh> = [];
    }
}