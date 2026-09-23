/**
 * Standalone DOM player. Keep every helper inside this function: its source is
 * also embedded in the downloadable HTML, without a module loader or runtime.
 */
export function createStoryPlayer(host, story, options = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView || window;
  const editing = options.mode === 'edit';
  const assets = new Map(story.assets.map(asset => [asset.id, asset]));
  const rules = story.rules || [];
  const original = story.layers || [];
  const nodes = new Map();
  const states = new Map();
  const completed = new Set();
  const running = new Set();
  const timers = new Set();
  const sounds = new Set();
  const listeners = [];
  let enabledSound = options.sound !== false;
  let finished = false;
  let destroyed = false;
  let generation = 0;
  let pointer = null;
  let selected = null;
  let narration = null;

  const root = doc.createElement('div');
  root.className = `story-player${editing ? ' story-player--edit' : ''}`;
  root.setAttribute('aria-label', story.title || '互动故事');
  root.setAttribute('role', 'group');
  const stage = doc.createElement('div');
  stage.className = 'story-player__stage';
  root.append(stage);
  host.replaceChildren(root);

  function clamp(value, low = 0, high = 1) {
    return Math.min(high, Math.max(low, Number(value) || 0));
  }
  function listen(element, type, handler, settings) {
    element.addEventListener(type, handler, settings);
    listeners.push(() => element.removeEventListener(type, handler, settings));
  }
  function notice(text) {
    if (!destroyed) options.onNotice?.(text);
  }
  function isVisible(id) {
    const state = states.get(id);
    return !!state && state.visible !== false && state.opacity > 0;
  }
  function availableRules() {
    if (finished || destroyed || editing) return [];
    return rules.filter(rule => !running.has(rule.id)
      && !(rule.once !== false && completed.has(rule.id))
      && (rule.requires || []).every(id => completed.has(id))
      && isVisible(rule.trigger.source)
      && (rule.trigger.type !== 'drop' || isVisible(rule.trigger.target)));
  }
  function hint() {
    if (editing) return '点选图层，拖动来改变位置。也可以用方向键微调。';
    if (finished) return story.ending?.message || '这一段故事，已经由你完成。';
    const next = availableRules()[0];
    if (next) return next.hint || `试试：${next.name || '下一步'}`;
    if (running.size) return '画面正在回应你，请稍等片刻。';
    return completed.size === rules.length
      ? '这些动作已经完成，可以重新体验。'
      : '暂时没有可执行的动作，可以重新体验或检查故事设置。';
  }
  function progress() {
    if (destroyed) return;
    updateAccessibility();
    options.onProgress?.({
      completed: rules.filter(rule => completed.has(rule.id)).map(rule => rule.id),
      available: availableRules().map(rule => rule.id),
      finished,
      hint: hint(),
    });
  }
  function updateAccessibility() {
    const available = new Set(availableRules().map(rule => rule.id));
    for (const layer of original) {
      const element = nodes.get(layer.id);
      const sourceRules = rules.filter(rule => rule.trigger.source === layer.id);
      const interactive = editing || sourceRules.length > 0;
      const visible = editing || isVisible(layer.id);
      const ready = sourceRules.some(rule => available.has(rule.id));
      element.tabIndex = visible && interactive ? 0 : -1;
      element.setAttribute('aria-hidden', visible ? 'false' : 'true');
      if (interactive) {
        element.setAttribute('role', 'button');
        const next = sourceRules.find(rule => available.has(rule.id));
        const description = editing ? '可拖动，方向键可微调' : next?.hint;
        element.setAttribute('aria-label', [layer.name || '图层', description].filter(Boolean).join('，'));
        element.setAttribute('aria-disabled', !editing && !ready ? 'true' : 'false');
      } else {
        element.removeAttribute('role');
        element.removeAttribute('aria-disabled');
      }
      element.classList.toggle('is-available', !editing && ready);
      element.classList.toggle('is-selected', editing && selected === layer.id);
      element.style.pointerEvents = visible && interactive ? 'auto' : 'none';
    }
  }
  function renderLayer(id) {
    const state = states.get(id);
    const element = nodes.get(id);
    if (!state || !element) return;
    const visible = state.visible !== false;
    element.style.left = `${state.x * 100}%`;
    element.style.top = `${state.y * 100}%`;
    element.style.width = `${state.width * 100}%`;
    element.style.height = `${state.height * 100}%`;
    element.style.transform = `translate(-50%, -50%) rotate(${Number(state.rotation) || 0}deg)`;
    element.style.opacity = String(editing ? Math.max(0.24, visible ? state.opacity : state.opacity * 0.4) : visible ? state.opacity : 0);
    element.classList.toggle('is-hidden-layer', !visible || state.opacity === 0);
    if (state.kind === 'text') element.firstElementChild.textContent = state.text || '';
    if (state.kind === 'image') {
      element.firstElementChild.style.objectFit = state.fit === 'contain' ? 'contain' : 'cover';
      // Preserve the authored crop from the 16:10 composition on narrow stages.
      element.style.setProperty('--photo-aspect', String(state.width * 1.6 / state.height));
    }
  }
  function stopNarration() {
    if (narration) {
      narration.onend = null;
      narration.onerror = null;
      win.speechSynthesis?.cancel();
      narration = null;
    }
  }
  function releaseSound(entry) {
    entry.audio.onended = null;
    entry.audio.onerror = null;
    entry.audio.pause();
    entry.audio.removeAttribute('src');
    entry.audio.load();
    entry.audio.remove();
    sounds.delete(entry);
  }
  function stopSounds(assetId) {
    for (const entry of [...sounds]) {
      if (!assetId || entry.assetId === assetId) releaseSound(entry);
    }
  }
  function playAudio(action) {
    if (!enabledSound) return;
    const asset = assets.get(action.assetId);
    if (!asset || asset.kind !== 'audio') {
      notice('这一段声音素材不可用，其他互动仍可继续。');
      return;
    }
    // Each action owns an independent media element; different tracks may overlap.
    const audio = new win.Audio(asset.src);
    audio.controls = false;
    audio.setAttribute('aria-label', asset.name || '故事声音');
    audio.dataset.assetId = asset.id;
    const entry = { audio, assetId: asset.id };
    const currentGeneration = generation;
    audio.volume = action.volume === undefined ? 0.8 : clamp(action.volume);
    audio.loop = action.loop === true;
    sounds.add(entry);
    root.append(audio);
    audio.onended = () => releaseSound(entry);
    audio.onerror = () => {
      if (!destroyed && currentGeneration === generation) notice('这段声音未能播放，请检查文件或浏览器的音频支持。');
      releaseSound(entry);
    };
    const request = audio.play();
    request?.catch(() => {
      if (sounds.has(entry)) releaseSound(entry);
      if (!destroyed && currentGeneration === generation && enabledSound) notice('浏览器暂未允许播放声音。可重新体验，或检查浏览器的声音设置。');
    });
  }
  function narrate(action) {
    if (!enabledSound) return;
    const synthesis = win.speechSynthesis;
    const voice = synthesis?.getVoices().find(item => /^zh(?:-|_)?/i.test(item.lang));
    if (!synthesis || !win.SpeechSynthesisUtterance || !voice) {
      notice('当前设备没有可用的中文系统声音，文字仍可阅读。创作者也可以加入自己的录音。');
      return;
    }
    const text = action.text || states.get(action.target)?.text || '';
    if (!text.trim()) return;
    stopNarration();
    const utterance = new win.SpeechSynthesisUtterance(text);
    const currentGeneration = generation;
    narration = utterance;
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.88;
    utterance.volume = action.volume === undefined ? 1 : clamp(action.volume);
    utterance.onend = () => { if (narration === utterance) narration = null; };
    utterance.onerror = event => {
      if (narration === utterance) narration = null;
      if (!destroyed && currentGeneration === generation && !['canceled', 'interrupted'].includes(event.error)) notice('系统朗读暂时不可用，可以继续阅读画面文字。');
    };
    synthesis.speak(utterance);
  }
  function perform(action) {
    const state = states.get(action.target);
    if (action.type === 'show' && state) { state.visible = true; renderLayer(state.id); }
    else if (action.type === 'hide' && state) { state.visible = false; renderLayer(state.id); }
    else if (action.type === 'move' && state) {
      if (Number.isFinite(action.x)) state.x = clamp(action.x);
      if (Number.isFinite(action.y)) state.y = clamp(action.y);
      renderLayer(state.id);
    } else if (action.type === 'text' && state) {
      state.text = String(action.text ?? '');
      renderLayer(state.id);
    } else if (action.type === 'audio') playAudio(action);
    else if (action.type === 'stopAudio') stopSounds(action.assetId || action.target);
    else if (action.type === 'narrate') narrate(action);
    else if (action.type === 'finish') finished = true;
  }
  function activateRule(ruleId) {
    if (destroyed || editing || finished) return false;
    const available = availableRules();
    const rule = ruleId ? available.find(item => item.id === ruleId) : available[0];
    if (!rule) { notice(hint()); return false; }
    running.add(rule.id);
    progress();
    const epoch = generation;
    const actions = rule.actions || [];
    let remaining = actions.length;
    function complete() {
      if (destroyed || epoch !== generation) return;
      running.delete(rule.id);
      completed.add(rule.id);
      progress();
    }
    if (!remaining) { complete(); return true; }
    for (const action of actions) {
      const execute = () => {
        if (destroyed || epoch !== generation) return;
        try { perform(action); }
        catch { notice('这个动作暂时未能完整播放，其他互动可以继续。'); }
        remaining -= 1;
        if (!remaining) complete();
        else progress();
      };
      const delay = Math.max(0, Number(action.delay) || 0);
      if (!delay) execute();
      else {
        const timer = win.setTimeout(() => { timers.delete(timer); execute(); }, delay);
        timers.add(timer);
      }
    }
    return true;
  }
  function selectLayer(id) {
    if (destroyed || !editing || (id != null && !states.has(id))) return false;
    selected = id ?? null;
    updateAccessibility();
    return true;
  }
  function activateLayer(id) {
    if (editing) {
      if (selectLayer(id)) options.onSelect?.(id);
      return;
    }
    const rule = availableRules().find(item => item.trigger.source === id);
    if (rule) activateRule(rule.id);
    else notice(hint());
  }
  function resetGesture(restore = true) {
    if (!pointer) return;
    const previous = pointer;
    pointer = null;
    const element = nodes.get(previous.id);
    element.classList.remove('is-dragging');
    if (restore) {
      Object.assign(states.get(previous.id), previous.original);
      renderLayer(previous.id);
    }
    if (element.hasPointerCapture?.(previous.pointerId)) element.releasePointerCapture(previous.pointerId);
    for (const node of nodes.values()) node.classList.remove('is-drop-target');
  }
  function pointerDown(event, id) {
    if (destroyed || (event.button !== undefined && event.button !== 0) || pointer) return;
    const element = nodes.get(id);
    const state = states.get(id);
    const rule = availableRules().find(item => item.trigger.source === id && ['swipe', 'drop'].includes(item.trigger.type));
    pointer = {
      id, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY,
      original: { x: state.x, y: state.y, opacity: state.opacity },
      rule, moved: false, dx: 0, dy: 0, width: Math.max(1, element.getBoundingClientRect().width),
    };
    if (editing) activateLayer(id);
    if (editing || rule) {
      event.preventDefault();
      element.classList.add('is-dragging');
      element.setPointerCapture?.(event.pointerId);
      if (rule?.trigger.type === 'drop') nodes.get(rule.trigger.target)?.classList.add('is-drop-target');
    }
  }
  function pointerMove(event, id) {
    if (!pointer || pointer.id !== id || pointer.pointerId !== event.pointerId) return;
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.dx = event.clientX - pointer.clientX;
    pointer.dy = event.clientY - pointer.clientY;
    if (Math.hypot(pointer.dx, pointer.dy) > 4) pointer.moved = true;
    if (!editing && !pointer.rule) return;
    const state = states.get(id);
    state.x = clamp(pointer.original.x + pointer.dx / bounds.width);
    if (editing || pointer.rule.trigger.type === 'drop') state.y = clamp(pointer.original.y + pointer.dy / bounds.height);
    if (!editing && pointer.rule.trigger.type === 'swipe') state.opacity = pointer.original.opacity * (1 - clamp(Math.abs(pointer.dx) / (pointer.width * 0.75)));
    renderLayer(id);
  }
  function overlaps(source, target) {
    if (!source || !target) return false;
    const a = source.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const area = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const share = area / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
    const distance = Math.hypot((a.left + a.right - b.left - b.right) / 2, (a.top + a.bottom - b.top - b.bottom) / 2);
    return share >= 0.15 || distance <= Math.max(30, Math.min(b.width, b.height) * 0.58);
  }
  function pointerUp(event, id) {
    if (!pointer || pointer.id !== id || pointer.pointerId !== event.pointerId) return;
    const gesture = pointer;
    const state = states.get(id);
    if (editing) {
      const position = { x: state.x, y: state.y };
      resetGesture(false);
      if (gesture.moved) options.onPosition?.(id, position);
      return;
    }
    if (!gesture.moved) {
      resetGesture(true);
      const clickRule = availableRules().find(rule => rule.trigger.source === id && rule.trigger.type === 'click');
      if (clickRule) activateRule(clickRule.id);
      else notice(gesture.rule?.hint || hint());
      return;
    }
    const rule = gesture.rule;
    const success = rule?.trigger.type === 'swipe'
      ? Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) / gesture.width >= 0.1
      : rule?.trigger.type === 'drop' && overlaps(nodes.get(id), nodes.get(rule.trigger.target));
    // Return swipe opacity to the authored value before the rule's show/hide actions.
    // These DOM writes occur in one frame, so the transition continues naturally.
    resetGesture(rule?.trigger.type !== 'drop' || !success);
    if (success) activateRule(rule.id);
    else if (rule) notice(rule.hint || hint());
  }

  // Authored array order is the stacking order, including full-frame images.
  for (const [index, layer] of original.entries()) {
    const element = doc.createElement('div');
    element.className = `story-player__layer story-player__layer--${layer.kind}`;
    if (layer.kind === 'image' && layer.fit === 'cover' && layer.width < 0.7 && layer.height < 0.7) element.classList.add('is-photo');
    element.dataset.layerId = layer.id;
    element.style.zIndex = String(index + 1);
    if (layer.kind === 'image') {
      const image = doc.createElement('img');
      image.src = assets.get(layer.assetId)?.src || '';
      image.alt = '';
      image.draggable = false;
      listen(image, 'error', () => notice(`图片“${layer.name || '未命名图层'}”未能载入。`));
      element.append(image);
    } else {
      const content = doc.createElement('span');
      content.className = 'story-player__layer-text';
      content.textContent = layer.kind === 'text' ? layer.text || '' : editing ? layer.name || '互动区域' : '';
      element.append(content);
    }
    listen(element, 'pointerdown', event => pointerDown(event, layer.id));
    listen(element, 'pointermove', event => pointerMove(event, layer.id));
    listen(element, 'pointerup', event => pointerUp(event, layer.id));
    listen(element, 'pointercancel', () => resetGesture(true));
    listen(element, 'lostpointercapture', () => { if (pointer?.id === layer.id) resetGesture(true); });
    listen(element, 'click', event => {
      // Screen-reader activation and element.click() have no pointer gesture.
      if (event.detail === 0) activateLayer(layer.id);
    });
    listen(element, 'keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateLayer(layer.id);
      } else if (editing && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const state = states.get(layer.id);
        const step = event.shiftKey ? 0.05 : 0.01;
        const direction = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
        state.x = clamp(state.x + direction[0]);
        state.y = clamp(state.y + direction[1]);
        renderLayer(layer.id);
        options.onPosition?.(layer.id, { x: state.x, y: state.y });
      }
    });
    nodes.set(layer.id, element);
    stage.append(element);
  }
  listen(win, 'pointerup', event => {
    if (pointer?.pointerId === event.pointerId) pointerUp(event, pointer.id);
  });
  listen(win, 'blur', () => resetGesture(true));

  function cancelPlayback() {
    generation += 1;
    for (const timer of timers) win.clearTimeout(timer);
    timers.clear();
    stopSounds();
    stopNarration();
    resetGesture(true);
  }
  function reset() {
    if (destroyed) return;
    cancelPlayback();
    completed.clear();
    running.clear();
    finished = false;
    root.classList.add('is-resetting');
    for (const layer of original) {
      states.set(layer.id, { ...layer, opacity: layer.opacity === undefined ? 1 : clamp(layer.opacity) });
      renderLayer(layer.id);
    }
    // Commit the reset without animating the old state back into the opening shot.
    void root.offsetWidth;
    root.classList.remove('is-resetting');
    progress();
  }
  function setSound(value) {
    enabledSound = Boolean(value);
    if (!enabledSound) { stopSounds(); stopNarration(); }
    return enabledSound;
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelPlayback();
    for (const remove of listeners) remove();
    root.remove();
  }
  reset();
  return { destroy, reset, setSound, activateRule, selectLayer };
}
