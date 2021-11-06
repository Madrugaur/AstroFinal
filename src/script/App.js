import React, {
  useCallback,
  useRef,
  useMemo,
  useState,
  useEffect
} from "react";
import ReactDOM from "react-dom";
import { Canvas, useThree, extend } from "react-three-fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import * as tf from "@tensorflow/tfjs";
import data from "../res/data.json";


import front from "../res/skybox/realistic/front.png"
import left from "../res/skybox/realistic/left.png"
import right from "../res/skybox/realistic/right.png"
import back from "../res/skybox/realistic/back.png"
import top from "../res/skybox/realistic/top.png"
import bottom from "../res/skybox/realistic/bottom.png"

import * as THREE from "three"

import { BufferGeometry, CubeTextureLoader, Vector3  } from "three";

import "../styles/App.css";


extend({ OrbitControls})

const table2a = data.table2a;
const table2b = data.table2b;

const numberOfPlanets = table2a.planets.length;

const j2000 = new Date(Date.UTC(2000, 0, 2, 0, 0, 0));

function SolarSystem() {
  
  const {camera, gl} = useThree();

  console.log(j2000);

  return (
    <group>
      <ambientLight />
      <pointLight />
      <orbitControls args={[camera, gl.domElement]} />
    </group>
  );
}

function SkyBox () {
  const { scene } = useThree();
  const loader = new CubeTextureLoader();
  const texture = loader.load([
    front, back, top, bottom, right, left
  ]);
  scene.background = texture;
  return null;
}

function App() {
  document.getElementById("root").setAttribute("style", "height:" + window.innerHeight +"px")
  window.addEventListener('resize', () => document.getElementById("root").setAttribute("style", "height:" + window.innerHeight +"px"))
 

  return (
    <div className="App">
      <Canvas camera={{ position: [10, 0, 0] }}>
        <SolarSystem />
        <SkyBox/>
      </Canvas>
    </div>
  );
}

export default App;
