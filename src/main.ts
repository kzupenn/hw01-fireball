import {vec3, vec4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
  red: 256,
  green: 210,
  blue: 10,
  'upload a song': function() {document.getElementById('myInput').click();},
};

let icosphere: Icosphere;
let square: Square;
let cube: Cube;
let prevTesselations: number = 5;
let prevFragVert = {frag: 0, vert:0};

function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
  cube = new Cube(vec3.fromValues(0, 0, 0), 1);
  cube.create();
}

const fragvert = {
  frag: 0,
  vert: 0
}

const audio_decay = 0.07;
const flame_max = 500;

function handleFiles(event: any) {
  var files = event.target.files;
  playAudio(URL.createObjectURL(files[0]));
  if(fragvert.frag == 0){
    fragvert.frag = 1;
  }
  else {
    fragvert.frag = 0;
  }
  if(fragvert.vert == 0){
    fragvert.vert = 1;
  }
  else {
    fragvert.vert = 0;
  }
}


//Audio
var audioTune, context, src, analyser : any, dataArray : Uint8Array, oldDataArray: Float32Array, tempdata : Float32Array, prevdata : Float32Array;
dataArray = new Uint8Array(128);
var fireballed: boolean = false;

function playAudio(file: any) {
  fireballed = true;
  audioTune = new Audio(file);
  audioTune.crossOrigin = "anonymous";
  context = new AudioContext();
  src = context.createMediaElementSource(audioTune);
  analyser = context.createAnalyser();

  audioTune.load();
  audioTune.play();
  

  src.connect(analyser);
  analyser.connect(context.destination);

  analyser.fftSize = 256;

  var bufferLength = analyser.frequencyBinCount;
  console.log(bufferLength);

  dataArray = new Uint8Array(bufferLength);
  oldDataArray = new Float32Array(bufferLength);
};


function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add a hidden file upload
  const upload_node = document.createElement("input"); 
  upload_node.setAttribute('id', 'myInput');
  upload_node.setAttribute('type', 'file');
  upload_node.setAttribute('style', 'visibility:hidden');
  upload_node.addEventListener("change", handleFiles, false);

  document.body.append(upload_node);


  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'tesselations', 0, 8).step(1);
  gui.add(controls, 'Load Scene');
  gui.add(controls, 'red', 0, 256).step(1);
  gui.add(controls, 'green', 0, 256).step(1);
  gui.add(controls, 'blue', 0, 256).step(1);
  gui.add(controls, 'upload a song');


  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2', {alpha:false});
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const frags = [
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')), 
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/perlin-frag.glsl'))
  ];
  const verts = [
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')), 
    new Shader(gl.VERTEX_SHADER, require('./shaders/trig-vert.glsl'))
  ];

  var shaderprog = new ShaderProgram([
    verts[0],
    frags[0]
  ]);

  let timetick: number = 0;
  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }
    if(fragvert.frag != prevFragVert.frag || fragvert.vert != prevFragVert.vert) {
      shaderprog = new ShaderProgram([verts[fragvert.vert],
        frags[fragvert.frag]]);
      prevFragVert.frag = fragvert.frag;
      prevFragVert.vert = fragvert.vert;
      timetick = 0;
    }
    
    if(fireballed) {
      analyser.getByteFrequencyData(dataArray);
      tempdata = Float32Array.from(dataArray);
      for(let i = 0; i < tempdata.length; i++) {
        //tempdata[i] = (tempdata[i] + prevdata[i]) / 2;
        tempdata[i] = Math.max(oldDataArray[i], tempdata[i], 1.5*(tempdata[i]-oldDataArray[i]));
      }
      prevdata = Float32Array.from(dataArray);
      //smooth out volume transitions
      oldDataArray = tempdata;
      for(let i = 0; i < oldDataArray.length; i++) {
        if(oldDataArray[i] > 0) oldDataArray[i]-= 1.5;
      }
    }
    else {
      tempdata = new Float32Array(128);
      prevdata = new Float32Array(128);
    }

    renderer.render(camera, 
      shaderprog, 
      [icosphere], 
      vec4.fromValues(controls.red/256, controls.green/256, controls.blue/256, 1), 
      tempdata,
      timetick
    );
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
    timetick++;
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
