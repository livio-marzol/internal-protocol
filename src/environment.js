import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createHospitalWing } from './hospital.js';

function createCanvasTexture(size, drawFn, repeatX = 1, repeatY = 1, isAlpha = false) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (!isAlpha) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

function createSignTexture(drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function drawBiohazardSymbol(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = r * 0.16;

  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
    const x = cx + Math.cos(a) * r * 0.48;
    const y = cy + Math.sin(a) * r * 0.48;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, a - 1.9, a + 1.9);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawWrappedLines(ctx, lines, x, startY, lineHeight) {
  lines.forEach((line, idx) => {
    ctx.fillText(line, x, startY + idx * lineHeight);
  });
}

function createProceduralTextures() {
  // 1. Asfalto rachado (512x512)
  const asphalt = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#1b1e22';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 14000; i++) {
        const v = 18 + Math.floor(Math.random() * 26);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      for (let i = 0; i < 16; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const r = 24 + Math.random() * 52;
        const g = ctx.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, 'rgba(7, 9, 11, 0.55)');
        g.addColorStop(1, 'rgba(7, 9, 11, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(6, 7, 9, 0.85)';
      for (let c = 0; c < 12; c++) {
        let x = Math.random() * s;
        let y = Math.random() * s;
        let a = Math.random() * Math.PI * 2;
        ctx.lineWidth = 1 + Math.random() * 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 12; k++) {
          a += (Math.random() - 0.5) * 0.85;
          x += Math.cos(a) * 14;
          y += Math.sin(a) * 14;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
    6,
    14
  );

  // 2. Calçada (512x512)
  const sidewalk = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#2d3136';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 8000; i++) {
        const v = 34 + Math.floor(Math.random() * 22);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 3})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      ctx.strokeStyle = 'rgba(10, 12, 14, 0.8)';
      ctx.lineWidth = 3;
      const step = s / 4;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * step);
        ctx.lineTo(s, i * step);
        ctx.stroke();
      }
    },
    2,
    12
  );

  // 3. Concreto externo sujo (512x512)
  const concrete = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#363a3e';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 9000; i++) {
        const v = 40 + Math.floor(Math.random() * 28);
        ctx.fillStyle = `rgb(${v},${v + 1},${v})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      for (let i = 0; i < 36; i++) {
        const x = Math.random() * s;
        const w = 6 + Math.random() * 22;
        const h = 110 + Math.random() * 340;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(12, 14, 13, 0.55)');
        grad.addColorStop(1, 'rgba(12, 14, 13, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, w, h);
      }
    },
    2,
    1
  );

  // 4. Azulejo clínico sujo para corredor e laboratório (512x512)
  const clinicalTile = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#6b7477';
      ctx.fillRect(0, 0, s, s);

      // Azulejos 8x8
      const step = s / 8;
      for (let gx = 0; gx < 8; gx++) {
        for (let gy = 0; gy < 8; gy++) {
          const shade = 95 + Math.floor(Math.random() * 24);
          ctx.fillStyle = `rgb(${shade - 4},${shade + 2},${shade + 3})`;
          ctx.fillRect(gx * step + 2, gy * step + 2, step - 4, step - 4);
        }
      }

      // Rejunte escuro e sujeira
      ctx.strokeStyle = 'rgba(22, 27, 29, 0.72)';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * step);
        ctx.lineTo(s, i * step);
        ctx.stroke();
      }

      // Escorridos de ferrugem e umidade
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * s;
        const w = 6 + Math.random() * 18;
        const h = 80 + Math.random() * 260;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(28, 26, 20, 0.45)');
        grad.addColorStop(1, 'rgba(28, 26, 20, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, Math.random() * 140, w, h);
      }
    },
    1,
    1
  );

  // 5. Piso clínico sujo (512x512)
  const labFloor = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#3b4144';
      ctx.fillRect(0, 0, s, s);
      const step = s / 4;
      for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 4; gy++) {
          const v = 54 + Math.floor(Math.random() * 18);
          ctx.fillStyle = `rgb(${v},${v + 4},${v + 5})`;
          ctx.fillRect(gx * step + 2, gy * step + 2, step - 4, step - 4);
        }
      }
      for (let i = 0; i < 3500; i++) {
        const v = 28 + Math.floor(Math.random() * 22);
        ctx.fillStyle = `rgba(${v},${v + 2},${v},0.35)`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 3, 3);
      }
    },
    1,
    1
  );

  // 6. Metal enferrujado (512x512)
  const rust = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#2c2724';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const r = 18 + Math.random() * 60;
        const g = ctx.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, Math.random() > 0.35 ? 'rgba(98, 44, 22, 0.65)' : 'rgba(24, 20, 18, 0.7)');
        g.addColorStop(1, 'rgba(44, 39, 36, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    1,
    1
  );

  // 7. Grade / Alambrado (512x512 alpha)
  const fence = createCanvasTexture(
    512,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.lineWidth = 4;
      for (let y = -s; y < s * 2; y += 32) {
        ctx.strokeStyle = '#5a4335';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y + s);
        ctx.stroke();
        ctx.strokeStyle = '#473a32';
        ctx.beginPath();
        ctx.moveTo(s, y);
        ctx.lineTo(0, y + s);
        ctx.stroke();
      }
      ctx.fillStyle = '#3d2e25';
      ctx.fillRect(0, s * 0.49, s, 10);
    },
    3,
    2,
    true
  );

  // 8. Halo aditivo do farol branco da entrada (128x128 alpha)
  const beaconHalo = createCanvasTexture(
    128,
    (ctx, s) => {
      const c = s / 2;
      const g = ctx.createRadialGradient(c, c, 2, c, c, c);
      g.addColorStop(0, 'rgba(235, 248, 255, 0.95)');
      g.addColorStop(0.28, 'rgba(195, 228, 255, 0.48)');
      g.addColorStop(0.65, 'rgba(140, 190, 235, 0.14)');
      g.addColorStop(1, 'rgba(140, 190, 235, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    1,
    1,
    true
  );

  // 9. Poça biológica viscosa (256x256 alpha)
  const bioPuddle = createCanvasTexture(
    256,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      const c = s / 2;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const ox = c + Math.cos(ang) * (20 + Math.random() * 24);
        const oy = c + Math.sin(ang) * (20 + Math.random() * 24);
        const r = 45 + Math.random() * 35;
        const g = ctx.createRadialGradient(ox, oy, 6, ox, oy, r);
        g.addColorStop(0, 'rgba(26, 62, 34, 0.92)');
        g.addColorStop(0.65, 'rgba(16, 38, 20, 0.78)');
        g.addColorStop(1, 'rgba(12, 24, 14, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      const centerG = ctx.createRadialGradient(c, c, 8, c, c, 78);
      centerG.addColorStop(0, 'rgba(44, 108, 52, 0.88)');
      centerG.addColorStop(1, 'rgba(18, 42, 22, 0)');
      ctx.fillStyle = centerG;
      ctx.beginPath();
      ctx.arc(c, c, 78, 0, Math.PI * 2);
      ctx.fill();
    },
    1,
    1,
    true
  );

  // 10. Manchas orgânicas e marcas de arrasto no piso (256x256 alpha)
  const bloodDrag = createCanvasTexture(
    256,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      // Três marcas alongadas de arrasto + respingos escuros
      for (let k = 0; k < 4; k++) {
        const y = 65 + k * 34 + (Math.random() - 0.5) * 8;
        const g = ctx.createLinearGradient(16, y, 240, y);
        g.addColorStop(0, 'rgba(34, 9, 9, 0.85)');
        g.addColorStop(0.55, 'rgba(24, 7, 7, 0.65)');
        g.addColorStop(1, 'rgba(20, 6, 6, 0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 10 + Math.random() * 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.quadraticCurveTo(120, y + (Math.random() - 0.5) * 14, 232, y + (Math.random() - 0.5) * 10);
        ctx.stroke();
      }
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = 'rgba(28, 7, 7, 0.72)';
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 7, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    1,
    1,
    true
  );

  // 11. Documentos espalhados no chão (512x512)
  const paperDoc = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#9c988c';
    ctx.fillRect(0, 0, s, s);

    // Cabeçalho técnico
    ctx.fillStyle = '#090909';
    ctx.fillRect(36, 36, s - 72, 34);
    ctx.fillStyle = '#9c988c';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('RELATÓRIO DE CONTENÇÃO // AMOSTRA B-04', 48, 59);

    // Linhas de texto e tabela
    ctx.fillStyle = '#1d2022';
    for (let y = 96; y < 220; y += 20) {
      ctx.fillRect(40, y, 220 + (y % 3) * 40, 6);
    }

    // Gráfico de anomalia
    ctx.strokeStyle = '#090909';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 240, s - 80, 120);
    ctx.strokeStyle = '#8c1f1f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(48, 325);
    for (let x = 60; x < s - 48; x += 22) {
      const spike = x > 260 ? (Math.random() - 0.5) * 84 : (Math.random() - 0.5) * 16;
      ctx.lineTo(x, 305 + spike);
    }
    ctx.stroke();

    // Carimbo vermelho inclinado
    ctx.save();
    ctx.translate(s / 2, 415);
    ctx.rotate(-0.14);
    ctx.strokeStyle = '#8c1f1f';
    ctx.lineWidth = 6;
    ctx.strokeRect(-195, -42, 390, 84);
    ctx.fillStyle = '#8c1f1f';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('PROTOCOLO COMPROMETIDO', 0, -6);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('PROPAGAÇÃO CONFIRMADA', 0, 26);
    ctx.restore();
  });

  // 12. Caixa térmica de transporte Biohazard (512x512)
  const bioCrate = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#b39024';
    ctx.fillRect(0, 0, s, s);

    // Faixas pretas industriais
    ctx.fillStyle = '#090909';
    ctx.fillRect(0, 0, s, 68);
    ctx.fillRect(0, s - 68, s, 68);

    // Listras diagonais de alerta
    ctx.fillStyle = '#b39024';
    for (let x = -s; x < s * 2; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 24, 0);
      ctx.lineTo(x - 16, 68);
      ctx.lineTo(x - 40, 68);
      ctx.closePath();
      ctx.fill();
    }

    drawBiohazardSymbol(ctx, s / 2, 220, 86, '#090909');

    ctx.fillStyle = '#090909';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('BIOHAZARD // NÍVEL 4', s / 2, 355);
    ctx.font = 'bold 22px monospace';
    ctx.fillText('TRANSPORTE BIOLÓGICO', s / 2, 395);
  });

  // 13. Avisos psicológicos do Corredor (Zona 2) — tons foscos anti-ofuscamento
  const signBioLevel4 = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#b39024';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#090909';
    ctx.lineWidth = 22;
    ctx.strokeRect(18, 18, s - 36, s - 36);

    ctx.fillStyle = '#090909';
    ctx.fillRect(28, 28, s - 56, 86);
    ctx.fillStyle = '#b39024';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('AVISO DE CONTENÇÃO', s / 2, 84);

    drawBiohazardSymbol(ctx, s / 2, 222, 88, '#090909');

    ctx.fillStyle = '#090909';
    ctx.font = 'bold 30px sans-serif';
    drawWrappedLines(
      ctx,
      ['RISCO BIOLÓGICO NÍVEL 4', 'ÁREA RESTRITA'],
      s / 2,
      368,
      48
    );
  });

  const signDontProceed = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#9c988c';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#8c1f1f';
    ctx.fillRect(0, 0, s, 118);

    ctx.fillStyle = '#090909';
    ctx.textAlign = 'center';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText('ALERTA URGENTE', s / 2, 76);

    ctx.fillStyle = '#090909';
    ctx.font = 'bold 32px sans-serif';
    drawWrappedLines(
      ctx,
      ['PROPAGAÇÃO DE VÍRUS', 'BIOLÓGICO DETECTADA'],
      s / 2,
      206,
      48
    );

    ctx.strokeStyle = '#8c1f1f';
    ctx.lineWidth = 10;
    ctx.strokeRect(56, 305, s - 112, 118);
    ctx.fillStyle = '#090909';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('NÃO PROSSIGA', s / 2, 378);
  });

  const monitorAlert = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#071319';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#255c6e';
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, s - 36, s - 36);

    ctx.fillStyle = '#9e1d1d';
    ctx.fillRect(36, 42, s - 72, 68);
    ctx.fillStyle = '#f2d9d9';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('SETOR B // ALERTA CRÍTICO', s / 2, 86);

    ctx.fillStyle = '#7ad4e6';
    ctx.font = 'bold 27px monospace';
    drawWrappedLines(
      ctx,
      ['PROPAGAÇÃO DE VÍRUS', 'BIOLÓGICO DETECTADA', '', 'PROTOCOLO: NÃO PROSSIGA'],
      s / 2,
      192,
      44
    );

    // Linhas de varredura sutis
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < s; y += 8) {
      ctx.fillRect(0, y, s, 3);
    }
  });

  const signContamActive = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#8c1f1f';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#090909';
    ctx.lineWidth = 20;
    ctx.strokeRect(20, 20, s - 40, s - 40);

    ctx.fillStyle = '#090909';
    ctx.textAlign = 'center';
    ctx.font = 'bold 38px sans-serif';
    drawWrappedLines(
      ctx,
      ['CONTAMINAÇÃO ATIVA', '', 'EVACUAÇÃO CANCELADA', '', 'SELOS ROMPIDOS'],
      s / 2,
      130,
      58
    );
  });

  const signIsolationFailed = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#9c988c';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#8c1f1f';
    ctx.fillRect(24, 24, s - 48, 86);
    ctx.fillStyle = '#090909';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('FALHA DE ISOLAMENTO', s / 2, 78);

    ctx.fillStyle = '#090909';
    ctx.font = 'bold 34px sans-serif';
    drawWrappedLines(
      ctx,
      ['CONTENÇÃO ROMPIDA', 'NO LABORATÓRIO FINAL', '', 'NÃO ABRA A PORTA'],
      s / 2,
      188,
      54
    );
  });

  // Texturas sutis de alucinação ao olhar para trás (sem texto explicativo)
  const monitorHallucination = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#090c0e';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#38464d';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, s - 36, s - 36);

    ctx.fillStyle = '#9aa8b0';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px monospace';
    drawWrappedLines(ctx, ['VOCÊ JÁ ESTÁ', 'DENTRO'], s / 2, 232, 54);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    for (let y = 0; y < s; y += 6) {
      ctx.fillRect(0, y, s, 2);
    }
  });

  const signHallucinationWall = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#5c6062';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 4500; i++) {
      const v = 64 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 2})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    ctx.fillStyle = '#090909';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('NINGUÉM MAIS ESTÁ AQUI', s / 2, s / 2 + 12);
  });

  const labMonitorError = createSignTexture((ctx, s) => {
    ctx.fillStyle = '#140606';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(24, 24, s - 48, 84);
    ctx.fillStyle = '#fce7e7';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('ERRO CRÍTICO // 04', s / 2, 78);

    ctx.fillStyle = '#e86a6a';
    ctx.font = 'bold 28px monospace';
    drawWrappedLines(
      ctx,
      ['CÁPSULA CENTRAL VIOLADA', '', 'PROPAGAÇÃO INTENCIONAL', 'DETECTADA'],
      s / 2,
      205,
      50
    );
  });

  // Sprite suave para partículas (32x32)
  const ashSprite = createCanvasTexture(
    32,
    (ctx, s) => {
      const c = s / 2;
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, 'rgba(215, 222, 228, 0.9)');
      g.addColorStop(0.5, 'rgba(170, 180, 190, 0.42)');
      g.addColorStop(1, 'rgba(170, 180, 190, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    1,
    1,
    true
  );

  return {
    asphalt,
    sidewalk,
    concrete,
    clinicalTile,
    labFloor,
    rust,
    fence,
    beaconHalo,
    bioPuddle,
    bloodDrag,
    paperDoc,
    bioCrate,
    signBioLevel4,
    signDontProceed,
    monitorAlert,
    signContamActive,
    signIsolationFailed,
    monitorHallucination,
    signHallucinationWall,
    labMonitorError,
    ashSprite,
  };
}

export function buildInstancedBoxes(specs, geometry, material, castShadow = true, receiveShadow = true) {
  const mesh = new THREE.InstancedMesh(geometry, material, specs.length);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    dummy.position.set(s.x, s.y, s.z);
    dummy.rotation.set(s.rx || 0, s.ry || 0, s.rz || 0);
    dummy.scale.set(s.sx || 1, s.sy || 1, s.sz || 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function applyWorldEnvBoxUVs(geo, scaleMeters = 2.4) {
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i);
    const wy = pos.getY(i);
    const wz = pos.getZ(i);
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));

    if (ny > 0.5) {
      uv.setXY(i, wx / scaleMeters, wz / scaleMeters);
    } else if (nx > 0.5) {
      uv.setXY(i, wz / scaleMeters, wy / scaleMeters);
    } else {
      uv.setXY(i, wx / scaleMeters, wy / scaleMeters);
    }
  }
  uv.needsUpdate = true;
}

function mergeEnvSpecs(specs, baseGeo, worldUVScale = 0) {
  const parts = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const g = baseGeo.index ? baseGeo.toNonIndexed() : baseGeo.clone();
    dummy.position.set(s.x || 0, s.y || 0, s.z || 0);
    dummy.rotation.set(s.rx || 0, s.ry || 0, s.rz || 0);
    dummy.scale.set(s.sx || 1, s.sy || 1, s.sz || 1);
    dummy.updateMatrix();
    g.applyMatrix4(dummy.matrix);
    if (worldUVScale > 0) {
      applyWorldEnvBoxUVs(g, worldUVScale);
    }
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

function mergeEnvEntries(entries, worldUVScale = 0) {
  const parts = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const g = e.geo.index ? e.geo.toNonIndexed() : e.geo.clone();
    dummy.position.set(e.x || 0, e.y || 0, e.z || 0);
    dummy.rotation.set(e.rx || 0, e.ry || 0, e.rz || 0);
    dummy.scale.set(e.sx || 1, e.sy || 1, e.sz || 1);
    dummy.updateMatrix();
    g.applyMatrix4(dummy.matrix);
    if (worldUVScale > 0) {
      applyWorldEnvBoxUVs(g, worldUVScale);
    }
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

export function createEnvironment(scene) {
  const tex = createProceduralTextures();
  const colliders = [];
  const raycastTargets = [];

  const registerBoxCollider = (cx, cz, width, depth) => {
    const col = {
      minX: cx - width * 0.5,
      maxX: cx + width * 0.5,
      minZ: cz - depth * 0.5,
      maxZ: cz + depth * 0.5,
      enabled: true,
    };
    colliders.push(col);
    return col;
  };

  // Orçamento máximo de luzes: 1 HemisphereLight + 1 SpotLight (lanterna) + 1 PointLight sem sombra
  const hemiLight = new THREE.HemisphereLight(0x222c38, 0x0a0c0e, 0.35);
  hemiLight.castShadow = false;
  scene.add(hemiLight);

  const zoneLight = new THREE.PointLight(0xe4f3ff, 22, 22, 1.5);
  zoneLight.castShadow = false;
  scene.add(zoneLight);

  // Materiais MeshLambertMaterial em todo o cenário (ótimo fill-rate na Vega 7 e sem brilho especular)
  const asphaltMat = new THREE.MeshLambertMaterial({ map: tex.asphalt });
  const sidewalkMat = new THREE.MeshLambertMaterial({ map: tex.sidewalk });
  const concreteMat = new THREE.MeshLambertMaterial({ map: tex.concrete });
  const clinicalWallMat = new THREE.MeshLambertMaterial({ map: tex.clinicalTile });
  const labFloorMat = new THREE.MeshLambertMaterial({ map: tex.labFloor });
  const rustMat = new THREE.MeshLambertMaterial({ map: tex.rust });
  const darkMetalMat = new THREE.MeshLambertMaterial({ color: 0x1d2126 });
  const fenceMat = new THREE.MeshLambertMaterial({
    map: tex.fence,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
  });
  const emissiveFluorescentMat = new THREE.MeshBasicMaterial({ color: 0xdfeffa });

  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const zone1Group = new THREE.Group();
  scene.add(zone1Group);

  // ============================================================================
  // ZONA 1: PÁTIO / BECO EXTERNO (z = +18.5 até z = -24.0)
  // ============================================================================
  const extGroundGeo = new THREE.PlaneGeometry(18, 44);
  extGroundGeo.rotateX(-Math.PI / 2);
  const extGround = new THREE.Mesh(extGroundGeo, asphaltMat);
  extGround.position.set(0, 0, -2.5);
  extGround.receiveShadow = true;
  zone1Group.add(extGround);

  const extSidewalks = [
    { x: -6.5, y: 0.07, z: -3.0, sx: 3.0, sy: 0.14, sz: 42 },
    { x: 6.5, y: 0.07, z: -3.0, sx: 3.0, sy: 0.14, sz: 42 },
  ];
  const extSidewalkMesh = new THREE.Mesh(mergeEnvSpecs(extSidewalks, unitBoxGeo), sidewalkMat);
  extSidewalkMesh.receiveShadow = true;
  zone1Group.add(extSidewalkMesh);

  const extWalls = [
    { x: -8.3, y: 2.4, z: -3.0, sx: 0.6, sy: 4.8, sz: 43 },
    { x: 8.3, y: 2.4, z: -3.0, sx: 0.6, sy: 4.8, sz: 43 },
    { x: -4.85, y: 2.2, z: -24.0, sx: 6.8, sy: 4.4, sz: 0.65 },
    { x: 4.85, y: 2.2, z: -24.0, sx: 6.8, sy: 4.4, sz: 0.65 },
    { x: 0.0, y: 3.65, z: -24.0, sx: 3.0, sy: 1.5, sz: 0.65 },
    { x: 0.0, y: 6.2, z: -26.5, sx: 17.2, sy: 5.5, sz: 5.0 },
  ];
  registerBoxCollider(-4.85, -24.0, 6.8, 0.7);
  registerBoxCollider(4.85, -24.0, 6.8, 0.7);
  const extWallsMesh = new THREE.Mesh(mergeEnvSpecs(extWalls, unitBoxGeo), concreteMat);
  extWallsMesh.castShadow = true;
  extWallsMesh.receiveShadow = true;
  zone1Group.add(extWallsMesh);
  raycastTargets.push(extWallsMesh);

  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const fencePanels = [
    { x: -5.4, y: 1.35, z: 18.2, sx: 5.4, sy: 2.7, sz: 1 },
    { x: 0.0, y: 1.35, z: 18.2, sx: 5.4, sy: 2.7, sz: 1 },
    { x: 5.4, y: 1.35, z: 18.2, sx: 5.4, sy: 2.7, sz: 1 },
  ];
  zone1Group.add(new THREE.Mesh(mergeEnvSpecs(fencePanels, planeGeo), fenceMat));

  const drumGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.92, 10);
  const extDrums = [
    { geo: drumGeo, x: -3.8, y: 0.46, z: -10.0 },
    { geo: drumGeo, x: -3.2, y: 0.46, z: -10.7 },
    { geo: drumGeo, x: 3.7, y: 0.46, z: -18.5 },
    { geo: drumGeo, x: -4.2, y: 0.46, z: 9.5 },
    { geo: unitBoxGeo, x: 3.3, y: 0.52, z: -15.2, sx: 1.2, sy: 1.04, sz: 1.4, ry: 0.12 },
    { geo: unitBoxGeo, x: 2.8, y: 0.55, z: -3.8, sx: 2.2, sy: 1.1, sz: 0.55, ry: -0.06 },
    { geo: unitBoxGeo, x: -3.4, y: 0.55, z: -16.8, sx: 1.1, sy: 1.1, sz: 1.1, ry: -0.18 },
    { geo: unitBoxGeo, x: -3.1, y: 0.48, z: 3.6, sx: 1.85, sy: 0.72, sz: 4.1, ry: 0.12 },
  ];
  [
    [-3.8, -10.0, 0.68, 0.68],
    [-3.2, -10.7, 0.68, 0.68],
    [3.7, -18.5, 0.68, 0.68],
    [-4.2, 9.5, 0.68, 0.68],
    [3.3, -15.2, 1.2, 1.4],
    [2.8, -3.8, 2.2, 0.55],
    [-3.4, -16.8, 1.1, 1.1],
    [-3.1, 3.6, 2.0, 4.2],
  ].forEach(([cx, cz, w, d]) => registerBoxCollider(cx, cz, w, d));
  const extRustMesh = new THREE.Mesh(mergeEnvEntries(extDrums), rustMat);
  extRustMesh.castShadow = true;
  extRustMesh.receiveShadow = true;
  zone1Group.add(extRustMesh);
  drumGeo.dispose();

  registerBoxCollider(-4.7, 4.0, 0.35, 0.35);
  const extDarkMesh = new THREE.Mesh(
    mergeEnvSpecs(
      [
        { x: -3.1, y: 1.08, z: 3.75, sx: 1.55, sy: 0.55, sz: 2.1, ry: 0.12 },
        { x: -4.7, y: 2.6, z: 4.0, sx: 0.18, sy: 5.2, sz: 0.18 },
      ],
      unitBoxGeo
    ),
    darkMetalMat
  );
  extDarkMesh.castShadow = true;
  extDarkMesh.receiveShadow = true;
  zone1Group.add(extDarkMesh);

  const beaconPlaneMat = new THREE.MeshBasicMaterial({
    color: 0xe6f4ff,
    transparent: true,
    opacity: 0.92,
    fog: false,
  });
  const beaconCore = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.55), beaconPlaneMat);
  beaconCore.position.set(0, 1.38, -24.45);
  zone1Group.add(beaconCore);

  const beaconHaloMat = new THREE.MeshBasicMaterial({
    map: tex.beaconHalo,
    color: 0xd9eeff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const beaconHalo = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6.2), beaconHaloMat);
  beaconHalo.position.set(0, 1.55, -23.75);
  zone1Group.add(beaconHalo);

  // ============================================================================
  // ZONA 2 & 3: CORREDOR + LABORATÓRIO (geometrias mescladas e materiais Lambert)
  // ============================================================================
  const zone23FloorGeo = mergeEnvEntries(
    [
      { geo: new THREE.PlaneGeometry(4.0, 29.8), x: 0, y: 0.002, z: -38.9, rx: -Math.PI / 2 },
      { geo: new THREE.PlaneGeometry(9.6, 9.8), x: 0, y: 0.002, z: -58.8, rx: -Math.PI / 2 },
    ],
    2.4
  );
  const zone23FloorMesh = new THREE.Mesh(zone23FloorGeo, labFloorMat);
  zone23FloorMesh.receiveShadow = true;
  scene.add(zone23FloorMesh);

  // Paredes e tetos do corredor + laboratório com UVs em metros reais (sem listras esticadas)
  const zone23WallSpecs = [
    // Corredor (z = -24.0..-53.79)
    { x: -2.15, y: 1.65, z: -38.9, sx: 0.3, sy: 3.3, sz: 29.8 },
    { x: 2.15, y: 1.65, z: -38.9, sx: 0.3, sy: 3.3, sz: 29.8 },
    { x: 0.0, y: 3.3, z: -38.9, sx: 4.6, sy: 0.2, sz: 29.8 },
    // Divisória z = -54.0 (vão livre x = -1.15..+1.15)
    { x: -3.025, y: 1.8, z: -54.0, sx: 3.75, sy: 3.6, sz: 0.42 },
    { x: 3.025, y: 1.8, z: -54.0, sx: 3.75, sy: 3.6, sz: 0.42 },
    { x: 0.0, y: 3.175, z: -54.0, sx: 2.3, sy: 0.85, sz: 0.42 },
    // Paredes Oeste, Norte e Teto do Laboratório (terminando rente em x = +4.70 onde começa o Salão)
    { x: -4.85, y: 1.8, z: -58.8, sx: 0.3, sy: 3.6, sz: 10.0 },
    { x: -0.075, y: 1.8, z: -63.75, sx: 9.85, sy: 3.6, sz: 0.3 },
    { x: -0.1, y: 3.68, z: -58.85, sx: 9.6, sy: 0.2, sz: 10.1 },
  ];
  registerBoxCollider(-3.025, -54.0, 3.75, 0.5);
  registerBoxCollider(3.025, -54.0, 3.75, 0.5);
  const zone23WallMesh = new THREE.Mesh(
    mergeEnvSpecs(zone23WallSpecs, unitBoxGeo, 2.4),
    clinicalWallMat
  );
  zone23WallMesh.receiveShadow = true;
  scene.add(zone23WallMesh);
  raycastTargets.push(zone23WallMesh);

  // Luminárias fluorescentes no teto (mescladas em 1 draw call)
  const fixtureSpecs = [];
  for (let z = -26.5; z >= -50.5; z -= 6.0) {
    fixtureSpecs.push({ x: 0, y: 3.16, z, sx: 0.26, sy: 0.06, sz: 1.35 });
  }
  scene.add(new THREE.Mesh(mergeEnvSpecs(fixtureSpecs, unitBoxGeo), emissiveFluorescentMat));

  // Avisos Psicológicos & Sistema sutil de alucinação ao olhar para trás (MeshLambertMaterial)
  const createWallPoster = (texture, w, h, x, y, z, rotY, rotZ = 0) => {
    const mat = new THREE.MeshLambertMaterial({ map: texture });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.rotation.z = rotZ;
    mesh.receiveShadow = true;
    scene.add(mesh);
    raycastTargets.push(mesh);
    return mesh;
  };

  // Tier 1 (Início do corredor: z = -28)
  const sign1 = createWallPoster(tex.signBioLevel4, 0.9, 0.9, -1.985, 1.68, -28.0, Math.PI / 2);

  // Tier 2 (Meio do corredor: z = -37 e -39.5) — sofrem alteração sutil ao olhar para trás
  const sign2Poster = createWallPoster(
    tex.signDontProceed,
    0.85,
    0.95,
    1.985,
    1.62,
    -37.0,
    -Math.PI / 2,
    0.07
  );
  // Monitor de parede com tela emissiva sutil
  const monitorHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.72, 0.92),
    darkMetalMat
  );
  monitorHousing.position.set(-1.93, 1.72, -39.5);
  scene.add(monitorHousing);

  const monitorScreenMat = new THREE.MeshBasicMaterial({ map: tex.monitorAlert });
  const monitorScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.62), monitorScreenMat);
  monitorScreen.position.set(-1.865, 1.72, -39.5);
  monitorScreen.rotation.y = Math.PI / 2;
  scene.add(monitorScreen);

  // Tier 3 (Terço final do corredor: z = -45.5 e -49.5) — ocultos até gatilho de avanço
  const sign3Left = createWallPoster(
    tex.signContamActive,
    0.92,
    0.92,
    -1.985,
    1.64,
    -45.5,
    Math.PI / 2,
    -0.04
  );
  const sign4Right = createWallPoster(
    tex.signIsolationFailed,
    0.92,
    0.92,
    1.985,
    1.66,
    -49.5,
    -Math.PI / 2,
    0.03
  );
  sign2Poster.visible = false;
  monitorScreen.visible = false;
  sign3Left.visible = false;
  sign4Right.visible = false;

  // ============================================================================
  // ZONA 3: PROPS DO LABORATÓRIO (geometrias mescladas + materiais Lambert)
  // ============================================================================
  const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 29.8, 8);
  pipeGeo.rotateX(Math.PI / 2);
  const tankPipeGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.15, 8);
  const zone23RustMesh = new THREE.Mesh(
    mergeEnvEntries([
      { geo: pipeGeo, x: -1.35, y: 3.02, z: -39.0 },
      { geo: pipeGeo, x: -1.15, y: 2.95, z: -39.0 },
      { geo: pipeGeo, x: 1.35, y: 3.02, z: -39.0 },
      { geo: unitBoxGeo, x: -1.38, y: 1.34, z: -54.78, sx: 1.3, sy: 2.68, sz: 0.1, ry: 1.25 },
      { geo: tankPipeGeo, x: -0.78, y: 2.35, z: -58.35, rx: 0.35, rz: 0.42 },
      { geo: tankPipeGeo, x: 0.72, y: 2.25, z: -59.2, rx: -0.4, rz: -0.35 },
      { geo: tankPipeGeo, x: 0.18, y: 0.42, z: -57.75, rx: 1.35, rz: 0.2 },
      { geo: tankPipeGeo, x: -0.52, y: 0.45, z: -59.75, rx: -1.32, rz: -0.15 },
    ]),
    rustMat
  );
  zone23RustMesh.receiveShadow = true;
  scene.add(zone23RustMesh);
  pipeGeo.dispose();
  tankPipeGeo.dispose();

  registerBoxCollider(0, -58.8, 1.9, 1.9);
  registerBoxCollider(-3.1, -57.1, 1.5, 1.1);
  registerBoxCollider(3.35, -56.2, 1.3, 1.8);
  registerBoxCollider(-3.85, -62.4, 1.8, 0.95);

  const darkEntries = [
    { geo: new THREE.CylinderGeometry(0.92, 0.98, 0.32, 14), x: 0, y: 0.16, z: -58.8 },
    { geo: new THREE.CylinderGeometry(0.94, 0.94, 0.28, 14), x: 0, y: 2.72, z: -58.8 },
    { geo: unitBoxGeo, x: -3.1, y: 0.46, z: -57.1, sx: 1.5, sy: 0.85, sz: 0.95, rx: 0.18, ry: 0.25, rz: 1.28 },
    { geo: unitBoxGeo, x: -2.0, y: 0.26, z: -55.9, sx: 0.52, sy: 0.5, sz: 0.52, rx: 1.4, ry: 0.6 },
    { geo: unitBoxGeo, x: 3.35, y: 0.4, z: -56.2, sx: 1.2, sy: 0.8, sz: 1.7, ry: -0.05 },
    { geo: unitBoxGeo, x: -3.85, y: 1.05, z: -62.4, sx: 1.7, sy: 2.1, sz: 0.75, ry: 0.18, rx: 0.12 },
    { geo: unitBoxGeo, x: -2.65, y: 0.28, z: -62.2, sx: 0.56, sy: 0.56, sz: 0.56, ry: 0.42 },
    { geo: unitBoxGeo, x: 3.5, y: 1.02, z: -55.9, sx: 0.18, sy: 0.44, sz: 0.56, ry: -0.3 },
  ];
  for (let z = -26.5; z >= -51.5; z -= 5.0) {
    darkEntries.push({ geo: unitBoxGeo, x: -1.93, y: 1.6, z, sx: 0.14, sy: 3.2, sz: 0.22 });
    darkEntries.push({ geo: unitBoxGeo, x: 1.93, y: 1.6, z, sx: 0.14, sy: 3.2, sz: 0.22 });
  }
  const zone23DarkMesh = new THREE.Mesh(mergeEnvEntries(darkEntries), darkMetalMat);
  zone23DarkMesh.castShadow = true;
  zone23DarkMesh.receiveShadow = true;
  scene.add(zone23DarkMesh);

  // Vidro estilhaçado do tanque + cacos no chão mesclados em 1 único Mesh (sem sombra)
  const shatteredGlassMat = new THREE.MeshStandardMaterial({
    color: 0x9ec4b8,
    roughness: 0.18,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  const glassEntries = [
    { geo: new THREE.CylinderGeometry(0.8, 0.8, 1.25, 10, 1, true, 0.4, 2.1), x: 0, y: 0.94, z: -58.8 },
    { geo: new THREE.CylinderGeometry(0.8, 0.8, 0.72, 8, 1, true, 3.1, 1.7), x: 0, y: 2.24, z: -58.8 },
  ];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 0.95 + Math.random() * 1.45;
    glassEntries.push({
      geo: unitBoxGeo,
      x: Math.cos(a) * dist,
      y: 0.008,
      z: -58.8 + Math.sin(a) * dist,
      sx: 0.06 + Math.random() * 0.11,
      sy: 0.012,
      sz: 0.04 + Math.random() * 0.09,
      ry: Math.random() * Math.PI,
    });
  }
  scene.add(new THREE.Mesh(mergeEnvEntries(glassEntries), shatteredGlassMat));

  // Poça viscosa escura/esverdeada ao redor da cápsula (MeshLambertMaterial)
  const puddleMat = new THREE.MeshLambertMaterial({
    map: tex.bioPuddle,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const puddleMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), puddleMat);
  puddleMesh.rotation.x = -Math.PI / 2;
  puddleMesh.position.set(0, 0.01, -58.8);
  scene.add(puddleMesh);

  // Manchas orgânicas e marcas de arrasto no piso mescladas (MeshLambertMaterial)
  const dragMat = new THREE.MeshLambertMaterial({
    map: tex.bloodDrag,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const dragGeo = mergeEnvEntries([
    { geo: new THREE.PlaneGeometry(2.6, 1.3), x: -1.55, y: 0.012, z: -57.8, rx: -Math.PI / 2, rz: -0.35 },
    { geo: new THREE.PlaneGeometry(2.1, 1.1), x: 0.35, y: 0.012, z: -56.1, rx: -Math.PI / 2, rz: 1.25 },
  ]);
  scene.add(new THREE.Mesh(dragGeo, dragMat));

  const labMonitorMat = new THREE.MeshBasicMaterial({ map: tex.labMonitorError });
  const labMonScreen1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), labMonitorMat);
  labMonScreen1.position.set(3.4, 1.02, -55.9);
  labMonScreen1.rotation.y = -Math.PI / 2 - 0.3;
  scene.add(labMonScreen1);

  // Caixas térmicas Biohazard (MeshLambertMaterial)
  const bioCrateMat = new THREE.MeshLambertMaterial({ map: tex.bioCrate });
  const bioCrateSpecs = [
    { x: 1.9, y: 0.24, z: -62.2, sx: 0.76, sy: 0.48, sz: 0.58, ry: 0.35 },
    { x: -1.55, y: 0.24, z: -61.7, sx: 0.72, sy: 0.46, sz: 0.54, ry: -0.45 },
    { x: 1.25, y: 0.04, z: -61.6, sx: 0.76, sy: 0.08, sz: 0.58, ry: 0.92 },
  ];
  registerBoxCollider(1.9, -62.2, 0.85, 0.68);
  registerBoxCollider(-1.55, -61.7, 0.82, 0.65);
  const bioCrateMesh = new THREE.Mesh(mergeEnvSpecs(bioCrateSpecs, unitBoxGeo), bioCrateMat);
  bioCrateMesh.castShadow = true;
  bioCrateMesh.receiveShadow = true;
  scene.add(bioCrateMesh);

  // Frascos tombados pelo chão mesclados em 1 Mesh (sem sombra)
  const vialMat = new THREE.MeshLambertMaterial({ color: 0x62b878 });
  const vialGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.14, 8);
  const vialSpecs = [];
  for (let i = 0; i < 16; i++) {
    const cx = i < 8 ? 2.2 : -1.4;
    const cz = -61.2;
    vialSpecs.push({
      x: cx + (Math.random() - 0.5) * 1.4,
      y: 0.032,
      z: cz + (Math.random() - 0.5) * 1.3,
      rx: Math.PI / 2,
      ry: Math.random() * Math.PI,
    });
  }
  scene.add(new THREE.Mesh(mergeEnvSpecs(vialSpecs, vialGeo), vialMat));
  vialGeo.dispose();

  // Papéis no chão da Zona 3 (y = 0.004, estritamente horizontais no plano XZ, sem sombra)
  const paperGeo = new THREE.PlaneGeometry(0.24, 0.32);
  paperGeo.rotateX(-Math.PI / 2);
  const paperMat = new THREE.MeshLambertMaterial({ map: tex.paperDoc });
  const paperCount = 44;
  const paperMesh = new THREE.InstancedMesh(paperGeo, paperMat, paperCount);
  paperMesh.castShadow = false;
  paperMesh.receiveShadow = false;
  const paperDummy = new THREE.Object3D();
  for (let i = 0; i < paperCount; i++) {
    const px = (Math.random() - 0.5) * 7.6;
    const pz = -54.8 - Math.random() * 8.2;
    paperDummy.position.set(px, 0.004 + (i % 3) * 0.0003, pz);
    paperDummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    paperDummy.updateMatrix();
    paperMesh.setMatrixAt(i, paperDummy.matrix);
  }
  paperMesh.instanceMatrix.needsUpdate = true;
  scene.add(paperMesh);

  // ============================================================================
  // PARTÍCULAS ATMOSFÉRICAS LEVES (máx. 150 pontos compartilhados entre zonas)
  // ============================================================================
  const particleCount = 150;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleSeeds = new Float32Array(particleCount);
  const spreadX = 14;
  const spreadY = 3.4;
  const spreadZ = 14;

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * spreadX;
    particlePositions[i * 3 + 1] = 0.2 + Math.random() * spreadY;
    particlePositions[i * 3 + 2] = 10 + (Math.random() - 0.5) * spreadZ;
    particleSeeds[i] = Math.random() * Math.PI * 2;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    map: tex.ashSprite,
    color: 0xa6b2ba,
    size: 0.08,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const ashParticles = new THREE.Points(particleGeo, particleMat);
  ashParticles.frustumCulled = false;
  scene.add(ashParticles);

  // ============================================================================
  // ZONAS 4 E 5: HOSPITAL PSIQUIÁTRICO (conectado pela porta direita da Zona 3)
  // ============================================================================
  const hospital = createHospitalWing(scene, registerBoxCollider, raycastTargets);

  // ============================================================================
  // COLISÃO AABB POR ZONA (limites dinâmicos conforme a posição do jogador)
  // ============================================================================
  function isColliding(x, z, radius) {
    if (x <= 4.85) {
      // Limite Sul externo
      if (z + radius > 17.6) return true;
      // Limite Norte interno do quarto experimental (Zona 3)
      if (z - radius < -63.4) return true;

      if (z > -24.2) {
        // Zona 1: beco externo (x = -7.9..+7.9)
        if (x - radius < -7.8 || x + radius > 7.8) return true;
      } else if (z > -54.0) {
        // Zona 2: corredor (x = -1.96..+1.96)
        if (x - radius < -1.92 || x + radius > 1.92) return true;
      } else {
        // Zona 3: parede oeste em -4.62; parede leste tem passagem aberta em z = -60.95..-58.65
        if (x - radius < -4.62) return true;
      }
    } else {
      // Zonas 4 & 5 (Hospital Psiquiátrico): limites externos de segurança
      if (x + radius > 20.8) return true;
      if (z - radius < -74.65 || z + radius > -44.85) return true;
    }

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c.enabled) continue;
      if (
        x + radius > c.minX &&
        x - radius < c.maxX &&
        z + radius > c.minZ &&
        z - radius < c.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  function moveWithCollision(pos, dx, dz, radius = 0.38) {
    if (dx !== 0 && !isColliding(pos.x + dx, pos.z, radius)) {
      pos.x += dx;
    }
    if (dz !== 0 && !isColliding(pos.x, pos.z + dz, radius)) {
      pos.z += dz;
    }
  }

  // ============================================================================
  // ESTADO NARRATIVO E GATILHOS INVISÍVEIS
  // ============================================================================
  const fogColorExt = new THREE.Color(0x0b0e11);
  const fogColorInt = new THREE.Color(0x161d24);
  const fogColorLab = new THREE.Color(0x131618);
  const fogColorHosp = new THREE.Color(0x0e1314);
  const hemiSkyExt = new THREE.Color(0x222c38);
  const hemiSkyInt = new THREE.Color(0x7c8e9e);
  const hemiSkyLab = new THREE.Color(0x526068);
  const hemiSkyHosp = new THREE.Color(0x3a4745);
  const hemiGndExt = new THREE.Color(0x0a0c0e);
  const hemiGndInt = new THREE.Color(0x242a30);

  let tier2Triggered = false;
  let tier3Triggered = false;
  let lookedBackSwapped = false;
  let flickerTimer = 0;
  let elapsed = 0;

  function update(dt, playerPos, playerYaw, audio) {
    elapsed += dt;
    if (flickerTimer > 0) flickerTimer = Math.max(0, flickerTimer - dt);

    const px = playerPos.x;
    const pz = playerPos.z;

    hospital.update(dt, playerPos, audio);

    // 1. Progressão de visibilidade / "resolução" ao se aproximar da entrada (z = -24)
    const distToDoor = Math.max(0, pz - -24.0);
    const rawEntry = THREE.MathUtils.clamp(1 - distToDoor / 28.0, 0, 1);
    const sEntry = rawEntry * rawEntry * (3 - 2 * rawEntry);

    // Transição adicional para o quarto experimental (z = -54)
    const rawLab = THREE.MathUtils.clamp((-51.5 - pz) / 5.0, 0, 1);
    const sLab = rawLab * rawLab * (3 - 2 * rawLab);

    // Transição para a Ala Psiquiátrica (x > 4.6)
    const rawHosp = THREE.MathUtils.clamp((px - 4.2) / 3.2, 0, 1);
    const sHosp = rawHosp * rawHosp * (3 - 2 * rawHosp);

    // FogExp2: 0.115 no beco -> 0.028 no corredor -> ~0.048 sombrio no hospital
    const baseDensity = THREE.MathUtils.lerp(0.115, 0.028, sEntry) + sLab * 0.004;
    scene.fog.density = THREE.MathUtils.lerp(baseDensity, 0.048, sHosp);

    scene.fog.color
      .copy(fogColorExt)
      .lerp(fogColorInt, sEntry)
      .lerp(fogColorLab, sLab)
      .lerp(fogColorHosp, sHosp);
    scene.background.copy(scene.fog.color);

    hemiLight.color
      .copy(hemiSkyExt)
      .lerp(hemiSkyInt, sEntry)
      .lerp(hemiSkyLab, sLab)
      .lerp(hemiSkyHosp, sHosp);
    hemiLight.groundColor.copy(hemiGndExt).lerp(hemiGndInt, sEntry);
    hemiLight.intensity = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(0.35, 0.72, sEntry) - sLab * 0.22,
      0.34,
      sHosp
    );

    // Desliga visibilidade da Zona 1 distante quando bem dentro do hospital para poupar draw calls
    zone1Group.visible = px <= 7.2;

    // Atenua o plano/halo do farol distante conforme o jogador entra na porta para revelar o corredor real
    const beaconFade = THREE.MathUtils.clamp((pz - -23.0) / 10.0, 0, 1);
    beaconPlaneMat.opacity = 0.92 * beaconFade;
    beaconHaloMat.opacity = 0.85 * beaconFade;
    beaconCore.visible = beaconFade > 0.02;
    beaconHalo.visible = beaconFade > 0.02;

    // 2. Gatilhos invisíveis de avisos no Corredor (Zona 2)
    if (!tier2Triggered && pz < -30.5 && px < 4.5) {
      tier2Triggered = true;
      sign2Poster.visible = true;
      monitorScreen.visible = true;
      flickerTimer = 0.14;
      if (audio) audio.playHallucinationStinger(false);
    }

    if (!tier3Triggered && pz < -40.5 && px < 4.5) {
      tier3Triggered = true;
      sign3Left.visible = true;
      sign4Right.visible = true;
      flickerTimer = 0.16;
      if (audio) audio.playHallucinationStinger(false);
    }

    // Subtexto oculto de alucinação: após passar z < -42.5 e olhar para trás (+Z)
    if (tier2Triggered && !lookedBackSwapped && pz < -42.5 && px < 4.5) {
      const lookDotSouth = Math.cos(playerYaw);
      if (lookDotSouth > 0.45) {
        lookedBackSwapped = true;
        flickerTimer = 0.18;
        monitorScreenMat.map = tex.monitorHallucination;
        monitorScreenMat.needsUpdate = true;

        sign2Poster.material.map = tex.signHallucinationWall;
        sign2Poster.material.needsUpdate = true;
        sign2Poster.rotation.z = 0;

        if (audio) audio.playHallucinationStinger(true);
      }
    }

    // 3. Orçamento estrito: APENAS 1 PointLight sem sombra ativa para a zona atual
    const microDip = flickerTimer > 0 ? 0.18 : 1.0;
    const flick =
      Math.sin(elapsed * 8.5) * 0.15 +
      (Math.sin(elapsed * 29.0) > 0.93 ? -0.45 : 0);

    let activeZone = 1;
    if (px > 4.6) {
      activeZone = 4;
      // Zonas 4 & 5: 1 luz fria no Salão ou na entrada do quarto atual
      zoneLight.color.setHex(0xa8bec2);
      if (pz < -66.2) {
        zoneLight.position.set(13.2, 3.25, -69.2);
        zoneLight.intensity = 6.0;
      } else if (pz > -53.4) {
        zoneLight.position.set(13.2, 3.25, -50.4);
        zoneLight.intensity = 6.0;
      } else {
        zoneLight.position.set(13.5, 3.35, -59.8);
        zoneLight.intensity = Math.max(2.5, 7.5 + flick * 2.2);
      }
      zoneLight.distance = 18;
    } else if (pz <= -52.5) {
      activeZone = 3;
      // Zona 3: luz clínica fria + leve pulso no laboratório
      zoneLight.color.setHex(0xcbe2ef);
      zoneLight.position.set(0.2, 3.25, -58.8);
      zoneLight.intensity = 12.5 + Math.sin(elapsed * 3.4) * 2.5;
      zoneLight.distance = 18;
    } else if (pz <= -19.0) {
      activeZone = 2;
      // Zona 2: luz fluorescente única acompanhando suavemente o trecho do corredor
      zoneLight.color.setHex(0xd4e6f2);
      zoneLight.position.set(0, 2.95, THREE.MathUtils.clamp(pz, -50.0, -26.5));
      zoneLight.intensity = Math.max(2.5, (14.0 + flick * 3.2) * microDip);
      zoneLight.distance = 18;
    } else {
      activeZone = 1;
      // Zona 1: farol branco na entrada da construção
      zoneLight.color.setHex(0xe4f3ff);
      zoneLight.position.set(0, 2.5, -24.7);
      zoneLight.intensity = 22.0;
      zoneLight.distance = 22;
    }

    // Pisca suave da tela de erro no quarto final
    labMonitorMat.color.setScalar(0.82 + 0.18 * Math.sin(elapsed * 5.0));

    if (audio) {
      audio.updateZoneAtmosphere(dt, activeZone);
    }

    // 4. Partículas leves (150 pontos) acompanhando o jogador
    const posAttr = particleGeo.getAttribute('position');
    const arr = posAttr.array;
    const halfX = spreadX * 0.5;
    const halfZ = spreadZ * 0.5;
    const isVapor = activeZone === 3;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const seed = particleSeeds[i];

      arr[idx] += Math.sin(elapsed * 0.7 + seed) * 0.16 * dt;
      arr[idx + 1] += (isVapor ? 0.16 : -0.13) * dt;
      arr[idx + 2] += Math.cos(elapsed * 0.6 + seed) * 0.15 * dt;

      if (arr[idx] - playerPos.x > halfX) arr[idx] -= spreadX;
      else if (arr[idx] - playerPos.x < -halfX) arr[idx] += spreadX;

      if (arr[idx + 2] - playerPos.z > halfZ) arr[idx + 2] -= spreadZ;
      else if (arr[idx + 2] - playerPos.z < -halfZ) arr[idx + 2] += spreadZ;

      if (arr[idx + 1] < 0.12) arr[idx + 1] += spreadY;
      else if (arr[idx + 1] > spreadY + 0.2) arr[idx + 1] -= spreadY;
    }
    posAttr.needsUpdate = true;
  }

  return {
    moveWithCollision,
    update,
    getRaycastTargets: () => raycastTargets,
    getInteractionPrompt: (pos) => hospital.getInteractionPrompt(pos),
    triggerInteraction: (pos, audio, showThought) =>
      hospital.triggerInteraction(pos, audio, showThought),
  };
}
