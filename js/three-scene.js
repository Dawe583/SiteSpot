/**
 * SiteSpot — Three.js Background Scene  v2
 * Awwwards-level treatment:
 *   • 3 000 GPU particles with custom GLSL vertex/fragment shaders
 *   • Scroll-driven morph: sphere → DNA helix → dispersed grid
 *   • Volumetric additive-blend glow rings
 *   • Per-particle sin-wave breathing animation
 *   • Mouse-reactive camera with smooth lerp
 *   • AdditiveBlending throughout — zero overdraw cost
 */

(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  // ─────────────────────────────────────────────────────────────
  //  RENDERER
  // ─────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,          // off – particles look fine, perf gain
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 6);

  // ─────────────────────────────────────────────────────────────
  //  STATE
  // ─────────────────────────────────────────────────────────────
  let time         = 0;
  let scrollRaw    = 0;   // target scroll  0-1
  let scrollSmooth = 0;   // lerped scroll  0-1
  let mouseX = 0, mouseY = 0;
  let camX = 0, camY = 0;

  // ─────────────────────────────────────────────────────────────
  //  PARTICLE SYSTEM  (custom shaders)
  // ─────────────────────────────────────────────────────────────
  const COUNT = 3000;

  // Pre-bake three position sets: sphere / helix / grid
  const posSphere = new Float32Array(COUNT * 3);
  const posHelix  = new Float32Array(COUNT * 3);
  const posGrid   = new Float32Array(COUNT * 3);
  const randoms   = new Float32Array(COUNT * 3); // r0 phase, r1 size, r2 brightness
  const colorsArr = new Float32Array(COUNT * 3); // per-particle base colour

  const _cA = new THREE.Color(0xc8ff3e); // lime
  const _cB = new THREE.Color(0x88dd00); // green
  const _cC = new THREE.Color(0xffffff); // white core

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;

    // — SPHERE positions (Fibonacci lattice for even distribution)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const theta = goldenAngle * i;
    const y     = 1 - (i / (COUNT - 1)) * 2;
    const rSin  = Math.sqrt(1 - y * y);
    const R     = 1.6 + (Math.random() - 0.5) * 0.35;
    posSphere[i3]     = Math.cos(theta) * rSin * R;
    posSphere[i3 + 1] = y * R;
    posSphere[i3 + 2] = Math.sin(theta) * rSin * R;

    // — HELIX (double helix)
    const t      = (i / COUNT) * Math.PI * 14;
    const strand = i % 2 === 0 ? 1 : -1;
    const hR     = 0.9;
    const hSpread = 0.08;
    posHelix[i3]     = (Math.cos(t) * hR + (Math.random() - 0.5) * hSpread) * strand * Math.cos(strand * 0.8);
    posHelix[i3 + 1] = (t / (Math.PI * 14)) * 4.5 - 2.25 + (Math.random() - 0.5) * hSpread;
    posHelix[i3 + 2] = Math.sin(t) * hR * strand + (Math.random() - 0.5) * hSpread;

    // — GRID (spread outward)
    const gx = ((i % 20) - 9.5) * 0.32;
    const gy = (Math.floor(i / 20) % 20 - 9.5) * 0.32;
    const gz = (Math.floor(i / 400) - 1.5) * 1.2;
    posGrid[i3]     = gx + (Math.random() - 0.5) * 0.08;
    posGrid[i3 + 1] = gy + (Math.random() - 0.5) * 0.08;
    posGrid[i3 + 2] = gz + (Math.random() - 0.5) * 0.08;

    // — Randoms
    randoms[i3]     = Math.random() * Math.PI * 2; // phase
    randoms[i3 + 1] = 0.4 + Math.random() * 0.6;  // size factor
    randoms[i3 + 2] = 0.6 + Math.random() * 0.4;  // brightness

    // — Per-particle colour: blend cyan→teal by y-position on sphere
    const mixF  = Math.max(0, Math.min(1, (posSphere[i3 + 1] / R + 1) * 0.5));
    const pCol  = new THREE.Color().lerpColors(_cA, _cB, mixF);
    // brightest 5% → white
    if (randoms[i3 + 2] > 0.95) pCol.set(_cC);
    colorsArr[i3]     = pCol.r;
    colorsArr[i3 + 1] = pCol.g;
    colorsArr[i3 + 2] = pCol.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',   new THREE.BufferAttribute(posSphere.slice(), 3));
  geo.setAttribute('aSphere',    new THREE.BufferAttribute(posSphere, 3));
  geo.setAttribute('aHelix',     new THREE.BufferAttribute(posHelix,  3));
  geo.setAttribute('aGrid',      new THREE.BufferAttribute(posGrid,   3));
  geo.setAttribute('aRandom',    new THREE.BufferAttribute(randoms,   3));
  geo.setAttribute('aColor',     new THREE.BufferAttribute(colorsArr, 3));

  // ── VERTEX SHADER ───────────────────────────────────────────
  const vertexShader = /* glsl */`
    attribute vec3 aSphere;
    attribute vec3 aHelix;
    attribute vec3 aGrid;
    attribute vec3 aRandom;   // x=phase, y=sizeFactor, z=brightness
    attribute vec3 aColor;

    uniform float uTime;
    uniform float uScroll;    // 0-1
    uniform float uMorphA;    // sphere→helix blend  0-1
    uniform float uMorphB;    // helix→grid blend    0-1
    uniform float uGlobalSize;

    varying vec3  vColor;
    varying float vAlpha;

    // smooth step that avoids clamp artefacts
    float remap(float v, float lo, float hi) {
      return clamp((v - lo) / (hi - lo), 0.0, 1.0);
    }

    void main() {
      // Morph between the three shapes
      vec3 pos = mix(aSphere, aHelix, uMorphA);
      pos       = mix(pos,    aGrid,  uMorphB);

      // Per-particle breathing wave
      float wave = sin(uTime * 1.4 + aRandom.x) * 0.045;
      pos += normalize(pos) * wave;

      vColor = aColor;
      vAlpha = aRandom.z;

      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_Position  = projectionMatrix * mvPos;

      // Perspective-correct size — closer = bigger
      float dist = length(mvPos.xyz);
      gl_PointSize = uGlobalSize * aRandom.y * (6.0 / dist);
    }
  `;

  // ── FRAGMENT SHADER ─────────────────────────────────────────
  const fragmentShader = /* glsl */`
    varying vec3  vColor;
    varying float vAlpha;

    void main() {
      // Soft disc — distance from centre of point sprite
      vec2  uv   = gl_PointCoord - 0.5;
      float dist = length(uv);
      if (dist > 0.5) discard;

      // Soft glow falloff
      float strength = 1.0 - smoothstep(0.0, 0.5, dist);
      strength = pow(strength, 1.6);

      gl_FragColor = vec4(vColor * strength, strength * vAlpha);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime:       { value: 0 },
      uScroll:     { value: 0 },
      uMorphA:     { value: 0 },
      uMorphB:     { value: 0 },
      uGlobalSize: { value: 3.5 },
    },
    transparent:    true,
    depthWrite:     false,
    blending:       THREE.AdditiveBlending,
    vertexColors:   true,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ─────────────────────────────────────────────────────────────
  //  VOLUMETRIC GLOW RINGS  (additive, no shader needed)
  // ─────────────────────────────────────────────────────────────
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  function makeGlowRing(radius, tube, tiltDeg, color, opacity) {
    const geo = new THREE.TorusGeometry(radius, tube, 6, 160);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = (tiltDeg * Math.PI) / 180;
    ringGroup.add(mesh);
    return mesh;
  }

  const glowRings = [
    makeGlowRing(1.82, 0.012, 0,   0xc8ff3e, 0.45),
    makeGlowRing(1.65, 0.009, 58,  0x88dd00, 0.35),
    makeGlowRing(1.52, 0.009, -42, 0xc8ff3e, 0.28),
    makeGlowRing(1.30, 0.007, 90,  0x88dd00, 0.22),
    makeGlowRing(1.10, 0.007, 28,  0xc8ff3e, 0.18),
    makeGlowRing(0.88, 0.005, -68, 0x88dd00, 0.15),
  ];

  // ── Outer halo — very large, barely visible ──────────────────
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x1a2500,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 32), haloMat);
  ringGroup.add(halo);

  // ─────────────────────────────────────────────────────────────
  //  CORE  (icosphere wireframe + inner bright sphere)
  // ─────────────────────────────────────────────────────────────
  const coreGroup = new THREE.Group();
  ringGroup.add(coreGroup);

  const wfMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.30, 2),
    new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  coreGroup.add(wfMesh);

  const innerCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  coreGroup.add(innerCore);

  // ─────────────────────────────────────────────────────────────
  //  POSITION GROUP  (right side, hero)
  // ─────────────────────────────────────────────────────────────
  const root = new THREE.Group();
  root.add(points);
  root.add(ringGroup);
  root.position.set(3.2, 0, 0);
  scene.add(root);

  // ─────────────────────────────────────────────────────────────
  //  EVENTS
  // ─────────────────────────────────────────────────────────────
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    scrollRaw = total > 0 ? window.scrollY / total : 0;
  }, { passive: true });

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ─────────────────────────────────────────────────────────────
  //  ANIMATION LOOP
  // ─────────────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(lo, hi, x) {
    const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
    return t * t * (3 - 2 * t);
  }

  function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    // Smooth scroll
    scrollSmooth = lerp(scrollSmooth, scrollRaw, 0.06);
    const s = scrollSmooth;

    // ── Morph phases ──────────────────────────────────────────
    // 0→0.35  sphere stays, rings expand
    // 0.35→0.65  morph to helix
    // 0.65→1.0   morph to grid / disperse
    const morphA = smoothstep(0.30, 0.60, s); // sphere → helix
    const morphB = smoothstep(0.62, 0.90, s); // helix  → grid

    mat.uniforms.uTime.value    = time;
    mat.uniforms.uScroll.value  = s;
    mat.uniforms.uMorphA.value  = morphA;
    mat.uniforms.uMorphB.value  = morphB;

    // Particle size: shrink slightly at grid phase
    mat.uniforms.uGlobalSize.value = 3.5 - morphB * 1.2;

    // ── Root position ─────────────────────────────────────────
    // Hero (s<0.35): sit on right side
    // Mid (helix):   drift toward centre-left
    // End (grid):    fill whole screen, centred
    const targetX = lerp(3.2, lerp(-1.5, 0, morphB), morphA);
    const targetY = Math.sin(time * 0.4) * 0.06 + s * 0.4;
    root.position.x = lerp(root.position.x, targetX, 0.04);
    root.position.y = lerp(root.position.y, targetY, 0.04);

    // ── Scale ─────────────────────────────────────────────────
    const targetScale = 1 + morphA * 0.35 + morphB * 0.55;
    root.scale.setScalar(lerp(root.scale.x, targetScale, 0.05));

    // ── Rotation ─────────────────────────────────────────────
    const rotSpeed = 0.003 + morphA * 0.012 + morphB * 0.004;
    root.rotation.y += rotSpeed;
    root.rotation.x  = lerp(root.rotation.x, mouseY * 0.12 + s * 0.25, 0.04);

    // ── Ring animation ────────────────────────────────────────
    glowRings.forEach((ring, i) => {
      ring.rotation.z += 0.003 * (i % 2 === 0 ? 1 : -1) * (1 + morphA * 1.8);
      const baseOpacity = [0.55, 0.45, 0.38, 0.30, 0.25, 0.20][i];
      // Rings fade into particles during morph
      ring.material.opacity = baseOpacity * (1 - morphA * 0.6) * (1 - morphB * 0.8);
      ring.scale.setScalar(1 + morphA * 0.4);
    });
    haloMat.opacity = 0.12 * (1 - morphA * 0.7);

    // ── Core ─────────────────────────────────────────────────
    const pulse = 1 + Math.sin(time * 2.8) * 0.07;
    coreGroup.scale.setScalar(pulse);
    wfMesh.rotation.x += 0.010;
    wfMesh.rotation.y += 0.007;
    wfMesh.material.opacity = 0.35 * (1 - morphA * 0.5);
    innerCore.material.opacity = 0.92 - morphA * 0.5;

    // ── Camera parallax ───────────────────────────────────────
    camX = lerp(camX, mouseX * 0.25, 0.04);
    camY = lerp(camY, -mouseY * 0.18, 0.04);
    camera.position.x = camX;
    camera.position.y = camY;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  animate();
})();