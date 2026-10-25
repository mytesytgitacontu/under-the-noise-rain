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
    contentWidth: 960,
    theme: 'light'
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var parsed = JSON.parse(raw);
      var out = Object.assign({}, DEFAULTS, parsed);
      if (out.theme === 'warm') out.theme = 'dark';
      if (out.theme !== 'light' && out.theme !== 'dark') out.theme = 'light';
      /* drop legacy blue-filter keys if present */
      delete out.blueFilter;
      delete out.blueFilterStrength;
      delete out.blueFilterWarmth;
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
    root.style.setProperty('--font-size', settings.fontSize + 'px');
    root.style.setProperty('--font-family', settings.fontFamily);
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
    DEFAULTS: DEFAULTS
  };
})(window);
