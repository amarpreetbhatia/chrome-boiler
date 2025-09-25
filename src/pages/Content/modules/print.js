export function injectFloatingNoteButton() {
  if (window.__notelyInjected) return;
  window.__notelyInjected = true;

  const hasChromeStorage = typeof chrome !== 'undefined' && chrome?.storage?.local;

  const rootHost = document.createElement('div');
  rootHost.style.all = 'initial';
  rootHost.style.position = 'fixed';
  rootHost.style.zIndex = '2147483647';
  rootHost.style.bottom = '20px';
  rootHost.style.right = '20px';
  document.documentElement.appendChild(rootHost);

  // Load saved position if available
  try {
    if (hasChromeStorage) {
      chrome.storage.local.get(['fabPos'], (data) => {
        const pos = data.fabPos;
        if (pos && typeof pos.bottom === 'number' && typeof pos.right === 'number') {
          rootHost.style.bottom = pos.bottom + 'px';
          rootHost.style.right = pos.right + 'px';
        }
      });
    }
  } catch { }

  const shadow = rootHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    .fab { position: relative; width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer; display: grid; place-items: center; box-shadow: 0 10px 22px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -4px 8px rgba(0,0,0,0.3); background: radial-gradient(circle at 30% 30%, #6fb3ff 0%, #1a73e8 40%, #0f5ad1 70%, #0a3c8a 100%); }
    .fab::before { content: ''; position: absolute; top: 8px; left: 12px; width: 36px; height: 16px; border-radius: 50%; background: linear-gradient(to bottom, rgba(255,255,255,0.75), rgba(255,255,255,0.15)); filter: blur(1px); }
    .fab:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(0,0,0,0.45), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -5px 10px rgba(0,0,0,0.35); }
    .panel { position: absolute; bottom: 68px; right: 0; width: 300px; max-width: 84vw; box-sizing: border-box; background: #0f1115; color: #e6eefb; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; box-shadow: 0 12px 30px rgba(0,0,0,0.35); padding: 10px; display: none; }
    .panel.open { display: block; }
    .row { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
    .input, .textarea, .select, .time { flex: 1; min-width: 0; background: #11141b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 8px; color: #e6eefb; box-sizing: border-box; }
    .textarea { height: 80px; }
    .time { flex: 0 0 90px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .btn { background: #1f2430; color: #cfe0ff; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 10px; cursor: pointer; }
    .btn.primary { background: #1a73e8; color: #fff; border-color: transparent; }
    .hint { font-size: 12px; color: #97a3b6; margin-top: 4px; }
    .plus { font-size: 30px; line-height: 1; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3), 0 0 8px rgba(255,255,255,0.35); user-select: none; }
  `;
  shadow.appendChild(style);

  const fab = document.createElement('button');
  fab.className = 'fab';
  const plus = document.createElement('span');
  plus.className = 'plus';
  plus.textContent = '+';
  fab.appendChild(plus);
  shadow.appendChild(fab);

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="row"><input class="input" id="title" placeholder="Title" /></div>
    <div class="row"><textarea class="textarea" id="content" placeholder="Content"></textarea></div>
    <div class="row">
      <select class="select" id="type">
        <option value="journal" selected>Journal</option>
        <option value="todo">Todo</option>
        <option value="notification">Notification (timer)</option>
      </select>
      <input class="time" id="minutes" type="number" min="1" step="1" placeholder="min" style="display:none;" />
    </div>
    <div class="actions">
      <button class="btn" id="cancel">Cancel</button>
      <button class="btn primary" id="save">Save</button>
    </div>
    <div class="hint">Saves to extension storage; shows in popup.</div>
  `;
  const typeEl = panel.querySelector('#type');
  const minutesEl = panel.querySelector('#minutes');
  typeEl.addEventListener('change', () => {
    if (typeEl.value === 'notification') {
      minutesEl.style.display = '';
    } else {
      minutesEl.style.display = 'none';
      minutesEl.value = '';
    }
  });
  shadow.appendChild(panel);

  let isDragging = false;
  let dragStart = null;
  let startBR = null;

  fab.addEventListener('click', (e) => {
    if (isDragging) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    panel.classList.toggle('open');
  });

  fab.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = false;
    dragStart = { x: e.clientX, y: e.clientY };
    const bottomPx = parseFloat(rootHost.style.bottom);
    const rightPx = parseFloat(rootHost.style.right);
    startBR = { bottom: isNaN(bottomPx) ? 20 : bottomPx, right: isNaN(rightPx) ? 20 : rightPx };
    const onMove = (ev) => {
      const dx = ev.clientX - dragStart.x;
      const dy = ev.clientY - dragStart.y;
      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) isDragging = true;
      if (isDragging) {
        const newRight = Math.max(0, startBR.right - dx);
        const newBottom = Math.max(0, startBR.bottom - dy);
        rootHost.style.right = newRight + 'px';
        rootHost.style.bottom = newBottom + 'px';
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
      if (isDragging && hasChromeStorage) {
        const bottomPx = parseFloat(rootHost.style.bottom) || 20;
        const rightPx = parseFloat(rootHost.style.right) || 20;
        try { chrome.storage.local.set({ fabPos: { bottom: bottomPx, right: rightPx } }); } catch { }
      }
      setTimeout(() => { isDragging = false; }, 0);
    };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
  });
  panel.querySelector('#cancel').addEventListener('click', () => panel.classList.remove('open'));
  // Ctrl+Enter to save
  panel.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      panel.querySelector('#save').click();
    }
  });

  panel.querySelector('#save').addEventListener('click', () => {
    const title = panel.querySelector('#title').value.trim();
    const text = panel.querySelector('#content').value.trim();
    const type = panel.querySelector('#type').value;
    const minutes = parseInt(panel.querySelector('#minutes').value, 10);
    if (!hasChromeStorage) {
      alert('Chrome storage unavailable. Install/enable the extension.');
      return;
    }
    const createdAt = Date.now();
    const note = { title, text, type, createdAt };
    chrome.storage.local.get(['notes'], (data) => {
      const list = Array.isArray(data.notes) ? data.notes.slice() : [];
      list.push(note);
      chrome.storage.local.set({ notes: list }, () => {
        if (chrome.runtime?.lastError) return;
        if (type === 'notification' && Number.isFinite(minutes) && minutes > 0) {
          try {
            const id = `notely_${createdAt}`;
            chrome.alarms.create(id, { when: Date.now() + minutes * 60000 });
            chrome.storage.local.set({ ['alarm_' + id]: { title, text } });
          } catch { }
        }
        panel.classList.remove('open');
        panel.querySelector('#title').value = '';
        panel.querySelector('#content').value = '';
        panel.querySelector('#minutes').value = '';
        panel.querySelector('#type').value = 'journal';
      });
    });
  });
}

export const printLine = (line) => {
  console.log('===> FROM THE PRINT MODULE:', line);
};
