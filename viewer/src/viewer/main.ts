import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(18, 14, 22);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app')?.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(10,20,5);
scene.add(light);

function twinBox(name:string, position:THREE.Vector3, scale:THREE.Vector3){
 const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({color:0x667788}));
 mesh.name=name;
 mesh.position.copy(position);
 mesh.scale.copy(scale);
 scene.add(mesh);
 return mesh;
}

const tank=twinBox('TankTwin T-04',new THREE.Vector3(5,2,0),new THREE.Vector3(3,4,3));
const pipe=twinBox('PipeTwin P-17',new THREE.Vector3(0,1,0),new THREE.Vector3(8,.3,.3));
const wall=twinBox('WallTwin W-07',new THREE.Vector3(4,2,-5),new THREE.Vector3(10,4,.2));

const fire=new THREE.Mesh(new THREE.SphereGeometry(1.5,32,32),new THREE.MeshStandardMaterial({color:0xff5500,emissive:0xaa2200}));
fire.position.set(1,2,0);
scene.add(fire);

let t=0;
function animate(){
 requestAnimationFrame(animate);
 t+=0.02;
 fire.scale.setScalar(1+Math.sin(t)*0.15);
 renderer.render(scene,camera);
}
animate();

window.addEventListener('resize',()=>{
 camera.aspect=window.innerWidth/window.innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth,window.innerHeight);
});
