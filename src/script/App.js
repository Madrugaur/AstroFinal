import React from "react";
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

const j2000 = 2451545.0;
const degreeToRadianFactor =  Math.PI / 180.0;
const scale = 1;
const trailMax = 100;
const debug = false;

function SolarSystem() {
  const [current, setCurrent ] = React.useState(j2000);
  const totalTicks = React.useRef(0);
  const {camera, gl} = useThree();
  const [ xyz, setXYZ] = React.useState(undefined)
  const [ currentPositions, setCurrentPositions ] = React.useState(undefined);
  const [ trail, setTrail ] = React.useState([...Array(numberOfPlanets).keys()].map(() => Array(trailMax).fill([0, 0, 0])));

  

  const toRadians = React.useCallback((number) => number * degreeToRadianFactor, []);
  const calcEccentricAnomaly = React.useCallback((eccentricity, mean_anomaly) => {
    const delta = Math.pow(10, -6);
    var deltaEccentricity, deltaMeanAnomoly;
    const maxIterations = 30;
    
    mean_anomaly = mean_anomaly / 360.0;
    mean_anomaly = 2.0 * Math.PI * (mean_anomaly - Math.floor(mean_anomaly))

    if (eccentricity < 0.8) deltaEccentricity = mean_anomaly; 
    else deltaEccentricity = Math.PI;

    deltaMeanAnomoly = deltaEccentricity - eccentricity * Math.sin(mean_anomaly) - mean_anomaly;

    for (var i = 0; (i < maxIterations) && (Math.abs(deltaMeanAnomoly) > delta); i++) {
      deltaEccentricity = deltaEccentricity - deltaMeanAnomoly / (1.0 - eccentricity * Math.cos(deltaEccentricity));
      deltaMeanAnomoly = deltaEccentricity - eccentricity * Math.sin(deltaEccentricity) - mean_anomaly;
    }

    deltaEccentricity = deltaEccentricity / (Math.PI / 180);
    deltaEccentricity = Math.round(deltaEccentricity * Math.pow(10, 6)) / Math.pow(10, 6);
    return deltaEccentricity;
  }, []);

  const computeSingle = React.useCallback((planetId) => {
    const planet = table2a.planets[planetId];
    // Number of centuries past J2000 epoch
    const T = (current - j2000) / 36525;

    
    const orbit_size = planet.au + (planet.aucy * T); 

    const eccentricity = planet.rad + (planet.radcy * T);

    var orbital_inclination = planet.Ideg + (planet.Idegcy * T);
    orbital_inclination = orbital_inclination % 360;

    var longitude_ascending_node = planet.nodedeg + (planet.nodedegcy * T);
    longitude_ascending_node = longitude_ascending_node % 360;

    var longitude_perihelion = planet.perideg + (planet.peridegcy * T);
    longitude_perihelion = longitude_perihelion % 360;
    if (longitude_perihelion < 0) longitude_perihelion = 360 + longitude_perihelion;

    var mean_longitude = planet.Ldeg + planet.Ldegcy * T;
    mean_longitude = mean_longitude % 360
    if (mean_longitude < 0) mean_longitude = 360 + mean_longitude

    var mean_anomaly = mean_longitude - longitude_perihelion;
    if (mean_anomaly < 0) mean_anomaly = 360 + mean_anomaly;
    
    const eccentric_anomaly = calcEccentricAnomaly(eccentricity, mean_anomaly);
    const argument_true_anomaly = Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.tan(toRadians(eccentric_anomaly) / 2);
    
    var true_anomaly = 0;
    if (argument_true_anomaly < 0) {
      true_anomaly = 2 * (Math.atan(argument_true_anomaly) / degreeToRadianFactor + 180);
    } else {
      true_anomaly = 2 * (Math.atan(argument_true_anomaly) / degreeToRadianFactor);
    }

    
    const radius = orbit_size * (1 - (eccentricity * (Math.cos(toRadians(eccentric_anomaly))))) * scale;

    const cos_of_orbital_inclination = Math.cos(toRadians(orbital_inclination));
    const sin_of_many_longitudes = Math.sin(toRadians(true_anomaly + longitude_perihelion - longitude_ascending_node));
    const cos_of_many_longitudes = Math.cos(toRadians(true_anomaly + longitude_perihelion - longitude_ascending_node));

    const xCoord = radius *(Math.cos(toRadians(longitude_ascending_node)) * Math.cos(toRadians(true_anomaly+longitude_perihelion-longitude_ascending_node)) - Math.sin(toRadians(longitude_ascending_node)) * Math.sin(toRadians(true_anomaly+longitude_perihelion-longitude_ascending_node)) * Math.cos(toRadians(orbital_inclination)));
    const yCoord = radius *(Math.sin(toRadians(longitude_ascending_node)) * Math.cos(toRadians(true_anomaly+longitude_perihelion-longitude_ascending_node)) + Math.cos(toRadians(longitude_ascending_node)) * Math.sin(toRadians(true_anomaly+longitude_perihelion-longitude_ascending_node)) * Math.cos(toRadians(orbital_inclination)));
    const zCoord = radius *(Math.sin(toRadians(true_anomaly+longitude_perihelion-longitude_ascending_node))*Math.sin(toRadians(orbital_inclination)));

    if (debug) {
      console.log(
        `
        Planet ${planetId + 1}
  
        a: ${orbit_size} 
        e: ${eccentricity}
        i: ${orbital_inclination}
        W: ${longitude_ascending_node}
        w: ${longitude_perihelion}
        L: ${mean_longitude}
  
        Mean Anomaly: ${mean_anomaly}
        Ecc. Anomaly: ${eccentric_anomaly}
        True Anomaly: ${true_anomaly}
        Radius Vector: ${radius}
  
        X: ${xCoord}
        Y: ${yCoord}
        Z: ${zCoord}
        `
      );
    }
    
    
    return [xCoord, yCoord, zCoord];
  }, [current, toRadians])

  const animate = React.useCallback(() => {
    setCurrent(current + 1)
    totalTicks.current += 1;

    const new_positions = [...Array(numberOfPlanets).keys()].map(planetId => computeSingle(planetId));
    setCurrentPositions(new_positions);
    setTrail(trail => trail.map((points, i) => points.slice(-trailMax + 1).concat([new_positions[i]])));
    
    // const new_xyz = computeSingle(3);
    //setXYZ(new_xyz);
    //setTrail(trail => [...trail, new_xyz])
    // console.log(`Date: ${current}\nX:${new_xyz[0]}\nY:${new_xyz[1]}\nZ:${new_xyz[2]}`)
  }, [current, setCurrentPositions, totalTicks, trail]);

  React.useEffect(() => {
    requestAnimationFrame(() => animate());
  }, [current]);

  return (
    <group>
      <ambientLight />
      <pointLight />
      <orbitControls args={[camera, gl.domElement]} />
      <mesh>
        <sphereGeometry attach="geometry" args={[0.1]} />
            <meshStandardMaterial
              attach="material"
              color="yellow"
            />
      </mesh>
      {
        currentPositions !== undefined ? 
        currentPositions.map((position, i) => 
          <mesh visible position={new THREE.Vector3(...position)} key={i}>
            <sphereGeometry attach="geometry" args={[table2a.planets[i].diameter / 25 ]} />
            <meshStandardMaterial
              attach="material"
              color="white"
            />
          </mesh>)
        :
        <></>
      }

      {
        trail.map((points, i) => 
          <line geometry={new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)))}>
            <lineBasicMaterial attach="material" />
          </line>
        )
      }
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
      <Canvas camera={{position: [0, 0, 20]}}>
        <SolarSystem />
        <SkyBox/>
      </Canvas>
    </div>
  );
}

export default App;
