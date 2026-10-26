/**
 * app.js — Main application: UI wiring, navigation, background, init
 */
(function () {
  'use strict';

  var settings = NovelSettings.load();
  var scrollSaveTimer = null;

  /* ---------- Background stars canvas (throttled, pause on scroll) ---------- */
  function initBackground() {
    var canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d', { alpha: true });
    var stars = [];
    var w, h, dpr;
    var isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    /* Mobile: static stars only — no rAF loop (biggest scroll/jank win) */
    var reduced = true; /* no star animation */
    var scrolling = false;
    var scrollIdleTimer = null;
    var rafId = 0;
    var lastFrame = 0;
    var frameInterval = isMobile ? 50 : 33; /* ~20fps mobile, ~30fps desktop */
    var time = 0;
    var starColor = '#ffffff';

    function readStarColor() {
      try {
        starColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--star-color').trim() || '#ffffff';
      } catch (e) {
        starColor = '#ffffff';
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
      paintStatic();
    }

    function initStars() {
      var density = isMobile ? 22000 : 14000;
      var max = isMobile ? 50 : 100;
      var count = Math.min(Math.floor((w * h) / density), max);
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * (isMobile ? 1.1 : 1.4) + 0.3,
          a: Math.random() * 0.55 + 0.2,
          speed: Math.random() * 0.012 + 0.003,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function paintStatic() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = starColor;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function draw(now) {
      rafId = 0;
      if (scrolling || reduced) return;
      if (now - lastFrame < frameInterval) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      lastFrame = now;
      time += frameInterval / 1000;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = starColor;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var alpha = s.a * (0.55 + 0.45 * Math.sin(time * s.speed * 60 + s.phase));
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(draw);
    }

    function startAnim() {
      if (reduced || scrolling || rafId) return;
      lastFrame = 0;
      rafId = requestAnimationFrame(draw);
    }

    function stopAnim() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function onUserScroll() {
      if (!scrolling) {
        scrolling = true;
        canvas.classList.add('is-scrolling');
        stopAnim();
      }
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(function () {
        scrolling = false;
        canvas.classList.remove('is-scrolling');
        startAnim();
      }, 180);
    }

    readStarColor();
    resize();
    if (!reduced) startAnim();
    else paintStatic();

    window.addEventListener('resize', function () {
      isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
      frameInterval = isMobile ? 50 : 33;
      resize();
    }, { passive: true });

    window.addEventListener('scroll', onUserScroll, { passive: true });
    window.addEventListener('touchmove', onUserScroll, { passive: true });

    var observer = new MutationObserver(function () {
      readStarColor();
      paintStatic();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------- UI helpers ---------- */
  function showLoading(show) {
    var loading = document.getElementById('loading-state');
    var body = document.getElementById('chapter-body');
    if (loading) {
      loading.hidden = !show;
      if (show) loading.removeAttribute('hidden');
      else loading.setAttribute('hidden', '');
      loading.style.display = show ? '' : 'none';
    }
    if (body) {
      body.hidden = !!show;
      if (show) body.setAttribute('hidden', '');
      else body.removeAttribute('hidden');
      body.style.display = show ? 'none' : '';
    }
  }

  function updateNav(index, total) {
    var prevBtn = document.getElementById('btn-prev');
    var nextBtn = document.getElementById('btn-next');
    var progress = document.getElementById('chapter-progress');

    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= total - 1 || total === 0;

    if (progress) {
      if (total > 0) {
        progress.textContent =
          NovelSettings.toPersianDigits(index + 1) +
          ' از ' +
          NovelSettings.toPersianDigits(total);
      } else {
        progress.textContent = '—';
      }
    }
  }

  function openDrawer(id) {
    var drawer = document.getElementById(id);
    var overlayId = id === 'toc-drawer' ? 'toc-overlay' : 'settings-overlay';
    var overlay = document.getElementById(overlayId);
    if (drawer) {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    }
    if (overlay) {
      overlay.hidden = false;
      requestAnimationFrame(function () {
        overlay.classList.add('visible');
      });
    }
  }

  function closeDrawer(id) {
    var drawer = document.getElementById(id);
    var overlayId = id === 'toc-drawer' ? 'toc-overlay' : 'settings-overlay';
    var overlay = document.getElementById(overlayId);
    if (drawer) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(function () {
        if (!overlay.classList.contains('visible')) overlay.hidden = true;
      }, 280);
    }
  }

  function closeAllDrawers() {
    closeDrawer('toc-drawer');
    closeDrawer('settings-panel');
  }

  /* ---------- Chapter display ---------- */
  function refreshToc() {
    var ch = NovelChapters.getChapterByIndex(NovelChapters.state.currentIndex);
    NovelChapters.buildToc(
      document.getElementById('toc-list'),
      ch ? ch.id : null,
      function (i) {
        closeDrawer('toc-drawer');
        goToChapter(i);
      }
    );
  }

  function displayChapter(result, restoreScroll) {
    var body = document.getElementById('chapter-body');
    if (!body) return;

    NovelChapters.renderChapter(result.parsed, body);

    if (!result.parsed.title && result.meta.title) {
      var h2 = document.createElement('h2');
      h2.className = 'chapter-heading';
      h2.textContent = result.meta.title;
      body.insertBefore(h2, body.firstChild);
    }

    showLoading(false);
    updateNav(result.index, result.total);
    refreshToc();

    var y = typeof restoreScroll === 'number' ? restoreScroll : 0;
    if (y > 0) {
      requestAnimationFrame(function () {
        window.scrollTo(0, y);
        NovelChapters.saveProgress(result.meta.id, y);
      });
    } else {
      window.scrollTo(0, 0);
      NovelChapters.saveProgress(result.meta.id, 0);
    }

    document.title = (result.meta.title || result.parsed.title || '') + ' — زیر بارانِ نویز';
  }

  function goToChapter(index, restoreScroll) {
    if (NovelChapters.state.loading) return;
    if (index < 0) return;

    /* Save current position before leaving */
    var prev = NovelChapters.getChapterByIndex(NovelChapters.state.currentIndex);
    if (prev) {
      NovelChapters.saveProgress(prev.id, window.scrollY);
      maybeMarkRead(prev.id);
    }

    showLoading(true);
    closeAllDrawers();

    var target = NovelChapters.getChapterByIndex(index);
    var scrollY = restoreScroll;
    if (typeof scrollY !== 'number' && target) {
      scrollY = NovelChapters.getScrollForChapter(target.id);
    }

    NovelChapters.loadChapter(index)
      .then(function (result) {
        displayChapter(result, scrollY || 0);
      })
      .catch(function (err) {
        showLoading(false);
        var body = document.getElementById('chapter-body');
        if (body) {
          body.hidden = false;
          body.innerHTML =
            '<p style="color:var(--text-muted);text-align:center;padding:2rem;">' +
            'خطا در بارگذاری فصل. ' +
            NovelChapters.escapeHtml(String(err.message || err)) +
            '</p>';
        }
        console.error(err);
      });
  }

  /* Mark chapter read when user reaches ~90% of page height */
  function maybeMarkRead(chapterId, force) {
    if (!chapterId) return;
    if (force) {
      NovelChapters.markChapterRead(chapterId);
      refreshToc();
      return;
    }
    var doc = document.documentElement;
    var maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
    var ratio = window.scrollY / maxScroll;
    /* 75% scrolled or short page → marked read */
    if (ratio >= 0.75 || maxScroll < 300) {
      NovelChapters.markChapterRead(chapterId);
      refreshToc();
    }
  }

  /* ---------- Scroll progress ---------- */
  function onScroll() {
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(function () {
      var ch = NovelChapters.getChapterByIndex(NovelChapters.state.currentIndex);
      if (ch) {
        NovelChapters.saveProgress(ch.id, window.scrollY);
        maybeMarkRead(ch.id);
      }
    }, 500);
  }

  function onVisibilitySave() {
    var ch = NovelChapters.getChapterByIndex(NovelChapters.state.currentIndex);
    if (ch) {
      NovelChapters.saveProgress(ch.id, window.scrollY);
      maybeMarkRead(ch.id);
    }
  }

  /* ---------- Immersive mode (mobile: single tap hides chrome) ---------- */
  var immersive = false;
  var tapState = { x: 0, y: 0, t: 0, moved: false };

  function isCoarsePointer() {
    try {
      return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    } catch (e) {
      return ('ontouchstart' in window);
    }
  }

  function setImmersive(on) {
    immersive = !!on;
    document.body.classList.toggle('immersive', immersive);
  }

  function toggleImmersive() {
    if (!isCoarsePointer()) return;
    setImmersive(!immersive);
  }

  function onReaderPointerDown(e) {
    if (!isCoarsePointer()) return;
    if (e.target.closest && (
      e.target.closest('button') ||
      e.target.closest('a') ||
      e.target.closest('.drawer') ||
      e.target.closest('.top-bar') ||
      e.target.closest('.bottom-nav') ||
      e.target.closest('.overlay')
    )) return;
    var pt = e.touches && e.touches[0] ? e.touches[0] : e;
    tapState.x = pt.clientX;
    tapState.y = pt.clientY;
    tapState.t = Date.now();
    tapState.moved = false;
  }

  function onReaderPointerMove(e) {
    if (!tapState.t) return;
    var pt = e.touches && e.touches[0] ? e.touches[0] : e;
    if (Math.abs(pt.clientX - tapState.x) > 12 || Math.abs(pt.clientY - tapState.y) > 12) {
      tapState.moved = true;
    }
  }

  function onReaderPointerUp(e) {
    if (!isCoarsePointer() || !tapState.t) return;
    var dt = Date.now() - tapState.t;
    var wasTap = !tapState.moved && dt < 350;
    tapState.t = 0;
    if (!wasTap) return;
    /* Ignore if text selection exists */
    try {
      var sel = window.getSelection && window.getSelection();
      if (sel && String(sel).length > 0) return;
    } catch (err) { /* ignore */ }
    toggleImmersive();
  }

  /* ---------- Wire events ---------- */
  function bindUI() {
    document.getElementById('btn-toc').addEventListener('click', function () {
      setImmersive(false);
      openDrawer('toc-drawer');
    });
    document.getElementById('btn-close-toc').addEventListener('click', function () {
      closeDrawer('toc-drawer');
    });
    document.getElementById('toc-overlay').addEventListener('click', function () {
      closeDrawer('toc-drawer');
    });

    document.getElementById('btn-settings').addEventListener('click', function () {
      setImmersive(false);
      openDrawer('settings-panel');
    });
    document.getElementById('btn-close-settings').addEventListener('click', function () {
      closeDrawer('settings-panel');
    });
    document.getElementById('settings-overlay').addEventListener('click', function () {
      closeDrawer('settings-panel');
    });

    document.getElementById('btn-prev').addEventListener('click', function () {
      if (NovelChapters.state.currentIndex > 0) {
        goToChapter(NovelChapters.state.currentIndex - 1);
      }
    });
    document.getElementById('btn-next').addEventListener('click', function () {
      var total = NovelChapters.state.manifest
        ? NovelChapters.state.manifest.chapters.length
        : 0;
      var cur = NovelChapters.getChapterByIndex(NovelChapters.state.currentIndex);
      if (cur) maybeMarkRead(cur.id, true);
      if (NovelChapters.state.currentIndex < total - 1) {
        goToChapter(NovelChapters.state.currentIndex + 1);
      }
    });

    window.addEventListener('scroll', onScroll, { passive: true });

    /* Mobile: single tap on reading area toggles top/bottom bars */
    var reader = document.getElementById('reader');
    if (reader) {
      reader.addEventListener('touchstart', onReaderPointerDown, { passive: true });
      reader.addEventListener('touchmove', onReaderPointerMove, { passive: true });
      reader.addEventListener('touchend', onReaderPointerUp, { passive: true });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') onVisibilitySave();
    });
    window.addEventListener('pagehide', onVisibilitySave);
    window.addEventListener('beforeunload', onVisibilitySave);

    /* Keyboard navigation */
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageDown') {
        e.preventDefault();
        document.getElementById('btn-next').click();
      } else if (e.key === 'ArrowRight' || e.key === 'PageUp') {
        e.preventDefault();
        document.getElementById('btn-prev').click();
      } else if (e.key === 'Escape') {
        closeAllDrawers();
      }
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        /* When a new SW is waiting, activate on next refresh automatically */
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              /* New version ready — will apply on next refresh */
            }
          });
        });
      }).catch(function () { /* offline or file:// */ });
    });
  }

  function setCacheStatus(msg) {
    var el = document.getElementById('cache-status');
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  /* ---------- Boot ---------- */
  function init() {
    NovelSettings.apply(settings);
    NovelSettings.initUI(settings);
    NovelSettings.bindControls(settings);

    initBackground();
    bindUI();
    registerServiceWorker();

    /* Load manifest → open chapter immediately → preload rest in background */
    NovelChapters.loadManifest()
      .then(function (manifest) {
        var titleEl = document.getElementById('novel-title');
        if (titleEl && manifest.novelTitle) {
          titleEl.textContent = manifest.novelTitle;
        }
        document.title = (manifest.novelTitle || 'زیر بارانِ نویز');

        var progress = NovelChapters.loadProgress();
        var startIndex = 0;
        if (progress.chapterId) {
          var found = NovelChapters.findIndexById(progress.chapterId);
          if (found >= 0) startIndex = found;
        }

        var chMeta = NovelChapters.getChapterByIndex(startIndex);
        var restoreY = 0;
        if (chMeta) {
          restoreY = NovelChapters.getScrollForChapter(chMeta.id);
        } else {
          restoreY = progress.scrollY || 0;
        }

        /* Show the chapter right away — do not wait for full cache */
        goToChapter(startIndex, restoreY);

        /* Background: cache entire novel for offline (no blocking UI) */
        NovelChapters.preloadAllChapters().then(function (info) {
          if (info && info.ok === info.total && info.total > 0) {
            setCacheStatus('آماده برای خواندن آفلاین');
            setTimeout(function () { setCacheStatus(''); }, 2500);
          }
        }).catch(function () { /* silent */ });
      })
      .catch(function (err) {
        showLoading(false);
        setCacheStatus('');
        var loading = document.getElementById('loading-state');
        if (loading) loading.hidden = true;
        var body = document.getElementById('chapter-body');
        if (body) {
          body.hidden = false;
          body.innerHTML =
            '<p style="color:var(--text-muted);text-align:center;padding:2rem;">' +
            'فایل فهرست فصل‌ها یافت نشد. لطفاً chapters/manifest.json را بررسی کنید.' +
            '</p>';
        }
        console.error(err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
