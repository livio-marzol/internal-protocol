import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function createHospitalTexture(size, drawFn, repeatX = 1, repeatY = 1, isAlpha = false) {
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

function createSignTex(size, drawFn, isAlpha = false) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  if (!isAlpha) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

function drawShakyLine(ctx, x0, y0, x1, y1, steps = 10, jitter = 4.5) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jx = (Math.random() - 0.5) * jitter * (i === steps ? 0.6 : 1.0);
    const jy = (Math.random() - 0.5) * jitter * (i === steps ? 0.6 : 1.0);
    ctx.lineTo(x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy);
  }
  ctx.stroke();
}

function drawShakyFreehandLoop(ctx, cx, cy, rx, ry, turns = 1.35, jitter = 11) {
  const segs = Math.floor(turns * 28);
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
    const rMod = 1 + Math.sin(a * 3.1) * 0.09 + (Math.random() - 0.5) * (jitter / rx);
    const px = cx + Math.cos(a) * rx * rMod + (Math.random() - 0.5) * 4;
    const py = cy + Math.sin(a) * ry * rMod + (Math.random() - 0.5) * 4;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function createHospitalTextures() {
  // Parede hospitalar descascada (512x512, repeat 1x1 com UV em espaço de mundo 3.6m)
  const wallTex = createHospitalTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#4f5a56';
      ctx.fillRect(0, 0, s, s);
      // Parte inferior (y = 0..1.58m -> v = 0..0.44 -> canvas y = 56%..100%)
      ctx.fillStyle = '#343c3a';
      ctx.fillRect(0, s * 0.56, s, s * 0.44);
      ctx.fillStyle = '#232826';
      ctx.fillRect(0, s * 0.55, s, 8);

      for (let i = 0; i < 42; i++) {
        ctx.fillStyle =
          Math.random() > 0.45 ? 'rgba(34, 38, 36, 0.34)' : 'rgba(92, 98, 92, 0.2)';
        ctx.fillRect(
          Math.random() * s,
          Math.random() * s,
          14 + Math.random() * 44,
          16 + Math.random() * 68
        );
      }

      for (let i = 0; i < 20; i++) {
        const x = Math.random() * s;
        const h = 80 + Math.random() * 240;
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(18, 22, 20, 0.44)');
        g.addColorStop(1, 'rgba(18, 22, 20, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, Math.random() * 140, 8 + Math.random() * 14, h);
      }
    },
    1,
    1
  );

  // Piso linóleo quadriculado encardido (512x512, repeat 1x1 com UV em espaço de mundo)
  const floorTex = createHospitalTexture(
    512,
    (ctx, s) => {
      const step = s / 8;
      for (let gx = 0; gx < 8; gx++) {
        for (let gy = 0; gy < 8; gy++) {
          const even = (gx + gy) % 2 === 0;
          const base = (even ? 56 : 42) + Math.floor(Math.random() * 10);
          ctx.fillStyle = `rgb(${base},${base + 3},${base + 1})`;
          ctx.fillRect(gx * step, gy * step, step, step);
        }
      }
      for (let i = 0; i < 22; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const r = 20 + Math.random() * 54;
        const g = ctx.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, 'rgba(14, 16, 15, 0.48)');
        g.addColorStop(1, 'rgba(14, 16, 15, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    1,
    1
  );

  // Aviso grande na porta pesada: "NÃO ABRA" (512x512, fundo fosco #9c988c)
  const dontOpenTex = createSignTex(512, (ctx, s) => {
    ctx.fillStyle = '#9c988c';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#090909';
    ctx.lineWidth = 18;
    ctx.strokeRect(14, 14, s - 28, s - 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#7a1414';
    ctx.font = 'bold 92px sans-serif';
    ctx.fillText('NÃO', s / 2, 162);
    ctx.fillText('ABRA', s / 2, 268);

    ctx.fillStyle = '#090909';
    ctx.fillRect(34, 324, s - 68, 76);
    ctx.fillStyle = '#b39024';
    for (let x = -s; x < s * 2; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 324);
      ctx.lineTo(x + 24, 324);
      ctx.lineTo(x - 10, 400);
      ctx.lineTo(x - 34, 400);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#090909';
    ctx.fillRect(92, 338, s - 184, 48);
    ctx.fillStyle = '#9c988c';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('ISOLAMENTO PSIQUIÁTRICO', s / 2, 371);

    ctx.fillStyle = '#090909';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('ACESSO ESTRITAMENTE PROIBIDO', s / 2, 452);
  });

  // Placa da recepção: "ALA PSIQUIÁTRICA — INTERNAÇÃO" (512x512)
  const wardSignTex = createSignTex(512, (ctx, s) => {
    ctx.fillStyle = '#9c988c';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#090909';
    ctx.lineWidth = 14;
    ctx.strokeRect(18, 18, s - 36, s - 36);

    ctx.fillStyle = '#2d3d38';
    ctx.fillRect(32, 32, s - 64, 110);
    ctx.fillStyle = '#9c988c';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('SETOR HOSPITALAR', s / 2, 100);

    ctx.fillStyle = '#090909';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('ALA PSIQUIÁTRICA', s / 2, 260);
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('INTERNAÇÃO', s / 2, 324);
    ctx.fillStyle = '#7a1414';
    ctx.fillRect(88, 378, s - 176, 12);
  });

  const makeRoomSign = (label) =>
    createSignTex(256, (ctx, s) => {
      ctx.fillStyle = '#9c988c';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#090909';
      ctx.lineWidth = 12;
      ctx.strokeRect(12, 12, s - 24, s - 24);
      ctx.fillStyle = '#090909';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(label, s / 2, s / 2 + 12);
    });
  const room1SignTex = makeRoomSign('QUARTO 01');
  const room2SignTex = makeRoomSign('QUARTO 02');

  // Colchão manchado (256x256)
  const mattressTex = createHospitalTexture(256, (ctx, s) => {
    ctx.fillStyle = '#7d7a70';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 16 + Math.random() * 44;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, 'rgba(48, 42, 32, 0.45)');
      g.addColorStop(1, 'rgba(48, 42, 32, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Atlas 3x2 de cubos de madeira infantis ABC / 123 (256x256)
  const toyCubeAtlasTex = createSignTex(256, (ctx) => {
    const cells = [
      { ch: 'A', bg: '#8a6d4b', fg: '#782222' },
      { ch: 'B', bg: '#87764b', fg: '#204568' },
      { ch: 'C', bg: '#7b786a', fg: '#265836' },
      { ch: '1', bg: '#8a6f4e', fg: '#805316' },
      { ch: '2', bg: '#7e6a56', fg: '#5a2258' },
      { ch: '3', bg: '#82775f', fg: '#161616' },
    ];
    const cw = 256 / 3;
    const ch = 256 / 2;
    cells.forEach((cell, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = col * cw;
      const y = row * ch;

      ctx.fillStyle = cell.bg;
      ctx.fillRect(x, y, cw, ch);
      ctx.fillStyle = 'rgba(28, 20, 12, 0.14)';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(x + 4, y + 10 + i * 18, cw - 8, 3);
      }
      ctx.strokeStyle = '#3d2c1c';
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 5, y + 5, cw - 10, ch - 10);

      ctx.fillStyle = cell.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 56px serif';
      ctx.fillText(cell.ch, x + cw / 2, y + ch / 2 + 2);
    });
  });

  // Textura de pelúcia suja para o ursinho (256x256)
  const plushTex = createHospitalTexture(256, (ctx, s) => {
    ctx.fillStyle = '#6b5340';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 3200; i++) {
      const v = Math.random() > 0.5 ? 12 : -14;
      ctx.fillStyle = `rgb(${107 + v},${83 + v},${64 + v})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 3, 2);
    }
    ctx.strokeStyle = 'rgba(34, 24, 18, 0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s / 2, s);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Textura da bola infantil com gomos vintage sujos/desbotados (256x256)
  const ballTex = createSignTex(256, (ctx, s) => {
    const stripes = ['#7f332e', '#9c8c72', '#355469', '#947430', '#445c44', '#9c8c72'];
    const sw = s / stripes.length;
    stripes.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(i * sw, 0, sw + 1, s);
    });
    ctx.fillStyle = '#9c8c72';
    ctx.fillRect(0, 0, s, 26);
    ctx.fillRect(0, s - 26, s, 26);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = 'rgba(20, 18, 16, 0.24)';
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 20, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Textura da cabine do carrinho com janelas pintadas (256x256)
  const toyCarCabinTex = createSignTex(256, (ctx, s) => {
    ctx.fillStyle = '#3c5866';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#182228';
    ctx.fillRect(28, 38, s - 56, s - 76);
    ctx.strokeStyle = '#222b30';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, s - 24, s - 24);
  });

  // Desenho infantil rabiscado (512x512)
  const childDrawingTex = createSignTex(512, (ctx, s) => {
    ctx.fillStyle = '#9c988c';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#141416';
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.arc(165, 165, 36, 0, Math.PI * 2);
    ctx.moveTo(165, 201);
    ctx.lineTo(165, 315);
    ctx.moveTo(120, 240);
    ctx.lineTo(210, 240);
    ctx.moveTo(165, 315);
    ctx.lineTo(130, 395);
    ctx.moveTo(165, 315);
    ctx.lineTo(200, 395);
    ctx.stroke();

    ctx.strokeStyle = '#681818';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(355, 120, 42, 0, Math.PI * 2);
    ctx.moveTo(355, 162);
    ctx.lineTo(355, 420);
    ctx.stroke();

    ctx.strokeStyle = '#090909';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let t = 0; t < 24; t += 0.25) {
      const r = t * 2.5;
      const x = 360 + Math.cos(t) * r;
      const y = 370 + Math.sin(t) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Rabiscos frenéticos feitos à mão livre em carvão e sangue seco (ZERO simetria perfeita)
  const ritualSymbolTex = createSignTex(
    512,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      const cx = 248;
      const cy = 246;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Borrões e respingos de carvão / tinta escura ao fundo
      for (let i = 0; i < 28; i++) {
        ctx.fillStyle =
          Math.random() > 0.35 ? 'rgba(20, 18, 18, 0.24)' : 'rgba(92, 16, 16, 0.28)';
        ctx.beginPath();
        ctx.arc(
          cx + (Math.random() - 0.5) * 320,
          cy + (Math.random() - 0.5) * 320,
          3 + Math.random() * 14,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Múltiplos laços trêmulos tortos e sobrepostos em carvão
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = k % 2 === 0 ? 'rgba(14, 14, 16, 0.88)' : 'rgba(30, 26, 26, 0.65)';
        ctx.lineWidth = 4 + Math.random() * 5;
        drawShakyFreehandLoop(
          ctx,
          cx + (Math.random() - 0.5) * 18,
          cy + (Math.random() - 0.5) * 18,
          145 + k * 14 + Math.random() * 12,
          135 + k * 11 + Math.random() * 12,
          1.2 + Math.random() * 0.5,
          16
        );
      }

      // Traços nervosos cruzados que falham e escapam para fora do círculo
      ctx.strokeStyle = 'rgba(14, 14, 16, 0.9)';
      for (let i = 0; i < 9; i++) {
        ctx.lineWidth = 3 + Math.random() * 4;
        const a1 = Math.random() * Math.PI * 2;
        const a2 = a1 + Math.PI * (0.65 + Math.random() * 0.7);
        const r1 = 155 + Math.random() * 65;
        const r2 = 165 + Math.random() * 75;
        drawShakyLine(
          ctx,
          cx + Math.cos(a1) * r1,
          cy + Math.sin(a1) * r1,
          cx + Math.cos(a2) * r2,
          cy + Math.sin(a2) * r2,
          12,
          10
        );
      }

      // Olho/espiral nervoso riscado às pressas no centro em sangue seco + carvão
      ctx.strokeStyle = 'rgba(98, 16, 16, 0.92)';
      ctx.lineWidth = 6;
      drawShakyLine(ctx, cx - 95, cy + 8, cx + 10, cy - 42, 7, 6);
      drawShakyLine(ctx, cx + 10, cy - 42, cx + 98, cy + 4, 7, 6);
      drawShakyLine(ctx, cx - 92, cy + 12, cx + 6, cy + 48, 7, 6);
      drawShakyLine(ctx, cx + 6, cy + 48, cx + 96, cy + 2, 7, 6);

      // Espiral frenética no centro
      ctx.strokeStyle = 'rgba(18, 14, 14, 0.94)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let t = 0; t < 20; t += 0.28) {
        const r = t * 1.9 + (Math.random() - 0.5) * 4;
        const x = cx + Math.cos(t) * r + (Math.random() - 0.5) * 3;
        const y = cy + Math.sin(t) * r + (Math.random() - 0.5) * 3;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Escorridos irregulares descendo da tinta
      for (let d = 0; d < 7; d++) {
        const dx = cx + (Math.random() - 0.5) * 230;
        const dy = cy + 20 + Math.random() * 110;
        ctx.strokeStyle =
          d % 2 === 0 ? 'rgba(90, 16, 16, 0.72)' : 'rgba(18, 16, 16, 0.7)';
        ctx.lineWidth = 2.5 + Math.random() * 2.5;
        drawShakyLine(ctx, dx, dy, dx + (Math.random() - 0.5) * 8, dy + 45 + Math.random() * 90, 6, 3);
      }
    },
    true
  );

  // Marcas irregulares de contagem de dias riscadas às pressas (512x512 alpha)
  const tallyWallTex = createSignTex(
    512,
    (ctx) => {
      ctx.clearRect(0, 0, 512, 512);
      ctx.lineCap = 'round';
      for (let row = 0; row < 3; row++) {
        for (let grp = 0; grp < 4; grp++) {
          const bx = 46 + grp * 108 + (Math.random() - 0.5) * 16;
          const by = 82 + row * 122 + (Math.random() - 0.5) * 18;
          for (let k = 0; k < 4; k++) {
            ctx.strokeStyle =
              Math.random() > 0.2 ? 'rgba(16, 16, 18, 0.88)' : 'rgba(88, 16, 16, 0.82)';
            ctx.lineWidth = 4 + Math.random() * 3.5;
            const x0 = bx + k * (14 + Math.random() * 4);
            const y0 = by + (Math.random() - 0.5) * 14;
            const len = 54 + Math.random() * 32;
            drawShakyLine(ctx, x0, y0, x0 + (Math.random() - 0.5) * 14, y0 + len, 6, 3.5);
          }
          // Corte diagonal nervoso atravessando e escapando
          ctx.strokeStyle = 'rgba(84, 16, 16, 0.86)';
          ctx.lineWidth = 5;
          drawShakyLine(
            ctx,
            bx - 14,
            by + 58 + (Math.random() - 0.5) * 12,
            bx + 68,
            by + 4 + (Math.random() - 0.5) * 12,
            7,
            4
          );
        }
      }
    },
    true
  );

  return {
    wallTex,
    floorTex,
    dontOpenTex,
    wardSignTex,
    room1SignTex,
    room2SignTex,
    mattressTex,
    toyCubeAtlasTex,
    plushTex,
    ballTex,
    toyCarCabinTex,
    childDrawingTex,
    ritualSymbolTex,
    tallyWallTex,
  };
}

/**
 * Aplica mapeamento UV proporcional às dimensões reais em metros (sem esticar azulejos).
 */
function applyWorldBoxUVs(geo, scaleMeters = 3.6) {
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

function mergeSpecs(specs, baseGeo, worldUVScale = 0) {
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
      applyWorldBoxUVs(g, worldUVScale);
    }
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

function mergeGeosTransformed(entries, worldUVScale = 0) {
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
      applyWorldBoxUVs(g, worldUVScale);
    }
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

function createToyCubeGeometry(size) {
  const geo = new THREE.BoxGeometry(size, size, size);
  const uvAttr = geo.attributes.uv;
  const cw = 1 / 3;
  const ch = 1 / 2;
  for (let face = 0; face < 6; face++) {
    const col = face % 3;
    const row = 1 - Math.floor(face / 3);
    const u0 = col * cw + 0.005;
    const u1 = (col + 1) * cw - 0.005;
    const v0 = row * ch + 0.005;
    const v1 = (row + 1) * ch - 0.005;

    const base = face * 4;
    uvAttr.setXY(base + 0, u0, v1);
    uvAttr.setXY(base + 1, u1, v1);
    uvAttr.setXY(base + 2, u0, v0);
    uvAttr.setXY(base + 3, u1, v0);
  }
  uvAttr.needsUpdate = true;
  return geo;
}

export function createHospitalWing(scene, registerCollider, raycastTargets) {
  const tex = createHospitalTextures();
  const group = new THREE.Group();
  group.name = 'HospitalWing';
  scene.add(group);

  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);

  const wallMat = new THREE.MeshLambertMaterial({ map: tex.wallTex });
  const floorMat = new THREE.MeshLambertMaterial({ map: tex.floorTex });
  const ironMat = new THREE.MeshLambertMaterial({ color: 0x262b2d });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x3b3128 });
  const mattressMat = new THREE.MeshLambertMaterial({ map: tex.mattressTex });
  const sheetMat = new THREE.MeshLambertMaterial({ color: 0x6f736e });

  // ============================================================================
  // 1. PORTA PESADA "NÃO ABRA" (x = 4.85, z = -59.8)
  // ============================================================================
  const doorPivot = new THREE.Group();
  doorPivot.position.set(4.85, 0, -60.88);
  group.add(doorPivot);

  const doorGeo = mergeGeosTransformed([
    { geo: new THREE.BoxGeometry(0.14, 2.68, 2.16), x: 0, y: 1.34, z: 1.08 },
    { geo: new THREE.BoxGeometry(0.24, 0.06, 0.18), x: 0, y: 1.12, z: 1.95 },
  ]);
  const doorLeaf = new THREE.Mesh(doorGeo, ironMat);
  doorLeaf.castShadow = true;
  doorLeaf.receiveShadow = true;
  doorPivot.add(doorLeaf);
  raycastTargets.push(doorLeaf);

  const dontOpenMat = new THREE.MeshLambertMaterial({ map: tex.dontOpenTex });
  const dontOpenSignFront = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), dontOpenMat);
  dontOpenSignFront.position.set(-0.075, 1.52, 1.08);
  dontOpenSignFront.rotation.y = -Math.PI / 2;
  dontOpenSignFront.receiveShadow = true;
  doorPivot.add(dontOpenSignFront);
  raycastTargets.push(dontOpenSignFront);

  const dontOpenSignBack = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), dontOpenMat);
  dontOpenSignBack.position.set(0.075, 1.52, 1.08);
  dontOpenSignBack.rotation.y = Math.PI / 2;
  dontOpenSignBack.receiveShadow = true;
  doorPivot.add(dontOpenSignBack);

  const doorCollider = registerCollider(4.85, -59.8, 0.45, 2.4);
  let doorOpen = false;
  let doorAngle = 0;
  let doorTargetAngle = 0;

  // ============================================================================
  // 2. ZONA 4 & ZONA 5: PAREDES SÓLIDAS (UVs proporcionais 3.6m, zero fresta e zero z-fighting)
  // ============================================================================
  const floorGeo = mergeGeosTransformed(
    [
      { geo: new THREE.PlaneGeometry(16.0, 14.0), x: 12.95, y: 0.002, z: -59.8, rx: -Math.PI / 2 },
      { geo: new THREE.PlaneGeometry(8.0, 8.0), x: 13.2, y: 0.002, z: -70.8, rx: -Math.PI / 2 },
      { geo: new THREE.PlaneGeometry(8.0, 8.0), x: 13.2, y: 0.002, z: -48.8, rx: -Math.PI / 2 },
    ],
    2.6
  );
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Paredes sólidas (BoxGeometry >= 0.30m) sem sobreposições em quinas, batentes ou tetos
  const wallAndCeilingSpecs = [
    // Parede Oeste do Salão (x = 4.85) dividindo Zona 3 e Zona 4 com vão livre z = -60.95..-58.65
    { x: 4.85, y: 1.8, z: -63.95, sx: 0.3, sy: 3.6, sz: 6.0 },
    { x: 4.85, y: 1.8, z: -55.65, sx: 0.3, sy: 3.6, sz: 6.0 },
    { x: 4.85, y: 3.14, z: -59.8, sx: 0.3, sy: 0.92, sz: 2.3 },

    // Parede Leste do Salão (x = 21.0)
    { x: 21.0, y: 1.8, z: -59.8, sx: 0.3, sy: 3.6, sz: 14.3 },

    // Parede Norte do Salão (z = -66.8) com vão livre x = 12.0..14.4 para Quarto 01
    { x: 8.5, y: 1.8, z: -66.8, sx: 7.0, sy: 3.6, sz: 0.3 },
    { x: 17.625, y: 1.8, z: -66.8, sx: 6.45, sy: 3.6, sz: 0.3 },
    { x: 13.2, y: 3.14, z: -66.8, sx: 2.4, sy: 0.92, sz: 0.3 },

    // Parede Sul do Salão (z = -52.8) com vão livre x = 12.0..14.4 para Quarto 02
    { x: 8.5, y: 1.8, z: -52.8, sx: 7.0, sy: 3.6, sz: 0.3 },
    { x: 17.625, y: 1.8, z: -52.8, sx: 6.45, sy: 3.6, sz: 0.3 },
    { x: 13.2, y: 3.14, z: -52.8, sx: 2.4, sy: 0.92, sz: 0.3 },

    // Quarto 01 (x: 9.05..17.35, z: -74.8..-66.95) sem sobreposição nas quinas
    { x: 9.05, y: 1.8, z: -70.875, sx: 0.3, sy: 3.6, sz: 7.85 },
    { x: 17.35, y: 1.8, z: -70.875, sx: 0.3, sy: 3.6, sz: 7.85 },
    { x: 13.2, y: 1.8, z: -74.95, sx: 8.6, sy: 3.6, sz: 0.3 },

    // Quarto 02 (x: 9.05..17.35, z: -52.65..-44.8) sem sobreposição nas quinas
    { x: 9.05, y: 1.8, z: -48.725, sx: 0.3, sy: 3.6, sz: 7.85 },
    { x: 17.35, y: 1.8, z: -48.725, sx: 0.3, sy: 3.6, sz: 7.85 },
    { x: 13.2, y: 1.8, z: -44.65, sx: 8.6, sy: 3.6, sz: 0.3 },

    // Tetos fechados sem sobreposição (começa em x=4.70 alinhado ao teto da Zona 3)
    { x: 12.925, y: 3.68, z: -59.8, sx: 16.45, sy: 0.2, sz: 14.3 },
    { x: 13.2, y: 3.68, z: -70.95, sx: 8.6, sy: 0.2, sz: 8.0 },
    { x: 13.2, y: 3.68, z: -48.65, sx: 8.6, sy: 0.2, sz: 8.0 },
  ];
  wallAndCeilingSpecs.forEach((w) => {
    if (w.y < 2.6) registerCollider(w.x, w.z, w.sx, w.sz);
  });

  const hospitalWallsMesh = new THREE.Mesh(
    mergeSpecs(wallAndCeilingSpecs, unitBoxGeo, 3.6),
    wallMat
  );
  hospitalWallsMesh.receiveShadow = true;
  group.add(hospitalWallsMesh);
  raycastTargets.push(hospitalWallsMesh);

  // Batentes limpos e portas entreabertas encostadas no lado interno dos quartos (zero z-fighting)
  const ironParts = [
    // Batentes da porta "NÃO ABRA"
    { x: 4.85, y: 1.34, z: -60.91, sx: 0.34, sy: 2.68, sz: 0.08 },
    { x: 4.85, y: 1.34, z: -58.69, sx: 0.34, sy: 2.68, sz: 0.08 },
    // Batentes Quarto 01
    { x: 12.04, y: 1.34, z: -66.8, sx: 0.08, sy: 2.68, sz: 0.34 },
    { x: 14.36, y: 1.34, z: -66.8, sx: 0.08, sy: 2.68, sz: 0.34 },
    // Batentes Quarto 02
    { x: 12.04, y: 1.34, z: -52.8, sx: 0.08, sy: 2.68, sz: 0.34 },
    { x: 14.36, y: 1.34, z: -52.8, sx: 0.08, sy: 2.68, sz: 0.34 },
    // Folhas entreabertas articuladas limpas a partir do batente oeste interno (x = 12.04)
    { x: 11.79, y: 1.34, z: -67.5, sx: 0.08, sy: 2.68, sz: 1.15, ry: 0.44 },
    { x: 11.79, y: 1.34, z: -52.1, sx: 0.08, sy: 2.68, sz: 1.15, ry: -0.44 },
    // Grades do balcão da recepção
    { x: 17.85, y: 1.89, z: -59.85, sx: 0.06, sy: 0.06, sz: 4.3 },
    // Cadeiras de espera (tombada plana no chão y=0.27 e de pé y=0.40)
    { x: 16.4, y: 0.27, z: -54.1, sx: 0.54, sy: 0.48, sz: 0.54, rx: Math.PI / 2, ry: 0.4 },
    { x: 17.3, y: 0.4, z: -54.0, sx: 0.52, sy: 0.8, sz: 0.52, ry: -0.25 },
    // Sapatos pequenos alinhados (base exata em y = 0)
    { x: 11.75, y: 0.035, z: -69.5, sx: 0.16, sy: 0.07, sz: 0.09, ry: 0.1 },
    { x: 11.78, y: 0.035, z: -69.36, sx: 0.16, sy: 0.07, sz: 0.09, ry: 0.05 },
  ];
  for (let z = -61.8; z <= -57.9; z += 0.48) {
    ironParts.push({ x: 17.85, y: 1.48, z, sx: 0.04, sy: 0.82, sz: 0.04 });
  }

  // Placas rentes à face interna da parede (deslocamento 0.015m)
  const addHospitalSign = (texture, w, h, x, y, z, rotY) => {
    const mat = new THREE.MeshLambertMaterial({ map: texture });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.receiveShadow = true;
    group.add(m);
    raycastTargets.push(m);
    return m;
  };

  addHospitalSign(tex.wardSignTex, 1.5, 1.1, 20.835, 2.25, -59.8, -Math.PI / 2);
  addHospitalSign(tex.room1SignTex, 0.72, 0.42, 11.2, 2.15, -66.635, 0);
  addHospitalSign(tex.room2SignTex, 0.72, 0.42, 11.2, 2.15, -52.965, Math.PI);

  // Desenhos e riscos nervosos rentes à parede interna (0.015m) + chão (0.004m)
  const ritualWallGeo = mergeGeosTransformed([
    { geo: new THREE.PlaneGeometry(1.75, 1.75), x: 13.2, y: 1.55, z: -74.785, ry: 0 },
    { geo: new THREE.PlaneGeometry(1.75, 1.75), x: 13.2, y: 1.55, z: -44.815, ry: Math.PI },
    { geo: new THREE.PlaneGeometry(2.1, 2.1), x: 13.2, y: 0.004, z: -48.8, rx: -Math.PI / 2 },
  ]);
  const ritualMat = new THREE.MeshLambertMaterial({
    map: tex.ritualSymbolTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  group.add(new THREE.Mesh(ritualWallGeo, ritualMat));

  const tallyWallGeo = mergeGeosTransformed([
    { geo: new THREE.PlaneGeometry(1.4, 1.2), x: 9.215, y: 1.5, z: -71.0, ry: Math.PI / 2 },
    { geo: new THREE.PlaneGeometry(1.4, 1.2), x: 17.185, y: 1.5, z: -48.6, ry: -Math.PI / 2 },
  ]);
  const tallyMat = new THREE.MeshLambertMaterial({
    map: tex.tallyWallTex,
    transparent: true,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(tallyWallGeo, tallyMat));

  // Vidro fosco rachado no balcão
  const crackedGlassMat = new THREE.MeshLambertMaterial({
    color: 0x7e9291,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });
  const counterGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.76), crackedGlassMat);
  counterGlass.position.set(17.85, 1.48, -60.5);
  counterGlass.rotation.y = Math.PI / 2;
  group.add(counterGlass);

  // Interfone sobre o tampo do balcão (tampo topY = 1.08 -> centro = 1.08 + 0.07 = 1.15)
  const intercomGroup = new THREE.Group();
  intercomGroup.position.set(17.75, 1.15, -59.4);
  intercomGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.32), ironMat));
  const intercomLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.03, 0.03),
    new THREE.MeshBasicMaterial({ color: 0xb85828 })
  );
  intercomLed.position.set(-0.125, 0.02, 0.08);
  intercomGroup.add(intercomLed);
  group.add(intercomGroup);

  // Cadeira de Rodas Antiga (rodas raio 0.30 em y = 0.30 tocando y = 0)
  const wheelGeo = new THREE.TorusGeometry(0.3, 0.028, 6, 14);
  wheelGeo.rotateY(Math.PI / 2);
  const wheelchairGeo = mergeGeosTransformed([
    { geo: new THREE.BoxGeometry(0.48, 0.06, 0.46), y: 0.5 },
    { geo: new THREE.BoxGeometry(0.48, 0.52, 0.05), y: 0.78, z: -0.22 },
    { geo: wheelGeo, x: -0.29, y: 0.328, z: -0.04 },
    { geo: wheelGeo, x: 0.29, y: 0.328, z: -0.04 },
  ]);
  wheelGeo.dispose();
  const wheelchair = new THREE.Mesh(wheelchairGeo, ironMat);
  wheelchair.position.set(11.4, 0, -60.3);
  wheelchair.rotation.y = 0.42;
  wheelchair.castShadow = true;
  wheelchair.receiveShadow = true;
  group.add(wheelchair);
  const wheelchairCollider = registerCollider(11.4, -60.3, 0.82, 0.82);

  // ============================================================================
  // 3. 8 CAMAS HOSPITALARES + MESAS DE CABECEIRA (todas apoiadas exatamente em y = 0)
  // ============================================================================
  const bedConfigs = [
    { x: 10.45, z: -72.8, ry: 0.04, side: -1, crookedPillow: false },
    { x: 10.52, z: -69.2, ry: -0.14, side: -1, crookedPillow: true },
    { x: 15.95, z: -72.7, ry: -0.05, side: 1, crookedPillow: false },
    { x: 15.88, z: -69.1, ry: 0.16, side: 1, crookedPillow: true },
    { x: 10.45, z: -50.8, ry: -0.06, side: -1, crookedPillow: false },
    { x: 10.55, z: -47.1, ry: 0.15, side: -1, crookedPillow: true },
    { x: 15.95, z: -50.6, ry: 0.08, side: 1, crookedPillow: false },
    { x: 15.85, z: -47.0, ry: -0.18, side: 1, crookedPillow: true },
  ];

  const mattressSpecs = [];
  const sheetSpecs = [];
  const nightstandPositions = [];
  const woodParts = [
    { x: 17.85, y: 0.54, z: -59.8, sx: 0.72, sy: 1.08, sz: 4.8 },
    { x: 19.35, y: 0.54, z: -57.75, sx: 3.1, sy: 1.08, sz: 0.72 },
  ];
  registerCollider(17.85, -59.8, 0.85, 4.9);
  registerCollider(19.35, -57.75, 3.2, 0.85);

  for (let idx = 0; idx < bedConfigs.length; idx++) {
    const b = bedConfigs[idx];
    const cos = Math.cos(b.ry);
    const sin = Math.sin(b.ry);
    const localToWorld = (lx, lz) => ({
      wx: b.x + lx * cos + lz * sin,
      wz: b.z - lx * sin + lz * cos,
    });

    registerCollider(b.x, b.z, 2.05, 1.05);

    // Estrado: y = 0.41..0.47; Colchão: y = 0.47..0.65 (centro 0.56); Lençol: y = 0.65..0.69 (centro 0.67)
    mattressSpecs.push({ x: b.x, y: 0.56, z: b.z, sx: 1.92, sy: 0.18, sz: 0.9, ry: b.ry });
    sheetSpecs.push({
      x: b.x + b.side * 0.12,
      y: 0.67,
      z: b.z + 0.03,
      sx: 1.38,
      sy: 0.04,
      sz: 0.86,
      ry: b.ry + 0.05,
    });

    const pHead = localToWorld(b.side * 0.72, 0);
    if (b.crookedPillow) {
      // Travesseiro caído exatamente apoiado no piso y = 0 (sy = 0.10 -> y = 0.05)
      sheetSpecs.push({
        x: b.x - b.side * 0.45,
        y: 0.05,
        z: b.z + 0.68,
        sx: 0.42,
        sy: 0.1,
        sz: 0.56,
        ry: b.ry + 0.7,
      });
    } else {
      // Travesseiro exatamente sobre o lençol (y = 0.69 + 0.05 = 0.74)
      sheetSpecs.push({
        x: pHead.wx,
        y: 0.74,
        z: pHead.wz,
        sx: 0.38,
        sy: 0.1,
        sz: 0.6,
        ry: b.ry,
      });
    }

    // Estrado + cabeceira (y = 0..1.12) + peseira (y = 0..0.88) apoiados diretamente no piso y = 0
    ironParts.push({ x: b.x, y: 0.44, z: b.z, sx: 1.98, sy: 0.06, sz: 0.94, ry: b.ry });
    const headPos = localToWorld(b.side * 0.96, 0);
    const footPos = localToWorld(-b.side * 0.96, 0);
    ironParts.push({
      x: headPos.wx,
      y: 0.56,
      z: headPos.wz,
      sx: 0.06,
      sy: 1.12,
      sz: 0.96,
      ry: b.ry,
    });
    ironParts.push({
      x: footPos.wx,
      y: 0.44,
      z: footPos.wz,
      sx: 0.06,
      sy: 0.88,
      sz: 0.96,
      ry: b.ry,
    });
    const railPos = localToWorld(b.side * 0.15, 0.47);
    ironParts.push({
      x: railPos.wx,
      y: 0.74,
      z: railPos.wz,
      sx: 1.05,
      sy: 0.04,
      sz: 0.04,
      ry: b.ry,
    });

    // Mesa de cabeceira apoiada em y = 0 (sy = 0.68 -> centro y = 0.34, tampo topY = 0.68)
    const nsZ = b.z + (idx % 2 === 0 ? 0.82 : -0.82);
    const nsX = b.x + b.side * 0.78;
    woodParts.push({ x: nsX, y: 0.34, z: nsZ, sx: 0.46, sy: 0.68, sz: 0.46, ry: b.ry * 0.5 });
    nightstandPositions.push({ x: nsX, z: nsZ, topY: 0.68 });
  }

  const ironMesh = new THREE.Mesh(mergeSpecs(ironParts, unitBoxGeo), ironMat);
  ironMesh.castShadow = true;
  ironMesh.receiveShadow = true;
  group.add(ironMesh);

  const woodMesh = new THREE.Mesh(mergeSpecs(woodParts, unitBoxGeo), woodMat);
  woodMesh.castShadow = true;
  woodMesh.receiveShadow = true;
  group.add(woodMesh);

  const mattressMesh = new THREE.Mesh(mergeSpecs(mattressSpecs, unitBoxGeo), mattressMat);
  mattressMesh.castShadow = true;
  mattressMesh.receiveShadow = true;
  group.add(mattressMesh);

  const sheetMesh = new THREE.Mesh(mergeSpecs(sheetSpecs, unitBoxGeo), sheetMat);
  sheetMesh.castShadow = false;
  sheetMesh.receiveShadow = true;
  group.add(sheetMesh);

  // ============================================================================
  // 4. BRINQUEDOS E FRASCOS APOIADOS EXATAMENTE EM y = 0 OU SOBRE OS TAMPOS
  // ============================================================================
  const cubeSize = 0.14;
  const cubeGeo = createToyCubeGeometry(cubeSize);
  const cubeMat = new THREE.MeshLambertMaterial({ map: tex.toyCubeAtlasTex });
  const blockSpecs = [
    { x: 12.1, y: cubeSize * 0.5, z: -70.6, ry: 0.35 },
    { x: 12.28, y: cubeSize * 0.5, z: -70.47, ry: -0.75 },
    { x: 12.18, y: cubeSize * 1.5, z: -70.53, ry: 0.2 },
    { x: 14.3, y: cubeSize * 0.5, z: -72.1, ry: 1.15 },
    { x: 12.4, y: cubeSize * 0.5, z: -48.2, ry: 0.4 },
    { x: 12.58, y: cubeSize * 0.5, z: -48.34, ry: 1.45 },
    { x: 14.2, y: cubeSize * 0.5, z: -46.8, ry: -0.55 },
  ];
  const blockMesh = new THREE.InstancedMesh(cubeGeo, cubeMat, blockSpecs.length);
  blockMesh.castShadow = false;
  blockMesh.receiveShadow = false;
  const bDummy = new THREE.Object3D();
  blockSpecs.forEach((b, i) => {
    bDummy.position.set(b.x, b.y, b.z);
    bDummy.rotation.set(0, b.ry, 0);
    bDummy.scale.set(1, 1, 1);
    bDummy.updateMatrix();
    blockMesh.setMatrixAt(i, bDummy.matrix);
  });
  blockMesh.instanceMatrix.needsUpdate = true;
  group.add(blockMesh);

  // Bola infantil (raio 0.14 -> y = 0.14)
  const ballMat = new THREE.MeshLambertMaterial({ map: tex.ballTex });
  const fadedBall = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), ballMat);
  fadedBall.position.set(16.1, 0.14, -73.8);
  fadedBall.rotation.set(0.3, 0.8, 0.2);
  group.add(fadedBall);

  // Ursinho de pelúcia sentado encostado próximo à cama no Quarto 01 (base em y = 0)
  const teddyGroup = new THREE.Group();
  teddyGroup.position.set(11.65, 0, -72.25);
  teddyGroup.rotation.y = 0.85;

  const plushMat = new THREE.MeshLambertMaterial({ map: tex.plushTex });
  const muzzleMat = new THREE.MeshLambertMaterial({ color: 0x8a725a });
  const buttonMat = new THREE.MeshLambertMaterial({ color: 0x101012 });

  const teddyMainGeo = mergeGeosTransformed([
    { geo: new THREE.SphereGeometry(0.11, 10, 8), x: 0, y: 0.115, z: -0.01, rx: -0.15, sx: 0.95, sy: 1.15, sz: 0.82 },
    { geo: new THREE.SphereGeometry(0.088, 10, 8), x: 0, y: 0.275, z: 0.01 },
    { geo: new THREE.SphereGeometry(0.036, 8, 6), x: -0.068, y: 0.345, z: 0.005, sz: 0.65 },
    { geo: new THREE.SphereGeometry(0.036, 8, 6), x: 0.068, y: 0.345, z: 0.005, sz: 0.65 },
    { geo: new THREE.CylinderGeometry(0.03, 0.028, 0.14, 8), x: -0.105, y: 0.14, z: 0.025, rx: 0.25, rz: 0.38 },
    { geo: new THREE.CylinderGeometry(0.03, 0.028, 0.14, 8), x: 0.105, y: 0.14, z: 0.025, rx: 0.25, rz: -0.38 },
    { geo: new THREE.CylinderGeometry(0.036, 0.038, 0.16, 8), x: -0.065, y: 0.038, z: 0.095, rx: Math.PI / 2, ry: 0.28 },
    { geo: new THREE.CylinderGeometry(0.036, 0.038, 0.16, 8), x: 0.065, y: 0.038, z: 0.095, rx: Math.PI / 2, ry: -0.28 },
  ]);
  teddyGroup.add(new THREE.Mesh(teddyMainGeo, plushMat));

  const teddyMuzzle = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), muzzleMat);
  teddyMuzzle.position.set(0, 0.258, 0.084);
  teddyMuzzle.scale.set(1.1, 0.85, 0.85);
  teddyGroup.add(teddyMuzzle);

  const teddyButtonsGeo = mergeGeosTransformed([
    { geo: new THREE.SphereGeometry(0.011, 6, 6), x: -0.032, y: 0.292, z: 0.082 },
    { geo: new THREE.SphereGeometry(0.011, 6, 6), x: 0.032, y: 0.292, z: 0.082 },
    { geo: new THREE.SphereGeometry(0.013, 6, 6), x: 0, y: 0.268, z: 0.116, sx: 1.25, sy: 0.85 },
  ]);
  teddyGroup.add(new THREE.Mesh(teddyButtonsGeo, buttonMat));
  group.add(teddyGroup);

  // Carrinho de brinquedo no Quarto 02 (rodinhas tocando y = 0)
  const toyCarGroup = new THREE.Group();
  toyCarGroup.position.set(13.8, 0, -47.4);
  toyCarGroup.rotation.y = -0.65;

  const carChassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.052, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x3b5866 })
  );
  carChassis.position.set(0, 0.056, 0);
  toyCarGroup.add(carChassis);

  const carCabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.136, 0.048, 0.14),
    new THREE.MeshLambertMaterial({ map: tex.toyCarCabinTex })
  );
  carCabin.position.set(0, 0.104, -0.015);
  toyCarGroup.add(carCabin);

  const wheelCylGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.022, 10);
  wheelCylGeo.rotateZ(Math.PI / 2);
  const carWheelsGeo = mergeGeosTransformed([
    { geo: wheelCylGeo, x: -0.082, y: 0.03, z: 0.092 },
    { geo: wheelCylGeo, x: 0.082, y: 0.03, z: 0.092 },
    { geo: wheelCylGeo, x: -0.082, y: 0.03, z: -0.092 },
    { geo: wheelCylGeo, x: 0.082, y: 0.03, z: -0.092 },
  ]);
  wheelCylGeo.dispose();
  toyCarGroup.add(new THREE.Mesh(carWheelsGeo, new THREE.MeshLambertMaterial({ color: 0x121315 })));
  group.add(toyCarGroup);

  // Frascos e caneca apoiados EXATAMENTE sobre os tampos reais das mesas de cabeceira e no piso y = 0
  const ns1 = nightstandPositions[1]; // Quarto 01
  const ns6 = nightstandPositions[6]; // Quarto 02
  const vialGeoSrc = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  const medVialsGeo = mergeSpecs(
    [
      // Em pé sobre mesa de cabeceira 1 (tampo y = 0.68 -> base em 0.68, altura 0.09 -> centro 0.725)
      { x: ns1.x - 0.06, y: ns1.topY + 0.045, z: ns1.z + 0.04, sx: 0.045, sy: 0.09, sz: 0.045 },
      // Tombado sobre mesa de cabeceira 1 (raio 0.0225 -> centro 0.68 + 0.0225)
      { x: ns1.x + 0.07, y: ns1.topY + 0.0225, z: ns1.z - 0.03, sx: 0.045, sy: 0.09, sz: 0.045, rx: Math.PI / 2, ry: 0.5 },
      // Frasco caído no chão do Quarto 02 (raio 0.025 -> y = 0.025)
      { x: ns6.x - 0.45, y: 0.025, z: ns6.z + 0.15, sx: 0.05, sy: 0.1, sz: 0.05, rx: Math.PI / 2, ry: 0.9 },
      // Caneca tombada no chão do Quarto 02 (raio 0.045 -> y = 0.045)
      { x: ns6.x - 0.62, y: 0.045, z: ns6.z + 0.28, sx: 0.09, sy: 0.08, sz: 0.09, rx: Math.PI / 2, ry: 0.2 },
    ],
    vialGeoSrc
  );
  vialGeoSrc.dispose();
  group.add(new THREE.Mesh(medVialsGeo, new THREE.MeshLambertMaterial({ color: 0x9b7038 })));

  // ============================================================================
  // 5. PAPÉIS E CADERNOS COLADOS NO CHÃO (y = 0.004) E SOBRE O BALCÃO (y = 1.084)
  // ============================================================================
  const drawingPaperGeo = new THREE.PlaneGeometry(0.28, 0.36);
  drawingPaperGeo.rotateX(-Math.PI / 2);
  const drawingPaperMat = new THREE.MeshLambertMaterial({ map: tex.childDrawingTex });

  const drawingSpecs = [];
  for (let i = 0; i < 5; i++) {
    drawingSpecs.push({
      x: 17.65 + (i % 2) * 0.25,
      y: 1.084 + i * 0.0003,
      z: -61.4 + i * 0.65,
      ry: Math.random() * Math.PI * 2,
    });
  }
  for (let i = 0; i < 7; i++) {
    drawingSpecs.push({
      x: 16.0 + Math.random() * 1.4,
      y: 0.004 + (i % 3) * 0.0003,
      z: -61.6 + Math.random() * 3.8,
      ry: Math.random() * Math.PI * 2,
    });
  }
  for (let i = 0; i < 12; i++) {
    drawingSpecs.push({
      x: 11.7 + Math.random() * 3.0,
      y: 0.004 + (i % 3) * 0.0003,
      z: -74.0 + Math.random() * 6.4,
      ry: Math.random() * Math.PI * 2,
    });
    drawingSpecs.push({
      x: 11.7 + Math.random() * 3.0,
      y: 0.004 + (i % 3) * 0.0003,
      z: -52.0 + Math.random() * 6.4,
      ry: Math.random() * Math.PI * 2,
    });
  }

  const drawingMesh = new THREE.InstancedMesh(
    drawingPaperGeo,
    drawingPaperMat,
    drawingSpecs.length
  );
  drawingMesh.castShadow = false;
  drawingMesh.receiveShadow = false;
  const pDummy = new THREE.Object3D();
  drawingSpecs.forEach((p, i) => {
    pDummy.position.set(p.x, p.y, p.z);
    pDummy.rotation.set(0, p.ry, 0);
    pDummy.scale.set(1, 1, 1);
    pDummy.updateMatrix();
    drawingMesh.setMatrixAt(i, pDummy.matrix);
  });
  drawingMesh.instanceMatrix.needsUpdate = true;
  group.add(drawingMesh);

  // ============================================================================
  // 5b. CAIXINHA DE MÚSICA ABERTA (sobre mesa de cabeceira no fundo do Quarto 02)
  // ============================================================================
  const nsBox = nightstandPositions[7];
  const musicBoxGroup = new THREE.Group();
  musicBoxGroup.position.set(nsBox.x, nsBox.topY, nsBox.z);
  musicBoxGroup.rotation.y = -Math.PI * 0.65;
  group.add(musicBoxGroup);

  const boxWoodMat = new THREE.MeshLambertMaterial({ color: 0x362218 });
  const velvetMat = new THREE.MeshLambertMaterial({ color: 0x5c181c });
  const brassMat = new THREE.MeshLambertMaterial({
    color: 0xb8963e,
    emissive: 0x1a1406,
  });
  const dancerMat = new THREE.MeshLambertMaterial({
    color: 0xc2b0a0,
    emissive: 0x120f0c,
  });

  // Base de madeira (0.24 x 0.09 x 0.17, apoiada em y = 0 sobre o tampo)
  const boxBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.088, 0.17), boxWoodMat);
  boxBase.position.set(0, 0.044, 0);
  musicBoxGroup.add(boxBase);

  // Forro interno vermelho-escuro + placa dourada do mecanismo
  const innerVelvet = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.008, 0.14), velvetMat);
  innerVelvet.position.set(0, 0.089, 0);
  musicBoxGroup.add(innerVelvet);

  const brassPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.038, 0.008, 12),
    brassMat
  );
  brassPlate.position.set(0, 0.095, 0);
  musicBoxGroup.add(brassPlate);

  // Mini bailarina estilizada low-poly que gira enquanto toca
  const ballerinaPivot = new THREE.Group();
  ballerinaPivot.position.set(0, 0.098, 0);
  musicBoxGroup.add(ballerinaPivot);

  const dancerGeo = mergeGeosTransformed([
    { geo: new THREE.CylinderGeometry(0.006, 0.006, 0.026, 6), y: 0.013 }, // Pernas
    { geo: new THREE.CylinderGeometry(0.009, 0.03, 0.012, 10), y: 0.028 }, // Tutu
    { geo: new THREE.CylinderGeometry(0.008, 0.007, 0.022, 6), y: 0.042 }, // Tronco
    { geo: new THREE.SphereGeometry(0.009, 8, 6), y: 0.06 }, // Cabeça
    { geo: new THREE.BoxGeometry(0.034, 0.005, 0.005), y: 0.056, rz: 0.35 }, // Braços erguidos
  ]);
  ballerinaPivot.add(new THREE.Mesh(dancerGeo, dancerMat));

  // Chave lateral de dar corda
  const keyPivot = new THREE.Group();
  keyPivot.position.set(0.122, 0.045, 0);
  const keyGeo = mergeGeosTransformed([
    { geo: new THREE.CylinderGeometry(0.005, 0.005, 0.026, 6), x: 0.012, rz: Math.PI / 2 },
    { geo: new THREE.BoxGeometry(0.006, 0.028, 0.016), x: 0.026 },
  ]);
  keyPivot.add(new THREE.Mesh(keyGeo, brassMat));
  musicBoxGroup.add(keyPivot);

  // Tampa articulada aberta (~105°) mostrando forro vermelho-escuro interno
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.088, -0.085);
  let lidAngle = -1.83;
  let lidTargetAngle = -1.83;
  lidPivot.rotation.x = lidAngle;
  musicBoxGroup.add(lidPivot);

  const lidOuter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.018, 0.17), boxWoodMat);
  lidOuter.position.set(0, 0.009, 0.085);
  lidPivot.add(lidOuter);

  const lidLining = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.004, 0.14), velvetMat);
  lidLining.position.set(0, -0.001, 0.085);
  lidPivot.add(lidLining);

  let musicBoxOpen = true;

  // ============================================================================
  // 6. PONTOS DE INSPEÇÃO & TOQUE PSICOLÓGICO SILENCIOSO
  // ============================================================================
  const inspectionPoints = [
    {
      id: 'teddy_q1',
      x: 11.9,
      z: -71.4,
      radius: 2.3,
      thought: 'Brinquedos... por que tem coisas de criança aqui?',
    },
    {
      id: 'shoes_q1',
      x: 11.8,
      z: -69.4,
      radius: 2.1,
      thought: 'Sapatos pequenos... alinhados como se alguém fosse voltar.',
    },
    {
      id: 'symbol_q1',
      x: 13.2,
      z: -73.8,
      radius: 2.4,
      thought: 'Riscos nervosos feitos às pressas... como se alguém estivesse em pânico aqui.',
    },
    {
      id: 'symbol_q2',
      x: 13.2,
      z: -48.8,
      radius: 2.4,
      thought: 'Traços desesperados por toda parte... quem esteve preso aqui?',
    },
    {
      id: 'toycar_q2',
      x: 13.8,
      z: -47.0,
      radius: 2.3,
      thought: 'Ninguém para perguntar se isso tudo realmente aconteceu...',
    },
  ];

  let subtleHallucinationTriggered = false;
  let intercomStaticCooldown = 0;

  function getInteractionPrompt(playerPos) {
    if (!doorOpen) {
      const distDoor = Math.hypot(playerPos.x - 4.85, playerPos.z - -59.8);
      if (distDoor < 2.65) {
        return { id: 'door', type: 'door', text: '[E] Abrir porta' };
      }
    }

    if (musicBoxOpen) {
      const distBox = Math.hypot(playerPos.x - nsBox.x, playerPos.z - nsBox.z);
      if (distBox < 1.8) {
        return { id: 'musicbox', type: 'musicbox', text: '[E] Fechar caixinha de música' };
      }
    }

    const distIntercom = Math.hypot(playerPos.x - 17.75, playerPos.z - -59.4);
    if (distIntercom < 2.45) {
      return { id: 'intercom', type: 'intercom', text: '[E] Usar interfone' };
    }

    for (let i = 0; i < inspectionPoints.length; i++) {
      const p = inspectionPoints[i];
      if (Math.hypot(playerPos.x - p.x, playerPos.z - p.z) < p.radius) {
        return { id: p.id, type: 'inspect', text: '[E] Inspecionar', thought: p.thought };
      }
    }

    return null;
  }

  function triggerInteraction(playerPos, audio, showThought) {
    const prompt = getInteractionPrompt(playerPos);
    if (!prompt) return false;

    if (prompt.type === 'door' && !doorOpen) {
      doorOpen = true;
      doorTargetAngle = Math.PI * 0.52;
      doorCollider.enabled = false;
      if (audio) audio.playDoorCreak();
      if (showThought) {
        showThought('A tranca cedeu... que lugar é esse?');
      }
      return true;
    }

    if (prompt.type === 'musicbox' && musicBoxOpen) {
      musicBoxOpen = false;
      lidTargetAngle = 0;
      if (audio) audio.stopMusicBox();
      if (showThought) {
        showThought('...Silêncio.');
      }
      return true;
    }

    if (prompt.type === 'intercom') {
      if (audio) audio.playIntercomStatic(1.15);
      if (showThought) {
        showThought('Só estática. Não há ninguém do outro lado.');
      }
      return true;
    }

    if (prompt.type === 'inspect' && showThought) {
      showThought(prompt.thought);
      return true;
    }

    return false;
  }

  function update(dt, playerPos, audio) {
    if (doorOpen && Math.abs(doorAngle - doorTargetAngle) > 0.002) {
      doorAngle = THREE.MathUtils.lerp(doorAngle, doorTargetAngle, 1 - Math.exp(-3.4 * dt));
      doorPivot.rotation.y = doorAngle;
    }

    // Animação da caixinha de música (bailarina + chave giram enquanto aberta; tampa fecha ao interagir)
    if (Math.abs(lidAngle - lidTargetAngle) > 0.002) {
      lidAngle = THREE.MathUtils.lerp(lidAngle, lidTargetAngle, 1 - Math.exp(-9.0 * dt));
      lidPivot.rotation.x = lidAngle;
    }
    if (musicBoxOpen) {
      ballerinaPivot.rotation.y += 1.85 * dt;
      keyPivot.rotation.x += 0.9 * dt;
    }
    if (audio) {
      const distBox = Math.hypot(playerPos.x - nsBox.x, playerPos.z - nsBox.z);
      audio.updateMusicBox(dt, distBox, musicBoxOpen);
    }

    const distIntercom = Math.hypot(playerPos.x - 17.75, playerPos.z - -59.4);
    if (distIntercom < 4.2 && audio) {
      intercomStaticCooldown -= dt;
      if (intercomStaticCooldown <= 0) {
        intercomStaticCooldown = 3.5 + Math.random() * 2.5;
        audio.playHallucinationStinger(true);
      }
    }

    if (!subtleHallucinationTriggered && playerPos.x > 9.5 && playerPos.z > -48.2) {
      subtleHallucinationTriggered = true;
      wheelchair.rotation.y += 0.62;
      wheelchair.position.set(12.2, 0, -61.2);
      wheelchairCollider.minX = 12.2 - 0.41;
      wheelchairCollider.maxX = 12.2 + 0.41;
      wheelchairCollider.minZ = -61.2 - 0.41;
      wheelchairCollider.maxZ = -61.2 + 0.41;

      fadedBall.position.set(13.0, 0.14, -67.6);
    }
  }

  return {
    group,
    getInteractionPrompt,
    triggerInteraction,
    update,
  };
}
