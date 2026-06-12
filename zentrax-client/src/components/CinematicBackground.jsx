import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const GRID_SIZE = 45; 
const CUBE_SIZE = 1;
const GAP = 0.05;

// The floor made of dark irregular cubes
function CubeLandscape() {
    const meshRef = useRef();
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const colorDummy = useMemo(() => new THREE.Color(), []);
    
    const cubes = useMemo(() => {
        const temp = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let z = 0; z < GRID_SIZE; z++) {
                const posX = (x - GRID_SIZE / 2) * (CUBE_SIZE + GAP);
                const posZ = (z - GRID_SIZE / 2) * (CUBE_SIZE + GAP);
                
                // Very irregular heights, mostly low, some high
                const height = 0.1 + Math.pow(Math.random(), 3) * 2.5; 
                
                temp.push({
                    index: x * GRID_SIZE + z,
                    x: posX,
                    y: height / 2 - 1, // Shift down slightly
                    z: posZ,
                    scaleY: height
                });
            }
        }
        return temp;
    }, []);

    React.useLayoutEffect(() => {
        if (!meshRef.current) return;
        cubes.forEach((cube) => {
            dummy.position.set(cube.x, cube.y, cube.z);
            dummy.scale.set(1, cube.scaleY, 1);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(cube.index, dummy.matrix);
            
            // Matte charcoal/obsidian
            colorDummy.setHex(0x1a1a1f);
            meshRef.current.setColorAt(cube.index, colorDummy);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [cubes, dummy, colorDummy]);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const time = clock.getElapsedTime();

        cubes.forEach((cube) => {
            // Base obsidian color
            let r = 0.05, g = 0.05, b = 0.06;

            // Scanning wave passing left to right
            const scanX = (time * 12.0) % 80 - 40;
            const distToScan = Math.abs(cube.x - scanX);
            
            if (distToScan < 3.0) {
                // Glow as the wave passes
                const intensity = (1.0 - (distToScan / 3.0)) * 2.0;
                r += 1.0 * intensity;
                g += 0.3 * intensity;
            }

            // Occasional distant glowing pixels
            const blink = Math.sin(cube.x * 77 + cube.z * 55 + time * 2);
            if (blink > 0.99) {
                r = 2.0; g = 0.6; b = 0.0;
            }

            colorDummy.setRGB(Math.min(r, 2.5), Math.min(g, 2.0), Math.min(b, 1.0));
            meshRef.current.setColorAt(cube.index, colorDummy);
        });
        
        meshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, GRID_SIZE * GRID_SIZE]}>
            <boxGeometry args={[CUBE_SIZE, 1, CUBE_SIZE]} />
            <meshStandardMaterial 
                color="#111" 
                roughness={0.6} 
                metalness={0.7}
            />
        </instancedMesh>
    );
}

// The floating central pillar of disjointed cubes
function CenterPillar() {
    const groupRef = useRef();
    
    const parts = useMemo(() => {
        const arr = [];
        // Base pillar
        arr.push({ pos: [0, 1, 0], scale: [3, 4, 3], isCore: true });
        // Floating shards
        for(let i=0; i<15; i++) {
            arr.push({
                pos: [
                    (Math.random() - 0.5) * 6,
                    4 + Math.random() * 5,
                    (Math.random() - 0.5) * 6
                ],
                scale: [
                    0.5 + Math.random(),
                    0.5 + Math.random(),
                    0.5 + Math.random()
                ],
                isCore: false,
                offset: Math.random() * 10
            });
        }
        return arr;
    }, []);

    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
        if (groupRef.current) {
            groupRef.current.children.forEach((child, i) => {
                if (!parts[i].isCore) {
                    // Make the floating parts drift slightly
                    child.position.y = parts[i].pos[1] + Math.sin(time + parts[i].offset) * 0.5;
                }
            });
        }
    });

    return (
        <group ref={groupRef}>
            {parts.map((part, i) => (
                <mesh key={i} position={part.pos}>
                    <boxGeometry args={part.scale} />
                    <meshStandardMaterial 
                        color="#222" 
                        roughness={0.4} 
                        metalness={0.8}
                        emissive={part.isCore ? "#000" : "#ff4400"}
                        emissiveIntensity={part.isCore ? 0 : Math.random() * 0.5 + 0.1}
                    />
                </mesh>
            ))}
            
            {/* The glowing core inside the pillar */}
            <mesh position={[0, 3, 0]}>
                <boxGeometry args={[2.5, 3.5, 2.5]} />
                <meshBasicMaterial color="#ff3300" />
            </mesh>
            <pointLight position={[0, 3, 0]} color="#ff4400" intensity={15} distance={20} />
        </group>
    );
}

// The massive flowing orange energy wall from the right
function EnergyWall() {
    const wallRef = useRef();

    useFrame(({ clock }) => {
        const time = clock.getElapsedTime();
        if (wallRef.current) {
            // Pulse the emission intensity slightly
            wallRef.current.material.emissiveIntensity = 4 + Math.sin(time * 5) * 1.5;
        }
    });

    return (
        <mesh ref={wallRef} position={[15, 3, -10]}>
            <boxGeometry args={[40, 10, 2]} />
            <meshStandardMaterial 
                color="#ff2200" 
                emissive="#ff3300" 
                emissiveIntensity={5}
                toneMapped={false}
            />
            {/* Massive light casting onto the landscape from the energy wall */}
            <pointLight color="#ff4400" intensity={40} distance={50} position={[-5, 0, 5]} />
        </mesh>
    );
}

function CameraRig() {
    useFrame(({ camera, clock }) => {
        const t = clock.getElapsedTime();
        // Cinematic slow drone flyover and pan
        camera.position.x = Math.sin(t * 0.05) * 15;
        camera.position.z = Math.cos(t * 0.05) * 15 + 15;
        camera.position.y = 5 + Math.sin(t * 0.1) * 2;
        camera.lookAt(0, 2, 0);
    });
    return null;
}

export default function CinematicBackground() {
    return (
        <div className="absolute inset-0 bg-[#020202] pointer-events-none z-0">
            <Canvas camera={{ position: [0, 5, 25], fov: 50 }} gl={{ antialias: false }}>
                <color attach="background" args={['#050302']} />
                <fog attach="fog" args={['#050302', 15, 50]} />
                
                <ambientLight intensity={0.05} />
                <directionalLight position={[-10, 20, 10]} intensity={0.2} color="#ffffff" />
                
                <CubeLandscape />
                <CenterPillar />
                <EnergyWall />
                <CameraRig />
                
                <EffectComposer disableNormalPass>
                    <Bloom 
                        luminanceThreshold={1.0} 
                        mipmapBlur 
                        intensity={2.5} 
                        radius={0.8}
                    />
                </EffectComposer>
            </Canvas>
        </div>
    );
}
