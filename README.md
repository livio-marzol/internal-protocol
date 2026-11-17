# Protocolo Interno

Experiência interativa de exploração e terror psicológico em **Three.js** + **Vite**, otimizada para GPUs integradas (AMD Ryzen 5 4600G / Radeon Vega 7).

## Recursos

- **Atmosfera e Otimização WebGL:** Neblina exponencial (`FogExp2`), `ACESFilmicToneMapping`, iluminação em `MeshLambertMaterial` com mesclagem de geometrias estáticas (`mergeGeometries`) e `InstancedMesh`, escala de renderização `0.82` e apenas a lanterna projetando sombra (`PCFShadowMap` `512x512`).
- **Personagem e Lanterna (`FBX / Mixamo`):** Malha e esqueleto carregados sem duplicação de VRAM, animações `In Place` com `crossFadeTo`, mira vertical contínua pelo mouse (`Spine2`, `Head`, `LeftArm`, `LeftForeArm`, `LeftHand`) e lanterna angular com atenuação adaptativa de curta distância via `Raycaster`.
- **Progressão Contínua em 5 Zonas:** Beco externo → Corredor clínico com avisos psicológicos → Laboratório violado → Salão do Hospital Psiquiátrico → Quartos de internação (`01` e `02`).
- **Áudio Procedural (`Web Audio API`):** Vento frio, zumbidos ambientais por zona, estática de interfone, dobradiça da porta, passos, clique da lanterna e caixinha de música à corda em Lá menor com eco espacial.

## Controles

- `WASD` — Mover
- `Mouse` — Mirar / Girar (clique na tela para ativar o Pointer Lock)
- `Botão Esquerdo` / `F` — Ligar / Desligar lanterna
- `Botão Direito` (segurar) — Foco / Inspeção com a lanterna
- `E` — Interagir (abrir porta, usar interfone, inspecionar, fechar caixinha de música)
- `H` — Alternar modo Normal / Ferido
- `M` — Mutar / Desmutar áudio procedural

## Como Executar

```bash
npm install
npm run dev
```
