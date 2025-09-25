import { injectFloatingNoteButton } from './modules/print';

(function () {
    const hasChromeStorage = typeof chrome !== 'undefined' && chrome?.storage?.local;
    if (!hasChromeStorage) return;
    chrome.storage.local.get(['options'], (data) => {
        const enabled = data.options?.floatingButton !== false; // default on
        if (enabled) injectFloatingNoteButton();
    });

    try {
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg?.type === 'NOTELY_OPEN_FORM') {
                injectFloatingNoteButton();
                // toggle open
                const host = document.querySelector('div[style*="z-index: 2147483647"][style*="position: fixed"]');
                const root = host && host.shadowRoot;
                const panel = root && root.querySelector('.panel');
                if (panel) panel.classList.add('open');
            }
        });
    } catch { }
})();
