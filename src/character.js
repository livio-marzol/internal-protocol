import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const BASE_MODEL_FILE = '/models/Standing Torch Idle 01.fbx';

const ANIMATION_FILES = [
  { key: 'torch_walk_forward', url: '/models/Standing Torch Walk Forward.fbx' },
  { key: 'torch_walk_back', url: '/models/Standing Torch Walk Back.fbx' },
  { key: 'torch_walk_left', url: '/models/Standing Torch Walk Left.fbx' },
  { key: 'torch_walk_right', url: '/models/Standing Torch Walk Right.fbx' },
  { key: 'injured_idle', url: '/models/Injured Idle.fbx' },
  { key: 'injured_walk', url: '/models/Injured Walk.fbx' },
  { key: 'injured_walk_back', url: '/models/Injured Walk Backwards.fbx' },
  { key: 'injured_walk_left', url: '/models/Injured Walk Left Turn.fbx' },
  { key: 'injured_walk_right', url: '/models/Injured Walk Right Turn.fbx' },
];

const TEXTURE_SLOTS = [
  'map',
  'normalMap',
  'bumpMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'specularMap',
  'alphaMap',
  'aoMap',
];

function disposeMaterial(mat) {
  if (!mat) return;
  for (const slot of TEXTURE_SLOTS) {
    if (mat[slot]) {
      mat[slot].dispose();
      mat[slot] = null;
    }
  }
  mat.dispose();
}

function disposeObjectHierarchy(obj) {
  obj.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(disposeMaterial);
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

/**
 * Remove deslocamento horizontal (X e Z) na track de posição do osso raiz (`Hips.position`)
 * mantendo o balanço vertical (Y), garantindo movimento `In Place` controlado pelo código.
 */
function sanitizeClipInPlace(clip, newName) {
  clip.name = newName;
  for (const track of clip.tracks) {
    if (/hips\.position$/i.test(track.name)) {
      const vals = track.values;
      if (vals.length >= 3) {
        const baseX = vals[0];
        const baseZ = vals[2];
        for (let i = 0; i < vals.length; i += 3) {
          vals[i] = baseX;
          vals[i + 2] = baseZ;
        }
      }
    }
  }
  return clip;
}

function upgradeCharacterMaterial(mat) {
  const stdParams = {
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.0,
    flatShading: false,
    side: mat.side ?? THREE.FrontSide,
    transparent: Boolean(mat.transparent),
    opacity: mat.opacity ?? 1,
  };

  if (mat.map) {
    mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.map.needsUpdate = true;
    stdParams.map = mat.map;
    const c = mat.color ? mat.color.clone() : new THREE.Color(0xffffff);
    if (c.r < 0.35 && c.g < 0.35 && c.b < 0.35) {
      c.setHex(0xd8d8d8);
    }
    stdParams.color = c;
  } else {
    const c = mat.color ? mat.color.clone() : new THREE.Color(0x9a9ea3);
    if (c.r < 0.18 && c.g < 0.18 && c.b < 0.18) {
      c.setHex(0x6e737a);
    }
    stdParams.color = c;
  }

  if (mat.normalMap) {
    stdParams.normalMap = mat.normalMap;
    stdParams.normalScale = new THREE.Vector2(0.25, 0.25);
  }
  if (mat.alphaMap) stdParams.alphaMap = mat.alphaMap;

  // Preserva apenas map, normalMap e alphaMap; descarta specular/bump ruidosos e material Phong
  for (const slot of TEXTURE_SLOTS) {
    if (slot !== 'map' && slot !== 'normalMap' && slot !== 'alphaMap') {
      if (mat[slot]) mat[slot].dispose();
    }
  }
  mat.dispose();

  const stdMat = new THREE.MeshStandardMaterial(stdParams);
  stdMat.roughness = 0.92;
  stdMat.metalness = 0.0;
  stdMat.envMapIntensity = 0.0;
  stdMat.flatShading = false;
  return stdMat;
}

function findBone(skeleton, shortName) {
  if (!skeleton) return null;
  const regex = new RegExp(`^(mixamorig:?)?${shortName}$`, 'i');
  return (
    skeleton.bones.find((b) => regex.test(b.name)) ||
    skeleton.bones.find((b) => b.name.toLowerCase().endsWith(shortName.toLowerCase())) ||
    null
  );
}

export async function loadCharacter(onProgress) {
  const loader = new FBXLoader();
  const totalFiles = 1 + ANIMATION_FILES.length;
  let loadedCount = 0;

  const report = (label) => {
    loadedCount += 1;
    if (onProgress) {
      onProgress(loadedCount / totalFiles, label);
    }
  };

  // 1. Carrega o modelo base (malha + esqueleto + idle)
  const baseFbx = await loader.loadAsync(BASE_MODEL_FILE);
  report('Modelo base carregado');

  let mainSkeleton = null;
  baseFbx.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = true;

      if (Array.isArray(child.material)) {
        child.material = child.material.map(upgradeCharacterMaterial);
      } else if (child.material) {
        child.material = upgradeCharacterMaterial(child.material);
      }

      if (child.isSkinnedMesh && child.skeleton && !mainSkeleton) {
        mainSkeleton = child.skeleton;
      }
    }
  });

  if (!mainSkeleton) {
    // Fallback caso o esqueleto precise ser buscado nos ossos
    const bones = [];
    baseFbx.traverse((c) => {
      if (c.isBone) bones.push(c);
    });
    if (bones.length > 0) {
      mainSkeleton = new THREE.Skeleton(bones);
    }
  }

  // Wrapper raiz para posição/rotação no mundo
  const root = new THREE.Group();
  root.name = 'PlayerRoot';
  root.add(baseFbx);

  const mixer = new THREE.AnimationMixer(baseFbx);
  const actions = {};

  if (baseFbx.animations && baseFbx.animations.length > 0) {
    const idleClip = sanitizeClipInPlace(baseFbx.animations[0], 'torch_idle');
    actions.torch_idle = mixer.clipAction(idleClip);
    actions.torch_idle.play();
    mixer.update(0.016);
  }

  // Normaliza altura exata para 1.75m com os pés em y = 0
  baseFbx.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(baseFbx);
  const initialSize = new THREE.Vector3();
  initialBox.getSize(initialSize);

  const targetHeight = 1.75;
  const charScale = initialSize.y > 0.001 ? targetHeight / initialSize.y : 0.01;
  baseFbx.scale.setScalar(charScale);
  baseFbx.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(baseFbx);
  baseFbx.position.y -= scaledBox.min.y;
  baseFbx.updateMatrixWorld(true);

  // 2. Carrega os demais FBX apenas para extrair os AnimationClips e descarta malhas/texturas imediatamente
  for (const item of ANIMATION_FILES) {
    const animFbx = await loader.loadAsync(item.url);
    if (animFbx.animations && animFbx.animations.length > 0) {
      const clip = sanitizeClipInPlace(animFbx.animations[0], item.key);
      actions[item.key] = mixer.clipAction(clip);
    } else {
      console.warn(`[Character] Nenhuma animação encontrada em ${item.url}`);
    }
    disposeObjectHierarchy(animFbx);
    animFbx.animations.length = 0;
    report(`Animação: ${item.key}`);
  }

  const aimBones = {
    spine2: findBone(mainSkeleton, 'Spine2'),
    head: findBone(mainSkeleton, 'Head'),
    leftArm: findBone(mainSkeleton, 'LeftArm'),
    leftForeArm: findBone(mainSkeleton, 'LeftForeArm'),
    leftHand: findBone(mainSkeleton, 'LeftHand'),
  };

  // Objetos reutilizáveis para evitar alocação por frame
  const _pitchAxisWorld = new THREE.Vector3();
  const _parentWorldQuat = new THREE.Quaternion();
  const _parentWorldQuatInv = new THREE.Quaternion();
  const _worldDeltaQuat = new THREE.Quaternion();
  const _localDeltaQuat = new THREE.Quaternion();

  function applyAdditiveWorldPitch(bone, axisWorld, angle) {
    if (!bone || !bone.parent || Math.abs(angle) < 1e-4) return;
    bone.parent.updateWorldMatrix(true, false);
    bone.parent.getWorldQuaternion(_parentWorldQuat);
    _parentWorldQuatInv.copy(_parentWorldQuat).invert();
    _worldDeltaQuat.setFromAxisAngle(axisWorld, angle);
    _localDeltaQuat
      .copy(_parentWorldQuatInv)
      .multiply(_worldDeltaQuat)
      .multiply(_parentWorldQuat);
    bone.quaternion.premultiply(_localDeltaQuat);
  }

  let currentState = 'torch_idle';

  function fadeTo(nextState, duration = 0.2) {
    if (nextState === currentState) return;
    const nextAction = actions[nextState];
    const prevAction = actions[currentState];
    if (!nextAction) return;

    nextAction.reset();
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, duration, true);
    }

    currentState = nextState;
  }

  function update(dt) {
    mixer.update(dt);
  }

  function applyVerticalAim(aimPitch, playerYaw) {
    if (Math.abs(aimPitch) < 1e-4) return;
    root.updateMatrixWorld(true);
    // Eixo horizontal direito do personagem no mundo (gira o braço para cima com aimPitch > 0)
    _pitchAxisWorld.set(-Math.cos(playerYaw), 0, Math.sin(playerYaw)).normalize();

    applyAdditiveWorldPitch(aimBones.spine2, _pitchAxisWorld, aimPitch * 0.18);
    applyAdditiveWorldPitch(aimBones.head, _pitchAxisWorld, aimPitch * 0.24);
    applyAdditiveWorldPitch(aimBones.leftArm, _pitchAxisWorld, aimPitch * 0.42);
    applyAdditiveWorldPitch(aimBones.leftForeArm, _pitchAxisWorld, aimPitch * 0.24);
    applyAdditiveWorldPitch(aimBones.leftHand, _pitchAxisWorld, aimPitch * 0.16);
    root.updateMatrixWorld(true);
  }

  function getCurrentState() {
    return currentState;
  }

  return {
    root,
    model: baseFbx,
    skeleton: mainSkeleton,
    scale: charScale,
    mixer,
    actions,
    fadeTo,
    update,
    applyVerticalAim,
    getCurrentState,
  };
}
