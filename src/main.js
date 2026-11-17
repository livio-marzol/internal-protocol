import * as THREE from 'three';
import { loadCharacter } from './character.js';
import { createFlashlight, FLASHLIGHT_CONFIG } from './flashlight.js';
import { createEnvironment } from './environment.js';
import { ProceduralAudio } from './audio.js';
import { createDialogueManager } from './dialogue.js';

const FOG_COLOR = 0x0b0e11;
const FOG_DENSITY = 0.115;

function shortestAngleDiff(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

async function init() {
  const canvas = document.getElementById('game-canvas');
  const loadingScreen = document.getElementById('loading-screen');
  const loadingBarFill = document.getElementById('loading-bar-fill');
  const loadingText = document.getElementById('loading-text');
  const centerHint = document.getElementById('center-hint');

  // HUD elements
  const hudFps = document.getElementById('hud-fps');
  const hudMs = document.getElementById('hud-ms');
  const hudCalls = document.getElementById('hud-calls');
  const hudTris = document.getElementById('hud-tris');
  const statusLight = document.getElementById('status-light');
  const statusFocus = document.getElementById('status-focus');
  const statusMode = document.getElementById('status-mode');
  const statusAudio = document.getElementById('status-audio');
  const interactPrompt = document.getElementById('interact-prompt');
  const thoughtBox = document.getElementById('thought-box');

  // 1. Renderer configurado estritamente para ~60 FPS na Radeon Vega 7 (render scale 0.82)
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  const getRenderScale = () => Math.min(window.devicePixelRatio || 1, 1) * 0.82;
  renderer.setPixelRatio(getRenderScale());
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  // 2. Cena e Neblina densa Silent Hill
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);

  // 3. Câmera 3ª pessoa sobre o ombro
  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.1,
    60
  );

  // 4. Ambiente procedural leve + Áudio procedural
  const env = createEnvironment(scene);
  const audio = new ProceduralAudio();

  // 5. Personagem + Animações + Lanterna fixa em LeftHand
  const character = await loadCharacter((progress, label) => {
    loadingBarFill.style.width = `${Math.round(progress * 100)}%`;
    loadingText.textContent = label;
  });

  // Posição inicial na rua olhando para o norte (-Z), ~38m até a entrada iluminada
  character.root.position.set(0, 0, 14.0);
  let targetYaw = Math.PI;
  let camYaw = Math.PI;
  let playerYaw = Math.PI;
  character.root.rotation.y = playerYaw;
  scene.add(character.root);

  const flashlight = createFlashlight(FLASHLIGHT_CONFIG.light.shadowMapSize);
  flashlight.attachToLeftHand(character.skeleton, character.scale);

  // Estado de entrada e gameplay
  const keys = new Set();
  let isInjured = false;
  let isInspecting = false;
  let focusAlpha = 0;
  let aimPitch = 0; // Contínuo entre -0.65 rad e +0.65 rad

  const syncBadges = () => {
    const lightOn = flashlight.isEnabled();
    statusLight.textContent = `Lanterna: ${lightOn ? 'ON' : 'OFF'}`;
    statusLight.classList.toggle('on', lightOn);

    statusFocus.textContent = `Foco: ${isInspecting ? 'Inspeção' : 'Normal'}`;
    statusFocus.classList.toggle('focus', isInspecting);

    statusMode.textContent = `Modo: ${isInjured ? 'Ferido' : 'Normal'}`;
    statusMode.classList.toggle('injured', isInjured);

    const audioOn = audio.isAudioActive();
    statusAudio.textContent = `Áudio: ${audioOn ? 'ON' : 'OFF'}`;
    statusAudio.classList.toggle('on', audioOn);
  };

  // Vetores suavizados da câmera presa atrás / sobre o ombro
  const currentCamPos = new THREE.Vector3(
    character.root.position.x + 0.48,
    1.56,
    character.root.position.z + 2.6
  );
  const currentLookAt = new THREE.Vector3(
    character.root.position.x,
    1.38,
    character.root.position.z - 4.0
  );
  const desiredCamPos = new THREE.Vector3();
  const desiredLookAt = new THREE.Vector3();

  camera.position.copy(currentCamPos);
  camera.lookAt(currentLookAt);

  syncBadges();
  loadingScreen.classList.add('hidden');

  const toggleFlashlight = () => {
    const next = !flashlight.isEnabled();
    flashlight.setEnabled(next);
    audio.playFlashlightClick(next);
    syncBadges();
  };

  const dialogue = createDialogueManager(thoughtBox);
  let activePromptId = null;
  let lastInspectOwnerId = null;

  // Eventos de teclado
  window.addEventListener('keydown', (e) => {
    const code = e.code;
    keys.add(code);

    if (e.repeat) return;

    audio.unlock();
    syncBadges();

    if (code === 'KeyF') {
      toggleFlashlight();
    } else if (code === 'KeyE') {
      const prompt = env.getInteractionPrompt(character.root.position);
      env.triggerInteraction(character.root.position, audio, (text) => {
        const ownerId = prompt ? prompt.id : null;
        const dur = prompt && prompt.type === 'musicbox' ? 3.5 : 4.5;
        if (prompt && prompt.type === 'inspect') {
          lastInspectOwnerId = ownerId;
        }
        dialogue.show(text, dur, ownerId);
      });
    } else if (code === 'KeyH') {
      isInjured = !isInjured;
      syncBadges();
    } else if (code === 'KeyM') {
      audio.toggleMute();
      syncBadges();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  window.addEventListener('blur', () => {
    keys.clear();
    isInspecting = false;
    syncBadges();
  });

  // Desabilita menu de contexto para uso limpo do Botão Direito (RMB)
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Eventos de mouse: Pointer Lock + LMB (Lanterna) + RMB (Foco / Inspeção)
  canvas.addEventListener('mousedown', (e) => {
    audio.unlock();
    syncBadges();

    if (e.button === 0) {
      if (document.pointerLockElement === canvas) {
        toggleFlashlight();
      } else if (canvas.requestPointerLock) {
        try {
          const maybePromise = canvas.requestPointerLock();
          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => {});
          }
        } catch {
          // Ignora caso bloqueado em sandbox
        }
      }
    } else if (e.button === 2) {
      isInspecting = true;
      syncBadges();
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 2 && isInspecting) {
      isInspecting = false;
      syncBadges();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    centerHint.classList.toggle('hidden', locked);
    if (!locked && isInspecting) {
      isInspecting = false;
      syncBadges();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;

    const rawDx = e.movementX || 0;
    const rawDy = e.movementY || 0;

    // Filtra picos anômalos do Pointer Lock em navegadores Windows
    if (Math.abs(rawDx) > 250 || Math.abs(rawDy) > 250) return;

    const dx = THREE.MathUtils.clamp(rawDx, -45, 45);
    const dy = THREE.MathUtils.clamp(rawDy, -45, 45);

    const yawSens = isInspecting ? 0.0018 : 0.0022;
    const pitchSens = isInspecting ? 0.0024 : 0.0019;

    targetYaw -= dx * yawSens;
    aimPitch = THREE.MathUtils.clamp(aimPitch - dy * pitchSens, -0.65, 0.65);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(getRenderScale());
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Loop principal + Monitor de FPS / Draw Calls
  let lastTime = performance.now();
  let fpsFrames = 0;
  let fpsAccum = 0;

  function animate(now) {
    requestAnimationFrame(animate);

    const rawDt = (now - lastTime) * 0.001;
    lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    // Suporte opcional às setas caso Pointer Lock não esteja travado
    if (keys.has('ArrowLeft')) targetYaw += 1.8 * dt;
    if (keys.has('ArrowRight')) targetYaw -= 1.8 * dt;
    if (keys.has('ArrowUp')) {
      aimPitch = THREE.MathUtils.clamp(aimPitch + 1.3 * dt, -0.65, 0.65);
    }
    if (keys.has('ArrowDown')) {
      aimPitch = THREE.MathUtils.clamp(aimPitch - 1.3 * dt, -0.65, 0.65);
    }

    // Rotação contínua sem saltos entre -PI e +PI
    camYaw += shortestAngleDiff(camYaw, targetYaw) * (1 - Math.exp(-18 * dt));
    playerYaw += shortestAngleDiff(playerYaw, targetYaw) * (1 - Math.exp(-15 * dt));
    character.root.rotation.y = playerYaw;

    // Transição suave do Modo Inspeção / Foco (RMB) — altera apenas FOV/zoom/ângulo
    const targetFocus = isInspecting ? 1 : 0;
    focusAlpha = THREE.MathUtils.lerp(focusAlpha, targetFocus, 1 - Math.exp(-10 * dt));

    const desiredFov = THREE.MathUtils.lerp(58, 48, focusAlpha);
    if (Math.abs(camera.fov - desiredFov) > 0.01) {
      camera.fov = desiredFov;
      camera.updateProjectionMatrix();
    }

    // Vetores de movimentação no plano XZ alinhados ao personagem
    const forwardInput = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const strafeInput = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
    const isMoving = forwardInput !== 0 || strafeInput !== 0;

    // Seleção da animação alvo com crossFade suave (~0.2s)
    let targetAnim;
    if (isMoving) {
      if (isInjured) {
        if (forwardInput > 0) targetAnim = 'injured_walk';
        else if (forwardInput < 0) targetAnim = 'injured_walk_back';
        else if (strafeInput > 0) targetAnim = 'injured_walk_left';
        else targetAnim = 'injured_walk_right';
      } else {
        if (forwardInput > 0) targetAnim = 'torch_walk_forward';
        else if (forwardInput < 0) targetAnim = 'torch_walk_back';
        else if (strafeInput > 0) targetAnim = 'torch_walk_left';
        else targetAnim = 'torch_walk_right';
      }
    } else {
      targetAnim = isInjured ? 'injured_idle' : 'torch_idle';
    }

    character.fadeTo(targetAnim, 0.2);

    // Deslocamento com colisão AABB
    if (isMoving) {
      const fwdX = Math.sin(playerYaw);
      const fwdZ = Math.cos(playerYaw);
      // No rig Mixamo (+Z frente), +X é esquerda
      const leftX = Math.cos(playerYaw);
      const leftZ = -Math.sin(playerYaw);

      let moveX = fwdX * forwardInput + leftX * strafeInput;
      let moveZ = fwdZ * forwardInput + leftZ * strafeInput;
      const len = Math.hypot(moveX, moveZ);
      if (len > 0) {
        moveX /= len;
        moveZ /= len;
      }

      let speed;
      if (isInjured) {
        speed = forwardInput < 0 ? 1.15 : forwardInput > 0 ? 1.45 : 1.2;
      } else {
        speed = forwardInput < 0 ? 1.75 : forwardInput > 0 ? 2.35 : 1.85;
      }
      // Reduz levemente velocidade durante inspeção focada
      speed *= THREE.MathUtils.lerp(1.0, 0.72, focusAlpha);

      env.moveWithCollision(
        character.root.position,
        moveX * speed * dt,
        moveZ * speed * dt,
        0.38
      );
    }

    // Atualiza mixer, aplica mira vertical contínua nos ossos e atenuação adaptativa da lanterna
    character.update(dt);
    character.applyVerticalAim(aimPitch, playerYaw);
    flashlight.updateBeam(dt, focusAlpha, env.getRaycastTargets());

    env.update(dt, character.root.position, playerYaw, audio);
    audio.updateFootstep(dt, isMoving, isInjured);

    // Atualiza diálogos internos, prompt contextual [E] e limpa legenda de inspeção ao afastar
    dialogue.update(dt, character.root.position);

    const activePrompt = env.getInteractionPrompt(character.root.position);
    const nextPromptId = activePrompt ? activePrompt.id : null;

    if (activePrompt) {
      if (activePromptId !== nextPromptId) {
        interactPrompt.textContent = activePrompt.text;
      }
      interactPrompt.classList.remove('hidden');
    } else {
      interactPrompt.classList.add('hidden');
      if (lastInspectOwnerId) {
        dialogue.clearIfOwner(lastInspectOwnerId);
        lastInspectOwnerId = null;
      }
    }
    activePromptId = nextPromptId;

    // Câmera presa atrás/sobre o ombro direito (inclina apenas ~25% do aimPitch)
    const camFwdX = Math.sin(camYaw);
    const camFwdZ = Math.cos(camYaw);
    const camRightX = -Math.cos(camYaw);
    const camRightZ = Math.sin(camYaw);

    const camDist = THREE.MathUtils.lerp(2.6, 1.85, focusAlpha);
    const shoulderOffset = THREE.MathUtils.lerp(0.48, 0.56, focusAlpha);
    const baseHeight = THREE.MathUtils.lerp(1.54, 1.5, focusAlpha);
    const camPitch = aimPitch * 0.25;

    desiredCamPos.set(
      character.root.position.x - camFwdX * camDist + camRightX * shoulderOffset,
      Math.max(0.55, baseHeight - Math.sin(camPitch) * 0.75),
      character.root.position.z - camFwdZ * camDist + camRightZ * shoulderOffset
    );

    // Impede que a câmera atravesse as paredes internas do corredor, lab ou hospital
    const px = character.root.position.x;
    const pz = character.root.position.z;
    if (desiredCamPos.x <= 4.85 && px <= 4.85) {
      if (desiredCamPos.z < -24.1 && desiredCamPos.z > -53.9) {
        desiredCamPos.x = THREE.MathUtils.clamp(desiredCamPos.x, -1.78, 1.78);
        desiredCamPos.y = Math.min(desiredCamPos.y, 2.9);
      } else if (desiredCamPos.z <= -53.9) {
        desiredCamPos.x = THREE.MathUtils.clamp(desiredCamPos.x, -4.45, 4.55);
        desiredCamPos.z = Math.max(desiredCamPos.z, -63.2);
        desiredCamPos.y = Math.min(desiredCamPos.y, 3.3);
      }
    } else if (px > 4.85) {
      // Salão e Quartos do Hospital
      desiredCamPos.x = THREE.MathUtils.clamp(desiredCamPos.x, 5.15, 20.6);
      desiredCamPos.y = Math.min(desiredCamPos.y, 3.3);
      if (pz < -66.7) {
        desiredCamPos.x = THREE.MathUtils.clamp(desiredCamPos.x, 9.45, 16.95);
        desiredCamPos.z = Math.max(desiredCamPos.z, -74.5);
      } else if (pz > -52.9) {
        desiredCamPos.x = THREE.MathUtils.clamp(desiredCamPos.x, 9.45, 16.95);
        desiredCamPos.z = Math.min(desiredCamPos.z, -45.0);
      } else {
        const inRoomDoorwayX = desiredCamPos.x > 12.1 && desiredCamPos.x < 14.3;
        if (!inRoomDoorwayX) {
          desiredCamPos.z = THREE.MathUtils.clamp(desiredCamPos.z, -66.5, -53.1);
        }
      }
    }

    desiredLookAt.set(
      character.root.position.x + camFwdX * 4.2 + camRightX * 0.24,
      1.38 + Math.sin(camPitch) * 2.8,
      character.root.position.z + camFwdZ * 4.2 + camRightZ * 0.24
    );

    const camSmooth = 1 - Math.exp(-18 * dt);
    currentCamPos.lerp(desiredCamPos, camSmooth);
    currentLookAt.lerp(desiredLookAt, camSmooth);

    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    renderer.render(scene, camera);

    // Atualiza monitor de performance a cada 0.25s
    fpsFrames += 1;
    fpsAccum += rawDt;
    if (fpsAccum >= 0.25) {
      const fps = Math.round(fpsFrames / fpsAccum);
      const ms = ((fpsAccum / fpsFrames) * 1000).toFixed(1);
      hudFps.textContent = String(fps);
      hudMs.textContent = ms;
      hudCalls.textContent = String(renderer.info.render.calls);
      hudTris.textContent = String(renderer.info.render.triangles);
      fpsFrames = 0;
      fpsAccum = 0;
    }
  }

  requestAnimationFrame(animate);
}

init().catch((err) => {
  console.error('Erro ao inicializar demo:', err);
  const loadingText = document.getElementById('loading-text');
  if (loadingText) {
    loadingText.textContent = `Erro ao carregar: ${err.message}`;
  }
});
