// Áudio procedural leve via Web Audio API (vento, zumbido de corredor/lab, estática sutil e gotejamento)

// Valsa melancólica lenta em Lá menor (compasso 3/4, 0 = pausa breve)
const MUSIC_BOX_WALTZ = [
  880.0, 1046.5, 1318.5,
  1174.66, 1046.5, 987.77,
  880.0, 987.77, 1046.5,
  987.77, 830.61, 659.25,
  880.0, 1046.5, 1318.5,
  1396.91, 1318.5, 1174.66,
  1046.5, 987.77, 880.0,
  830.61, 659.25, 0,
];

export class ProceduralAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.windGain = null;
    this.droneGain = null;
    this.corridorHumGain = null;
    this.labHumGain = null;
    this.noiseBuffer = null;

    this.musicBoxMasterGain = null;
    this.musicBoxDryGain = null;
    this.musicBoxWetGain = null;
    this.musicBoxStepAccum = 0;
    this.musicBoxNoteIdx = 0;
    this.musicBoxStopped = false;

    this.initialized = false;
    this.muted = false;
    this.stepCooldown = 0;
    this.dripCooldown = 1.8;
    this.currentZone = 1;
  }

  unlock() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.78;
    this.masterGain.connect(this.ctx.destination);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.0;
    this.ambientGain.connect(this.masterGain);

    this._createNoiseBuffer();
    this._setupAmbientDrone();
    this._setupColdWind();
    this._setupCorridorHum();
    this._setupLabBuzz();
    this._setupMusicBoxBus();

    const now = this.ctx.currentTime;
    this.ambientGain.gain.setValueAtTime(0.0, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.48, now + 2.2);

    this.initialized = true;
  }

  _createNoiseBuffer() {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
    }
  }

  _setupAmbientDrone() {
    const ctx = this.ctx;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 51.5;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 52.3;

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 135;
    droneFilter.Q.value = 3.2;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 45;
    lfo.connect(lfoGain);
    lfoGain.connect(droneFilter.frequency);

    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.15;

    osc1.connect(droneFilter);
    osc2.connect(droneFilter);
    droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.ambientGain);

    osc1.start();
    osc2.start();
    lfo.start();
  }

  _setupColdWind() {
    const ctx = this.ctx;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 310;
    windFilter.Q.value = 1.8;

    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.value = 0.11;

    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 120;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.24;

    noise.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.ambientGain);

    noise.start();
    windLfo.start();
  }

  _setupCorridorHum() {
    const ctx = this.ctx;

    // Zumbido clínico de reator fluorescente (60Hz + 120Hz)
    const osc60 = ctx.createOscillator();
    osc60.type = 'sine';
    osc60.frequency.value = 60;

    const osc120 = ctx.createOscillator();
    osc120.type = 'triangle';
    osc120.frequency.value = 120;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;

    this.corridorHumGain = ctx.createGain();
    this.corridorHumGain.gain.value = 0.0;

    osc60.connect(filter);
    osc120.connect(filter);
    filter.connect(this.corridorHumGain);
    this.corridorHumGain.connect(this.ambientGain);

    osc60.start();
    osc120.start();
  }

  _setupLabBuzz() {
    const ctx = this.ctx;

    // Zumbido elétrico mais tenso do laboratório (92Hz + 184.6Hz modulados)
    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = 92;

    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 184.6;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 165;
    filter.Q.value = 2.4;

    this.labHumGain = ctx.createGain();
    this.labHumGain.gain.value = 0.0;

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(this.labHumGain);
    this.labHumGain.connect(this.ambientGain);

    oscA.start();
    oscB.start();
  }

  updateZoneAtmosphere(dt, zone) {
    this.currentZone = zone;

    if (this.initialized && this.ctx && !this.muted) {
      const now = this.ctx.currentTime;
      const tau = 0.85;

      if (zone === 1) {
        this.windGain.gain.setTargetAtTime(0.24, now, tau);
        this.droneGain.gain.setTargetAtTime(0.15, now, tau);
        this.corridorHumGain.gain.setTargetAtTime(0.0, now, tau);
        this.labHumGain.gain.setTargetAtTime(0.0, now, tau);
      } else if (zone === 2) {
        this.windGain.gain.setTargetAtTime(0.03, now, tau);
        this.droneGain.gain.setTargetAtTime(0.18, now, tau);
        this.corridorHumGain.gain.setTargetAtTime(0.085, now, tau);
        this.labHumGain.gain.setTargetAtTime(0.015, now, tau);
      } else if (zone === 3) {
        this.windGain.gain.setTargetAtTime(0.01, now, tau);
        this.droneGain.gain.setTargetAtTime(0.22, now, tau);
        this.corridorHumGain.gain.setTargetAtTime(0.05, now, tau);
        this.labHumGain.gain.setTargetAtTime(0.11, now, tau);
      } else {
        // Zonas 4 e 5 (Hospital Psiquiátrico): silêncio opressivo com zumbido grave distante
        this.windGain.gain.setTargetAtTime(0.04, now, tau);
        this.droneGain.gain.setTargetAtTime(0.2, now, tau);
        this.corridorHumGain.gain.setTargetAtTime(0.035, now, tau);
        this.labHumGain.gain.setTargetAtTime(0.025, now, tau);
      }
    }

    // Gotejamento metálico sutil apenas dentro do quarto final (Zona 3)
    if (zone === 3) {
      this.dripCooldown -= dt;
      if (this.dripCooldown <= 0) {
        this.dripCooldown = 2.2 + Math.random() * 2.6;
        this._playMetallicDrip();
      }
    }
  }

  _playMetallicDrip() {
    if (!this.initialized || this.muted || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const f = 1350 + Math.random() * 480;
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.45, now + 0.045);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playDoorCreak() {
    if (!this.initialized || this.muted || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Estalo metálico da tranca
    const lockOsc = ctx.createOscillator();
    lockOsc.type = 'square';
    lockOsc.frequency.setValueAtTime(320, now);
    lockOsc.frequency.exponentialRampToValueAtTime(95, now + 0.06);

    const lockGain = ctx.createGain();
    lockGain.gain.setValueAtTime(0.18, now);
    lockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    lockOsc.connect(lockGain);
    lockGain.connect(this.masterGain);
    lockOsc.start(now);
    lockOsc.stop(now + 0.08);

    // Rangido lento da dobradiça pesada
    const creakOsc = ctx.createOscillator();
    creakOsc.type = 'sawtooth';
    creakOsc.frequency.setValueAtTime(145, now + 0.08);
    creakOsc.frequency.linearRampToValueAtTime(215, now + 0.48);
    creakOsc.frequency.linearRampToValueAtTime(162, now + 1.05);

    const creakFilter = ctx.createBiquadFilter();
    creakFilter.type = 'bandpass';
    creakFilter.frequency.value = 640;
    creakFilter.Q.value = 4.5;

    const creakGain = ctx.createGain();
    creakGain.gain.setValueAtTime(0.001, now + 0.08);
    creakGain.gain.linearRampToValueAtTime(0.14, now + 0.24);
    creakGain.gain.linearRampToValueAtTime(0.07, now + 0.72);
    creakGain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    creakOsc.connect(creakFilter);
    creakFilter.connect(creakGain);
    creakGain.connect(this.masterGain);
    creakOsc.start(now + 0.08);
    creakOsc.stop(now + 1.18);
  }

  playIntercomStatic(duration = 1.1) {
    if (!this.initialized || this.muted || !this.ctx || !this.noiseBuffer) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Clique do botão do interfone
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1280, now);
    clickOsc.frequency.exponentialRampToValueAtTime(420, now + 0.03);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.24, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);
    clickOsc.start(now);
    clickOsc.stop(now + 0.045);

    // Chiado vazio de estática sem resposta
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1850;
    bp.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now + 0.04);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.09);
    gain.gain.setValueAtTime(0.14, now + duration - 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.masterGain);
    src.start(now + 0.04);
    src.stop(now + duration + 0.02);
  }

  playHallucinationStinger(isStatic = false) {
    if (!this.initialized || this.muted || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Zumbido grave sutil
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isStatic ? 62 : 48, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.45);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.14, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.5);

    // Chiado curto de estática quase subliminar
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = isStatic ? 2400 : 1400;
      bp.Q.value = 1.4;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(isStatic ? 0.09 : 0.05, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      src.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.masterGain);
      src.start(now);
      src.stop(now + 0.15);
    }
  }

  playFlashlightClick(isOn) {
    if (!this.initialized || this.muted || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isOn ? 1450 : 1120, now);
    osc.frequency.exponentialRampToValueAtTime(isOn ? 460 : 320, now + 0.032);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.28, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(clickGain);
    clickGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  updateFootstep(dt, isMoving, injured) {
    if (!isMoving) {
      this.stepCooldown = 0.12;
      return;
    }
    this.stepCooldown -= dt;
    if (this.stepCooldown <= 0) {
      this.stepCooldown = injured ? 0.68 : 0.46;
      this._playStep(injured);
    }
  }

  _playStep(injured) {
    if (!this.initialized || this.muted || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const baseFreq = injured ? 72 : 90;
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 14, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(injured ? 0.09 : 0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  _setupMusicBoxBus() {
    const ctx = this.ctx;

    this.musicBoxMasterGain = ctx.createGain();
    this.musicBoxMasterGain.gain.value = 0.0;
    this.musicBoxMasterGain.connect(this.masterGain);

    this.musicBoxDryGain = ctx.createGain();
    this.musicBoxDryGain.gain.value = 0.45;
    this.musicBoxDryGain.connect(this.musicBoxMasterGain);

    this.musicBoxWetGain = ctx.createGain();
    this.musicBoxWetGain.gain.value = 0.75;

    // Eco de corredor/quartos vazios: Delay 0.28s + Lowpass + Feedback ~0.28
    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.28;

    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 1850;

    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;

    this.musicBoxWetGain.connect(delay);
    delay.connect(echoFilter);
    echoFilter.connect(this.musicBoxMasterGain);
    echoFilter.connect(feedback);
    feedback.connect(delay);
  }

  updateMusicBox(dt, distance, isOpen) {
    if (!this.initialized || !this.ctx || !this.musicBoxMasterGain) return;

    const now = this.ctx.currentTime;
    if (!isOpen || this.musicBoxStopped || distance > 22 || this.muted) {
      this.musicBoxMasterGain.gain.setTargetAtTime(0.0, now, 0.06);
      return;
    }

    // Atenuação espacial suave (22m -> 2m) e ajuste de proporção seco/eco ao entrar no quarto
    const prox = Math.min(1, Math.max(0, 1 - (distance - 2.0) / 20.0));
    const vol = (0.04 + prox * prox * 0.44);
    this.musicBoxMasterGain.gain.setTargetAtTime(vol, now, 0.08);

    const roomClose = Math.min(1, Math.max(0, 1 - (distance - 2.0) / 8.0));
    this.musicBoxDryGain.gain.setTargetAtTime(0.32 + roomClose * 0.6, now, 0.1);
    this.musicBoxWetGain.gain.setTargetAtTime(0.88 - roomClose * 0.56, now, 0.1);

    // Agendamento leve via acumulador de tempo (compasso lento ~0.48s por nota)
    this.musicBoxStepAccum += dt;
    if (this.musicBoxStepAccum >= 0.48) {
      this.musicBoxStepAccum -= 0.48;
      const freq = MUSIC_BOX_WALTZ[this.musicBoxNoteIdx];
      this.musicBoxNoteIdx = (this.musicBoxNoteIdx + 1) % MUSIC_BOX_WALTZ.length;
      if (freq > 0) {
        this._playMusicBoxTine(freq);
      }
    }
  }

  _playMusicBoxTine(freq) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Lâmina metálica principal com leve desafinação nostálgica de caixinha antiga
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 14;

    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(0.34, now + 0.012);
    noteGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.78);

    osc.connect(noteGain);
    noteGain.connect(this.musicBoxDryGain);
    noteGain.connect(this.musicBoxWetGain);
    osc.start(now);
    osc.stop(now + 0.8);

    // Harmônico metálico sutil e curto no ataque (~18ms)
    const ping = ctx.createOscillator();
    ping.type = 'sine';
    ping.frequency.value = freq * 2.98;

    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0.11, now);
    pingGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.022);

    ping.connect(pingGain);
    pingGain.connect(this.musicBoxDryGain);
    ping.start(now);
    ping.stop(now + 0.028);
  }

  stopMusicBox() {
    this.musicBoxStopped = true;
    if (!this.initialized || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (this.musicBoxMasterGain) {
      this.musicBoxMasterGain.gain.setTargetAtTime(0.0, now, 0.01);
    }

    if (this.muted) return;

    // Clique seco mecânico da tampa fechando
    const clack = ctx.createOscillator();
    clack.type = 'triangle';
    clack.frequency.setValueAtTime(420, now);
    clack.frequency.exponentialRampToValueAtTime(95, now + 0.045);

    const clackGain = ctx.createGain();
    clackGain.gain.setValueAtTime(0.3, now);
    clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    clack.connect(clackGain);
    clackGain.connect(this.masterGain);
    clack.start(now);
    clack.stop(now + 0.06);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.78, this.ctx.currentTime, 0.05);
    }
    return !this.muted;
  }

  isAudioActive() {
    return this.initialized && !this.muted;
  }
}
