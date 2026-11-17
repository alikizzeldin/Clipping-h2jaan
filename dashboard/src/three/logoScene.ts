// The GTA VI logo as a real 3D model (made with Tripo from the logo artwork),
// drawn with three.js. The scene only draws; whoever owns it animates `pose`
// (and may set `onFrame`) to move the logo, the lights and the glow.

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL = `${import.meta.env.BASE_URL}models/logo.glb`;
const PINK = 0xff2fd0;
const VIOLET = 0x8a3cff;
const AQUA = 0x35f2ff;

export type LogoSceneOptions = {
  /** Dust drifting through the light. */
  particles?: boolean;
  /** Neon rings on the floor under the logo, and the pulse they can send out. */
  pedestal?: boolean;
  /** A soft glow behind the logo. */
  halo?: boolean;
  /** How much of the view's height and width the logo may fill, 0..1. */
  fit?: number;
};

export type Pose = {
  yaw: number; // radians, turning left and right
  pitch: number; // radians, nodding
  roll: number;
  x: number; // in view widths: -0.5 is the left edge, 0.5 the right
  y: number; // in view heights: 0.5 is the top
  z: number; // towards the viewer (positive) or away
  scale: number;
  glow: number; // 1 is normal; higher makes the logo and its halo burn brighter
  light: number; // radians: where the sweeping light is on its circle
  sweep: number; // 0..1 strength of the sweeping light
  opacity: number;
  pulse: number; // 0..1: a ring travelling outwards from the pedestal
};

function dot(inner: string, outer: string): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const fill = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  fill.addColorStop(0, inner);
  fill.addColorStop(0.35, outer);
  fill.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class LogoScene {
  readonly pose: Pose = { yaw: 0, pitch: 0, roll: 0, x: 0, y: 0, z: 0, scale: 1, glow: 1, light: 0, sweep: 0, opacity: 1, pulse: 0 };
  /** Called before every frame with the seconds since the scene started. */
  onFrame: ((seconds: number) => void) | null = null;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private pivot = new THREE.Group();
  private materials: THREE.MeshStandardMaterial[] = [];
  private sweepLight = new THREE.PointLight(0xffffff, 0, 30, 1.6);
  private halo?: THREE.Sprite;
  private rings: THREE.Mesh[] = [];
  private pulseRing?: THREE.Mesh;
  private dust?: THREE.Points;
  private size = new THREE.Vector3(1, 1, 0.3); // of the model, once loaded
  private view = { w: 1, h: 1 }; // world units visible at the logo's depth
  private unit = 1; // world scale at which the logo fits the view
  private frame = 0;
  private running = false;
  private began = performance.now();
  private observer?: ResizeObserver;
  private disposed = false;
  private fit: number;

  constructor(private canvas: HTMLCanvasElement, private options: LogoSceneOptions = {}) {
    this.fit = options.fit ?? 0.8;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.camera.position.set(0, 0, 8);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.75;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xfff0fb, 1.6);
    key.position.set(-2.5, 3.5, 6);
    const pink = new THREE.PointLight(PINK, 60, 30, 1.8);
    pink.position.set(-4.5, 1.2, 2.5);
    const violet = new THREE.PointLight(VIOLET, 70, 30, 1.8);
    violet.position.set(4.5, -0.5, 2);
    const aqua = new THREE.PointLight(AQUA, 22, 30, 1.8);
    aqua.position.set(0.5, -3.5, 3);
    this.scene.add(key, pink, violet, aqua, this.sweepLight, this.pivot);

    if (options.halo) {
      this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: dot("rgba(255,70,200,0.85)", "rgba(138,60,255,0.32)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      this.halo.renderOrder = -2;
      this.scene.add(this.halo);
    }
    if (options.pedestal) this.buildPedestal();
    if (options.particles) this.buildDust();

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }

  /** Fetch the model. Resolves once it is on stage. */
  async load(): Promise<void> {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(MODEL);
    if (this.disposed) return;
    const model = gltf.scene;
    model.rotation.y = -Math.PI / 2; // the model's face looks along +X; turn it to the viewer
    const holder = new THREE.Group();
    holder.add(model);
    const box = new THREE.Box3().setFromObject(holder);
    box.getSize(this.size);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      // The artwork glows, so let its own colours give off a little light.
      material.emissive = new THREE.Color(0xffffff);
      material.emissiveMap = material.map;
      material.emissiveIntensity = 0.3;
      material.envMapIntensity = 1.1;
      material.transparent = true;
      this.materials.push(material);
    });
    this.pivot.add(holder);
    this.resize();
  }

  private buildPedestal() {
    const ring = (inner: number, outer: number, color: number, opacity: number) => {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 96),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      mesh.rotation.x = -Math.PI / 2 + 0.22; // lying on the floor, tipped a little to the viewer
      mesh.renderOrder = -1;
      this.scene.add(mesh);
      return mesh;
    };
    this.rings = [ring(0.985, 1, PINK, 0.95), ring(0.76, 0.768, VIOLET, 0.8), ring(0, 0.74, PINK, 0.1)];
    this.pulseRing = ring(0.97, 1, 0xffffff, 0);
  }

  private buildDust() {
    const count = 420;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color(PINK), new THREE.Color(VIOLET), new THREE.Color(AQUA), new THREE.Color(0xffffff)];
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 9 - 1;
      palette[Math.floor(Math.random() * palette.length)].toArray(colors, i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.dust = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 0.09, map: dot("rgba(255,255,255,1)", "rgba(255,255,255,0.35)"), vertexColors: true, transparent: true, opacity: 0.75,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.dust.renderOrder = -3;
    this.scene.add(this.dust);
  }

  private resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.view.h = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.view.w = this.view.h * this.camera.aspect;
    this.unit = Math.min((this.view.h * this.fit) / this.size.y, (this.view.w * this.fit) / this.size.x);
    if (!this.running) this.draw();
  }

  private draw = () => {
    const seconds = (performance.now() - this.began) / 1000;
    this.onFrame?.(seconds);
    const p = this.pose;
    const scale = this.unit * p.scale;
    this.pivot.position.set(p.x * this.view.w, p.y * this.view.h, p.z);
    this.pivot.rotation.set(p.pitch, p.yaw, p.roll, "YXZ");
    this.pivot.scale.setScalar(scale);
    for (const material of this.materials) {
      material.emissiveIntensity = 0.3 * p.glow;
      material.opacity = p.opacity;
    }
    const reach = scale * this.size.x;
    this.sweepLight.intensity = 260 * p.sweep;
    this.sweepLight.position.set(
      this.pivot.position.x + Math.sin(p.light) * reach * 1.1,
      this.pivot.position.y + Math.cos(p.light * 0.7) * reach * 0.35,
      p.z + 2.2 + Math.cos(p.light) * 1.2,
    );
    if (this.halo) {
      this.halo.position.set(this.pivot.position.x, this.pivot.position.y, p.z - 1.2);
      this.halo.scale.setScalar(reach * (2.3 + 0.12 * Math.sin(seconds * 1.3)) * (0.75 + 0.25 * p.glow));
      (this.halo.material as THREE.SpriteMaterial).opacity = Math.min(1, 0.55 * p.glow) * p.opacity;
    }
    if (this.rings.length) {
      const floor = this.pivot.position.y - scale * this.size.y * 0.62;
      const radius = reach * 0.62;
      this.rings.forEach((ring, index) => {
        ring.position.set(this.pivot.position.x, floor, p.z);
        ring.scale.setScalar(radius);
        ring.rotation.z = seconds * (index === 1 ? -0.25 : 0.18);
        (ring.material as THREE.MeshBasicMaterial).opacity = [0.95, 0.8, 0.1][index] * p.opacity * (0.7 + 0.3 * p.glow);
      });
      if (this.pulseRing) {
        this.pulseRing.position.set(this.pivot.position.x, floor, p.z);
        this.pulseRing.scale.setScalar(radius * (1 + p.pulse * 1.6));
        (this.pulseRing.material as THREE.MeshBasicMaterial).opacity = p.pulse > 0 ? (1 - p.pulse) * 0.9 : 0;
      }
    }
    if (this.dust) {
      this.dust.rotation.y = seconds * 0.02;
      this.dust.position.y = Math.sin(seconds * 0.16) * 0.35;
    }
    this.renderer.render(this.scene, this.camera);
  };

  private loop = () => {
    if (!this.running) return;
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  };

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.observer?.disconnect();
    this.scene.traverse((node) => {
      const mesh = node as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const material of materials) {
        for (const value of Object.values(material)) (value as THREE.Texture | null)?.isTexture && (value as THREE.Texture).dispose();
        material.dispose();
      }
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
