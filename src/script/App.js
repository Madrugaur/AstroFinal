import React from "react";
import { Canvas, useThree, extend } from "react-three-fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import data from "../res/data.json";
import Loader from 'react-loader-spinner';


import front from "../res/skybox/realistic/front.png"
import left from "../res/skybox/realistic/left.png"
import right from "../res/skybox/realistic/right.png"
import back from "../res/skybox/realistic/back.png"
import top from "../res/skybox/realistic/top.png"
import bottom from "../res/skybox/realistic/bottom.png"
import * as THREE from "three"
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'

import { CubeTextureLoader, Vector3  } from "three";
import "../styles/App.css";

import SolarSystem from "./SolarSystem"
extend({ OrbitControls, TextGeometry})

const planets = data.planets;

function SkyBox () {
  const { scene } = useThree();
  const loader = new CubeTextureLoader();
  const texture = loader.load([
    front, back, top, bottom, right, left
  ]);
  scene.background = texture;
  return null;
}



function  App() {
  const [planetInfo, setPlanetInfo] = React.useState(undefined);
  const defaultPosition = React.useMemo(() => [0, 0, 0], []);
  const [focused, setFocused] = React.useState({planetId: -1})
  const [ showPlanetNames, setShowPlanetNames ] = React.useState(true);
  const [ showPlanetStats, setShowPlanetStats] = React.useState(false);
  const [ showPlanetDebug, setShowPlanetDebug] = React.useState(false);
  const cameraRef = React.useRef(() => ({positon: [0, 0, 0]}));
  const [timeout, setTimeout] = React.useState(1);
  const exitFocused = React.useCallback((e) => {
    if (e.code !== "Escape") return;
    setFocused({planetId: -2})
    setShowPlanetNames(true);
  }, [cameraRef.current])

  React.useEffect(() => {
    document.getElementById("root").setAttribute("style", "height:" + window.innerHeight +"px")
    window.addEventListener('resize', () => document.getElementById("root").setAttribute("style", "height:" + window.innerHeight +"px"))
    window.addEventListener('keydown', exitFocused)
  }, [])

  
  const fallbackComponent = React.useMemo(() => 
    <div className="center">
      <Loader type="TailSpin" color="#00BFFF" height={100} width={100}/>
      <p className="loaderText">Loading...</p>
    </div>
  , []);

  const planetInfoComponent = React.useMemo(() => {
    if (focused.planetId < 0) return null;
    if (planetInfo === undefined) return null;
    const planet = planets[focused.planetId];
    const infoChunk = planetInfo[focused.planetId];
    return (
      <div className="planetInfoComponent">
        <div className="planetName">{`${planet.name}`}</div>
        <div className="planetFact">Mass:    {infoChunk.mass.massValue} x 10<sup>{infoChunk.mass.massExponent}</sup> kg</div>
        <div className="planetFact">Gravity: {infoChunk.gravity} m/s<sup>2</sup></div>
        <div className="planetFact">Moons: {infoChunk.moons ? infoChunk.moons.length : "None"}</div>
        <div className="planetFact">{planet.blurb}</div>
        <div className="planetFact"><a href={`${planet.wikilink}`} target="_blank">Learn More</a></div>

      </div>
    );
  }, [focused, planets, planetInfo])
  
  const dropdownComponent = React.useMemo(() =>
    <div className="dropdownContainer">
      <div className="dropdown">
        <button className="dropbtn">Spotlight Planet</button>
        <div className="dropdown-content">
          { planets.map((planet, i) => <a key={`spotlight-btn-${i}`}onClick={() => spotlightPlanet(i)} >{planet.name}</a>)}
        </div>
      </div>
    </div>
  , []);

  const showPlanetNamesComponent = React.useMemo(() => 
    <div className="showNamesCheckBox">
      <input type="checkbox" checked={showPlanetNames} id="showPlanetNames" name="showPlanetNames" onChange={() => setShowPlanetNames(!showPlanetNames)}/>
      <label htmlFor="showPlanetNames"> Show Planet Names</label>
    </div>
  , [showPlanetNames, setShowPlanetNames]);

  const speedSliderComponent = React.useMemo(() => 
   <div class="slidecontainer">
      <input type="range" min={1} max={240000} value={timeout} className="slider" onChange={(e) => setTimeout(Number(e.target.value))} />
    </div>
  , [timeout]);
  const spotlightPlanet = React.useCallback((id) => {
    setFocused({planetId: id});
    setShowPlanetNames(false);
  }, []);

  React.useEffect(() => {
    Promise.all(planets.map(planet =>
      fetch(`https://api.le-systeme-solaire.net/rest/bodies/${planet.name}`).then(resp => resp.json())
    )).then(texts => {
      setPlanetInfo(texts)
    })
  }, [])

  return (
    <div className="App">
      <React.Suspense fallback={fallbackComponent}>
        <Canvas camera={cameraRef}>
          {/* <primitive object={new THREE.AxesHelper(10)} /> */}
          <SolarSystem 
            focused={focused} 
            showPlanetNames={showPlanetNames}
            setFocused={setFocused}
            setShowPlanetNames={setShowPlanetNames}
            timeout={timeout}
          />
          <SkyBox/>
        </Canvas>
        {dropdownComponent}
        {/* {showPlanetNamesComponent} */}
        {planetInfoComponent}
        
      </React.Suspense>
    </div>
  );
}

export default App;
