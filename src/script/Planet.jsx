import React from "react";
import { useFrame } from "react-three-fiber";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader"
import * as THREE from "three"
import "../styles/App.css";
import Model from "./Model"
import Roboto from "three/examples/fonts/helvetiker_regular.typeface.json";

function renderText(text, position, params) {
  return (
    <mesh position={new THREE.Vector3(position[0] + 0.01, position[1], position[2])}>
      <textGeometry attach='geometry' args={[text, params]} />
      <meshStandardMaterial attach='material' />
    </mesh>
  );
}

const daysInJulianYear = 36525;


export default function Planet({planet, position, index, showText, textSize, timeout}) {
  const [rotation, setRotation] = React.useState(new THREE.Euler(1, 0 ,0));
  const planetRef = React.useRef();
  const font = new FontLoader().parse(Roboto);
  if (textSize === undefined) textSize = 0.1;
  const textOptions = {
    font,
    size: textSize,
    height: 0,
    color: "white"
  };
  
  useFrame(() => planetRef.current.rotation.y += 2  * Math.PI * (1000 / (timeout < 532 ? 532 : timeout)))

  return (
    <group key={`planet-${index}`}>
      <mesh ref={planetRef} rotation={rotation} visible position={new THREE.Vector3(...position)} key={index}>
        {/* <sphereGeometry attach="geometry" args={[planets[index].radius]}  />
        <meshStandardMaterial
          attach="material"
          color="white"
        /> */}
        {/* <primitive object={new THREE.AxesHelper(1)} /> */}
        <Model name={planet.name.toLocaleLowerCase()} scale={.003 * planet.radius}/>

      </mesh>
     {showText ? renderText(planet.name, position, textOptions) : null}
    </group>
  );
}

