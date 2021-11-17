import React from "react";
import { useThree, extend, useFrame } from "react-three-fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import data from "../res/data.json";
import * as THREE from "three"
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'

import "../styles/App.css";

import Model from "./Model"
import Planet from "./Planet"
extend({ OrbitControls, TextGeometry})
const planets = data.planets;

const numberOfPlanets = planets.length;

const j2000 = 2451545.0;
const degreeToRadianFactor =  Math.PI / 180.0;
const scale = 1;
const trailMax = 100;
const debug = false;
const sunScale = 0.002
const daysInJulianYear = 36525;

export default function SolarSystem({setFocused, focused, showPlanetNames, setShowPlanetNames, timeout}) {
  const [current, setCurrent ] = React.useState(j2000);
  const textSize = React.useRef(0.1);
  const totalTicks = React.useRef(0);
  const {camera, gl} = useThree();
  const [ currentPositions, setCurrentPositions ] = React.useState(undefined);
  const [ trail, setTrail ] = React.useState([...Array(numberOfPlanets).keys()].map(() => Array(trailMax).fill([0, 0, 0])));
  const distanceFromOrigin = React.useCallback((x, y, z) => Math.sqrt(Math.pow(0 - x, 2) + Math.pow(0 - y, 2) + Math.pow(0 - z, 2)));
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

  const computeSingle = React.useCallback((planetId, currentTime) => {
    const planet = planets[planetId];
    // Number of centuries past J2000 epoch
    const T = (currentTime - j2000) / daysInJulianYear;

    
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

  const animate = React.useCallback((currentTime) => {
    totalTicks.current += 1;
    const new_positions = [...Array(numberOfPlanets).keys()].map(planetId => computeSingle(planetId, currentTime));
    setCurrentPositions(new_positions);
    setTrail(trail => trail.map((points, i) => points.slice(-trailMax + 1).concat([new_positions[i]])));
    setTimeout(() => requestAnimationFrame(() => animate(currentTime + 1)), timeout)
  }, [setCurrentPositions, totalTicks, trail, timeout]);

  React.useEffect(() => {
    requestAnimationFrame(() => animate(j2000))
  }, []);

  
  useFrame(({camera}) => {
    textSize.current = textSize.current < 0.1 ? 0.05 * distanceFromOrigin(...camera.position) : 0.1;
    if (!(currentPositions && currentPositions.length > 1)) return;
    if (!focused || focused.planetId === -1) return;
    if (focused.planetId === -2) {
      camera.position.x = 0;
      camera.position.y = 0;
      camera.position.z = 20;
      camera.lookAt(new THREE.Vector3(0, 0, 0));
      setFocused({planetId: -1})
      return;
    }
    const pos = currentPositions[focused.planetId];
    camera.position.x = pos[0];
    camera.position.y = pos[1] - planets[focused.planetId].zoom;
    camera.position.z = pos[2] + planets[focused.planetId].zoom / 2;
    camera.lookAt(new THREE.Vector3(...pos))
  });


  return (
    <group>
      <pointLight />
      {/* { (focused.planetId < 0) ?  : null} */}
      <orbitControls args={[camera, gl.domElement]} />
      <Model name={"sun"} scale={0.0002} />

      {
        currentPositions !== undefined ? currentPositions.map((position, i) => 
          <Planet 
            planet={planets[i]} 
            position={position} 
            index={i} 
            showPlanetNames={showPlanetNames} 
            textSize={textSize} 
            setFocused={setFocused} 
            timeout={timeout}
          />
        ) : <></>
      }

      {

        trail.map((points, i) => 
          <line key={`trail-line-${i}`} geometry={new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)))}>
            <lineBasicMaterial attach="material" />
          </line>
        )
      }
    </group>
  );
}