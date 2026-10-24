/**
 * chapters.js — Manifest loading, chapter fetch, rendering, progress memory
 */
(function (global) {
  'use strict';

  var MANIFEST_URL = 'chapters/manifest.json';
  var PROGRESS_KEY = 'under-the-noise-rain-progress';
  var CACHE = {};

  var state = {
    manifest: null,
    currentIndex: -1,
    loading: false,
    preloaded: false
  };

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function stripMdInline(str) {
    /* Convert *italic* to plain for escape, track spans separately if needed */
    return str.replace(/\*([^*]+)\*/g, '$1');
  }

  function parseChapterText(raw) {
    var text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!text) return { title: '', paragraphs: [] };

    var blocks = text.split(/\n\s*\n/);
    var paragraphs = [];
    var title = '';

    blocks.forEach(function (block) {
      var cleaned = block.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned) return;

      /* Markdown H1 title: # فصل ... */
      var h1 = cleaned.match(/^#\s+(.+)$/);
      if (h1 && !title) {
        title = h1[1].trim();
        return;
      }

      /* Scene header: location — date/time (contains em dash or similar, short) */
      var isScene =
        /^[【\[]/.test(cleaned) ||
        (cleaned.length < 120 && /[—–-]/.test(cleaned) && /تهران|هاب|بام|اتاق|خیابان|پل|شب|صبح|غروب|بامداد/.test(cleaned)) ||
        (/^[۰-۹0-9]{1,2}[:：]/.test(cleaned) && cleaned.length < 80);

      if (isScene) {
        paragraphs.push({ type: 'scene', text: stripMdInline(cleaned) });
      } else {
        paragraphs.push({ type: 'p', text: stripMdInline(cleaned) });
      }
    });

    return { title: title, paragraphs: paragraphs };
  }

  function renderChapter(parsed, container) {
    var html = '';
    if (parsed.title) {
      html += '<h2 class="chapter-heading">' + escapeHtml(parsed.title) + '</h2>';
    }
    parsed.paragraphs.forEach(function (item) {
      if (item.type === 'scene') {
        html += '<p class="scene-header">' + escapeHtml(item.text) + '</p>';
      } else {
        html += '<p>' + escapeHtml(item.text) + '</p>';
      }
    });
    container.innerHTML = html;
  }

  function defaultProgress() {
    return {
      chapterId: null,
      scrollY: 0,
      scrolls: {},
      read: {},
      updated: 0
    };
  }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return defaultProgress();
      var data = JSON.parse(raw);
      return {
        chapterId: data.chapterId || null,
        scrollY: data.scrollY || 0,
        scrolls: data.scrolls && typeof data.scrolls === 'object' ? data.scrolls : {},
        read: data.read && typeof data.read === 'object' ? data.read : {},
        updated: data.updated || 0
      };
    } catch (e) {
      return defaultProgress();
    }
  }

  function saveProgress(chapterId, scrollY, extra) {
    try {
      var cur = loadProgress();
      if (chapterId) {
        cur.chapterId = chapterId;
        cur.scrollY = scrollY || 0;
        if (!cur.scrolls) cur.scrolls = {};
        cur.scrolls[chapterId] = scrollY || 0;
      }
      if (extra && extra.readId) {
        if (!cur.read) cur.read = {};
        cur.read[extra.readId] = true;
      }
      if (extra && extra.readMap) {
        cur.read = extra.readMap;
      }
      cur.updated = Date.now();
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(cur));
    } catch (e) { /* ignore */ }
  }

  function markChapterRead(chapterId) {
    if (!chapterId) return;
    var cur = loadProgress();
    if (!cur.read) cur.read = {};
    cur.read[chapterId] = true;
    cur.updated = Date.now();
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(cur));
    } catch (e) { /* ignore */ }
  }

  function markChapterUnread(chapterId) {
    if (!chapterId) return;
    var cur = loadProgress();
    if (!cur.read) cur.read = {};
    delete cur.read[chapterId];
    cur.updated = Date.now();
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(cur));
    } catch (e) { /* ignore */ }
  }

  function toggleChapterRead(chapterId) {
    if (!chapterId) return false;
    if (isChapterRead(chapterId)) {
      markChapterUnread(chapterId);
      return false;
    }
    markChapterRead(chapterId);
    return true;
  }

  function isChapterRead(chapterId) {
    var cur = loadProgress();
    return !!(cur.read && cur.read[chapterId]);
  }

  function getScrollForChapter(chapterId) {
    var cur = loadProgress();
    if (cur.scrolls && typeof cur.scrolls[chapterId] === 'number') {
      return cur.scrolls[chapterId];
    }
    if (cur.chapterId === chapterId) return cur.scrollY || 0;
    return 0;
  }

  var CONTENT_CACHE_NAME = 'under-noise-content-v4';

  function fetchText(url, opts) {
    opts = opts || {};
    var init = { cache: opts.forceNetwork ? 'no-store' : 'default' };
    return fetch(url, init).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      return res.text();
    });
  }

  function putInContentCache(url, text) {
    if (!('caches' in window)) return Promise.resolve();
    try {
      return caches.open(CONTENT_CACHE_NAME).then(function (cache) {
        return cache.put(url, new Response(text, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }));
      }).catch(function () { /* ignore */ });
    } catch (e) {
      return Promise.resolve();
    }
  }

  function getFromContentCache(url) {
    if (!('caches' in window)) return Promise.resolve(null);
    return caches.open(CONTENT_CACHE_NAME).then(function (cache) {
      return cache.match(url).then(function (res) {
        return res ? res.text() : null;
      });
    }).catch(function () { return null; });
  }

  function loadManifest() {
    /* Always network on page load so refresh applies updates; offline → cache */
    return fetch(MANIFEST_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Manifest not found');
        return res.json();
      })
      .catch(function () {
        return getFromContentCache(MANIFEST_URL).then(function (raw) {
          if (!raw) throw new Error('Manifest not found');
          return JSON.parse(raw);
        });
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.chapters)) {
          throw new Error('Invalid manifest');
        }
        state.manifest = data;
        try {
          putInContentCache(MANIFEST_URL, JSON.stringify(data));
        } catch (e) { /* ignore */ }
        return data;
      });
  }

  /**
   * Preload entire novel into memory + Cache Storage.
   * Always fetches from network when online (refresh = latest text).
   * Offline: fills memory from Cache Storage.
   */
  function preloadAllChapters() {
    if (!state.manifest || !state.manifest.chapters) {
      return Promise.resolve({ ok: 0, fail: 0, offline: false });
    }
    var list = state.manifest.chapters;
    var ok = 0;
    var fail = 0;
    var offline = false;

    var tasks = list.map(function (ch) {
      var url = 'chapters/' + ch.file;
      return fetchText(url, { forceNetwork: true })
        .then(function (text) {
          CACHE[url] = text;
          ok += 1;
          return putInContentCache(url, text);
        })
        .catch(function () {
          offline = true;
          return getFromContentCache(url).then(function (text) {
            if (text != null) {
              CACHE[url] = text;
              ok += 1;
            } else {
              fail += 1;
            }
          });
        });
    });

    return Promise.all(tasks).then(function () {
      state.preloaded = true;
      return { ok: ok, fail: fail, offline: offline, total: list.length };
    });
  }

  function getChapterByIndex(index) {
    if (!state.manifest || index < 0 || index >= state.manifest.chapters.length) {
      return null;
    }
    return state.manifest.chapters[index];
  }

  function findIndexById(id) {
    if (!state.manifest) return -1;
    for (var i = 0; i < state.manifest.chapters.length; i++) {
      if (state.manifest.chapters[i].id === id) return i;
    }
    return -1;
  }

  function loadChapter(index) {
    var chapter = getChapterByIndex(index);
    if (!chapter) return Promise.reject(new Error('Chapter not found'));

    state.loading = true;
    state.currentIndex = index;

    var url = 'chapters/' + chapter.file;

    var promise;
    if (CACHE[url]) {
      promise = Promise.resolve(CACHE[url]);
    } else {
      promise = fetchText(url).then(function (text) {
        CACHE[url] = text;
        return text;
      });
    }

    return promise.then(function (text) {
      state.loading = false;
      return {
        meta: chapter,
        index: index,
        total: state.manifest.chapters.length,
        parsed: parseChapterText(text)
      };
    }).catch(function (err) {
      state.loading = false;
      throw err;
    });
  }

  function buildToc(listEl, currentId, onSelect) {
    if (!listEl || !state.manifest) return;
    var progress = loadProgress();
    var readMap = progress.read || {};
    listEl.innerHTML = '';
    state.manifest.chapters.forEach(function (ch, i) {
      var row = document.createElement('div');
      var classes = 'toc-item';
      if (ch.id === currentId) classes += ' active';
      if (readMap[ch.id]) classes += ' read';
      row.className = classes;
      row.setAttribute('data-id', ch.id);
      row.setAttribute('data-index', i);

      var mark = document.createElement('button');
      mark.type = 'button';
      mark.className = 'toc-check';
      mark.setAttribute('aria-label', readMap[ch.id] ? 'برداشتن تیک خوانده‌شده' : 'علامت به‌عنوان خوانده‌شده');
      mark.title = readMap[ch.id] ? 'برداشتن تیک' : 'تیک خوانده‌شده';
      mark.textContent = readMap[ch.id] ? '✓' : '';
      mark.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var nowRead = toggleChapterRead(ch.id);
        row.classList.toggle('read', nowRead);
        mark.textContent = nowRead ? '✓' : '';
        mark.setAttribute('aria-label', nowRead ? 'برداشتن تیک خوانده‌شده' : 'علامت به‌عنوان خوانده‌شده');
        mark.title = nowRead ? 'برداشتن تیک' : 'تیک خوانده‌شده';
      });

      var label = document.createElement('button');
      label.type = 'button';
      label.className = 'toc-label';
      label.textContent = ch.title || ('فصل ' + (i + 1));
      label.setAttribute('aria-current', ch.id === currentId ? 'true' : 'false');
      label.addEventListener('click', function () {
        if (typeof onSelect === 'function') onSelect(i);
      });

      row.appendChild(mark);
      row.appendChild(label);
      listEl.appendChild(row);
    });
  }

  global.NovelChapters = {
    state: state,
    loadManifest: loadManifest,
    preloadAllChapters: preloadAllChapters,
    loadChapter: loadChapter,
    getChapterByIndex: getChapterByIndex,
    findIndexById: findIndexById,
    parseChapterText: parseChapterText,
    renderChapter: renderChapter,
    escapeHtml: escapeHtml,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    markChapterRead: markChapterRead,
    markChapterUnread: markChapterUnread,
    toggleChapterRead: toggleChapterRead,
    isChapterRead: isChapterRead,
    getScrollForChapter: getScrollForChapter,
    buildToc: buildToc
  };
})(window);
