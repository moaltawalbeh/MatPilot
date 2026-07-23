"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import * as THREE from "three";
import "./matpilot_v3.css";

export default function MatPilotHomepageV3() {
  useEffect(() => {
    let isCancelled = false;

    function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });
    }

    async function initAll() {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js");

        if (isCancelled) return;

        const gsap = (window as any).gsap;
        const ScrollTrigger = (window as any).ScrollTrigger;

        /* --------------------------------------------------
           1. WEB AUDIO SYNTHESIZER (Sci-Fi Ambience & FX)
           -------------------------------------------------- */
        let audioCtx: AudioContext | null = null;
        let isMuted = true;
        let ambientOsc: OscillatorNode | null = null;
        let ambientGain: GainNode | null = null;
        let lastPlayedScene = -1;

        function initAudio() {
          if (!audioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
          }
        }

        function startAmbientDrone() {
          if (!audioCtx || isMuted) return;
          try {
            if (ambientOsc) return;
            ambientOsc = audioCtx.createOscillator();
            ambientGain = audioCtx.createGain();

            ambientOsc.type = "sine";
            ambientOsc.frequency.setValueAtTime(55, audioCtx.currentTime);

            ambientGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
            ambientGain.gain.linearRampToValueAtTime(0.025, audioCtx.currentTime + 2);

            ambientOsc.connect(ambientGain);
            ambientGain.connect(audioCtx.destination);
            ambientOsc.start();
          } catch (e) {}
        }

        function stopAmbientDrone() {
          if (ambientOsc && ambientGain && audioCtx) {
            try {
              ambientGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
              setTimeout(() => {
                if (ambientOsc) {
                  ambientOsc.stop();
                  ambientOsc.disconnect();
                  ambientOsc = null;
                }
              }, 500);
            } catch (e) {}
          }
        }

        function playSciFiWhoosh(freqStart = 150, freqEnd = 400, duration = 0.5) {
          if (isMuted || !audioCtx) return;
          try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc.type = "sawtooth";
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(freqStart * 2, audioCtx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(freqEnd * 3, audioCtx.currentTime + duration);

            osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);

            gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + duration);
          } catch (e) {}
        }

        function playUiClick() {
          if (isMuted || !audioCtx) return;
          try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
          } catch (e) {}
        }

        function playUiHover() {
          if (isMuted || !audioCtx) return;
          try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.03);

            gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
          } catch (e) {}
        }

        function playSceneSound(sceneIdx: number) {
          if (isMuted || !audioCtx || sceneIdx === lastPlayedScene) return;
          lastPlayedScene = sceneIdx;

          const sceneFreqs = [110, 220, 330, 440, 550, 660, 770, 880];
          const baseFreq = sceneFreqs[sceneIdx] || 220;

          try {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc1.type = "sine";
            osc2.type = "triangle";

            osc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
            osc2.frequency.setValueAtTime(baseFreq * 1.5, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(audioCtx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(audioCtx.currentTime + 0.6);
            osc2.stop(audioCtx.currentTime + 0.6);
          } catch (e) {}
        }

        function playInstrumentSound(type: string) {
          if (isMuted || !audioCtx) return;
          try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            if (type === "xrd") {
              osc.type = "sine";
              osc.frequency.setValueAtTime(200, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.4);
              gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            } else if (type === "raman") {
              osc.type = "triangle";
              osc.frequency.setValueAtTime(880, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.25);
              gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
            } else if (type === "ftir") {
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(350, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(175, audioCtx.currentTime + 0.5);
              gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            } else if (type === "sem") {
              osc.type = "square";
              osc.frequency.setValueAtTime(150, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.3);
              gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            }

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
          } catch (e) {}
        }

        function playTone(freq: number, type: OscillatorType = "sine", duration = 0.2, vol = 0.05) {
          if (isMuted || !audioCtx) return;
          try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
          } catch (e) {}
        }

        (window as any).playInstrumentSound = playInstrumentSound;

        const audioToggleBtn = document.getElementById("audio-toggle");
        if (audioToggleBtn) {
          audioToggleBtn.addEventListener("click", () => {
            initAudio();
            if (audioCtx && audioCtx.state === "suspended") {
              audioCtx.resume();
            }
            isMuted = !isMuted;
            const icon = document.getElementById("audio-icon");
            const text = document.getElementById("audio-text");
            const eqBars = document.getElementById("nav-eq-bars");

            if (isMuted) {
              if (icon) icon.className = "fas fa-volume-mute text-matOrange";
              if (text) text.textContent = "SOUND OFF";
              if (eqBars) {
                eqBars.classList.add("hidden");
                eqBars.classList.remove("flex");
              }
              stopAmbientDrone();
            } else {
              if (icon) icon.className = "fas fa-volume-high text-matOrange";
              if (text) text.textContent = "SOUND ON";
              if (eqBars) {
                eqBars.classList.remove("hidden");
                eqBars.classList.add("flex");
              }
              startAmbientDrone();
              playSciFiWhoosh(200, 600, 0.4);
            }
          });
        }

        /* --------------------------------------------------
           2. THREE.JS CINEMATIC SCENE ENGINE (Scenes 00-08)
           -------------------------------------------------- */
        let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
        let crystalGroup: THREE.Group,
          diffractionGroup: THREE.Group,
          graphGroup: THREE.Group,
          neuralMeshGroup: THREE.Group,
          atomStructureGroup: THREE.Group;

        function initThreeScene() {
          const canvas = document.getElementById("three-canvas") as HTMLCanvasElement | null;
          const container = document.getElementById("canvas-container");
          if (!canvas || !container) return;

          scene = new THREE.Scene();
          scene.fog = new THREE.FogExp2(0x08090a, 0.03);

          camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
          camera.position.set(0, 0, 15);

          renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
          renderer.setSize(container.clientWidth, container.clientHeight);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

          const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
          scene.add(ambientLight);

          const pointLightOrange = new THREE.PointLight(0xff6a2c, 3, 30);
          pointLightOrange.position.set(2, 3, 5);
          scene.add(pointLightOrange);

          const pointLightBlue = new THREE.PointLight(0x3e8eff, 2, 30);
          pointLightBlue.position.set(-3, -2, 5);
          scene.add(pointLightBlue);

          // 1. Crystal Lattice Group (Scenes 01)
          crystalGroup = new THREE.Group();
          const boxGeo = new THREE.BoxGeometry(3.5, 3.5, 3.5);
          const wireframeGeo = new THREE.WireframeGeometry(boxGeo);
          const latticeMat = new THREE.LineBasicMaterial({ color: 0xff6a2c, transparent: true, opacity: 0.8 });
          const latticeLines = new THREE.LineSegments(wireframeGeo, latticeMat);
          crystalGroup.add(latticeLines);

          const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);
          const nodeMat = new THREE.MeshStandardMaterial({
            color: 0xff8a50,
            emissive: 0xff6a2c,
            emissiveIntensity: 0.5,
          });

          for (let x = -1; x <= 1; x += 2) {
            for (let y = -1; y <= 1; y += 2) {
              for (let z = -1; z <= 1; z += 2) {
                const node = new THREE.Mesh(nodeGeo, nodeMat);
                node.position.set(x * 1.75, y * 1.75, z * 1.75);
                crystalGroup.add(node);
              }
            }
          }
          scene.add(crystalGroup);

          // 2. Diffraction Concentric Rings (Scene 02)
          diffractionGroup = new THREE.Group();
          for (let i = 1; i <= 6; i++) {
            const ringGeo = new THREE.RingGeometry(i * 0.8, i * 0.82, 64);
            const ringMat = new THREE.MeshBasicMaterial({
              color: i % 2 === 0 ? 0xff6a2c : 0x3e8eff,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.6 / i,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            diffractionGroup.add(ring);
          }
          diffractionGroup.scale.set(0.01, 0.01, 0.01);
          scene.add(diffractionGroup);

          // 3. XRD Spectrum Graph Line (Scene 03)
          graphGroup = new THREE.Group();
          const points: THREE.Vector3[] = [];
          const numPoints = 120;
          for (let i = 0; i <= numPoints; i++) {
            const x = (i / numPoints) * 12 - 6;
            let y = 0.1 * Math.sin(i * 0.5);
            if (Math.abs(x + 3) < 0.3) y += 2.2 * Math.exp(-Math.pow(x + 3, 2) * 20);
            if (Math.abs(x + 0.5) < 0.2) y += 3.5 * Math.exp(-Math.pow(x + 0.5, 2) * 30);
            if (Math.abs(x - 2) < 0.25) y += 1.8 * Math.exp(-Math.pow(x - 2, 2) * 25);
            if (Math.abs(x - 4) < 0.2) y += 2.9 * Math.exp(-Math.pow(x - 4, 2) * 30);
            points.push(new THREE.Vector3(x, y - 1.5, 0));
          }
          const graphGeo = new THREE.BufferGeometry().setFromPoints(points);
          const graphMat = new THREE.LineBasicMaterial({ color: 0xff6a2c });
          const graphLine = new THREE.Line(graphGeo, graphMat);
          graphGroup.add(graphLine);
          graphGroup.position.set(0, -10, 0);
          scene.add(graphGroup);

          // 4. Neural Network Recognition Mesh Overlay (Scene 04)
          neuralMeshGroup = new THREE.Group();
          const meshGeo = new THREE.BufferGeometry();
          const nodePositions: number[] = [];
          for (let i = 0; i < 35; i++) {
            nodePositions.push((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4);
          }
          meshGeo.setAttribute("position", new THREE.Float32BufferAttribute(nodePositions, 3));
          const meshMat = new THREE.PointsMaterial({ color: 0x3e8eff, size: 0.15 });
          const neuralPoints = new THREE.Points(meshGeo, meshMat);
          neuralMeshGroup.add(neuralPoints);
          neuralMeshGroup.position.set(0, -20, 0);
          scene.add(neuralMeshGroup);

          // 5. Atomic Crystal Structure (Scene 05)
          atomStructureGroup = new THREE.Group();
          const atomFeMat = new THREE.MeshStandardMaterial({ color: 0xff6a2c, metalness: 0.8, roughness: 0.2 });
          const atomPMat = new THREE.MeshStandardMaterial({ color: 0x3e8eff, metalness: 0.6, roughness: 0.3 });
          const atomOMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });

          const atomPositions = [
            { pos: [0, 0, 0], mat: atomFeMat, r: 0.4 },
            { pos: [1.2, 1.2, 0], mat: atomPMat, r: 0.3 },
            { pos: [-1.2, -1.2, 0], mat: atomPMat, r: 0.3 },
            { pos: [1.8, 0, 1.2], mat: atomOMat, r: 0.22 },
            { pos: [-1.8, 0, -1.2], mat: atomOMat, r: 0.22 },
            { pos: [0, 1.8, -1.2], mat: atomOMat, r: 0.22 },
            { pos: [0, -1.8, 1.2], mat: atomOMat, r: 0.22 },
          ];

          atomPositions.forEach((item) => {
            const sphereGeo = new THREE.SphereGeometry(item.r, 32, 32);
            const mesh = new THREE.Mesh(sphereGeo, item.mat);
            mesh.position.set(item.pos[0], item.pos[1], item.pos[2]);
            atomStructureGroup.add(mesh);
          });

          atomStructureGroup.scale.set(0.001, 0.001, 0.001);
          scene.add(atomStructureGroup);

          function animate() {
            if (isCancelled) return;
            requestAnimationFrame(animate);

            if (crystalGroup) {
              crystalGroup.rotation.y += 0.003;
              crystalGroup.rotation.x += 0.001;
            }
            if (atomStructureGroup) {
              atomStructureGroup.rotation.y += 0.004;
            }
            if (renderer && scene && camera) {
              renderer.render(scene, camera);
            }
          }
          animate();

          window.addEventListener("resize", () => {
            if (!container || !camera || !renderer) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
          });
        }

        /* --------------------------------------------------
           3. GSAP SCROLLTRIGGER MASTER TIMELINE
           -------------------------------------------------- */
        let masterTimeline: any;

        function initScrollStory() {
          if (!gsap || !ScrollTrigger) return;
          gsap.registerPlugin(ScrollTrigger);

          const textScenes = [
            document.getElementById("scene-00-text"),
            document.getElementById("scene-01-text"),
            document.getElementById("scene-02-text"),
            document.getElementById("scene-03-text"),
            document.getElementById("scene-04-text"),
            document.getElementById("scene-05-text"),
            document.getElementById("scene-06-text"),
            document.getElementById("scene-07-text"),
          ];

          function showTextScene(idx: number) {
            textScenes.forEach((el, i) => {
              if (!el) return;
              if (i === idx) {
                el.style.opacity = "1";
                el.style.pointerEvents = "auto";
                el.style.transform = "translateY(0px)";
              } else {
                el.style.opacity = "0";
                el.style.pointerEvents = "none";
                el.style.transform = "translateY(-20px)";
              }
            });

            const sceneIdxEl = document.getElementById("scene-idx");
            if (sceneIdxEl) sceneIdxEl.textContent = `0${idx}`;

            const fillEl = document.getElementById("scroll-progress-fill");
            if (fillEl) fillEl.style.height = `${(idx / 7) * 100}%`;

            const dotsEl = document.getElementById("scene-dots");
            if (dotsEl) {
              const dots = dotsEl.children;
              for (let d = 0; d < dots.length; d++) {
                if (d === idx) {
                  (dots[d] as HTMLElement).className =
                    "w-2 h-2 rounded-full bg-matOrange transition-all scale-125";
                } else {
                  (dots[d] as HTMLElement).className =
                    "w-2 h-2 rounded-full bg-matBorder hover:bg-matOrangeLight transition-all";
                }
              }
            }
          }

          masterTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: "#cinematic-trigger",
              start: "top top",
              end: "+=700%",
              scrub: 1,
              pin: "#cinematic-pin",
              onUpdate: (self: any) => {
                const prog = self.progress;
                const currentScene = Math.min(7, Math.floor(prog * 8));
                showTextScene(currentScene);
                playSceneSound(currentScene);
              },
            },
          });

          masterTimeline
            .to(camera.position, { z: 9, duration: 1 })
            .to(crystalGroup.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 1 }, 0)
            .to(crystalGroup.position, { y: 10, duration: 1 })
            .to(diffractionGroup.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 1 }, "<")
            .to(diffractionGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.8 })
            .to(graphGroup.position, { y: 0, duration: 1 }, "<")
            .to(neuralMeshGroup.position, { y: 0, duration: 1 })
            .to(graphGroup.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 1 }, "<")
            .to(graphGroup.position, { y: -15, duration: 1 })
            .to(neuralMeshGroup.position, { y: -15, duration: 1 }, "<")
            .to(atomStructureGroup.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 1 }, "<")
            .to(atomStructureGroup.position, { x: -3, z: 2, duration: 1 })
            .to(atomStructureGroup.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 1 })
            .to(camera.position, { z: 14, duration: 1 }, "<");
        }

        function jumpToScene(sceneIndex: number) {
          if (!masterTimeline) return;
          const targetProg = sceneIndex / 7;
          const scrollTrigger = masterTimeline.scrollTrigger;
          const start = scrollTrigger.start;
          const end = scrollTrigger.end;
          window.scrollTo({
            top: start + targetProg * (end - start),
            behavior: "smooth",
          });
          playSciFiWhoosh(300, 150, 0.3);
        }
        (window as any).jumpToScene = jumpToScene;

        /* --------------------------------------------------
           4. INTERACTIVE SONIC RESONANCE PROBE & SIMULATIONS
           -------------------------------------------------- */
        let probeFreq = 432;
        let probeActive = false;

        function triggerProbePulse() {
          initAudio();
          if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
          probeActive = true;
          playSciFiWhoosh(probeFreq, probeFreq * 2, 0.5);
          setTimeout(() => {
            probeActive = false;
          }, 500);
        }
        (window as any).triggerProbePulse = triggerProbePulse;

        function initSonicProbe() {
          const canvas = document.getElementById("sonic-canvas") as HTMLCanvasElement | null;
          const container = document.getElementById("spectral-probe-box");
          if (!canvas || !container) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;

          const particles: any[] = [];
          for (let i = 0; i < 35; i++) {
            particles.push({
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              radius: Math.random() * 2 + 1,
              speed: Math.random() * 1 + 0.5,
            });
          }

          let phase = 0;

          function drawSonic() {
            if (isCancelled || !ctx || !canvas) return;
            ctx.fillStyle = "rgba(15, 17, 19, 0.25)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = probeActive ? "#FF8A50" : "#FF6A2C";

            for (let x = 0; x < canvas.width; x += 2) {
              const waveMod = Math.sin(x * (probeFreq / 20000) + phase) * (probeActive ? 35 : 20);
              const y = canvas.height / 2 + waveMod * Math.sin(x * 0.01);
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(62, 142, 255, 0.5)";
            for (let x = 0; x < canvas.width; x += 4) {
              const waveMod2 = Math.cos(x * (probeFreq / 15000) - phase * 1.5) * 15;
              const y = canvas.height / 2 + waveMod2;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            ctx.fillStyle = "#FF6A2C";
            particles.forEach((p) => {
              p.y -= p.speed * (probeActive ? 2 : 0.5);
              if (p.y < 0) p.y = canvas.height;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fill();
            });

            phase += probeActive ? 0.15 : 0.05;
            requestAnimationFrame(drawSonic);
          }
          drawSonic();

          container.addEventListener("mousemove", (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            probeFreq = Math.floor(100 + (x / rect.width) * 1200);
            const freqReadout = document.getElementById("synth-freq-readout");
            if (freqReadout) freqReadout.textContent = `FREQ: ${probeFreq}.00 Hz`;
            if (probeActive && audioCtx && !isMuted) {
              playTone(probeFreq, "sine", 0.1, 0.03);
            }
          });

          container.addEventListener("mousedown", () => {
            probeActive = true;
            const statusEl = document.getElementById("probe-status");
            if (statusEl) {
              statusEl.textContent = "MODULATION: ACTIVE";
              statusEl.className =
                "absolute bottom-3 right-3 text-[10px] font-mono text-matOrange font-bold";
            }
            triggerProbePulse();
          });

          window.addEventListener("mouseup", () => {
            probeActive = false;
            const statusEl = document.getElementById("probe-status");
            if (statusEl) {
              statusEl.textContent = "MODULATION: IDLE";
              statusEl.className = "absolute bottom-3 right-3 text-[10px] font-mono text-matTextDim";
            }
          });
        }

        function initMicroSimulations() {
          initSonicProbe();

          // XRD Micro Canvas
          const xrdCanvas = document.getElementById("sim-xrd") as HTMLCanvasElement | null;
          if (xrdCanvas) {
            const ctx = xrdCanvas.getContext("2d");
            let offset = 0;
            function drawXRD() {
              if (isCancelled || !ctx || !xrdCanvas) return;
              ctx.clearRect(0, 0, xrdCanvas.width, xrdCanvas.height);
              ctx.strokeStyle = "#FF6A2C";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              for (let x = 0; x < xrdCanvas.width; x++) {
                let y = xrdCanvas.height - 15 - Math.sin((x + offset) * 0.05) * 5;
                if (Math.abs(x - 80) < 15) y -= Math.exp(-Math.pow(x - 80, 2) * 0.02) * 40;
                if (Math.abs(x - 180) < 10) y -= Math.exp(-Math.pow(x - 180, 2) * 0.03) * 55;
                if (Math.abs(x - 240) < 12) y -= Math.exp(-Math.pow(x - 240, 2) * 0.02) * 30;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
              offset += 0.5;
              requestAnimationFrame(drawXRD);
            }
            drawXRD();
          }

          // Raman Micro Canvas
          const ramanCanvas = document.getElementById("sim-raman") as HTMLCanvasElement | null;
          if (ramanCanvas) {
            const ctx = ramanCanvas.getContext("2d");
            let particles = Array.from({ length: 20 }, () => ({
              x: Math.random() * 300,
              y: Math.random() * 150,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
            }));
            function drawRaman() {
              if (isCancelled || !ctx || !ramanCanvas) return;
              ctx.clearRect(0, 0, ramanCanvas.width, ramanCanvas.height);
              ctx.fillStyle = "#3E8EFF";
              particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > ramanCanvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > ramanCanvas.height) p.vy *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
              });
              requestAnimationFrame(drawRaman);
            }
            drawRaman();
          }

          // FTIR Micro Canvas
          const ftirCanvas = document.getElementById("sim-ftir") as HTMLCanvasElement | null;
          if (ftirCanvas) {
            const ctx = ftirCanvas.getContext("2d");
            let step = 0;
            function drawFTIR() {
              if (isCancelled || !ctx || !ftirCanvas) return;
              ctx.clearRect(0, 0, ftirCanvas.width, ftirCanvas.height);
              ctx.strokeStyle = "#10B981";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              for (let x = 0; x < ftirCanvas.width; x++) {
                let y = 35 + Math.sin(x * 0.08 + step) * 15 * Math.sin(x * 0.02);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
              step += 0.05;
              requestAnimationFrame(drawFTIR);
            }
            drawFTIR();
          }

          // SEM Micro Canvas
          const semCanvas = document.getElementById("sim-sem") as HTMLCanvasElement | null;
          if (semCanvas) {
            const ctx = semCanvas.getContext("2d");
            let scanY = 0;
            function drawSEM() {
              if (isCancelled || !ctx || !semCanvas) return;
              ctx.fillStyle = "rgba(15, 17, 19, 0.2)";
              ctx.fillRect(0, 0, semCanvas.width, semCanvas.height);
              ctx.strokeStyle = "#A855F7";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(0, scanY);
              ctx.lineTo(semCanvas.width, scanY);
              ctx.stroke();
              scanY = (scanY + 1.5) % semCanvas.height;
              requestAnimationFrame(drawSEM);
            }
            drawSEM();
          }
        }

        /* --------------------------------------------------
           5. INTERACTIVE MODAL & SANDBOX UTILS
           -------------------------------------------------- */
        let activeDataset = "nmc811";
        let activePlane = "100";

        const datasetInfo: Record<string, any> = {
          nmc811: {
            title: "LiNi0.8Mn0.1Co0.1O2 (NMC-811)",
            spacegroup: "Space Group: R-3m (#166) • Layered Rock-Salt Structure",
            purity: "99.1% PHASE PURITY",
            rwp: "1.82%",
            crystallite: "58.4 nm",
            log: `<p class="text-white font-medium">✓ Bragg peaks aligned with ICSD-184920.</p>
                  <p>• Sharp (003) reflection at 2θ = 18.7° indicates well-ordered layered cation framework.</p>
                  <p>• Cation mixing ratio (Li/Ni exchange): <span class="text-matOrange">1.24%</span> (Extremely low defect density).</p>`,
          },
          perovskite: {
            title: "CH3NH3PbI3 (MAPbI3 Solar Perovskite)",
            spacegroup: "Space Group: I4/mcm (#140) • Tetragonal Perovskite Phase",
            purity: "98.7% PHASE PURITY",
            rwp: "2.14%",
            crystallite: "112.0 nm",
            log: `<p class="text-white font-medium">✓ Tetragonal symmetry confirmed at 298K.</p>
                  <p>• Zero detectable PbI2 degradation precursor peaks at 2θ = 12.6°.</p>
                  <p>• Lattice strain parameter: <span class="text-matBlue">0.081% RMS</span>.</p>`,
          },
          llzo: {
            title: "Li7La3Zr2O12 (Cubic LLZO Electrolyte)",
            spacegroup: "Space Group: Ia-3d (#230) • Cubic Garnet Structure",
            purity: "99.8% PHASE PURITY",
            rwp: "1.45%",
            crystallite: "84.2 nm",
            log: `<p class="text-white font-medium">✓ Pure high-conductivity cubic garnet phase.</p>
                  <p>• Complete stabilization without pyrochlore La2Zr2O7 impurity.</p>
                  <p>• Estimated ionic conductivity: <span class="text-emerald-400">1.2 x 10^-3 S/cm</span>.</p>`,
          },
        };

        function drawSandboxSpectrum() {
          const canvas = document.getElementById("sandbox-spectrum-canvas") as HTMLCanvasElement | null;
          if (!canvas || !canvas.parentElement) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          canvas.width = canvas.parentElement.clientWidth;
          canvas.height = canvas.parentElement.clientHeight;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          ctx.strokeStyle = "#2A2C2F";
          ctx.lineWidth = 1;
          for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          for (let y = 0; y < canvas.height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }

          ctx.strokeStyle = "#FF6A2C";
          ctx.lineWidth = 2;
          ctx.beginPath();

          const peakPositions =
            activeDataset === "nmc811"
              ? [60, 140, 220, 310, 420]
              : activeDataset === "perovskite"
              ? [80, 160, 250, 340, 450]
              : [50, 120, 200, 290, 380];

          for (let x = 0; x < canvas.width; x++) {
            let y = canvas.height - 20 - Math.sin(x * 0.1) * 3;
            peakPositions.forEach((pos, idx) => {
              if (Math.abs(x - pos) < 20) {
                const h = 100 + (idx % 3) * 30;
                y -= Math.exp(-Math.pow(x - pos, 2) * 0.015) * h;
              }
            });
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          const highlightX =
            activePlane === "100" ? peakPositions[0] : activePlane === "110" ? peakPositions[1] : peakPositions[2];
          ctx.fillStyle = "#3E8EFF";
          ctx.beginPath();
          ctx.arc(highlightX, canvas.height - 120, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#3E8EFF";
          ctx.font = "10px JetBrains Mono";
          ctx.fillText(`hkl (${activePlane})`, highlightX - 18, canvas.height - 135);
        }

        function loadSandboxDataset(type: string) {
          activeDataset = type;
          playUiClick();

          ["nmc811", "perovskite", "llzo"].forEach((t) => {
            const btn = document.getElementById(`tab-${t}`);
            if (btn) {
              if (t === type) {
                btn.className =
                  "px-4 py-2.5 rounded-lg bg-matOrange text-matDark font-bold text-xs font-mono transition-all flex items-center gap-2";
              } else {
                btn.className =
                  "px-4 py-2.5 rounded-lg bg-matElevated border border-matBorder text-matTextMuted hover:text-white font-mono text-xs transition-all flex items-center gap-2";
              }
            }
          });

          const data = datasetInfo[type];
          if (data) {
            const titleEl = document.getElementById("sandbox-dataset-title");
            if (titleEl) titleEl.textContent = data.title;
            const sgEl = document.getElementById("sandbox-spacegroup");
            if (sgEl) sgEl.textContent = data.spacegroup;
            const purityEl = document.getElementById("sandbox-purity-tag");
            if (purityEl) purityEl.textContent = data.purity;
            const logEl = document.getElementById("sandbox-ai-log");
            if (logEl) logEl.innerHTML = data.log;
            const rwpEl = document.getElementById("sandbox-rwp");
            if (rwpEl) rwpEl.textContent = data.rwp;
            const crystEl = document.getElementById("sandbox-crystallite");
            if (crystEl) crystEl.textContent = data.crystallite;
          }

          drawSandboxSpectrum();
        }
        (window as any).loadSandboxDataset = loadSandboxDataset;

        function toggleMillerPlane(plane: string) {
          activePlane = plane;
          playUiClick();
          ["100", "110", "111"].forEach((p) => {
            const btn = document.getElementById(`plane-${p}`);
            if (btn) {
              if (p === plane) {
                btn.className =
                  "px-3 py-1 rounded bg-matOrange text-matDark font-mono font-bold text-xs transition-all";
              } else {
                btn.className =
                  "px-3 py-1 rounded bg-matDark border border-matBorder text-matTextMuted font-mono text-xs transition-all";
              }
            }
          });
          drawSandboxSpectrum();
        }
        (window as any).toggleMillerPlane = toggleMillerPlane;

        function triggerDemoModal() {
          const modal = document.getElementById("demo-modal");
          const card = document.getElementById("demo-modal-card");
          if (modal && card) {
            modal.classList.remove("opacity-0", "pointer-events-none");
            card.classList.remove("scale-95");
            card.classList.add("scale-100");
            playSciFiWhoosh(250, 500, 0.3);
          }
        }
        (window as any).triggerDemoModal = triggerDemoModal;

        function closeDemoModal() {
          const modal = document.getElementById("demo-modal");
          const card = document.getElementById("demo-modal-card");
          if (modal && card) {
            modal.classList.add("opacity-0", "pointer-events-none");
            card.classList.remove("scale-100");
            card.classList.add("scale-95");
          }
        }
        (window as any).closeDemoModal = closeDemoModal;

        function handleDemoSubmit(e: Event) {
          e.preventDefault();
          alert("Thank you! Your institutional access request has been submitted to the MatPilot team.");
          closeDemoModal();
        }
        (window as any).handleDemoSubmit = handleDemoSubmit;

        const onScrollNav = () => {
          const nav = document.getElementById("navbar");
          if (nav) {
            if (window.scrollY > 50) {
              nav.classList.add("bg-matDark/80", "backdrop-blur-md", "border-b", "border-matBorder");
              nav.classList.remove("py-5");
              nav.classList.add("py-3");
            } else {
              nav.classList.remove("bg-matDark/80", "backdrop-blur-md", "border-b", "border-matBorder");
              nav.classList.remove("py-3");
              nav.classList.add("py-5");
            }
          }
        };
        window.addEventListener("scroll", onScrollNav);

        initThreeScene();
        initScrollStory();
        initMicroSimulations();
        drawSandboxSpectrum();

        document.querySelectorAll("button, a").forEach((el) => {
          el.addEventListener("mouseenter", playUiHover);
          el.addEventListener("click", playUiClick);
        });
      } catch (err) {
        console.error("Error initializing homepage v3 scripts:", err);
      }
    }

    initAll();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="bg-matDark text-white selection:bg-matOrange selection:text-black min-h-screen">
      {/* Fixed Navigation Bar */}
      <nav
        id="navbar"
        className="fixed top-0 left-0 w-full z-50 transition-all duration-500 py-5 px-6 lg:px-12 flex justify-between items-center bg-transparent"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-matOrange flex items-center justify-center text-white font-bold font-sans text-xl shadow-lg shadow-matOrange/30 tracking-tight leading-none">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-white font-sans leading-none">MatPilot</span>
            <span className="text-[9px] text-matTextDim font-sans tracking-tight hidden sm:block">
              Materials Characterization Platform
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-matTextMuted font-medium">
          <a href="#cinematic-trigger" className="hover:text-white transition-colors">
            Story
          </a>
          <a href="#capabilities" className="hover:text-white transition-colors">
            Instruments
          </a>
          <a href="#trust-stats" className="hover:text-white transition-colors">
            Precision
          </a>
          <a href="#final-cta" className="hover:text-white transition-colors">
            Access
          </a>
        </div>

        <div className="flex items-center gap-4">
          {/* Audio Toggle Button */}
          <button
            id="audio-toggle"
            title="Toggle Sci-Fi Ambience & Sound Effects"
            className="p-2.5 rounded-lg border border-matBorder bg-matSurface hover:bg-matElevated text-matTextMuted hover:text-white transition-all flex items-center gap-2.5 text-xs font-mono"
          >
            <i className="fas fa-volume-mute text-matOrange" id="audio-icon"></i>
            <div id="nav-eq-bars" className="hidden items-end gap-0.5 h-3">
              <span className="w-0.5 bg-matOrange animate-[bounce_1s_infinite_100ms] h-full"></span>
              <span className="w-0.5 bg-matOrange animate-[bounce_1s_infinite_300ms] h-2/3"></span>
              <span className="w-0.5 bg-matOrange animate-[bounce_1s_infinite_200ms] h-5/6"></span>
              <span className="w-0.5 bg-matOrange animate-[bounce_1s_infinite_400ms] h-1/2"></span>
            </div>
            <span id="audio-text">SOUND OFF</span>
          </button>

          {/* Login Button */}
          <Link
            href="/login"
            className="px-4 py-2.5 rounded-lg border border-matBorder bg-matSurface hover:bg-matElevated text-matTextMuted hover:text-white text-sm font-semibold transition-all"
          >
            Log in
          </Link>

          {/* Start Analyzing Button */}
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-lg bg-matOrange hover:bg-matOrangeLight text-matDark font-semibold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg shadow-matOrange/20 flex items-center gap-2"
          >
            <span>Start Analyzing</span>
            <i className="fas fa-arrow-right text-xs"></i>
          </Link>
        </div>
      </nav>

      {/* Floating Right-Side Scroll Progress Bar */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-3 pointer-events-none">
        <div className="text-[10px] font-mono text-matTextDim tracking-widest uppercase rotate-90 mb-6">
          SCENE <span id="scene-idx" className="text-matOrange">00</span>/08
        </div>
        <div className="w-[2px] h-36 bg-matBorder relative rounded-full overflow-hidden">
          <div id="scroll-progress-fill" className="w-full bg-matOrange h-0 transition-all duration-100"></div>
        </div>
        <div className="flex flex-col gap-2 mt-4 pointer-events-auto" id="scene-dots">
          <button
            onClick={() => (window as any).jumpToScene && (window as any).jumpToScene(0)}
            className="w-2 h-2 rounded-full bg-matOrange transition-all"
            title="Scene 0: Void"
          ></button>
          <button
            onClick={() => (window as any).jumpToScene && (window as any).jumpToScene(1)}
            className="w-2 h-2 rounded-full bg-matBorder hover:bg-matOrangeLight transition-all"
            title="Scene 1: Crystal"
          ></button>
          <button
            onClick={() => (window as any).jumpToScene && (window as any).jumpToScene(2)}
            className="w-2 h-2 rounded-full bg-matBorder hover:bg-matOrangeLight transition-all"
            title="Scene 2: Diffraction"
          ></button>
          <button
            onClick={() => (window as any).jumpToScene && (window as any).jumpToScene(3)}
            className="w-2 h-2 rounded-full bg-matBorder hover:bg-matOrangeLight transition-all"
            title="Scene 3: Graph"
          ></button>
          <button
            onClick={() => (window as any).jumpToScene && (window as any).jumpToScene(4)}
            className="w-2 h-2 rounded-full bg-matBorder hover:bg-matOrangeLight transition-all"
            title="Scene 4: AI Layer"
          ></button>
          <button
            onClick={() => (window as any).jumpToScene && (window as any).jumpToScene(5)}
            className="w-2 h-2 rounded-full bg-matBorder hover:bg-matOrangeLight transition-all"
            title="Scene 5: Structure"
          ></button>
          <button
            onClick={() => (window as any).jumpToScene && (window as any).jumpToScene(6)}
            className="w-2 h-2 rounded-full bg-matBorder hover:bg-matOrangeLight transition-all"
            title="Scene 6: Report"
          ></button>
          <button
            onClick={() => (window as any).jumpToScene && (window as any).jumpToScene(7)}
            className="w-2 h-2 rounded-full bg-matBorder hover:bg-matOrangeLight transition-all"
            title="Scene 7: Platform"
          ></button>
        </div>
      </div>

      {/* MAIN PINNED CINEMATIC CONTAINER (Scenes 00 through 08) */}
      <div id="cinematic-trigger" className="relative w-full">
        <div id="cinematic-pin" className="sticky top-0 w-full h-screen overflow-hidden bg-matDark flex items-center justify-center">
          {/* Three.js Canvas Container */}
          <div id="canvas-container" className="absolute inset-0 w-full h-full z-10">
            <canvas id="three-canvas" className="w-full h-full"></canvas>
          </div>

          {/* Ambient Radial Background Glows */}
          <div id="bg-glow-orange" className="absolute w-[600px] h-[600px] rounded-full bg-matOrange/10 blur-[140px] pointer-events-none transition-opacity duration-1000 z-0"></div>
          <div id="bg-glow-blue" className="absolute w-[500px] h-[500px] rounded-full bg-matBlue/10 blur-[140px] pointer-events-none opacity-0 transition-opacity duration-1000 z-0"></div>

          {/* OVERLAY CONTENT LAYERS */}
          <div className="relative z-20 w-full max-w-6xl px-6 pointer-events-none text-center">
            {/* Scene 00: The Void / Loading Breath */}
            <div id="scene-00-text" className="transition-all duration-700 opacity-100 transform translate-y-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-matOrange/30 bg-matOrange/10 text-matOrange text-xs font-mono mb-4">
                <span className="w-2 h-2 rounded-full bg-matOrange animate-ping"></span>
                SYSTEM READY • INTELLECTUAL MATTER
              </div>
              <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-white mb-4">
                Intelligence Applied to Matter.
              </h1>
              <p className="text-matTextMuted text-lg md:text-xl max-w-2xl mx-auto font-light">
                Scroll to initiate materials characterization sequence.
              </p>
              <div className="mt-8 flex justify-center">
                <div className="w-6 h-10 border-2 border-matBorder rounded-full flex justify-center p-1">
                  <div className="w-1.5 h-3 bg-matOrange rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>

            {/* Scene 01: The Crystal Emerges */}
            <div id="scene-01-text" className="absolute inset-0 flex flex-col justify-center items-center transition-all duration-700 opacity-0 pointer-events-none">
              <span className="text-xs font-mono tracking-widest text-matOrange uppercase mb-6">SCENE 01 // LATTICE FORMATION</span>
              <div className="relative flex flex-col items-center justify-center p-10 md:p-14 rounded-full bg-gradient-to-b from-matOrange/15 to-matOrange/5 border border-matOrange/20 shadow-2xl shadow-matOrange/20 backdrop-blur-md">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-matOrange flex items-center justify-center text-white font-black font-sans text-5xl md:text-7xl shadow-2xl shadow-matOrange/40 tracking-tight mb-6">
                  M
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-sans">
                  MatPilot
                </h2>
                <p className="text-matTextMuted/80 text-xs md:text-sm font-sans tracking-wide mt-1">
                  Materials Characterization Platform
                </p>
              </div>
              <p className="text-matTextMuted text-xs md:text-sm max-w-xl mt-6 font-mono">
                Perovskite Unit Cell • Symmetry Group Pm-3m
              </p>
            </div>

            {/* Scene 02: Diffraction Bloom */}
            <div id="scene-02-text" className="absolute inset-0 flex flex-col justify-center items-center transition-all duration-700 opacity-0 pointer-events-none">
              <span className="text-xs font-mono tracking-widest text-matBlue uppercase mb-2">SCENE 02 // WAVE INTERFERENCE</span>
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white max-w-2xl">
                X-Ray Diffraction Planes
              </h2>
              <p className="text-matTextMuted text-sm md:text-base max-w-md mt-3 font-mono">
                Bragg&apos;s Law: n&lambda; = 2d sin&theta;
              </p>
            </div>

            {/* Scene 03: Live Graph */}
            <div id="scene-03-text" className="absolute inset-0 flex flex-col justify-between p-8 md:p-16 transition-all duration-700 opacity-0 pointer-events-none">
              <div className="text-left">
                <span className="text-xs font-mono text-matOrange uppercase tracking-widest">SCENE 03 // INTENSITY PROFILE</span>
                <h2 className="text-2xl md:text-4xl font-bold text-white mt-1">XRD Spectrum Stream</h2>
              </div>
              <div className="text-right font-mono text-xs text-matTextDim">
                <div>2&theta; Sweep: 10.0° - 90.0°</div>
                <div>Source: Cu K-&alpha; (&lambda; = 1.5406 Å)</div>
              </div>
            </div>

            {/* Scene 04: AI Recognition Layer */}
            <div id="scene-04-text" className="absolute inset-0 flex flex-col justify-center items-center transition-all duration-700 opacity-0 pointer-events-none">
              <div className="glass-panel p-6 md:p-10 rounded-2xl max-w-3xl border-matBlue/30 shadow-2xl backdrop-blur-xl">
                <div className="inline-flex items-center gap-2 text-matBlue text-xs font-mono mb-3">
                  <i className="fas fa-microchip animate-pulse"></i> NEURAL RECOGNITION ENGINE ACTIVE
                </div>
                <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-4">
                  &quot;MatPilot reads what would take a scientist hours — in seconds.&quot;
                </h2>
                <div className="flex flex-wrap justify-center gap-3 text-xs font-mono text-matTextMuted">
                  <span className="px-3 py-1 rounded bg-matElevated border border-matBorder">Phase ID: <strong className="text-matOrange">LiFePO4 (Triphylite)</strong></span>
                  <span className="px-3 py-1 rounded bg-matElevated border border-matBorder">Confidence: <strong className="text-emerald-400">99.84%</strong></span>
                  <span className="px-3 py-1 rounded bg-matElevated border border-matBorder">Space Group: <strong className="text-matBlue">Pnma</strong></span>
                </div>
              </div>
            </div>

            {/* Scene 05: Structure Confirmed */}
            <div id="scene-05-text" className="absolute inset-0 flex flex-col justify-center items-center transition-all duration-700 opacity-0 pointer-events-none">
              <span className="text-xs font-mono tracking-widest text-matOrange uppercase mb-2">SCENE 05 // STRUCTURAL RESOLUTION</span>
              <h2 className="text-3xl md:text-6xl font-semibold tracking-tight text-white">
                From raw pattern to verified structure.
              </h2>
              <p className="text-matTextMuted text-sm md:text-base max-w-lg mt-3 font-mono">
                Atomic coordinates, thermal displacement parameters, and bond distances calculated in real-time.
              </p>
            </div>

            {/* Scene 06: Floating Glass Report Card */}
            <div id="scene-06-text" className="absolute inset-0 flex items-center justify-center transition-all duration-700 opacity-0 pointer-events-none">
              <div className="glass-panel glass-card-active p-6 md:p-8 rounded-2xl w-full max-w-lg text-left shadow-2xl transform transition-transform duration-500 hover:scale-102">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-xs font-mono text-matOrange uppercase tracking-widest">CHARACTERIZATION REPORT</div>
                    <h3 className="text-xl font-bold text-white mt-1">Lithium Iron Phosphate (LiFePO4)</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">VERIFIED</span>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-matElevated/50 border border-matBorder">
                    <div>
                      <div className="text-matTextDim">Cryst. System</div>
                      <div className="text-white font-medium text-sm">Orthorhombic</div>
                    </div>
                    <div>
                      <div className="text-matTextDim">Lattice Parameters</div>
                      <div className="text-white font-medium">a=10.33Å b=6.01Å c=4.69Å</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-matTextMuted">
                      <span>Phase Purity</span>
                      <span className="text-white">98.2%</span>
                    </div>
                    <div className="w-full bg-matBorder h-1.5 rounded-full overflow-hidden">
                      <div className="bg-matOrange h-full w-[98.2%]"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-2 rounded bg-matElevated border border-matBorder">
                      <div className="text-matTextDim text-[10px]">R_wp</div>
                      <div className="text-matOrange font-bold">2.41%</div>
                    </div>
                    <div className="p-2 rounded bg-matElevated border border-matBorder">
                      <div className="text-white font-bold">1.12</div>
                    </div>
                    <div className="p-2 rounded bg-matElevated border border-matBorder">
                      <div className="text-matDim text-[10px]">Crystallite</div>
                      <div className="text-matBlue font-bold">42.8 nm</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scene 07 & 08: Platform Glimpse */}
            <div id="scene-07-text" className="absolute inset-0 flex flex-col justify-center items-center transition-all duration-700 opacity-0 pointer-events-none">
              <span className="text-xs font-mono tracking-widest text-matOrange uppercase mb-2">SCENE 07 // MATPILOT PLATFORM</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white max-w-2xl mb-6">
                The entire characterization suite in your browser.
              </h2>
              <div className="flex gap-4 pointer-events-auto">
                <a href="#capabilities" className="px-6 py-3 rounded-lg bg-matOrange hover:bg-matOrangeLight text-matDark font-bold text-sm transition-all shadow-lg shadow-matOrange/20">
                  Explore Platform
                </a>
                <a href="#trust-stats" className="px-6 py-3 rounded-lg bg-matElevated border border-matBorder hover:border-matTextMuted text-white font-medium text-sm transition-all">
                  View Benchmarks
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 09: CAPABILITY GRID */}
      <section id="capabilities" className="relative py-28 px-6 lg:px-12 bg-matDark border-t border-matBorder">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-matOrange/30 bg-matOrange/10 text-matOrange text-xs font-mono mb-4">
              MODULAR INSTRUMENT ENGINE
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Multi-Modal Spectral Intelligence
            </h2>
            <p className="text-matTextMuted text-base md:text-lg mt-4 font-light">
              MatPilot unifies your analytical hardware into a single automated reasoning engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Instrument 1: XRD */}
            <div onClick={() => (window as any).playInstrumentSound && (window as any).playInstrumentSound('xrd')} className="glass-panel p-8 rounded-2xl hover:border-matOrange/50 transition-all duration-500 group relative overflow-hidden cursor-pointer">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-mono text-matOrange">INSTRUMENT // 01</span>
                  <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-matOrange transition-colors">X-Ray Powder Diffraction (XRD)</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-matOrange/10 border border-matOrange/30 flex items-center justify-center text-matOrange">
                  <i className="fas fa-cubes text-lg"></i>
                </div>
              </div>
              <p className="text-matTextMuted text-sm mb-6 leading-relaxed">
                Automated phase identification, Rietveld refinement, and lattice strain calculations from raw 2&theta; intensity scans.
              </p>
              <div className="w-full h-32 bg-matElevated/80 rounded-xl border border-matBorder relative overflow-hidden">
                <canvas id="sim-xrd" className="w-full h-full"></canvas>
                <div className="absolute bottom-2 left-3 font-mono text-[10px] text-matTextDim flex items-center gap-1.5">
                  <i className="fas fa-volume-high text-[9px] text-matOrange"></i> LIVE INTERFERENCE PATTERN [CLICK TO SYNTHESIZE]
                </div>
              </div>
            </div>

            {/* Instrument 2: Raman Spectroscopy */}
            <div onClick={() => (window as any).playInstrumentSound && (window as any).playInstrumentSound('raman')} className="glass-panel p-8 rounded-2xl hover:border-matBlue/50 transition-all duration-500 group relative overflow-hidden cursor-pointer">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-mono text-matBlue">INSTRUMENT // 02</span>
                  <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-matBlue transition-colors">Raman Spectroscopy</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-matBlue/10 border border-matBlue/30 flex items-center justify-center text-matBlue">
                  <i className="fas fa-wave-square text-lg"></i>
                </div>
              </div>
              <p className="text-matTextMuted text-sm mb-6 leading-relaxed">
                Vibrational mode deconvolution and chemical bond fingerprinting with laser-excitation noise subtraction.
              </p>
              <div className="w-full h-32 bg-matElevated/80 rounded-xl border border-matBorder relative overflow-hidden">
                <canvas id="sim-raman" className="w-full h-full"></canvas>
                <div className="absolute bottom-2 left-3 font-mono text-[10px] text-matTextDim flex items-center gap-1.5">
                  <i className="fas fa-volume-high text-[9px] text-matBlue"></i> PHOTON SCATTERING SIMULATION [CLICK TO SYNTHESIZE]
                </div>
              </div>
            </div>

            {/* Instrument 3: FTIR */}
            <div onClick={() => (window as any).playInstrumentSound && (window as any).playInstrumentSound('ftir')} className="glass-panel p-8 rounded-2xl hover:border-emerald-500/50 transition-all duration-500 group relative overflow-hidden cursor-pointer">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-mono text-emerald-400">INSTRUMENT // 03</span>
                  <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">FTIR Spectroscopy</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <i className="fas fa-microscope text-lg"></i>
                </div>
              </div>
              <p className="text-matTextMuted text-sm mb-6 leading-relaxed">
                Functional group matching across 4000 to 400 cm⁻¹ wavenumbers with atmospheric moisture compensation.
              </p>
              <div className="w-full h-32 bg-matElevated/80 rounded-xl border border-matBorder relative overflow-hidden">
                <canvas id="sim-ftir" className="w-full h-full"></canvas>
                <div className="absolute bottom-2 left-3 font-mono text-[10px] text-matTextDim flex items-center gap-1.5">
                  <i className="fas fa-volume-high text-[9px] text-emerald-400"></i> INFRARED TRANSMITTANCE INTERFEROGRAM [CLICK TO SYNTHESIZE]
                </div>
              </div>
            </div>

            {/* Instrument 4: SEM Micrographs */}
            <div onClick={() => (window as any).playInstrumentSound && (window as any).playInstrumentSound('sem')} className="glass-panel p-8 rounded-2xl hover:border-purple-500/50 transition-all duration-500 group relative overflow-hidden cursor-pointer">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-mono text-purple-400">INSTRUMENT // 04</span>
                  <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-purple-400 transition-colors">SEM & EDS Mapping</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <i className="fas fa-eye text-lg"></i>
                </div>
              </div>
              <p className="text-matTextMuted text-sm mb-6 leading-relaxed">
                Computer vision grain size segmentation, porosity distribution, and elemental composition heatmaps.
              </p>
              <div className="w-full h-32 bg-matElevated/80 rounded-xl border border-matBorder relative overflow-hidden">
                <canvas id="sim-sem" className="w-full h-full"></canvas>
                <div className="absolute bottom-2 left-3 font-mono text-[10px] text-matTextDim flex items-center gap-1.5">
                  <i className="fas fa-volume-high text-[9px] text-purple-400"></i> ELECTRON BEAM RASTER SCAN [CLICK TO SYNTHESIZE]
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: TRUST & RIGOR METRICS */}
      <section id="trust-stats" className="relative py-28 px-6 lg:px-12 bg-matSurface border-t border-matBorder">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            <div className="space-y-3">
              <div className="text-xs font-mono text-matOrange tracking-widest uppercase">PRECISION ACCURACY</div>
              <div className="text-5xl md:text-7xl font-extrabold text-white font-mono tracking-tight">
                99.84<span className="text-matOrange">%</span>
              </div>
              <p className="text-matTextMuted text-sm leading-relaxed">
                Verified phase classification across COD and ICSD crystalline structure databases.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono text-matBlue tracking-widest uppercase">ANALYSIS VELOCITY</div>
              <div className="text-5xl md:text-7xl font-extrabold text-white font-mono tracking-tight">
                120<span className="text-matBlue">x</span>
              </div>
              <p className="text-matTextMuted text-sm leading-relaxed">
                Reduction in time-to-insight compared to manual human Rietveld refinement.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono text-emerald-400 tracking-widest uppercase">REFERENCE LIBRARY</div>
              <div className="text-5xl md:text-7xl font-extrabold text-white font-mono tracking-tight">
                4.2M<span className="text-emerald-400">+</span>
              </div>
              <p className="text-matTextMuted text-sm leading-relaxed">
                Synthetic and empirical crystal structures indexing real-time peak predictions.
              </p>
            </div>
          </div>

          {/* ACOUSTIC SPECTRUM PROBE */}
          <div className="mt-20 p-8 md:p-12 glass-panel rounded-2xl max-w-5xl mx-auto border-matOrange/30 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-matOrange/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
              <div className="text-left max-w-md">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-matOrange/30 bg-matOrange/10 text-matOrange text-xs font-mono mb-3">
                  <i className="fas fa-wave-square animate-pulse"></i> INTERACTIVE ACOUSTIC SPECTRUM
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Sonic Resonance & Lattice Probe
                </h3>
                <p className="text-matTextMuted text-sm mt-2 font-light leading-relaxed">
                  Interact with the real-time acoustic synthesizer below. Click or drag across the frequency field to trigger lattice harmonics and vibrational modes.
                </p>
                <div className="flex items-center gap-4 mt-6">
                  <button
                    id="synth-trigger-btn"
                    onClick={() => (window as any).triggerProbePulse && (window as any).triggerProbePulse()}
                    className="px-5 py-2.5 rounded-lg bg-matOrange hover:bg-matOrangeLight text-matDark font-bold text-xs font-mono transition-all flex items-center gap-2 shadow-lg shadow-matOrange/20"
                  >
                    <i className="fas fa-play text-xs"></i> PULSE RESONANCE
                  </button>
                  <span className="text-xs font-mono text-matTextDim" id="synth-freq-readout">
                    FREQ: 432.00 Hz
                  </span>
                </div>
              </div>

              <div className="w-full lg:w-1/2 h-48 bg-matElevated/90 rounded-xl border border-matBorder relative overflow-hidden group cursor-pointer" id="spectral-probe-box">
                <canvas id="sonic-canvas" className="w-full h-full"></canvas>
                <div className="absolute top-3 left-3 text-[10px] font-mono text-matOrange flex items-center gap-2 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-matOrange animate-ping"></span>
                  AUDIO-VISUAL HARMONIC FIELD [CLICK & DRAG]
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] font-mono text-matTextDim pointer-events-none" id="probe-status">
                  MODULATION: IDLE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10.5: LIVE INTERACTIVE SANDBOX & MILLER PLANE INSPECTOR */}
      <section id="sandbox-inspector" className="relative py-28 px-6 lg:px-12 bg-matDark border-t border-matBorder">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-matBlue/30 bg-matBlue/10 text-matBlue text-xs font-mono mb-4">
              <i className="fas fa-flask"></i> LIVE PRODUCT SANDBOX
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Test Drive MatPilot Reasoning
            </h2>
            <p className="text-matTextMuted text-base md:text-lg mt-4 font-light">
              Select a benchmark dataset below to observe real-time crystallographic phase deconvolution and Miller lattice plane slicing.
            </p>
          </div>

          <div className="glass-panel p-6 md:p-10 rounded-2xl border-matBorder">
            <div className="flex flex-wrap gap-3 mb-8 border-b border-matBorder pb-6">
              <button
                onClick={() => (window as any).loadSandboxDataset && (window as any).loadSandboxDataset('nmc811')}
                id="tab-nmc811"
                className="px-4 py-2.5 rounded-lg bg-matOrange text-matDark font-bold text-xs font-mono transition-all flex items-center gap-2"
              >
                <i className="fas fa-battery-three-quarters"></i> NMC-811 Battery Cathode
              </button>
              <button
                onClick={() => (window as any).loadSandboxDataset && (window as any).loadSandboxDataset('perovskite')}
                id="tab-perovskite"
                className="px-4 py-2.5 rounded-lg bg-matElevated border border-matBorder text-matTextMuted hover:text-white font-mono text-xs transition-all flex items-center gap-2"
              >
                <i className="fas fa-sun"></i> MAPbI3 Solar Perovskite
              </button>
              <button
                onClick={() => (window as any).loadSandboxDataset && (window as any).loadSandboxDataset('llzo')}
                id="tab-llzo"
                className="px-4 py-2.5 rounded-lg bg-matElevated border border-matBorder text-matTextMuted hover:text-white font-mono text-xs transition-all flex items-center gap-2"
              >
                <i className="fas fa-microchip"></i> LLZO Solid Electrolyte
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 id="sandbox-dataset-title" className="text-xl font-bold text-white">LiNi0.8Mn0.1Co0.1O2 (NMC-811)</h3>
                    <div id="sandbox-spacegroup" className="text-xs font-mono text-matTextDim mt-1">Space Group: R-3m (#166) • Layered Rock-Salt Structure</div>
                  </div>
                  <span id="sandbox-purity-tag" className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                    99.1% PHASE PURITY
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-matElevated/80 border border-matBorder flex items-center gap-4">
                  <span className="text-xs font-mono text-matTextMuted uppercase tracking-wider">Lattice Slicing (Miller Indices):</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => (window as any).toggleMillerPlane && (window as any).toggleMillerPlane('100')}
                      id="plane-100"
                      className="px-3 py-1 rounded bg-matOrange text-matDark font-mono font-bold text-xs transition-all"
                    >
                      (100)
                    </button>
                    <button
                      onClick={() => (window as any).toggleMillerPlane && (window as any).toggleMillerPlane('110')}
                      id="plane-110"
                      className="px-3 py-1 rounded bg-matDark border border-matBorder text-matTextMuted font-mono text-xs transition-all"
                    >
                      (110)
                    </button>
                    <button
                      onClick={() => (window as any).toggleMillerPlane && (window as any).toggleMillerPlane('111')}
                      id="plane-111"
                      className="px-3 py-1 rounded bg-matDark border border-matBorder text-matTextMuted font-mono text-xs transition-all"
                    >
                      (111)
                    </button>
                  </div>
                </div>

                <div className="w-full h-64 bg-matDark rounded-xl border border-matBorder p-4 relative overflow-hidden">
                  <canvas id="sandbox-spectrum-canvas" className="w-full h-full"></canvas>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-matElevated/60 border border-matBorder flex flex-col justify-between font-mono text-xs">
                <div>
                  <div className="flex items-center gap-2 text-matOrange mb-4 font-bold tracking-wide">
                    <i className="fas fa-brain animate-pulse"></i> COPILOT SYNTHESIS INSIGHTS
                  </div>
                  <div id="sandbox-ai-log" className="space-y-3 text-matTextMuted leading-relaxed">
                    <p className="text-white font-medium">✓ Bragg peaks aligned with ICSD-184920.</p>
                    <p>• Sharp (003) reflection at 2&theta; = 18.7° indicates well-ordered layered cation framework.</p>
                    <p>• Cation mixing ratio (Li/Ni exchange): <span className="text-matOrange">1.24%</span> (Extremely low defect density).</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-matBorder space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-matTextDim">Rietveld R_wp:</span>
                    <span className="text-white font-bold" id="sandbox-rwp">1.82%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-matTextDim">Coherence Length:</span>
                    <span className="text-matBlue font-bold" id="sandbox-crystallite">58.4 nm</span>
                  </div>
                  <button
                    onClick={() => (window as any).triggerDemoModal && (window as any).triggerDemoModal()}
                    className="w-full mt-3 py-2.5 rounded bg-matOrange hover:bg-matOrangeLight text-matDark font-bold text-xs transition-all"
                  >
                    Export CIF & Full Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11: FINAL CALL TO ACTION */}
      <section id="final-cta" className="relative py-32 px-6 lg:px-12 bg-matDark border-t border-matBorder overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-matOrange/10 rounded-full blur-[150px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-xs font-mono text-matOrange tracking-widest uppercase mb-4 inline-block">INITIATE DISCOVERY</span>
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
            Ready to accelerate your materials intelligence?
          </h2>
          <p className="text-matTextMuted text-lg md:text-xl max-w-2xl mx-auto font-light mb-10">
            Deploy MatPilot into your laboratory workflow today. Compatible with PANalytical, Bruker, Rigaku, and JASCO data exports.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-matOrange hover:bg-matOrangeLight text-matDark font-bold text-base transition-all transform hover:scale-105 shadow-2xl shadow-matOrange/30 flex items-center justify-center gap-3"
            >
              <span>Start Analyzing Now</span>
              <i className="fas fa-chevron-right text-sm"></i>
            </Link>
            <button
              onClick={() => (window as any).triggerDemoModal && (window as any).triggerDemoModal()}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-matElevated border border-matBorder hover:border-matTextMuted text-white font-medium text-base transition-all"
            >
              Schedule Technical Demo
            </button>
          </div>

          <div className="mt-12 flex justify-center items-center gap-6 text-xs font-mono text-matTextDim">
            <span className="flex items-center gap-2"><i className="fas fa-shield-alt text-matOrange"></i> Enterprise Security Compliant</span>
            <span>•</span>
            <span className="flex items-center gap-2"><i className="fas fa-bolt text-matOrange"></i> Instant Cloud Processing</span>
          </div>
        </div>
      </section>

      {/* SECTION 12: FOOTER */}
      <footer className="py-16 px-6 lg:px-12 bg-matDark border-t border-matBorder text-matTextMuted text-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-matOrange flex items-center justify-center text-white font-bold font-sans text-lg shadow-md shadow-matOrange/30">
                M
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-white font-sans leading-none">MatPilot</span>
                <span className="text-[10px] text-matTextDim font-sans">Materials Characterization Platform</span>
              </div>
            </div>
            <p className="text-matTextDim max-w-sm text-xs leading-relaxed font-mono">
              MatPilot is intelligence applied to matter. Autonomous spectral decomposition and crystallographic structure solution.
            </p>
            <div className="text-xs text-matTextDim font-mono pt-2">
              © 2026 MatPilot Technologies Inc. All rights reserved.
            </div>
          </div>

          <div>
            <h4 className="text-white font-mono text-xs uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2 text-xs font-mono">
              <li><a href="#capabilities" className="hover:text-matOrange transition-colors">XRD Suite</a></li>
              <li><a href="#capabilities" className="hover:text-matOrange transition-colors">Raman Analytics</a></li>
              <li><a href="#capabilities" className="hover:text-matOrange transition-colors">FTIR Engine</a></li>
              <li><a href="#capabilities" className="hover:text-matOrange transition-colors">SEM Vision</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-mono text-xs uppercase tracking-wider mb-4">Science & Legal</h4>
            <ul className="space-y-2 text-xs font-mono">
              <li><a href="#" className="hover:text-matOrange transition-colors">Publications</a></li>
              <li><a href="#" className="hover:text-matOrange transition-colors">ICSD Database Integration</a></li>
              <li><a href="#" className="hover:text-matOrange transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-matOrange transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Interactive Modal Container */}
      <div
        id="demo-modal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300 p-4"
      >
        <div
          className="glass-panel p-8 rounded-2xl max-w-md w-full border-matOrange/30 text-center relative transform scale-95 transition-transform duration-300"
          id="demo-modal-card"
        >
          <button
            onClick={() => (window as any).closeDemoModal && (window as any).closeDemoModal()}
            className="absolute top-4 right-4 text-matTextDim hover:text-white text-lg"
          >
            <i className="fas fa-times"></i>
          </button>
          <div className="w-14 h-14 rounded-2xl bg-matOrange text-white font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-matOrange/30">
            M
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">Request Early Access</h3>
          <p className="text-matOrange text-xs font-sans mb-4">MatPilot — Materials Characterization Platform</p>
          <form
            onSubmit={(e) => (window as any).handleDemoSubmit && (window as any).handleDemoSubmit(e)}
            className="space-y-3"
          >
            <input
              type="email"
              required
              placeholder="Enter institutional email..."
              className="w-full px-4 py-3 rounded-lg bg-matElevated border border-matBorder focus:border-matOrange text-white text-sm focus:outline-none font-mono"
            />
            <button type="submit" className="w-full py-3 rounded-lg bg-matOrange hover:bg-matOrangeLight text-matDark font-bold text-sm transition-all">
              Submit Access Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
