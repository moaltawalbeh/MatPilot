"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./matpilot_v2.css";

export default function MatPilotHomepageV2() {
  const [soundActive, setSoundActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const soundEngineRef = useRef<any>(null);

  // Refs for cinematic elements
  const cinematicRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const glowSecondaryRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const crystalGroupRef = useRef<SVGGElement | null>(null);
  const graphPath1Ref = useRef<SVGPathElement | null>(null);
  const meshGroupRef = useRef<SVGGElement | null>(null);
  const scanBeamRef = useRef<HTMLDivElement | null>(null);
  const structureInnerRef = useRef<HTMLDivElement | null>(null);
  const ringsSvgRef = useRef<SVGSVGElement | null>(null);

  // Sound Engine Setup
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let master: GainNode | null = null;
    let droneGain: GainNode | null = null;
    let droneOsc1: OscillatorNode | null = null;
    let droneOsc2: OscillatorNode | null = null;
    let enabled = false;

    function ensureCtx() {
      if (!ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = 0.0;
        master.connect(ctx.destination);

        droneOsc1 = ctx.createOscillator();
        droneOsc2 = ctx.createOscillator();
        droneOsc1.type = "sine";
        droneOsc1.frequency.value = 55;
        droneOsc2.type = "sine";
        droneOsc2.frequency.value = 55.6;

        const droneFilter = ctx.createBiquadFilter();
        droneFilter.type = "lowpass";
        droneFilter.frequency.value = 300;

        droneGain = ctx.createGain();
        droneGain.gain.value = 0.05;

        droneOsc1.connect(droneFilter);
        droneOsc2.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(master);

        droneOsc1.start();
        droneOsc2.start();
      }
      return ctx;
    }

    function setEnabled(on: boolean) {
      enabled = on;
      ensureCtx();
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
      if (ctx && master) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(on ? 0.5 : 0.0, now, 0.25);
      }
    }

    function chime(freq: number, dur?: number, vol?: number, type?: OscillatorType) {
      if (!enabled || !ctx || !master) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol || 0.12, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.6));
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + (dur || 0.6) + 0.05);
    }

    function transition(sceneIndex: number) {
      if (!enabled) return;
      const freqs = [110, 220, 277, 330, 392, 440, 523, 587, 659];
      chime(freqs[sceneIndex % freqs.length], 0.9, 0.09, "sine");
      chime(freqs[sceneIndex % freqs.length] * 2, 0.5, 0.03, "triangle");
    }

    function click() {
      chime(880, 0.12, 0.06, "square");
    }

    function hover() {
      chime(660, 0.08, 0.025, "sine");
    }

    function setDroneModulation(intensity: number) {
      if (!ctx || !droneGain) return;
      const now = ctx.currentTime;
      droneGain.gain.setTargetAtTime(0.04 + intensity * 0.06, now, 0.3);
    }

    soundEngineRef.current = {
      setEnabled,
      transition,
      click,
      hover,
      setDroneModulation,
    };

    return () => {
      if (ctx) {
        ctx.close();
      }
    };
  }, []);

  const toggleSound = () => {
    const nextState = !soundActive;
    setSoundActive(nextState);
    if (soundEngineRef.current) {
      soundEngineRef.current.setEnabled(nextState);
    }
  };

  const handleSfxClick = () => {
    if (soundEngineRef.current) soundEngineRef.current.click();
  };

  const handleSfxHover = () => {
    if (soundEngineRef.current) soundEngineRef.current.hover();
  };

  // Canvas particle field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animFrameId: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    function resize() {
      if (!canvas) return;
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      canvas.style.height = window.innerHeight + "px";
    }
    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = window.innerWidth < 700 ? 45 : 90;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      hueBlue: boolean;
    }> = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.4 + 0.4,
        hueBlue: Math.random() < 0.18,
      });
    }

    let mouseX = W / 2;
    let mouseY = H / 2;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    function drawParticles() {
      if (!ctx2d) return;
      ctx2d.clearRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 180);

        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.r + influence * 1.5, 0, Math.PI * 2);
        ctx2d.fillStyle = p.hueBlue
          ? `rgba(62,142,255,${0.25 + influence * 0.4})`
          : `rgba(255,138,80,${0.22 + influence * 0.45})`;
        ctx2d.fill();
      }

      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx2 = particles[a].x - particles[b].x;
          const dy2 = particles[a].y - particles[b].y;
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (d2 < 120) {
            ctx2d.strokeStyle = `rgba(255,106,44,${0.06 * (1 - d2 / 120)})`;
            ctx2d.lineWidth = 0.6;
            ctx2d.beginPath();
            ctx2d.moveTo(particles[a].x, particles[a].y);
            ctx2d.lineTo(particles[b].x, particles[b].y);
            ctx2d.stroke();
          }
        }
      }
      animFrameId = requestAnimationFrame(drawParticles);
    }

    if (!reduceMotion) {
      drawParticles();
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, []);

  // Custom cursor dot & glow parallax
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (cursorDotRef.current) {
        cursorDotRef.current.style.left = e.clientX + "px";
        cursorDotRef.current.style.top = e.clientY + "px";
      }
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      if (glowSecondaryRef.current) {
        glowSecondaryRef.current.style.transform = `translate(${-x * 0.6}px, ${-y * 0.6}px)`;
      }
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  // Nav background on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!navRef.current) return;
      if (window.scrollY > window.innerHeight * 0.9) {
        navRef.current.classList.add("scrolled");
      } else {
        navRef.current.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reveal-on-scroll for post-cinematic content
  useEffect(() => {
    const revealEls = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Stat counters animation
  useEffect(() => {
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
    const statEls = document.querySelectorAll(".stat-num");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const target = parseFloat(el.getAttribute("data-target") || "0");
            const suffix = el.getAttribute("data-suffix") || "";
            let start: number | null = null;
            const duration = 1400;

            function step(ts: number) {
              if (!start) start = ts;
              const p = clamp((ts - start) / duration, 0, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              const val = target * eased;
              el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
              if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    statEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Card 3D tilt
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>("[data-tilt]");
    const cleanups: Array<() => void> = [];

    cards.forEach((card) => {
      const onMouseMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateY(-4px)`;
      };
      const onMouseLeave = () => {
        card.style.transform = "";
      };
      const onMouseEnter = () => {
        if (soundEngineRef.current) soundEngineRef.current.hover();
      };

      card.addEventListener("mousemove", onMouseMove);
      card.addEventListener("mouseleave", onMouseLeave);
      card.addEventListener("mouseenter", onMouseEnter);

      cleanups.push(() => {
        card.removeEventListener("mousemove", onMouseMove);
        card.removeEventListener("mouseleave", onMouseLeave);
        card.removeEventListener("mouseenter", onMouseEnter);
      });
    });

    return () => cleanups.forEach((c) => c());
  }, []);

  // Cinematic Scroll-linked Engine
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      document.querySelectorAll<HTMLElement>(".scene").forEach((s) => (s.style.opacity = "1"));
      document.querySelectorAll<HTMLElement>(".mesh-line, .mesh-node").forEach((el) => (el.style.opacity = "0.8"));
      return;
    }

    const cinematic = cinematicRef.current;
    if (!cinematic) return;

    const scenes = Array.from(cinematic.querySelectorAll<HTMLElement>(".scene"));
    const NUM_STEPS = scenes.length - 1;
    let lastSceneIndex = -1;
    let rafPending = false;
    let lastScrollY = window.scrollY;

    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

    function update() {
      rafPending = false;
      if (!cinematic) return;

      const currentScrollY = window.scrollY;
      const scrollVelocity = clamp(Math.abs(currentScrollY - lastScrollY) / 40, 0, 1);
      lastScrollY = currentScrollY;

      const rect = cinematic.getBoundingClientRect();
      const total = cinematic.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = total > 0 ? clamp(scrolled / total, 0, 1) : 0;
      const sceneFloat = progress * NUM_STEPS;
      const activeIndex = Math.round(sceneFloat);

      if (activeIndex !== lastSceneIndex && scrolled > 0 && scrolled < total) {
        if (soundEngineRef.current) soundEngineRef.current.transition(activeIndex);
        lastSceneIndex = activeIndex;
      }
      if (soundEngineRef.current) soundEngineRef.current.setDroneModulation(scrollVelocity);

      if (progressFillRef.current) {
        progressFillRef.current.style.height = `${progress * 100}%`;
      }

      scenes.forEach((scene, idx) => {
        const dist = Math.abs(sceneFloat - idx);
        const opacity = clamp(1 - dist, 0, 1);
        scene.style.opacity = String(opacity);
        scene.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
      });

      const glowOpacity = clamp(1 - Math.max(0, sceneFloat - 5), 0.15, 1);
      if (glowRef.current) glowRef.current.style.opacity = String(glowOpacity);

      const glowSecOpacity = clamp(sceneFloat - 3.2, 0, 1) * clamp(5.2 - sceneFloat, 0, 1);
      if (glowSecondaryRef.current) glowSecondaryRef.current.style.opacity = String(glowSecOpacity * 0.8);

      const t = performance.now() * 0.00006;

      // Scene 1: crystal SVG rotation
      if (crystalGroupRef.current) {
        const localCrystal = clamp(sceneFloat - 1, -1, 1);
        const rotation = t * 3600 + localCrystal * 50;
        crystalGroupRef.current.setAttribute(
          "transform",
          `rotate(${rotation} 200 200) scale(${1 + localCrystal * 0.18})`
        );
      }

      // Scene 2: diffraction rings scaling
      if (ringsSvgRef.current) {
        const ringCircles = ringsSvgRef.current.querySelectorAll<SVGCircleElement>("circle");
        const localRings = clamp(sceneFloat - 2, 0, 1);
        ringCircles.forEach((c, i) => {
          const base = 1 + i * 0.32;
          const scale = 1 + localRings * base * 0.95;
          c.style.transformOrigin = "200px 200px";
          c.style.transform = `scale(${scale})`;
          c.style.opacity = String(clamp(0.65 - localRings * 0.35, 0.12, 0.65));
        });
      }

      // Scene 3: graph draw-on
      if (graphPath1Ref.current) {
        const localGraph = clamp(sceneFloat - 3, 0, 1);
        const dash = clamp(localGraph * 1.4, 0, 1);
        graphPath1Ref.current.style.strokeDasharray = "1";
        graphPath1Ref.current.style.strokeDashoffset = String(1 - dash);
      }

      // Scene 4: mesh + scan beam
      if (meshGroupRef.current) {
        const localMesh = clamp(sceneFloat - 4, 0, 1);
        meshGroupRef.current.style.opacity = String(localMesh);
      }
      if (scanBeamRef.current) {
        const beamProgress = clamp((sceneFloat - 3.4) / 1.2, 0, 1);
        scanBeamRef.current.style.opacity = beamProgress > 0 && beamProgress < 1 ? "0.7" : "0";
        scanBeamRef.current.style.left = `${beamProgress * 100}%`;
      }

      // Scene 5: structure rotation
      if (structureInnerRef.current) {
        const localStruct = clamp(sceneFloat - 5, -1, 1);
        const structRotY = t * 4000 + localStruct * 70;
        structureInnerRef.current.style.transform = `rotateY(${structRotY}deg) rotateX(${localStruct * 12}deg)`;
      }

      // Scene 6/7 card entrance
      scenes.forEach((scene, idx) => {
        if (idx === 6 || idx === 7) {
          const local = clamp(sceneFloat - idx, -1, 1);
          const card = scene.querySelector<HTMLElement>(".glass-card, .platform-cards");
          if (card) {
            card.style.transform = `translateY(${local < 0 ? 20 * Math.abs(local) : 0}px)`;
          }
        }
      });
    }

    function requestUpdate() {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(update);
      }
    }

    let animLoopId: number;
    function loop() {
      requestUpdate();
      animLoopId = requestAnimationFrame(loop);
    }
    loop();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (animLoopId) cancelAnimationFrame(animLoopId);
    };
  }, []);

  return (
    <div className="matpilot-v2-body">
      <canvas id="particleCanvas" ref={canvasRef} />
      <div className="cursor-dot" id="cursorDot" ref={cursorDotRef} />

      <nav className="nav" id="nav" ref={navRef}>
        <Link href="/" className="nav-word">
          <span className="dot" />
          MatPilot
        </Link>
        <div className="nav-links">
          <a href="#product">Product</a>
          <a href="#science">Science</a>
          <a href="#pricing">Pricing</a>
          <div className="sound-toggle-wrap">
            <div
              className={`sound-toggle ${soundActive ? "active" : ""}`}
              id="soundToggle"
              role="button"
              aria-pressed={soundActive}
              title="Toggle ambient sound"
              onClick={toggleSound}
            >
              <div className="bars">
                <span />
                <span />
                <span />
              </div>
              <span id="soundLabel">{soundActive ? "Sound on" : "Sound off"}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            href="/login"
            style={{ fontSize: "14px", color: "var(--text-2)", textDecoration: "none" }}
            onMouseEnter={handleSfxHover}
            onClick={handleSfxClick}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="btn btn-primary btn-small"
            data-sfx="click"
            onMouseEnter={handleSfxHover}
            onClick={handleSfxClick}
          >
            Request Access
          </Link>
        </div>
      </nav>

      <main>
        <section className="cinematic" id="cinematic" ref={cinematicRef}>
          <div className="stage" ref={stageRef}>
            <div className="vignette" />
            <div className="glow" id="glow" ref={glowRef} />
            <div className="glow-secondary" id="glowSecondary" ref={glowSecondaryRef} />

            {/* Scene 0: Void */}
            <div className="scene" data-scene="0">
              <div className="void-point" />
              <div className="void-hint">Scroll to begin</div>
            </div>

            {/* Scene 1: Crystal Hero */}
            <div className="scene" data-scene="1">
              <svg className="crystal-svg" viewBox="0 0 400 400">
                <g id="crystalGroup" ref={crystalGroupRef}>
                  <line className="deep" x1="200" y1="30" x2="360" y2="120" />
                  <line className="deep" x1="360" y1="120" x2="360" y2="300" />
                  <line className="deep" x1="360" y1="300" x2="200" y2="390" />
                  <line className="deep" x1="200" y1="390" x2="40" y2="300" />
                  <line className="deep" x1="40" y1="300" x2="40" y2="120" />
                  <line className="deep" x1="40" y1="120" x2="200" y2="30" />
                  <line x1="200" y1="60" x2="320" y2="140" />
                  <line x1="320" y1="140" x2="320" y2="280" />
                  <line x1="320" y1="280" x2="200" y2="340" />
                  <line x1="200" y1="340" x2="80" y2="280" />
                  <line x1="80" y1="280" x2="80" y2="140" />
                  <line x1="80" y1="140" x2="200" y2="60" />
                  <line x1="200" y1="60" x2="200" y2="200" />
                  <line x1="320" y1="140" x2="200" y2="200" />
                  <line x1="320" y1="280" x2="200" y2="200" />
                  <line x1="200" y1="340" x2="200" y2="200" />
                  <line x1="80" y1="280" x2="200" y2="200" />
                  <line x1="80" y1="140" x2="200" y2="200" />
                  <circle className="node" cx="200" cy="60" r="3.5" />
                  <circle className="node" cx="320" cy="140" r="3.5" />
                  <circle className="node" cx="320" cy="280" r="3.5" />
                  <circle className="node" cx="200" cy="340" r="3.5" />
                  <circle className="node" cx="80" cy="280" r="3.5" />
                  <circle className="node" cx="80" cy="140" r="3.5" />
                  <circle className="node" cx="200" cy="200" r="5" />
                </g>
              </svg>
              <div className="wordmark-hero">MatPilot</div>
              <div className="scene-caption">Materials characterization, understood instantly.</div>
            </div>

            {/* Scene 2: Diffraction */}
            <div className="scene" data-scene="2">
              <div className="scene-eyebrow">01 / Signal</div>
              <svg className="rings-svg" viewBox="0 0 400 400" ref={ringsSvgRef}>
                <circle cx="200" cy="200" r="26" strokeWidth="1.6" />
                <circle className="blue" cx="200" cy="200" r="58" strokeWidth="1" />
                <circle cx="200" cy="200" r="94" strokeWidth="1.2" />
                <circle cx="200" cy="200" r="132" strokeWidth="0.9" />
                <circle className="blue" cx="200" cy="200" r="170" strokeWidth="0.6" />
                <circle cx="200" cy="200" r="196" strokeWidth="0.5" />
              </svg>
              <div className="scene-caption">Every plane of the lattice, diffracting.</div>
            </div>

            {/* Scene 3: Graph */}
            <div className="scene" data-scene="3">
              <div className="scene-eyebrow">02 / Pattern</div>
              <svg className="graph-svg" viewBox="0 0 800 280">
                <g className="graph-grid">
                  <line x1="0" y1="70" x2="800" y2="70" />
                  <line x1="0" y1="140" x2="800" y2="140" />
                  <line x1="0" y1="210" x2="800" y2="210" />
                </g>
                <path
                  className="graph-path"
                  id="graphPath1"
                  ref={graphPath1Ref}
                  d="M0,230 L60,225 L110,150 L140,40 L170,180 L230,220 L280,215 L330,90 L360,215 L420,225 L470,60 L500,220 L560,225 L610,170 L640,225 L700,220 L760,225 L800,225"
                  pathLength={1}
                />
              </svg>
              <div className="scene-caption">Raw diffraction pattern, captured in real time.</div>
            </div>

            {/* Scene 4: AI Recognition */}
            <div className="scene" data-scene="4">
              <div className="scan-beam" id="scanBeam" ref={scanBeamRef} />
              <svg className="graph-svg" viewBox="0 0 800 280">
                <g className="graph-grid">
                  <line x1="0" y1="70" x2="800" y2="70" />
                  <line x1="0" y1="140" x2="800" y2="140" />
                  <line x1="0" y1="210" x2="800" y2="210" />
                </g>
                <path
                  className="graph-path"
                  d="M0,230 L60,225 L110,150 L140,40 L170,180 L230,220 L280,215 L330,90 L360,215 L420,225 L470,60 L500,220 L560,225 L610,170 L640,225 L700,220 L760,225 L800,225"
                  pathLength={1}
                />
                <circle className="peak-node" cx="140" cy="40" r="4" />
                <circle className="peak-node" cx="330" cy="90" r="4" />
                <circle className="peak-node" cx="470" cy="60" r="4" />
                <circle className="peak-node" cx="610" cy="170" r="4" />
                <g id="meshGroup" ref={meshGroupRef}>
                  <line className="mesh-line" x1="140" y1="40" x2="330" y2="90" />
                  <line className="mesh-line" x1="330" y1="90" x2="470" y2="60" />
                  <line className="mesh-line" x1="470" y1="60" x2="610" y2="170" />
                  <line className="mesh-line" x1="140" y1="40" x2="470" y2="60" />
                  <circle className="mesh-node" cx="140" cy="40" r="6" />
                  <circle className="mesh-node" cx="330" cy="90" r="6" />
                  <circle className="mesh-node" cx="470" cy="60" r="6" />
                  <circle className="mesh-node" cx="610" cy="170" r="6" />
                </g>
              </svg>
              <div className="scene-heading">MatPilot reads what would take a scientist hours — in seconds.</div>
            </div>

            {/* Scene 5: Structure */}
            <div className="scene" data-scene="5">
              <div className="structure-3d">
                <div className="structure-inner" id="structureInner" ref={structureInnerRef}>
                  <div className="atom" style={{ left: "134px", top: "16px" }} />
                  <div className="atom blue" style={{ left: "238px", top: "90px" }} />
                  <div className="atom" style={{ left: "238px", top: "194px" }} />
                  <div className="atom blue" style={{ left: "134px", top: "268px" }} />
                  <div className="atom" style={{ left: "30px", top: "194px" }} />
                  <div className="atom blue" style={{ left: "30px", top: "90px" }} />
                  <div className="atom" style={{ left: "134px", top: "142px" }} />
                </div>
              </div>
              <div className="scene-heading">From raw pattern to verified structure.</div>
            </div>

            {/* Scene 6: Report */}
            <div className="scene" data-scene="6">
              <div className="glass-card report-card" data-tilt>
                <div className="accent-bar" />
                <h3>Phase Analysis — Sample 0417</h3>
                <div className="data-grid">
                  <div className="data-item">
                    <div className="k">Primary Phase</div>
                    <div className="v accent">Perovskite-type</div>
                  </div>
                  <div className="data-item">
                    <div className="k">Confidence</div>
                    <div className="v accent">98.6%</div>
                  </div>
                  <div className="data-item">
                    <div className="k">Space Group</div>
                    <div className="v">Pm-3m</div>
                  </div>
                  <div className="data-item">
                    <div className="k">Lattice a</div>
                    <div className="v">3.905 Å</div>
                  </div>
                  <div className="data-item">
                    <div className="k">Crystallite Size</div>
                    <div className="v">42.1 nm</div>
                  </div>
                  <div className="data-item">
                    <div className="k">Analysis Time</div>
                    <div className="v">4.2 s</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scene 7: Platform */}
            <div className="scene" data-scene="7">
              <div className="platform-cards">
                <div className="glass-card small" data-tilt>
                  <div className="label">Sample Queue</div>
                  04 pending · 12 complete
                </div>
                <div className="glass-card featured" data-tilt>
                  <div className="accent-bar" />
                  <div className="label" style={{ paddingLeft: "12px" }}>
                    Latest Report
                  </div>
                  <div style={{ paddingLeft: "12px", fontSize: "15px", marginTop: "6px" }}>
                    Perovskite-type · 98.6% confidence
                  </div>
                </div>
                <div className="glass-card small" data-tilt>
                  <div className="label">History</div>
                  238 analyses this month
                </div>
              </div>
            </div>

            {/* Scene 8: Closing */}
            <div className="scene" data-scene="8">
              <div className="closing-wordmark">MatPilot</div>
              <p className="closing-line">Materials intelligence, built for scientists who don&apos;t have hours to spare.</p>
              <div className="cta-actions">
                <Link
                  href="/register"
                  className="btn btn-primary"
                  data-sfx="click"
                  onMouseEnter={handleSfxHover}
                  onClick={handleSfxClick}
                >
                  Start Analyzing
                </Link>
              </div>
            </div>
          </div>

          <div className="progress-rail">
            <div className="progress-fill" id="progressFill" ref={progressFillRef} />
          </div>
          <div className="progress-labels">
            <span>SIGNAL</span>
            <span>ANALYSIS</span>
            <span>STRUCTURE</span>
            <span>PLATFORM</span>
          </div>
        </section>

        <section className="section" id="product">
          <div className="section-header reveal">
            <div className="eyebrow">Instruments, Understood</div>
            <h2>One platform. Every technique.</h2>
            <p>
              MatPilot reads and interprets data across the characterization methods materials scientists already rely
              on — no format wrangling, no manual peak-picking.
            </p>
          </div>
          <div className="capability-grid">
            <div className="capability-card reveal" data-tilt>
              <svg className="capability-icon" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="6" stroke="#FF6A2C" strokeWidth="1.4" />
                <circle cx="22" cy="22" r="13" stroke="#FF6A2C" strokeWidth="1" opacity="0.5" />
                <circle cx="22" cy="22" r="20" stroke="#FF6A2C" strokeWidth="0.7" opacity="0.3" />
              </svg>
              <h3>XRD</h3>
              <p>Phase identification, Rietveld refinement, and crystallite size — resolved automatically from raw diffraction data.</p>
            </div>
            <div className="capability-card reveal" data-tilt>
              <svg className="capability-icon" viewBox="0 0 44 44" fill="none">
                <path d="M4 32 Q14 12 22 22 T40 12" stroke="#FF6A2C" strokeWidth="1.4" />
                <path d="M4 26 Q14 10 22 18 T40 8" stroke="#FF6A2C" strokeWidth="0.8" opacity="0.4" />
              </svg>
              <h3>Raman</h3>
              <p>Vibrational mode assignment and molecular fingerprinting, cross-referenced against a growing spectral library.</p>
            </div>
            <div className="capability-card reveal" data-tilt>
              <svg className="capability-icon" viewBox="0 0 44 44" fill="none">
                <path d="M4 22 C12 8, 16 36, 22 22 C28 8, 32 36, 40 22" stroke="#FF6A2C" strokeWidth="1.4" />
              </svg>
              <h3>FTIR</h3>
              <p>Functional group detection and compound classification from infrared absorption spectra, in a single pass.</p>
            </div>
            <div className="capability-card reveal" data-tilt>
              <svg className="capability-icon" viewBox="0 0 44 44" fill="none">
                <rect x="8" y="8" width="28" height="28" rx="3" stroke="#FF6A2C" strokeWidth="1.2" />
                <circle cx="22" cy="22" r="7" stroke="#FF6A2C" strokeWidth="1" />
              </svg>
              <h3>SEM</h3>
              <p>Morphology and particle-size distribution extracted directly from micrographs — no manual annotation required.</p>
            </div>
          </div>
        </section>

        <section className="section trust" id="pricing">
          <div className="section-header reveal">
            <div className="eyebrow">In the Lab, Today</div>
            <h2>Precision at the speed of thought.</h2>
          </div>
          <div className="stats-row">
            <div className="stat reveal">
              <div className="stat-num" data-target="94" data-suffix="%">
                0%
              </div>
              <div className="stat-label">Reduction in manual analysis time</div>
            </div>
            <div className="stat reveal">
              <div className="stat-num" data-target="4" data-suffix=" s">
                0 s
              </div>
              <div className="stat-label">Median time to phase identification</div>
            </div>
            <div className="stat reveal">
              <div className="stat-num" data-target="99.1" data-suffix="%">
                0%
              </div>
              <div className="stat-label">Agreement with expert refinement</div>
            </div>
          </div>
        </section>

        <section className="final-cta reveal">
          <h2>Bring intelligence to your instrument.</h2>
          <p>Upload a pattern. See what MatPilot sees.</p>
          <div className="cta-actions">
            <Link
              href="/register"
              className="btn btn-primary"
              data-sfx="click"
              onMouseEnter={handleSfxHover}
              onClick={handleSfxClick}
            >
              Start Analyzing
            </Link>
            <a
              href="mailto:hello@matpilot.ai"
              className="btn btn-secondary"
              data-sfx="click"
              onMouseEnter={handleSfxHover}
              onClick={handleSfxClick}
            >
              Talk to the team
            </a>
          </div>
        </section>
      </main>

      <footer className="matpilot-v2-footer">
        <div className="footer-ring" />
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-word">
              <span className="dot" />
              MatPilot
            </div>
            <p>AI-powered materials characterization — from raw signal to verified structure, in seconds.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#product">XRD</a>
              <a href="#product">Raman</a>
              <a href="#product">FTIR</a>
              <a href="#product">SEM</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <Link href="/about">About</Link>
              <a href="mailto:hello@matpilot.ai">Careers</a>
              <a href="mailto:hello@matpilot.ai">Contact</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">© 2026 MatPilot. All rights reserved.</div>
      </footer>
    </div>
  );
}
