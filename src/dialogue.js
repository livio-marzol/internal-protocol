// Sistema leve de diálogos internos cadenciados (múltiplos tempos + fila sequencial)

export function createDialogueManager(thoughtBox) {
  let elapsed = 0;
  let stepTimer = 0;
  let stepIndex = 0;
  let currentItem = null;
  const queue = [];

  const triggered = {
    intro: false,
    alleyBeacon: false,
    corridorSigns: false,
  };

  function applyCurrentStep() {
    if (!thoughtBox) return;
    if (!currentItem || stepIndex >= currentItem.steps.length) {
      currentItem = null;
      stepIndex = 0;
      stepTimer = 0;
      thoughtBox.classList.add('hidden');
      return;
    }

    const step = currentItem.steps[stepIndex];
    stepTimer = step.duration;

    if (step.text) {
      thoughtBox.textContent = `"${step.text}"`;
      thoughtBox.classList.remove('hidden');
    } else {
      thoughtBox.classList.add('hidden');
    }
  }

  function startNextFromQueue() {
    if (queue.length === 0) {
      currentItem = null;
      stepIndex = 0;
      stepTimer = 0;
      if (thoughtBox) thoughtBox.classList.add('hidden');
      return;
    }
    currentItem = queue.shift();
    stepIndex = 0;
    applyCurrentStep();
  }

  function enqueueNarrative(ownerId, steps) {
    const hasNarrativeActiveOrQueued =
      (currentItem && currentItem.isNarrative) || queue.some((q) => q.isNarrative);

    const itemSteps = hasNarrativeActiveOrQueued
      ? [{ text: null, duration: 1.5 }, ...steps]
      : [...steps];

    const entry = { ownerId, isNarrative: true, steps: itemSteps };
    if (!currentItem) {
      currentItem = entry;
      stepIndex = 0;
      applyCurrentStep();
    } else {
      queue.push(entry);
    }
  }

  function show(text, duration = 4.5, ownerId = null) {
    if (!thoughtBox || !text) return;

    const entry = {
      ownerId,
      isNarrative: false,
      steps: [{ text, duration }],
    };

    // Não atropela diálogos principais narrativos: entra na fila após o término
    if (currentItem && currentItem.isNarrative) {
      // Evita duplicar a mesma inspeção na fila
      if (!queue.some((q) => q.ownerId === ownerId)) {
        queue.push(entry);
      }
      return;
    }

    // Se outra legenda curta/inspeção estava ativa, substitui diretamente
    currentItem = entry;
    stepIndex = 0;
    applyCurrentStep();
  }

  function clearIfOwner(ownerId) {
    if (!thoughtBox || !ownerId) return;

    // Remove da fila caso esteja aguardando
    for (let i = queue.length - 1; i >= 0; i--) {
      if (!queue[i].isNarrative && queue[i].ownerId === ownerId) {
        queue.splice(i, 1);
      }
    }

    if (currentItem && !currentItem.isNarrative && currentItem.ownerId === ownerId) {
      startNextFromQueue();
    }
  }

  function update(dt, playerPos) {
    elapsed += dt;

    // Diálogo 1 (~1.2s após carregar a cena)
    if (!triggered.intro && elapsed >= 1.2) {
      triggered.intro = true;
      enqueueNarrative('narrative_intro', [
        { text: 'Ok... onde eu estou?', duration: 3.0 },
        { text: null, duration: 0.9 },
        { text: 'Isso é real... ou é minha cabeça pregando mais uma peça?...', duration: 4.2 },
      ]);
    }

    // Diálogo 2 (caminhando na área externa em direção à luz branca ao fundo)
    if (!triggered.alleyBeacon && playerPos.x < 4.5 && playerPos.z <= -1.0) {
      triggered.alleyBeacon = true;
      enqueueNarrative('narrative_beacon', [
        { text: 'Ok... o que é essa luz?', duration: 2.8 },
        { text: null, duration: 0.9 },
        {
          text: 'Eu sinto que não deveria ir até lá... mas que escolha eu tenho, afinal...',
          duration: 4.5,
        },
      ]);
    }

    // Diálogo 3 (após passar pelos avisos de vírus/contenção no corredor iluminado)
    if (!triggered.corridorSigns && playerPos.x < 4.5 && playerPos.z <= -40.5) {
      triggered.corridorSigns = true;
      enqueueNarrative('narrative_corridor', [
        { text: 'Ok, Cesar...', duration: 2.4 },
        { text: null, duration: 0.7 },
        { text: 'Isso está ficando fora de controle.', duration: 3.8 },
      ]);
    }

    if (currentItem) {
      stepTimer -= dt;
      if (stepTimer <= 0) {
        stepIndex += 1;
        if (stepIndex < currentItem.steps.length) {
          applyCurrentStep();
        } else {
          startNextFromQueue();
        }
      }
    }
  }

  return {
    show,
    clearIfOwner,
    update,
  };
}
