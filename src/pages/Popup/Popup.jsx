import React from 'react';
import './Popup.css';

const Popup = () => {
  const [notes, setNotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState('date_desc');
  const [copiedIndex, setCopiedIndex] = React.useState(null);
  const hasChromeStorage =
    typeof chrome !== 'undefined' &&
    chrome &&
    chrome.storage &&
    chrome.storage.local;

  React.useEffect(() => {
    let isMounted = true;
    const loadNotes = async () => {
      if (!hasChromeStorage) {
        setLoading(false);
        setError('Chrome storage API unavailable. Run as an extension.');
        return;
      }
      try {
        const result = await new Promise((resolve, reject) => {
          try {
            chrome.storage.local.get(['notes', 'popupPrefs'], (data) => {
              const lastError = chrome.runtime && chrome.runtime.lastError;
              if (lastError) {
                reject(new Error(lastError.message));
                return;
              }
              resolve(data);
            });
          } catch (e) {
            reject(e);
          }
        });
        if (!isMounted) return;
        const storedNotes = Array.isArray(result.notes) ? result.notes : [];
        setNotes(storedNotes);
        // load prefs if present
        if (result.popupPrefs) {
          if (typeof result.popupPrefs.query === 'string') setQuery(result.popupPrefs.query);
          if (typeof result.popupPrefs.sortBy === 'string') setSortBy(result.popupPrefs.sortBy);
        }
      } catch (e) {
        if (!isMounted) return;
        setError(e?.message || 'Failed to load notes');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadNotes();

    // Listen for external updates
    const onChanged = (changes, area) => {
      if (area === 'local' && changes.notes) {
        const next = Array.isArray(changes.notes.newValue)
          ? changes.notes.newValue
          : [];
        setNotes(next);
      }
      if (area === 'local' && changes.popupPrefs) {
        const prefs = changes.popupPrefs.newValue || {};
        if (typeof prefs.query === 'string') setQuery(prefs.query);
        if (typeof prefs.sortBy === 'string') setSortBy(prefs.sortBy);
      }
    };
    try {
      if (hasChromeStorage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(onChanged);
      }
    } catch { }

    return () => {
      isMounted = false;
      try {
        if (hasChromeStorage && chrome.storage.onChanged) {
          chrome.storage.onChanged.removeListener(onChanged);
        }
      } catch { }
    };
  }, [hasChromeStorage]);

  // persist prefs
  React.useEffect(() => {
    try {
      if (hasChromeStorage) {
        chrome.storage.local.set({ popupPrefs: { query, sortBy } });
      }
    } catch { }
  }, [query, sortBy, hasChromeStorage]);

  const normalizedNotes = React.useMemo(() => {
    return notes.map((n, originalIndex) => {
      if (typeof n === 'string') {
        return { title: '', text: n, createdAt: undefined, originalIndex };
      }
      return {
        title: n.title || '',
        text: n.text || n.content || '',
        createdAt: n.createdAt,
        originalIndex,
      };
    });
  }, [notes]);

  const filteredAndSorted = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = normalizedNotes.filter((n) =>
      q === '' ? true : (n.title + ' ' + n.text).toLowerCase().includes(q)
    );
    const by = sortBy;
    arr.sort((a, b) => {
      if (by === 'title_asc') return a.title.localeCompare(b.title);
      if (by === 'title_desc') return b.title.localeCompare(a.title);
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (by === 'date_asc') return ad - bd;
      return bd - ad; // date_desc default
    });
    return arr;
  }, [normalizedNotes, query, sortBy]);

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1200);
    } catch (e) {
      // ignore
    }
  };

  const deleteNoteAt = (originalIndex) => {
    try {
      if (!hasChromeStorage) return;
      chrome.storage.local.get(['notes'], (data) => {
        const list = Array.isArray(data.notes) ? data.notes.slice() : [];
        if (originalIndex >= 0 && originalIndex < list.length) {
          list.splice(originalIndex, 1);
          chrome.storage.local.set({ notes: list });
        }
      });
    } catch { }
  };

  const editNoteAt = (note) => {
    // simple prompt-based edit for title and text
    const newTitle = window.prompt('Edit title:', note.title || '') ?? note.title;
    const newText = window.prompt('Edit text:', note.text || '') ?? note.text;
    try {
      if (!hasChromeStorage) return;
      chrome.storage.local.get(['notes'], (data) => {
        const list = Array.isArray(data.notes) ? data.notes.slice() : [];
        const idx = note.originalIndex;
        if (idx >= 0 && idx < list.length) {
          const current = list[idx];
          if (typeof current === 'string') {
            list[idx] = { title: newTitle, text: newText, createdAt: Date.now() };
          } else {
            list[idx] = {
              ...current,
              title: newTitle,
              text: newText,
            };
          }
          chrome.storage.local.set({ notes: list });
        }
      });
    } catch { }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-row">
          <h1 className="title">Your Notes</h1>
          <button
            className="refresh-btn"
            onClick={() => {
              setLoading(true);
              setError('');
              // re-run effect logic quickly
              chrome.storage.local.get(['notes'], (data) => {
                const lastError = chrome.runtime && chrome.runtime.lastError;
                if (lastError) {
                  setError(lastError.message);
                } else {
                  setNotes(Array.isArray(data.notes) ? data.notes : []);
                }
                setLoading(false);
              });
            }}
            title="Refresh"
          >
            ↻
          </button>
        </div>

        <div className="controls-row">
          <input
            className="search-input"
            placeholder="Search notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date_desc">Newest</option>
            <option value="date_asc">Oldest</option>
            <option value="title_asc">Title A–Z</option>
            <option value="title_desc">Title Z–A</option>
          </select>
        </div>

        {loading && <div className="state state-loading">Loading…</div>}
        {!loading && error && <div className="state state-error">{error}</div>}
        {!loading && !error && filteredAndSorted.length === 0 && (
          <div className="state state-empty">No notes yet.</div>
        )}

        {!loading && !error && filteredAndSorted.length > 0 && (
          <ul className="notes-list">
            {filteredAndSorted.map((note, index) => (
              <li
                className="note-card"
                key={index}
                onClick={() => handleCopy(note.text, index)}
                title="Click to copy"
              >
                <div className="note-header">
                  <span className="note-index">#{index + 1}</span>
                  {note.title ? (
                    <span className="note-title" title={note.title}>{note.title}</span>
                  ) : (
                    <span className="note-title untitled">Untitled</span>
                  )}
                  <div className="note-actions">
                    <button
                      className="icon-btn"
                      title="Edit"
                      onClick={(e) => { e.stopPropagation(); editNoteAt(note); }}
                    >
                      ✎
                    </button>
                    <button
                      className="icon-btn danger"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); deleteNoteAt(note.originalIndex); }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <div className="note-body">
                  <p className="note-text">
                    {note.text}
                  </p>
                </div>
                <div className="note-footer">
                  {note.createdAt && (
                    <span className="note-date" title={String(note.createdAt)}>
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  )}
                  {copiedIndex === index && (
                    <span className="copied-pill">Copied</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </header>
    </div>
  );
};

export default Popup;
