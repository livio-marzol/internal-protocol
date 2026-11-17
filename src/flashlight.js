import * as THREE from 'three';

/**
 * Configuração da lanterna fixada no osso `LeftHand` (braço erguido nas poses Standing Torch).
 * Formato compacto estilo lanterna tática angular (L-head) para encaixe limpo na palma fechada.
 */
export const FLASHLIGHT_CONFIG = {
  gripOffset: [-0.026, 0.08, 0.052], // Centro do túnel da palma fechada em LeftHand (metros)
  light: {
    color: 0xfff3d6,
    baseIntensity: 105,
    focusIntensity: 148,
    baseDistance: 22,
    focusDistance: 28,
    baseAngle: Math.PI / 5.5,
    focusAngle: Math.PI / 8.2,
    penumbra: 0.85,
    decay: 2.0,
    shadowMapSize: 512, // 512x512 otimizado para Radeon Vega 7
  },
};

export function createFlashlight(shadowMapSize = FLASHLIGHT_CONFIG.light.shadowMapSize) {
  const handMount = new THREE.Group();
  handMount.name = 'FlashlightHandMount';

  const flashlightGroup = new THREE.Group();
  flashlightGroup.name = 'TacticalFlashlight';
  flashlightGroup.position.set(
    FLASHLIGHT_CONFIG.gripOffset[0],
    FLASHLIGHT_CONFIG.gripOffset[1],
    FLASHLIGHT_CONFIG.gripOffset[2]
  );
  handMount.add(flashlightGroup);

  // Materiais leves sem projeção de sombra própria
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1e2227 });
  const gripMat = new THREE.MeshLambertMaterial({ color: 0x101214 });

  const lensMat = new THREE.MeshBasicMaterial({
    color: FLASHLIGHT_CONFIG.light.color,
  });

  // Cabo compacto (~0.0155m de raio, ~0.125m de comprimento ao longo do eixo X da palma fechada)
  // Vai de x = +0.060 (rente ao dedo mínimo) até x = -0.065 (acima do polegar/indicador)
  const handleGeo = new THREE.CylinderGeometry(0.0155, 0.015, 0.125, 10);
  handleGeo.rotateZ(Math.PI / 2);
  const handleMesh = new THREE.Mesh(handleGeo, gripMat);
  handleMesh.position.set(-0.002, 0, 0);
  flashlightGroup.add(handleMesh);

  // Tampa traseira metálica discreta dentro da borda da luva
  const capGeo = new THREE.CylinderGeometry(0.016, 0.0155, 0.012, 10);
  capGeo.rotateZ(Math.PI / 2);
  const capMesh = new THREE.Mesh(capGeo, bodyMat);
  capMesh.position.set(0.062, 0, 0);
  flashlightGroup.add(capMesh);

  // Bloco da cabeça angular emergindo limpo acima do polegar/indicador, apontando para frente (+Y de LeftHand)
  const headMount = new THREE.Group();
  headMount.position.set(-0.062, 0.006, 0);
  // Alinha o eixo +Z de headMount para frente do personagem compensando leve inclinação natural do pulso
  const forwardAimLocal = new THREE.Vector3(0.32, 0.92, -0.22).normalize();
  headMount.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forwardAimLocal);
  flashlightGroup.add(headMount);

  // Pescoço + cabeça chanfrada (~0.042m, comprimento total efetivo ~0.16m)
  const headGeo = new THREE.CylinderGeometry(0.023, 0.0165, 0.042, 12);
  headGeo.rotateX(Math.PI / 2);
  const headMesh = new THREE.Mesh(headGeo, bodyMat);
  headMesh.position.z = 0.021;
  headMount.add(headMesh);

  // Lente emissiva na face frontal da cabeça
  const lensGeo = new THREE.CircleGeometry(0.02, 12);
  const lensMesh = new THREE.Mesh(lensGeo, lensMat);
  lensMesh.position.z = 0.0425;
  headMount.add(lensMesh);

  // ÚNICA luz com castShadow = true na cena inteira
  const cfg = FLASHLIGHT_CONFIG.light;
  const spotLight = new THREE.SpotLight(
    cfg.color,
    cfg.baseIntensity,
    cfg.baseDistance,
    cfg.baseAngle,
    cfg.penumbra,
    cfg.decay
  );
  spotLight.position.set(0, 0, 0.055);
  spotLight.castShadow = true;

  const clampedMapSize = Math.min(Math.max(shadowMapSize, 256), 512);
  spotLight.shadow.mapSize.set(clampedMapSize, clampedMapSize);
  spotLight.shadow.camera.near = 0.08;
  spotLight.shadow.camera.far = 22;
  spotLight.shadow.bias = -0.0005;
  spotLight.shadow.normalBias = 0.025;

  // Target filho do mesmo grupo da lente para seguir perfeitamente o eixo frontal
  const target = new THREE.Object3D();
  target.position.set(0, 0, 8.0);
  headMount.add(target);
  spotLight.target = target;
  headMount.add(spotLight);

  // Cone de luz volumétrica "fake" super leve (10 segmentos radiais, 1 altura, máx. 5.5m)
  const coneLength = 5.5;
  const coneRadius = Math.tan(cfg.baseAngle) * coneLength * 0.76;
  const coneGeo = new THREE.ConeGeometry(coneRadius, coneLength, 10, 1, true);
  coneGeo.rotateX(-Math.PI / 2);
  coneGeo.translate(0, 0, coneLength * 0.5);

  const coneMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(cfg.color) },
      uOpacity: { value: 0.042 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vPosView;

      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vPosView = mvPosition.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;

      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vPosView;

      void main() {
        // vUv.y = 1.0 junto à lente, 0.0 na extremidade distante
        float nearFade = smoothstep(1.0, 0.78, vUv.y);
        float tipFade = smoothstep(0.0, 0.38, vUv.y);
        float distFade = pow(clamp(vUv.y, 0.0, 1.0), 1.9) * tipFade;

        vec3 viewDir = normalize(-vPosView);
        float ndotv = abs(dot(normalize(vNormalView), viewDir));
        float edgeFade = pow(ndotv, 2.6);

        float alpha = uOpacity * nearFade * distFade * edgeFade;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });

  const volumetricCone = new THREE.Mesh(coneGeo, coneMat);
  volumetricCone.position.z = 0.044;
  volumetricCone.renderOrder = 2;
  volumetricCone.frustumCulled = false;
  headMount.add(volumetricCone);

  let enabled = true;
  let currentDistAtten = 1.0;
  let targetDistAtten = 1.0;
  let raycastFrame = 0;

  const raycaster = new THREE.Raycaster();
  raycaster.near = 0.15;
  raycaster.far = 6.0;
  const _rayOrigin = new THREE.Vector3();
  const _rayTarget = new THREE.Vector3();
  const _rayDir = new THREE.Vector3();
  const _hits = [];

  function findLeftHandBone(skeleton) {
    if (!skeleton) return null;
    const exact = skeleton.bones.find((b) => /^(mixamorig:?)?LeftHand$/i.test(b.name));
    if (exact) return exact;
    return skeleton.bones.find((b) => b.name.toLowerCase().includes('lefthand')) || null;
  }

  function attachToLeftHand(skeleton, characterScale = 1) {
    const bone = findLeftHandBone(skeleton);
    if (!bone) {
      console.warn('[Flashlight] Osso LeftHand não encontrado no esqueleto.');
      return false;
    }
    handMount.scale.setScalar(1 / characterScale);
    bone.add(handMount);
    return true;
  }

  function setEnabled(state) {
    enabled = Boolean(state);
    spotLight.visible = enabled;
    volumetricCone.visible = enabled;
    lensMat.color.setHex(enabled ? cfg.color : 0x1a1d20);
  }

  function isEnabled() {
    return enabled;
  }

  function updateBeam(dt, focusAlpha, raycastTargets) {
    const t = THREE.MathUtils.clamp(focusAlpha, 0, 1);

    // Raycaster leve com throttle a cada 4 frames apenas contra paredes/placas pré-filtradas
    raycastFrame += 1;
    if (enabled && raycastTargets && raycastTargets.length > 0 && raycastFrame % 4 === 0) {
      spotLight.getWorldPosition(_rayOrigin);
      target.getWorldPosition(_rayTarget);
      _rayDir.subVectors(_rayTarget, _rayOrigin).normalize();
      raycaster.set(_rayOrigin, _rayDir);

      _hits.length = 0;
      raycaster.intersectObjects(raycastTargets, false, _hits);

      if (_hits.length > 0 && _hits[0].distance < 4.5) {
        const d = _hits[0].distance;
        const prox = THREE.MathUtils.clamp((d - 1.5) / 3.0, 0, 1);
        const smoothProx = prox * prox * (3 - 2 * prox);
        targetDistAtten = THREE.MathUtils.lerp(0.62, 1.0, smoothProx);
      } else {
        targetDistAtten = 1.0;
      }
    }

    currentDistAtten = THREE.MathUtils.lerp(
      currentDistAtten,
      targetDistAtten,
      1 - Math.exp(-10 * dt)
    );

    const baseFocusIntensity = THREE.MathUtils.lerp(cfg.baseIntensity, cfg.focusIntensity, t);
    spotLight.angle = THREE.MathUtils.lerp(cfg.baseAngle, cfg.focusAngle, t);
    spotLight.intensity = baseFocusIntensity * currentDistAtten;
    spotLight.distance = THREE.MathUtils.lerp(cfg.baseDistance, cfg.focusDistance, t);

    const widthScale = THREE.MathUtils.lerp(1.0, 0.68, t);
    const lengthScale = THREE.MathUtils.lerp(1.0, 1.08, t);
    volumetricCone.scale.set(widthScale, widthScale, lengthScale);

    const baseOpacity = THREE.MathUtils.lerp(0.042, 0.05, t);
    coneMat.uniforms.uOpacity.value = baseOpacity * THREE.MathUtils.lerp(0.45, 1.0, currentDistAtten);
  }

  return {
    handMount,
    flashlightGroup,
    spotLight,
    volumetricCone,
    attachToLeftHand,
    setEnabled,
    isEnabled,
    updateBeam,
  };
}
