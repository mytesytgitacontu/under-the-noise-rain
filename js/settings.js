/**
 * settings.js — Reading preferences & localStorage persistence
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'under-the-noise-rain-settings';

  /* Only system may be non-Persian-specific; all others are Persian webfonts */
  var FONT_MAP = {
    system: {
      family: "system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif",
      weight: '400'
    },
    vazirmatn: {
      family: "'Vazirmatn', Tahoma, sans-serif",
      weight: '400'
    },
    'vazirmatn-thin': {
      family: "'Vazirmatn', Tahoma, sans-serif",
      weight: '300'
    },
    'vazirmatn-bold': {
      family: "'Vazirmatn', Tahoma, sans-serif",
      weight: '800'
    },
    amiri: {
      family: "'Amiri', 'Noto Naskh Arabic', serif",
      weight: '400'
    },
    gandom: {
      family: "'Gandom', Tahoma, sans-serif",
      weight: '400'
    },
    nastaliq: {
      family: "'Noto Nastaliq Urdu', 'Amiri', serif",
      weight: '400'
    }
  };

  var DEFAULTS = {
    fontSize: 18,
    fontFamily: 'system',
    lineHeight: 1.8,
    contentWidth: 1600,
    theme: 'light'
  };

  function resolveFont(key) {
    return FONT_MAP[key] || FONT_MAP.system;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var parsed = JSON.parse(raw);
      var out = Object.assign({}, DEFAULTS, parsed);
      if (out.theme === 'warm') out.theme = 'dark';
      if (out.theme !== 'light' && out.theme !== 'dark') out.theme = 'light';
      delete out.blueFilter;
      delete out.blueFilterStrength;
      delete out.blueFilterWarmth;
      /* migrate legacy CSS font stacks → keys */
      if (out.fontFamily && out.fontFamily.indexOf(',') !== -1) {
        var lower = out.fontFamily.toLowerCase();
        if (lower.indexOf('vazirmatn') !== -1) out.fontFamily = 'vazirmatn';
        else if (lower.indexOf('amiri') !== -1) out.fontFamily = 'amiri';
        else if (lower.indexOf('gandom') !== -1) out.fontFamily = 'gandom';
        else if (lower.indexOf('nastaliq') !== -1) out.fontFamily = 'nastaliq';
        else out.fontFamily = 'system';
      }
      if (!FONT_MAP[out.fontFamily]) out.fontFamily = 'system';
      if (out.contentWidth > 1600) out.contentWidth = 1600;
      if (out.contentWidth < 560) out.contentWidth = 560;
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

  function updateThemeIcons(theme) {
    var moon = document.getElementById('icon-moon');
    var sun = document.getElementById('icon-sun');
    var btn = document.getElementById('btn-theme-toggle');
    var isLight = theme !== 'dark';
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
    var font = resolveFont(settings.fontFamily);
    root.style.setProperty('--font-size', settings.fontSize + 'px');
    root.style.setProperty('--font-family', font.family);
    root.style.setProperty('--font-weight', font.weight);
    root.style.setProperty('--line-height', String(settings.lineHeight));
    root.style.setProperty('--content-width', settings.contentWidth + 'px');
    root.setAttribute('data-theme', settings.theme === 'dark' ? 'dark' : 'light');
    root.classList.remove('blue-filter-on');
    updateThemeIcons(settings.theme);
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

    if (fontSizeEl) {
      fontSizeEl.value = settings.fontSize;
      if (fontSizeVal) fontSizeVal.textContent = toPersianDigits(settings.fontSize);
    }
    if (fontFamilyEl) {
      fontFamilyEl.value = settings.fontFamily;
      if (!fontFamilyEl.value) fontFamilyEl.value = 'system';
    }
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
    updateThemeIcons(settings.theme);
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
        else if (action === 'width-dec') update({ contentWidth: Math.max(560, settings.contentWidth - 40) });
        else if (action === 'width-inc') update({ contentWidth: Math.min(1600, settings.contentWidth + 40) });
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
    DEFAULTS: DEFAULTS,
    FONT_MAP: FONT_MAP
  };
})(window);
