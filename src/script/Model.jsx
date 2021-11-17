import React from "react";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useLoader } from '@react-three/fiber'
import "../styles/App.css";

export default function PlanetModel({name, scale}) {
  const gltf = useLoader(GLTFLoader, `./model/${name}.gltf`)
  return (
      <primitive object={gltf.scene} scale={scale}/>
  )
}