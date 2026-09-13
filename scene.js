import * as THREE from './vendor/three.module.min.js';

export function createScene(canvas, onFailure) {
  const mobile = matchMedia('(max-width: 700px)');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x090a0c, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile.matches ? 1.25 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const world = new THREE.Scene();
  world.fog = new THREE.FogExp2(0x090a0c, .027);
  const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, .1, 70);
  camera.position.set(0, 0, 9.6);

  // A procedural studio panorama gives the metal broad, crisp reflections.
  const studio = document.createElement('canvas');
  studio.width = 1024; studio.height = 512;
  const ctx = studio.getContext('2d');
  ctx.fillStyle = '#111215'; ctx.fillRect(0, 0, 1024, 512);
  const strip = (x, y, w, h, color) => {
    const gradient = ctx.createLinearGradient(x, y, x + w, y);
    gradient.addColorStop(0, '#17181a'); gradient.addColorStop(.15, color);
    gradient.addColorStop(.8, color); gradient.addColorStop(1, '#17181a');
    ctx.fillStyle = gradient; ctx.fillRect(x, y, w, h);
  };
  strip(60, 35, 130, 390, '#ffffff');
  strip(340, 5, 70, 460, '#eaffc6');
  strip(520, 80, 240, 250, '#fafaff');
  strip(830, 90, 70, 350, '#e8a1f3');
  const environment = new THREE.CanvasTexture(studio);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  environment.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromEquirectangular(environment);
  world.environment = environmentTarget.texture;
  environment.dispose(); pmrem.dispose();

  world.add(new THREE.AmbientLight(0xffffff, .3));
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(-3, 5, 6); world.add(key);
  const lime = new THREE.PointLight(0xccff39, 35, 20, 2);
  lime.position.set(4, 2, 3); world.add(lime);
  const pink = new THREE.PointLight(0xf34aff, 45, 20, 2);
  pink.position.set(0, -3, 2); world.add(pink);

  const sculpture = new THREE.Group();
  world.add(sculpture);
  const timeUniform = { value: 0 };
  const metal = new THREE.MeshPhysicalMaterial({color:0xd5d7d1, metalness:1, roughness:.19, clearcoat:1, clearcoatRoughness:.15, envMapIntensity:1.65});
  metal.onBeforeCompile = shader => {
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float ripple = sin(position.x * 2.4 + uTime * .55) * sin(position.y * 2.1 - uTime * .4) * .085;
      transformed += normal * ripple;
    `);
  };
  // A stack of offset blocks reads as layered backend architecture — a foundation
  // (data layer), a core service layer, and smaller modules built on top and
  // offset like they're being assembled — instead of an abstract decorative knot.
  const structure = new THREE.Group();
  const blockSpecs = [
    { size: [1.55, .22, 1.55], pos: [0, -.95, 0], rotY: .10 },   // foundation / data layer
    { size: [1.15, .55, 1.15], pos: [.05, -.42, 0], rotY: -.08 }, // core service layer
    { size: [.82, .5, .82], pos: [.62, .27, -.08], rotY: .42 },  // API / interface layer
    { size: [.58, .4, .58], pos: [-.55, .55, .3], rotY: -.55 }   // top module, still settling into place
  ];
  blockSpecs.forEach(({ size, pos, rotY }) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2], 2, 2, 2), metal);
    block.position.set(pos[0], pos[1], pos[2]);
    block.rotation.y = rotY;
    structure.add(block);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(block.geometry), new THREE.LineBasicMaterial({ color: 0xd6ff64, transparent: true, opacity: .35 }));
    block.add(edges);
  });
  structure.rotation.set(.35, -.35, -.35);
  sculpture.add(structure);
  sculpture.position.set(2.15, .1, 0);

  const orbit = new THREE.Group();
  sculpture.add(orbit);
  const orbitMaterial = new THREE.MeshBasicMaterial({ color:0xd6ff64, transparent:true, opacity:.23 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, .006, 5, 150), orbitMaterial);
  ring.rotation.set(1.12, -.35, .2); orbit.add(ring);
  // A small cube on the orbit path reads as a module/package being deployed onto the stack.
  const satellite = new THREE.Mesh(new THREE.BoxGeometry(.15, .15, .15), new THREE.MeshStandardMaterial({color:0xccff39,emissive:0xccff39,emissiveIntensity:.45,metalness:.7,roughness:.3}));
  orbit.add(satellite);

  const arc = new THREE.Mesh(new THREE.TorusGeometry(4.8, .012, 5, 160, Math.PI * 1.6), new THREE.MeshBasicMaterial({color:0xf34aff,transparent:true,opacity:.19}));
  arc.position.set(-.5, -1, -3); arc.rotation.set(.2, .6, -.5); world.add(arc);

  const particleCount = mobile.matches ? 120 : 380;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  // Seeded placement keeps the composition stable across visits and screenshots.
  let seed = 29;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < particleCount; i++) {
    positions[i*3] = (random() - .5) * 23;
    positions[i*3+1] = (random() - .5) * 17;
    positions[i*3+2] = (random() - .7) * 18;
    const color = new THREE.Color(i % 7 === 0 ? 0xccff39 : i % 9 === 0 ? 0xe88beb : 0xa3a5a9);
    colors.set([color.r, color.g, color.b], i*3);
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({size:.024,transparent:true,opacity:.6,vertexColors:true,depthWrite:false,sizeAttenuation:true}));
  world.add(particles);

  const pointer = new THREE.Vector2();
  const smoothPointer = new THREE.Vector2();
  const targetPosition = new THREE.Vector3();
  const targetCamera = new THREE.Vector3();
  addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') pointer.set(event.clientX / innerWidth - .5, event.clientY / innerHeight - .5);
  }, {passive:true});

  let anchors = [];
  function measure() {
    anchors = ['home','projects','experience','contrib'].map(id => document.getElementById(id).offsetTop);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile.matches ? 1.25 : 1.75, qualityRatio));
  }
  let qualityRatio = Math.min(devicePixelRatio, 1.75);
  measure();
  addEventListener('resize', measure);
  document.fonts.ready.then(measure);
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(document.querySelector('main'));

  // Small, monotonic drift between keyframes so scroll motion reads as one continuous
  // camera move rather than a disjointed flythrough. Rotation deltas stay well under
  // half a turn so the knot never appears to tumble or snap between orientations.
  const frames = [
    {x:2.15,y:.10,z:0,   rx:.35,ry:-.35,rz:-.35,cx:0,   cy:0,  cz:9.6},
    {x:2.35,y:.20,z:-.45,rx:.55,ry:-.15,rz:-.22,cx:.15, cy:.06,cz:9.8},
    {x:2.55,y:.30,z:-.85,rx:.72,ry:.05, rz:-.08,cx:-.10,cy:.12,cz:10.0},
    {x:2.35,y:.42,z:-1.2,rx:.85,ry:.22, rz:.08, cx:.10, cy:.04,cz:10.15}
  ];
  let active = false, animationId = 0, previous = 0, elapsed = 0, sampleTime = 0, sampleFrames = 0, warmup = 0;
  function render(now) {
    if (!active) return;
    const rawDelta = previous ? (now - previous) / 1000 : .016;
    const delta = Math.min(rawDelta, .05); previous = now; elapsed += delta;
    timeUniform.value = elapsed;
    let index = 0;
    for (let i = 0; i < anchors.length - 1; i++) if (scrollY >= anchors[i]) index = i;
    const a = frames[index], b = frames[Math.min(index + 1, frames.length - 1)];
    const range = Math.max(1, anchors[index + 1] - anchors[index]);
    let t = THREE.MathUtils.clamp((scrollY - anchors[index]) / range, 0, 1);
    t = t * t * (3 - 2 * t);
    const mix = key => THREE.MathUtils.lerp(a[key], b[key], t);
    const smoothing = 1 - Math.exp(-delta * 5);
    smoothPointer.lerp(pointer, smoothing);
    const mobileX = mobile.matches ? -.8 : 0;
    sculpture.position.lerp(targetPosition.set(mix('x') + mobileX, mix('y') + (mobile.matches ? -.45 : 0) + Math.sin(elapsed*.5)*.05, mix('z')), smoothing);
    sculpture.scale.setScalar(mobile.matches ? .72 : 1);
    structure.rotation.set(mix('rx') + elapsed * .055, mix('ry') + elapsed * .07 + smoothPointer.x*.15, mix('rz'));
    camera.position.lerp(targetCamera.set(mix('cx') + smoothPointer.x*.2, mix('cy') - smoothPointer.y*.15, mix('cz')), smoothing);
    camera.lookAt(0, 0, 0);
    orbit.rotation.z = elapsed * .07;
    satellite.position.set(Math.cos(elapsed*.2)*2.35, Math.sin(elapsed*.2)*.95, Math.sin(elapsed*.2)*2.1);
    particles.rotation.y = elapsed * .012 + scrollY * .000025;
    particles.rotation.z = elapsed * .005;
    arc.rotation.z = -.5 + scrollY * .00013;
    renderer.render(world, camera);
    // Reduce fill-rate and particle cost after a measured slow frame window.
    warmup += delta;
    if (warmup > 2 && rawDelta < .25) {
      sampleTime += rawDelta; sampleFrames++;
      if (sampleTime > 2.5) {
        const fps = sampleFrames / sampleTime;
        canvas.dataset.fps = String(Math.round(fps));
        if (fps < 42 && qualityRatio > .85) {
          qualityRatio = Math.max(.85, qualityRatio - .3);
          renderer.setPixelRatio(Math.min(qualityRatio, mobile.matches ? 1.25 : 1.75));
          particlesGeometry.setDrawRange(0, Math.round(particleCount * .6));
        }
        canvas.dataset.pixelRatio = String(renderer.getPixelRatio());
        sampleTime = 0; sampleFrames = 0;
      }
    }
    animationId = requestAnimationFrame(render);
  }
  canvas.addEventListener('webglcontextlost', event => {event.preventDefault(); active = false; cancelAnimationFrame(animationId); onFailure();});
  return {
    setEnabled(value) {
      if (value === active) return;
      active = value;
      if (active) { previous = 0; animationId = requestAnimationFrame(render); }
      else { cancelAnimationFrame(animationId); }
    }
  };
}
