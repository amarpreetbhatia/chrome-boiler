// Background: handle alarms for scheduled notifications
console.log('Background loaded');

try {
    chrome.alarms.onAlarm.addListener((alarm) => {
        const id = alarm?.name;
        if (!id || !id.startsWith('notely_')) return;
        const storageKey = 'alarm_' + id;
        chrome.storage.local.get([storageKey], (data) => {
            const payload = data[storageKey] || {};
            const title = payload.title || 'Reminder';
            const message = payload.text || 'Time is up!';
            try {
                chrome.notifications.create(id, {
                    type: 'basic',
                    iconUrl: 'icon-128.png',
                    title,
                    message,
                    priority: 2,
                });
            } catch { }
            chrome.storage.local.remove([storageKey]);
        });
    });
} catch (e) {
    // ignore if alarms not available
}

// Keyboard command → open in-page form
try {
    chrome.commands.onCommand.addListener((command) => {
        if (command !== 'toggle_note_form') return;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab?.id) return;
            chrome.tabs.sendMessage(tab.id, { type: 'NOTELY_OPEN_FORM' });
        });
    });
} catch { }
