/**
 * settings.js — Reading preferences & localStorage persistence
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'under-the-noise-rain-settings';
  var DEFAULTS = {
    fontSize: 18,
    fontFamily: "Tahoma, 'Segoe UI', sans-serif",
    lineHeight: 1.8,
    contentWidth: 860,
    theme: 'light',
    blueFilter: false,
    blueFilterStrength: 55
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var parsed = JSON.parse(raw);
      var out = Object.assign({}, DEFAULTS, parsed);
      /* migrate: old warm theme → dark + blue filter optional */
      if (out.theme === 'warm') {
        out.theme = 'dark';
        if (typeof parsed.blueFilter === 'undefined') out.blueFilter = true;
      }
      if (typeof out.blueFilterWarmth === 'number' && typeof parsed.blueFilterStrength !== 'number') {
        out.blueFilterStrength = out.blueFilterWarmth;
      }
      if (out.theme !== 'light' && out.theme !== 'dark') out.theme = 'light';
      return out;
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) { /* ignore */ }
  }

  /**
   * Real-ish blue-light reduction: lower blue channel via CSS filter on the
   * reading surface (not a yellow wash of the whole UI).
   * strength 10–100 → progressive blue cut + slight warmth.
   */
  function applyBlueFilter(settings) {
    var root = document.documentElement;
    var overlay = document.getElementById('blue-light-overlay');
    var controls = document.getElementById('blue-filter-controls');
    var toggle = document.getElementById('blue-filter-toggle');
    var on = !!settings.blueFilter;
    var s = typeof settings.blueFilterStrength === 'number' ? settings.blueFilterStrength : 55;
    s = Math.max(20, Math.min(100, s));

    root.classList.toggle('blue-filter-on', on);
    root.style.setProperty('--blf-strength', String(s));

    /*
     * Strength curve (acts like a real night-shift):
     *  20% → mild blue cut, still relatively cool
     *  55% → standard comfortable night reading
     * 100% → fully warm / amber (maximum filter)
     */
    var t = (s - 20) / 80; /* 0 at 20% … 1 at 100% */
    if (t < 0) t = 0;
    root.style.setProperty('--blf-t', t.toFixed(3));

    var sepia = (0.12 + t * 0.88).toFixed(3);       /* up to ~1.0 full warm */
    var saturate = (1.05 - t * 0.35).toFixed(3);
    var hue = (-8 - t * 28).toFixed(2);              /* shift hard toward amber */
    var brightness = (1 - t * 0.08).toFixed(3);
    var contrast = (1 + t * 0.06).toFixed(3);
    var blueCut = (0.2 + t * 0.8).toFixed(3);

    root.style.setProperty('--blf-sepia', sepia);
    root.style.setProperty('--blf-saturate', saturate);
    root.style.setProperty('--blf-hue', hue + 'deg');
    root.style.setProperty('--blf-brightness', brightness);
    root.style.setProperty('--blf-contrast', contrast);
    root.style.setProperty('--blf-blue-cut', blueCut);

    if (overlay) {
      overlay.classList.toggle('active', on);
      overlay.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    if (controls) controls.hidden = !on;
    if (toggle) {
      toggle.setAttribute('aria-checked', on ? 'true' : 'false');
      toggle.classList.toggle('on', on);
    }
  }

  function updateThemeIcons(theme) {
    var moon = document.getElementById('icon-moon');
    var sun = document.getElementById('icon-sun');
    var btn = document.getElementById('btn-theme-toggle');
    var isLight = theme !== 'dark';
    /* class-based hide: [hidden] on <svg> is unreliable in some WebViews */
    if (moon) {
      moon.hidden = !isLight;
      moon.classList.toggle('is-hidden', !isLight);
      moon.style.display = isLight ? '' : 'none';
    }
    if (sun) {
      sun.hidden = isLight;
      sun.classList.toggle('is-hidden', isLight);
      sun.style.display = isLight ? 'none' : '';
    }
    if (btn) {
      btn.title = isLight ? 'رفتن به تم تیره' : 'رفتن به تم روشن';
      btn.setAttribute('aria-label', btn.title);
      btn.setAttribute('data-theme-state', isLight ? 'light' : 'dark');
    }
  }

  function apply(settings) {
    var root = document.documentElement;
    root.style.setProperty('--font-size', settings.fontSize + 'px');
    root.style.setProperty('--font-family', settings.fontFamily);
    root.style.setProperty('--line-height', String(settings.lineHeight));
    root.style.setProperty('--content-width', settings.contentWidth + 'px');
    root.setAttribute('data-theme', settings.theme === 'dark' ? 'dark' : 'light');
    updateThemeIcons(settings.theme);
    applyBlueFilter(settings);
  }

  function toPersianDigits(n) {
    var map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(n).replace(/\d/g, function (d) { return map[+d]; });
  }

  function initUI(settings) {
    var fontSizeEl = document.getElementById('font-size');
    var fontFamilyEl = document.getElementById('font-family');
    var lineHeightEl = document.getElementById('line-height');
    var contentWidthEl = document.getElementById('content-width');
    var fontSizeVal = document.getElementById('font-size-val');
    var lineHeightVal = document.getElementById('line-height-val');
    var contentWidthVal = document.getElementById('content-width-val');
    var strengthEl = document.getElementById('blue-filter-strength');
    var strengthVal = document.getElementById('blue-filter-val');

    if (fontSizeEl) {
      fontSizeEl.value = settings.fontSize;
      if (fontSizeVal) fontSizeVal.textContent = toPersianDigits(settings.fontSize);
    }
    if (fontFamilyEl) fontFamilyEl.value = settings.fontFamily;
    if (lineHeightEl) {
      lineHeightEl.value = settings.lineHeight;
      if (lineHeightVal) {
        lineHeightVal.textContent = toPersianDigits(settings.lineHeight.toFixed(1).replace('.', '٫'));
      }
    }
    if (contentWidthEl) {
      contentWidthEl.value = settings.contentWidth;
      if (contentWidthVal) contentWidthVal.textContent = toPersianDigits(settings.contentWidth);
    }
    if (strengthEl) {
      strengthEl.value = settings.blueFilterStrength;
      if (strengthVal) strengthVal.textContent = toPersianDigits(settings.blueFilterStrength) + '٪';
    }
    updateThemeIcons(settings.theme);
    applyBlueFilter(settings);
  }

  function bindControls(settings, onChange) {
    function update(partial) {
      Object.assign(settings, partial);
      apply(settings);
      save(settings);
      initUI(settings);
      if (typeof onChange === 'function') onChange(settings);
    }

    var fontSizeEl = document.getElementById('font-size');
    var fontFamilyEl = document.getElementById('font-family');
    var lineHeightEl = document.getElementById('line-height');
    var contentWidthEl = document.getElementById('content-width');
    var strengthEl = document.getElementById('blue-filter-strength');
    var filterToggle = document.getElementById('blue-filter-toggle');
    var themeBtn = document.getElementById('btn-theme-toggle');

    if (fontSizeEl) {
      fontSizeEl.addEventListener('input', function () {
        update({ fontSize: +fontSizeEl.value });
      });
    }
    if (fontFamilyEl) {
      fontFamilyEl.addEventListener('change', function () {
        update({ fontFamily: fontFamilyEl.value });
      });
    }
    if (lineHeightEl) {
      lineHeightEl.addEventListener('input', function () {
        update({ lineHeight: +lineHeightEl.value });
      });
    }
    if (contentWidthEl) {
      contentWidthEl.addEventListener('input', function () {
        update({ contentWidth: +contentWidthEl.value });
      });
    }
    if (strengthEl) {
      strengthEl.addEventListener('input', function () {
        update({ blueFilterStrength: +strengthEl.value });
      });
    }
    if (filterToggle) {
      filterToggle.addEventListener('click', function () {
        update({ blueFilter: !settings.blueFilter });
      });
    }
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        update({ theme: settings.theme === 'light' ? 'dark' : 'light' });
      });
    }

    document.querySelectorAll('.range-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        if (action === 'font-dec') update({ fontSize: Math.max(14, settings.fontSize - 1) });
        else if (action === 'font-inc') update({ fontSize: Math.min(28, settings.fontSize + 1) });
        else if (action === 'lh-dec') update({ lineHeight: Math.max(1.4, +(settings.lineHeight - 0.1).toFixed(1)) });
        else if (action === 'lh-inc') update({ lineHeight: Math.min(2.4, +(settings.lineHeight + 0.1).toFixed(1)) });
        else if (action === 'width-dec') update({ contentWidth: Math.max(520, settings.contentWidth - 20) });
        else if (action === 'width-inc') update({ contentWidth: Math.min(1100, settings.contentWidth + 20) });
        else if (action === 'warmth-dec') update({ blueFilterStrength: Math.max(20, settings.blueFilterStrength - 5) });
        else if (action === 'warmth-inc') update({ blueFilterStrength: Math.min(100, settings.blueFilterStrength + 5) });
      });
    });
  }

  global.NovelSettings = {
    load: load,
    save: save,
    apply: apply,
    initUI: initUI,
    bindControls: bindControls,
    toPersianDigits: toPersianDigits,
    DEFAULTS: DEFAULTS
  };
})(window);
