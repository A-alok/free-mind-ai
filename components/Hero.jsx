"use client";
import React, { useRef, useEffect, useState } from 'react';
import Link from "next/link";
import { ScrollParallax } from "react-just-parallax";
import * as THREE from "three";

import { Gradient, BottomLine, BackgroundCircles } from "@/components/design/Hero";
import { heroIcons } from "@/constants";
import CompanyLogos from "./CompanyLogos";
import Generating from "./Generating";
import Notification from "./Notification";

const CustomButton = ({ href, className = "", white = false, children }) => {
  const baseStyles = "inline-flex items-center justify-center h-12 px-6 py-2 text-base font-medium transition-all rounded-lg cursor-pointer";
  const colorStyles = white 
    ? "text-n-8 bg-white hover:bg-n-1" 
    : "text-white bg-gradient-to-r from-purple-600 to-purple-800 hover:opacity-90";

  return (
    <Link 
      href={href}
      className={`${baseStyles} ${colorStyles} ${className}`}
      prefetch={true}
    >
      {children}
    </Link>
  );
};

const FreeMindAiHero = ({
  heroBackgroundImage = "/images/grad.png", 
  rectangleBackgroundImage = "/images/ai.webp" 
}) => {
  const parallaxRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [cracks, setCracks] = useState([]);

  // Three.js setup with independent asteroids and magnetic mouse attraction
  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Camera position
    camera.position.z = 20;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create asteroids
    const asteroids = [];
    const asteroidCount = 25; // Increased for more coverage

    // Mouse position (normalized device coordinates)
    const mouse = new THREE.Vector2(0, 0);
    let mouseSpeed = new THREE.Vector2(0, 0);
    let lastMousePosition = new THREE.Vector2(0, 0);

    // Helper function to get a random value between min and max
    const randomRange = (min, max) => min + Math.random() * (max - min);

    const createAsteroid = () => {
      const geometry = new THREE.IcosahedronGeometry(randomRange(0.2, 0.7), 0);

      // Create a material with a rocky texture
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(
          randomRange(0.1, 0.3),
          randomRange(0.1, 0.3),
          randomRange(0.1, 0.3)
        ),
        roughness: 0.9,
        metalness: 0.1,
      });

      const asteroid = new THREE.Mesh(geometry, material);

      // Random position across the whole view
      const pageWidth = 30;
      const pageHeight = 20;
      asteroid.position.set(
        randomRange(-pageWidth, pageWidth),
        randomRange(-pageHeight, pageHeight),
        randomRange(-15, 0)
      );

      // Random rotation
      asteroid.rotation.x = Math.random() * Math.PI * 2;
      asteroid.rotation.y = Math.random() * Math.PI * 2;
      asteroid.rotation.z = Math.random() * Math.PI * 2;

      // Independent random movement directions
      asteroid.userData.velocity = {
        x: randomRange(-0.05, 0.05),
        y: randomRange(-0.05, 0.05),
        z: randomRange(-0.02, 0.02),
      };

      // Random rotation speed
      asteroid.userData.rotationSpeed = {
        x: randomRange(-0.02, 0.02),
        y: randomRange(-0.02, 0.02),
        z: randomRange(-0.02, 0.02),
      };
      
      // Properties for mouse attraction
      asteroid.userData.attractionStrength = randomRange(0.005, 0.02);
      asteroid.userData.maxAttractionDistance = randomRange(10, 25);
      
      // Allow some asteroids to completely ignore mouse
      asteroid.userData.ignoresMouse = Math.random() > 0.7; // 30% ignore mouse completely

      scene.add(asteroid);
      asteroids.push(asteroid);

      return asteroid;
    };

    // Initialize asteroids
    for (let i = 0; i < asteroidCount; i++) {
      createAsteroid();
    }

    // Page boundaries for wrapping
    const bounds = {
      xMin: -35,
      xMax: 35,
      yMin: -25,
      yMax: 25,
      zMin: -20,
      zMax: 5,
    };

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // Handle mouse movement
    const handleMouseMove = (event) => {
      // Calculate normalized device coordinates (-1 to +1)
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Calculate mouse speed
      mouseSpeed.x = mouse.x - lastMousePosition.x;
      mouseSpeed.y = mouse.y - lastMousePosition.y;
      
      // Update last position
      lastMousePosition.x = mouse.x;
      lastMousePosition.y = mouse.y;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    // Convert mouse coordinates to world position
    const mouseToWorld = (mouseX, mouseY, z = 0) => {
      const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
      vector.unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const distance = (z - camera.position.z) / dir.z;
      return camera.position.clone().add(dir.multiplyScalar(distance));
    };

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Get mouse position in world coordinates (at z=0 plane)
      const mouseWorldPos = mouseToWorld(mouse.x, mouse.y);

      // Update asteroid positions
      asteroids.forEach((asteroid) => {
        // Independent movement
        asteroid.position.x += asteroid.userData.velocity.x;
        asteroid.position.y += asteroid.userData.velocity.y;
        asteroid.position.z += asteroid.userData.velocity.z;
        
        // Rotation
        asteroid.rotation.x += asteroid.userData.rotationSpeed.x;
        asteroid.rotation.y += asteroid.userData.rotationSpeed.y;
        asteroid.rotation.z += asteroid.userData.rotationSpeed.z;
        
        // Apply mouse attraction only if asteroid doesn't ignore mouse
        if (!asteroid.userData.ignoresMouse) {
          // Calculate distance to mouse
          const dx = mouseWorldPos.x - asteroid.position.x;
          const dy = mouseWorldPos.y - asteroid.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Only attract asteroids within a certain distance (magnetic effect)
          if (distance < asteroid.userData.maxAttractionDistance) {
            // Attraction strength decreases with distance (inverse square law)
            const attractionFactor = asteroid.userData.attractionStrength * 
                                    (1 - distance / asteroid.userData.maxAttractionDistance);
            
            // Apply attraction force
            asteroid.position.x += dx * attractionFactor;
            asteroid.position.y += dy * attractionFactor;
            
            // Add some rotation based on attraction
            asteroid.rotation.z += dx * 0.001;
            asteroid.rotation.x += dy * 0.001;
          }
        }
        
        // Screen wrapping - if asteroid goes out of bounds, wrap it to the other side
        if (asteroid.position.x < bounds.xMin) asteroid.position.x = bounds.xMax;
        if (asteroid.position.x > bounds.xMax) asteroid.position.x = bounds.xMin;
        if (asteroid.position.y < bounds.yMin) asteroid.position.y = bounds.yMax;
        if (asteroid.position.y > bounds.yMax) asteroid.position.y = bounds.yMin;
        if (asteroid.position.z < bounds.zMin) asteroid.position.z = bounds.zMax;
        if (asteroid.position.z > bounds.zMax) asteroid.position.z = bounds.zMin;
        
        // Randomly change direction occasionally
        if (Math.random() < 0.005) {
          asteroid.userData.velocity.x = randomRange(-0.05, 0.05);
          asteroid.userData.velocity.y = randomRange(-0.05, 0.05);
        }
      });

      // Reset mouse speed gradually
      mouseSpeed.x *= 0.95;
      mouseSpeed.y *= 0.95;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationRef.current);

      // Dispose of Three.js resources
      asteroids.forEach((asteroid) => {
        asteroid.geometry.dispose();
        asteroid.material.dispose();
        scene.remove(asteroid);
      });

      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div
      className="relative pt-[12rem] -mt-[5.25rem]"
      id="hero"
    >
      {/* Three.js Canvas for Asteroid Animation */}
      <canvas ref={canvasRef} className="absolute inset-0 z-20 pointer-events-none" />

      {/* Natural Crack Effects - more like the reference image */}
      {cracks.map((crack) => (
        <div
          key={crack.id}
          className="absolute z-30 pointer-events-none"
          style={{
            left: `${crack.x}px`,
            top: `${crack.y}px`,
            width: `${crack.size}px`,
            height: `${crack.size}px`,
            transform: `translate(-50%, -50%) rotate(${crack.rotation}deg)`,
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <g className="crack-system">
              {/* Simplified crack pattern - only 2-4 lines for smaller cracks */}
              <path
                d="M50,50 
                   L65,35 
                   M50,50 
                   L30,60"
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="2"
                className="crack-primary"
              />
              
              {/* Just a few secondary branches */}
              <path
                d="M65,35 
                   L75,25 
                   M30,60 
                   L20,75"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.5"
                className="crack-secondary"
              />
              
              {/* Few tertiary small cracks */}
              <path
                d="M75,25 
                   L80,20 
                   M20,75 
                   L15,85"
                fill="none"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="1"
                className="crack-tertiary"
              />
            </g>
          </svg>
        </div>
      ))}

      {/* Hero Background */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroBackgroundImage}
          alt="hero background"
          className="w-full h-full object-cover"
          width={1440}
          height={1800}
        />
      </div>

      <div className="container relative" ref={parallaxRef}>
        <div className="relative z-1 max-w-[62rem] mx-auto text-center mb-[3.875rem] md:mb-20 lg:mb-[6.25rem]">
          {/* Updated title formatting from second code */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Transform your ideas into&nbsp;reality with&nbsp;
            <span className="inline-block relative">
              <span className="bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 bg-clip-text text-transparent">
                FreeMindAi
              </span>
            </span>
          </h1>
          <p className="body-1 max-w-3xl mx-auto mb-6 text-n-2 lg:mb-8">
            Automate your entire machine learning project lifecycle with ease.
            From prompt to deployment, get everything you need in one place.
          </p>

          <CustomButton 
            href="/login"
            white
            className="font-bold font-sans text-black"
          >
            Get Started
          </CustomButton>
        </div>
      </div>

      <div className="relative z-10">         
        <div className="relative max-w-[20rem] mx-auto md:max-w-5xl xl:mb-24">           
          {/* Applying gradient border that matches the image */}           
          <div className="relative z-1 p-0.5 rounded-2xl" style={{ 
            background: "linear-gradient(90deg, #9F53FF, #FF98E2, #FFC876, #79FFF7, #9F53FF)",
            backgroundSize: "200% 100%",
            animation: "gradientShift 8s linear infinite"
          }}>             
            <div className="relative bg-n-8 rounded-[1rem]">
              <div className="h-[1.4rem] bg-n-10 rounded-t-[0.9rem]" />
              <div className="aspect-[33/40] rounded-b-[0.9rem] overflow-hidden md:aspect-[688/490] lg:aspect-[1024/490]">                 
                <img
                  src={rectangleBackgroundImage}
                  className="w-full scale-[1.7] translate-y-[4%] md:scale-[1] md:-translate-y-[4%] lg:-translate-y-[28%]"                   
                  width={1024}
                  height={490}
                  alt="AI"
                />
                <Generating
                  className="absolute left-4 right-4 bottom-5 md:left-1/2 md:right-auto md:bottom-8 md:w-[31rem] md:-translate-x-1/2"
                />

                <ScrollParallax isAbsolutelyPositioned>
                  <ul className="hidden absolute -left-[5.5rem] bottom-[7.5rem] px-1 py-1 bg-n-9/40 backdrop-blur border border-n-1/10 rounded-2xl xl:flex">
                    {heroIcons.map((icon, index) => (
                      <li className="p-5" key={index}>
                        <img src={icon} width={24} height={25} alt={`icon-${index}`} />
                      </li>
                    ))}
                  </ul>
                </ScrollParallax>

                <ScrollParallax isAbsolutelyPositioned>
                  <Notification
                    className="hidden absolute -right-[5.5rem] bottom-[11rem] w-[18rem] xl:flex"
                    title="Code generation"
                  />
                </ScrollParallax>
              </div>
            </div>

            <Gradient />
          </div>
          
          <BackgroundCircles />
        </div>

        <CompanyLogos className="hidden relative z-10 mt-20 mb-20 lg:block" />
      </div>

      <BottomLine />

      {/* Inline styles for animations */}
      <style jsx>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }

        .crack-primary,
        .crack-secondary,
        .crack-tertiary {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          filter: drop-shadow(0 0 2px rgba(120, 180, 255, 0.5));
        }
        
        .crack-primary {
          animation: drawSmallCrack 0.4s ease-out forwards;
        }
        
        .crack-secondary {
          animation: drawSmallCrack 0.6s ease-out 0.2s forwards;
        }
        
        .crack-tertiary {
          animation: drawSmallCrack 0.8s ease-out 0.4s forwards;
        }

        @keyframes drawSmallCrack {
          0% {
            stroke-dashoffset: 100;
            opacity: 0.6;
          }
          60% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};

export default FreeMindAiHero;
