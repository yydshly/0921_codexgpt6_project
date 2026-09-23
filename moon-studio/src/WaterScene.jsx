import {assetUrl} from './assetUrl.js';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uImage;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform vec4 uMoon;
  uniform float uHorizon;
  uniform float uTime;
  uniform float uAudio;
  uniform float uSound;
  uniform float uRippleAge;
  uniform float uMotion;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 s = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), s.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), s.x), s.y);
  }

  float layeredNoise(vec2 p) {
    return noise(p) * 0.58 + noise(p * 2.03 + 13.7) * 0.28
           + noise(p * 4.13 + 37.1) * 0.14;
  }

  // Match CSS object-fit: cover, anchored at the artwork's water horizon.
  // This preserves the photograph's proportions at every stage aspect ratio.
  vec2 imageUv(vec2 screenUv) {
    float stageAspect = uResolution.x / max(uResolution.y, 1.0);
    float imageAspect = uImageSize.x / max(uImageSize.y, 1.0);
    vec2 scale = vec2(min(stageAspect / imageAspect, 1.0),
                      min(imageAspect / stageAspect, 1.0));
    vec2 anchor = vec2(0.5, 1.0 - uHorizon);
    return clamp((screenUv - anchor) * scale + anchor, 0.001, 0.999);
  }

  void main() {
    vec2 screen = vec2(vUv.x, 1.0 - vUv.y);
    float water = smoothstep(uHorizon + 0.002, uHorizon + 0.026, screen.y);
    float depth = clamp((screen.y - uHorizon) / (1.0 - uHorizon), 0.0, 1.0);
    float time = uTime;
    float response = uAudio * uSound;

    // The actual generated photograph remains the visual base. Refraction is
    // measured in a few stage pixels and grows toward the foreground.
    float broad = sin(screen.y * 91.0 - time * 0.61
                      + sin(screen.x * 13.0 + time * 0.16) * 1.8);
    float fine = sin(screen.y * 238.0 + screen.x * 21.0 + time * 0.82);
    float drift = layeredNoise(vec2(screen.x * 11.0, screen.y * 57.0 - time * 0.11));
    float amplitude = water * (0.12 + depth * depth)
                    * (0.00135 + response * 0.0065) * uMotion;
    vec2 displacement = vec2((broad * 0.66 + fine * 0.23) * amplitude,
                             (drift - 0.5) * amplitude * 0.44);

    // A change in the ripple prop triggers one local, decaying water ring.
    vec2 rippleOrigin = vec2(uMoon.x, uHorizon + (1.0 - uHorizon) * 0.43);
    vec2 rippleVector = screen - rippleOrigin;
    rippleVector.x *= uResolution.x / max(uResolution.y, 1.0);
    rippleVector.y *= 1.8;
    float distanceFromRipple = length(rippleVector);
    float rippleLife = exp(-uRippleAge * 1.15) * step(uRippleAge, 5.0) * uMotion;
    float ring = sin(distanceFromRipple * 115.0 - uRippleAge * 8.5)
               * exp(-pow((distanceFromRipple - uRippleAge * 0.105) / 0.07, 2.0))
               * rippleLife * water;
    displacement.x += ring * 0.0022;
    displacement.y += ring * 0.0010;

    vec2 distortedUv = vUv + vec2(displacement.x, -displacement.y);
    vec3 base = texture2D(uImage, imageUv(distortedUv)).rgb;

    // A narrow path follows the DOM moon, with small broken horizontal glints.
    // The logarithmic depth coordinate is strictly increasing: multiplying Y
    // by a shrinking scale can flatten its derivative and create large blobs.
    float moonHeight = clamp((uHorizon - uMoon.y) / max(uHorizon, 0.001), 0.0, 1.0);
    float width = max(uMoon.z, 0.025)
                * (mix(0.24, 0.31, uSound) + pow(depth, 0.85)
                   * (mix(0.28, 0.075, uSound) + moonHeight * 0.035));
    width *= 1.0 + response * 0.32;
    float perspectiveY = log(1.0 + depth * 8.0) / log(9.0);
    float pathWander = (noise(vec2(perspectiveY * 81.0, time * 0.12)) - 0.5)
                    * (0.002 + depth * 0.008);
    float dx = screen.x - uMoon.x - pathWander;
    float path = exp(-pow(dx / max(width, 0.002), 2.0));
    float skirt = exp(-pow(dx / max(width * 1.70, 0.004), 2.0));
    float surface = noise(vec2(screen.x * 150.0 + time * 0.018,
                               perspectiveY * 285.0 - time * 0.28));
    float fineGrain = noise(vec2(screen.x * 320.0,
                                 perspectiveY * 570.0 + time * 0.11));
    float facets = smoothstep(0.52, 0.80, surface)
                 * smoothstep(0.24, 0.70, fineGrain);

    // Follow existing photographic wave crests instead of painting a smooth
    // luminous column over them. Nearby dark troughs keep their original tone.
    vec3 lumaWeights = vec3(0.2126, 0.7152, 0.0722);
    float luminance = dot(base, lumaWeights);
    vec2 crestOffset = vec2(0.0, 1.6 / max(uResolution.y, 1.0));
    vec3 above = texture2D(uImage, imageUv(distortedUv + crestOffset)).rgb;
    vec3 below = texture2D(uImage, imageUv(distortedUv - crestOffset)).rgb;
    float localMean = dot((above + below) * 0.5, lumaWeights);
    float nativeCrest = smoothstep(0.0002, 0.0055, luminance - localMean)
                     * smoothstep(0.006, 0.035, luminance);
    float shimmer = 0.009 + max(nativeCrest * (0.35 + fineGrain * 0.65), facets * 0.70);
    float distanceFalloff = 0.90 - depth * 0.25;
    float visibleMoon = 1.0 - smoothstep(uHorizon - 0.01, uHorizon + 0.10, uMoon.y);
    float brightness = uMoon.w * visibleMoon * smoothstep(0.0, 0.01, uMoon.z);
    float reflection = (path * shimmer + skirt * 0.006) * water
                       * distanceFalloff * brightness
                       * (mix(2.2, 3.3, uSound) + response * 0.90);

    // Dark rock surfaces receive no minimum glow. The sea photo's fixed shore
    // silhouette is conservatively excluded in texture coordinates, so cover
    // cropping or dragging the moon cannot move light onto the foreground.
    float waterTint = smoothstep(0.002, 0.028, base.b - base.r);
    float detailMask = smoothstep(0.005, 0.020, luminance)
                     * mix(0.18, 1.0, waterTint);
    vec2 sourceUv = imageUv(distortedUv);
    float shoreline = 0.70 + 0.275 * smoothstep(0.02, 0.59, sourceUv.x);
    shoreline -= 0.060 * smoothstep(0.86, 1.0, sourceUv.x);
    float shoreMask = 1.0 - smoothstep(shoreline - 0.025, shoreline + 0.003,
                                      1.0 - sourceUv.y);
    detailMask *= mix(shoreMask, 1.0, uSound);
    reflection *= detailMask;
    vec3 warmWhite = vec3(1.0, 0.93, 0.80);
    vec3 color = base + warmWhite * reflection;
    // A small real-audio glow expands the audible response without moving sky
    // or introducing a synthetic beat when no audio data is available.
    color += vec3(0.13, 0.20, 0.24) * response * skirt * water * detailMask * 0.025;
    color += warmWhite * max(ring, 0.0) * brightness * detailMask * 0.010;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const clamp01 = (value, fallback = 0) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/**
 * Render a photographic water background and reflected light only.
 * The parent owns the moon image, controls, and stage layout.
 * `ripple`: changing this numeric token triggers a single surface ripple.
 * `audioStateRef.current`: { level: 0..1, bins: Uint8Array | null }.
 * `intensity`: 0..1 gain applied to the measured sound response, default 0.55.
 */
export function WaterScene({ mode = 'sea', moon, audioStateRef, ripple = 0, intensity = 0.55 }) {
  const canvasHost = useRef(null);
  const latest = useRef({ moon, audioStateRef, ripple, intensity });
  const invalidate = useRef(() => {});
  const [ready, setReady] = useState(false);
  const isSound = mode === 'sound';
  const source = assetUrl(isSound ? '/assets/sound-pool.png' : '/assets/moon-sea.png');
  const horizon = isSound ? 0.28 : 0.55;

  useEffect(() => {
    latest.current = { moon, audioStateRef, ripple, intensity };
    invalidate.current();
  }, [moon, audioStateRef, ripple, intensity]);

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return undefined;
    setReady(false);
    let disposed = false;
    let contextLost = false;
    let renderer;
    let texture;
    let material;
    let geometry;
    let observer;
    let animation = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let rippleAge = 99;
    let previousRipple = latest.current.ripple;
    let audioLevel = 0;
    let dirty = true;
    let hasPainted = false;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;

    const uniforms = {
      uImage: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uImageSize: { value: new THREE.Vector2(1, 1) },
      uMoon: { value: new THREE.Vector4(0.68, 0.22, 0.11, 0.65) },
      uHorizon: { value: horizon },
      uTime: { value: 0 },
      uAudio: { value: 0 },
      uSound: { value: isSound ? 1 : 0 },
      uRippleAge: { value: 99 },
      uMotion: { value: reducedMotion ? 0 : 1 },
    };
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();

    const markDirty = () => { dirty = true; };
    invalidate.current = markDirty;
    const fail = () => {
      contextLost = true;
      if (animation) cancelAnimationFrame(animation);
      animation = 0;
      if (!disposed) setReady(false);
    };
    const renderFrame = (now) => {
      animation = 0;
      if (disposed || contextLost || document.hidden) return;
      animation = requestAnimationFrame(renderFrame);
      const interval = reducedMotion ? 1000 / 12 : 1000 / 40;
      if (!texture || now - lastFrame < interval) return;
      if (reducedMotion && !isSound && !dirty) return;
      const dt = Math.min((now - (lastFrame || now)) / 1000, 0.1);
      lastFrame = now;
      const current = latest.current;
      const currentMoon = current.moon || {};
      uniforms.uMoon.value.set(
        clamp01(currentMoon.x, 0.68), clamp01(currentMoon.y, 0.22),
        clamp01(currentMoon.size, 0.11), clamp01(currentMoon.brightness, 0.65),
      );
      if (current.ripple !== previousRipple) {
        previousRipple = current.ripple;
        rippleAge = 0;
      }
      const audio = current.audioStateRef?.current;
      const measuredLevel = isSound ? clamp01(audio?.level) : 0;
      let binLevel = 0;
      if (isSound && audio?.bins?.length && measuredLevel > 0.0001) {
        const bins = audio.bins;
        const count = Math.min(32, bins.length);
        for (let i = 0; i < count; i += 1) binLevel += bins[i] / 255;
        binLevel /= count;
      }
      const targetLevel = clamp01(Math.pow(measuredLevel, 0.65) * 1.12 + binLevel * 0.20);
      const responseTime = targetLevel > audioLevel ? 0.075 : 0.32;
      audioLevel += (targetLevel - audioLevel) * (1 - Math.exp(-dt / responseTime));
      if (!reducedMotion) {
        elapsed += dt;
        rippleAge += dt;
      }
      uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      uniforms.uRippleAge.value = reducedMotion ? 99 : rippleAge;
      uniforms.uMotion.value = reducedMotion ? 0 : 1;
      uniforms.uAudio.value = audioLevel * clamp01(current.intensity, 0.55);
      try {
        renderer.render(scene, camera);
        if (contextLost) return;
        dirty = false;
        if (!hasPainted) {
          hasPainted = true;
          setReady(true);
        }
      } catch {
        fail();
      }
    };
    const schedule = () => {
      if (!disposed && !contextLost && !document.hidden && !animation) {
        lastFrame = 0;
        animation = requestAnimationFrame(renderFrame);
      }
    };
    const resize = () => {
      if (!renderer || disposed) return;
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5,
                            Math.sqrt(2_200_000 / (width * height)));
      renderer.setPixelRatio(Math.max(0.5, ratio));
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width, height);
      dirty = true;
    };
    const visibilityChanged = () => {
      if (document.hidden) {
        if (animation) cancelAnimationFrame(animation);
        animation = 0;
      } else {
        dirty = true;
        schedule();
      }
    };
    const motionChanged = (event) => {
      reducedMotion = event.matches;
      dirty = true;
    };
    const lost = (event) => {
      event.preventDefault();
      fail();
    };
    const restored = () => {
      if (disposed) return;
      contextLost = false;
      hasPainted = false;
      if (texture) texture.needsUpdate = true;
      dirty = true;
      resize();
      schedule();
    };

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false, antialias: false, powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: true,
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.addEventListener('webglcontextlost', lost);
      renderer.domElement.addEventListener('webglcontextrestored', restored);
      // Shader compilation failures do not always throw from render().
      renderer.debug.onShaderError = fail;
      host.appendChild(renderer.domElement);
      geometry = new THREE.PlaneGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        uniforms, vertexShader, fragmentShader,
        depthTest: false, depthWrite: false,
      });
      scene.add(new THREE.Mesh(geometry, material));
      observer = new ResizeObserver(resize);
      observer.observe(host);
      window.addEventListener('resize', resize);
      document.addEventListener('visibilitychange', visibilityChanged);
      motionQuery.addEventListener('change', motionChanged);
      resize();
      new THREE.TextureLoader().load(source, (loadedTexture) => {
        if (disposed) {
          loadedTexture.dispose();
          return;
        }
        texture = loadedTexture;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        uniforms.uImage.value = texture;
        uniforms.uImageSize.value.set(texture.image.width, texture.image.height);
        dirty = true;
        schedule();
      }, undefined, fail);
    } catch {
      fail();
    }

    return () => {
      disposed = true;
      if (animation) cancelAnimationFrame(animation);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibilityChanged);
      motionQuery.removeEventListener('change', motionChanged);
      if (invalidate.current === markDirty) invalidate.current = () => {};
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      scene.clear();
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', lost);
        renderer.domElement.removeEventListener('webglcontextrestored', restored);
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, [source, horizon, isSound]);

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <img
        src={source}
        alt=""
        draggable={false}
        style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: `50% ${horizon * 100}%`, pointerEvents: 'none' }}
      />
      <div ref={canvasHost} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: ready ? 1 : 0 }} />
    </div>
  );
}
