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

function SolarSystem() {
  const [current, setCurrent ] = React.useState(0);
  const totalTicks = React.useRef(0);
  const {camera, gl} = useThree();
  const [ xyz, setXYZ] = React.useState([0, 0, 0])
  const [trail, setTrail] = React.useState([[0, 0, 0]]);
  const toRadians = React.useCallback((number) => number * degreeToRadianFactor, []);
  const calcEccentricAnomaly = React.useCallback((eccentricity, mean_anomaly) => {
    const tol = Math.pow(10, -6);
    var deltaEccentricity, deltaMeanAnomoly;
    const maxIterations = 30;
    
    var new_mean_anomoly = mean_anomaly / 360.0;
    new_mean_anomoly = 2.0 * Math.PI * (new_mean_anomoly - Math.floor(new_mean_anomoly))

    if (eccentricity < 0.8) deltaEccentricity = new_mean_anomoly; 
    else deltaEccentricity = Math.PI;

    deltaMeanAnomoly = deltaEccentricity - eccentricity * Math.sin(new_mean_anomoly) - new_mean_anomoly;

    for (var i = 0; (i < maxIterations) && (Math.abs(deltaMeanAnomoly) > tol); i++) {
      deltaEccentricity = deltaEccentricity - deltaMeanAnomoly / (1.0 - eccentricity * Math.cos(deltaEccentricity));
      deltaMeanAnomoly = deltaEccentricity - eccentricity * Math.sin(deltaEccentricity) - new_mean_anomoly;
    }

    deltaEccentricity = deltaEccentricity / degreeToRadianFactor;
    deltaEccentricity = Math.round(deltaEccentricity * Math.pow(10, 6)) / Math.pow(10, 6);
    return deltaEccentricity;
  }, []);

  const computeSingle = React.useCallback((planetId) => {
    const planet = table2a.planets[planetId];
    // Number of centuries past J2000 epoch
    const T = (current - j2000) / 36525;
    const b = 1, c = 1, s = 1, f = 1;
    if (planetId > 3) {
      b = table2b.planets[planetId - 4].b;
      c = table2b.planets[planetId - 4].c;
      s = table2b.planets[planetId - 4].s;
      f = table2b.planets[planetId - 4].f;
    }
    const orbit_size = planet.au + (planet.aucy * T); //
    const eccentricity = planet.rad + planet.radcy * T;
    const orbital_inclination = (planet.Ideg + planet.Idegcy * T) % 360;
    const longitude_ascending_node = (planet.nodedeg + planet.nodedegcy * T) % 360;
    var longitude_perihelion = (planet.perideg + planet.peridegcy * T) % 360;
    // if (longitude_perihelion < 0) longitude_perihelion = 360 + longitude_perihelion;
    var mean_longitude = planet.Ldeg + planet.Ldegcy * T;
    // (mean_longitude < 0) mean_longitude = 360 + mean_longitude
    var mean_anomaly = mean_longitude - longitude_perihelion;
    // (mean_anomaly < 0) mean_anomaly = 360 + mean_anomaly;
    
    const eccentric_anomaly = calcEccentricAnomaly(eccentricity, mean_anomaly);
    const argument_true_anomaly = Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.tan(toRadians(eccentric_anomaly) / 2);
    
    var true_anomaly = 0;
    if (argument_true_anomaly < 0) {
      true_anomaly = 2 * (Math.atan(argument_true_anomaly) / degreeToRadianFactor + 180);
    } else {
      true_anomaly = 2 * (Math.atan(argument_true_anomaly) / degreeToRadianFactor);
    }

    
    const radius = orbit_size * (1 - (eccentricity * (Math.cos(degreeToRadianFactor * eccentric_anomaly))));

    const cos_of_orbital_inclination = Math.cos(toRadians(orbital_inclination));
    const sin_of_many_longitudes = Math.sin(toRadians(true_anomaly + longitude_perihelion - longitude_ascending_node));
    const cos_of_many_longitudes = Math.cos(toRadians(true_anomaly + longitude_perihelion - longitude_ascending_node));

    const xCoord = radius * Math.cos(toRadians(longitude_ascending_node) * cos_of_many_longitudes - Math.sin(toRadians(longitude_ascending_node)) * sin_of_many_longitudes * cos_of_orbital_inclination);
    const yCoord = radius * Math.sin(toRadians(longitude_ascending_node) * cos_of_many_longitudes + Math.cos(toRadians(longitude_ascending_node)) * sin_of_many_longitudes * cos_of_orbital_inclination);
    const zCoord = radius * Math.sin(toRadians(true_anomaly + longitude_perihelion - longitude_ascending_node) * Math.sin(toRadians(orbital_inclination)));

    return [xCoord, yCoord, zCoord];
  }, [current])

  const animate = React.useCallback(() => {
    setCurrent(current + 1)
    const new_xyz = computeSingle(0).map(i => i * 2);
    setXYZ(new_xyz);
    setTrail(trail => [...trail, new_xyz])
    console.log(`X:${new_xyz[0]}\nY:${new_xyz[1]}\nZ:${new_xyz[2]}`)
  }, [current]);

  React.useEffect(() => {
    requestAnimationFrame(() => animate());
  }, [current]);

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(trail.map(arr => new THREE.Vector3(...arr)));

  return (
    <group>
      <ambientLight />
      <pointLight />
      <orbitControls args={[camera, gl.domElement]} />
      <mesh visible position={new THREE.Vector3(...xyz)}>
        <sphereGeometry attach="geometry" args={[0.1]} />
        <meshStandardMaterial
          attach="material"
          color="white"
        />
    </mesh>
    <line geometry={lineGeometry}>
          <lineBasicMaterial attach="material" color={'#9c88ff'} linewidth={10} linecap={'round'} linejoin={'round'} />
    </line>
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
