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
  'Upload a song': function() {document.getElementById('myInput').click();},
  fire_volatility: 3,
  'explosivity': 4, 
  'flames': 4,
  'Fix my fireball!': setDefaultControls
};

function setDefaultControls() {
  window.location.href=window.location.href;
}

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
  frag: 1,
  vert: 1
}

function handleFiles(event: any) {
  var files = event.target.files;
  playAudio(URL.createObjectURL(files[0]));
}


//Audio
var audioTune, context, src, analyser : any, dataArray : Uint8Array, oldDataArray: Float32Array, tempdata : Float32Array, prevdata : Float32Array, 
targetArray: Float32Array, currArray: Float32Array;
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
  
  

  src.connect(analyser);
  analyser.connect(context.destination);

  analyser.fftSize = 256;

  var bufferLength = analyser.frequencyBinCount;
  console.log(bufferLength);

  dataArray = new Uint8Array(bufferLength);
  currArray = new Float32Array(bufferLength);
  targetArray = new Float32Array(bufferLength);

  audioTune.play();
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
  gui.add(controls, 'Upload a song');
  gui.add(controls, 'fire_volatility', 1, 10).step(1).name('Fire Volatility');
  gui.add(controls, 'explosivity', 1, 10).name('Fire Explosivity');
  gui.add(controls, 'flames', 1, 10).name('Fire Flame Color');
  gui.add(controls, 'Fix my fireball!');


  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2', {alpha:true});
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
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);
  //alpha testing

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
        targetArray[i] = Math.max(currArray[i], tempdata[i], 1.6*controls.fire_volatility*(tempdata[i]-currArray[i]));
        if(targetArray[i] > currArray[i]) {
          currArray[i] += Math.max(controls.fire_volatility, (targetArray[i]-currArray[i])/20);
          targetArray[i] -= controls.fire_volatility/6;
          if(currArray[i] + 5 >= targetArray[i]) targetArray[i] = 0;
        }
        else {
          currArray[i] -= Math.max(controls.fire_volatility/3, Math.min(controls.fire_volatility, (currArray[i]-targetArray[i])/10));
        }
      }
    }
    else {
      currArray = new Float32Array(128);
    }

    renderer.render(camera, 
      shaderprog, 
      [icosphere], 
      vec4.fromValues(controls.red/256, controls.green/256, controls.blue/256, 1), 
      currArray,
      controls.explosivity,
      controls.flames,
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
