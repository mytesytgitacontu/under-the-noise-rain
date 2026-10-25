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
    theme: 'warm',
    blueFilterWarmth: 70
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var parsed = JSON.parse(raw);
      var out = Object.assign({}, DEFAULTS, parsed);
      /* migrate old name if needed */
      if (out.theme === 'شب گرم') out.theme = 'warm';
      return out;
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      /* quota or private mode */
    }
  }

  function applyBlueFilter(settings) {
    var root = document.documentElement;
    var overlay = document.getElementById('blue-light-overlay');
    var controls = document.getElementById('blue-filter-controls');
    var isWarm = settings.theme === 'warm';
    var warmth = typeof settings.blueFilterWarmth === 'number' ? settings.blueFilterWarmth : 70;
    warmth = Math.max(0, Math.min(100, warmth));

    root.style.setProperty('--blue-filter-warmth', String(warmth));
    /* 0 = cooler (less amber), 100 = warmer (more amber) */
    var opacity = (0.08 + (warmth / 100) * 0.32).toFixed(3);
    var hue = (25 + (warmth / 100) * 20).toFixed(1); /* orange shift */
    root.style.setProperty('--blue-filter-opacity', opacity);
    root.style.setProperty('--blue-filter-hue', hue + 'deg');

    if (overlay) {
      overlay.classList.toggle('active', isWarm);
    }
    if (controls) {
      controls.hidden = !isWarm;
    }
    document.body.classList.toggle('theme-warm', isWarm);
  }

  function apply(settings) {
    var root = document.documentElement;
    root.style.setProperty('--font-size', settings.fontSize + 'px');
    root.style.setProperty('--font-family', settings.fontFamily);
    root.style.setProperty('--line-height', String(settings.lineHeight));
    root.style.setProperty('--content-width', settings.contentWidth + 'px');
    root.setAttribute('data-theme', settings.theme);
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
    var warmthEl = document.getElementById('blue-filter-strength');
    var warmthVal = document.getElementById('blue-filter-val');

    if (fontSizeEl) {
      fontSizeEl.value = settings.fontSize;
      if (fontSizeVal) fontSizeVal.textContent = toPersianDigits(settings.fontSize);
    }
    if (fontFamilyEl) {
      fontFamilyEl.value = settings.fontFamily;
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
    if (warmthEl) {
      warmthEl.value = settings.blueFilterWarmth;
      if (warmthVal) {
        warmthVal.textContent = toPersianDigits(settings.blueFilterWarmth) + '٪';
      }
    }

    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === settings.theme);
    });

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
    var warmthEl = document.getElementById('blue-filter-strength');

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
    if (warmthEl) {
      warmthEl.addEventListener('input', function () {
        update({ blueFilterWarmth: +warmthEl.value });
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
        else if (action === 'warmth-dec') update({ blueFilterWarmth: Math.max(0, settings.blueFilterWarmth - 5) });
        else if (action === 'warmth-inc') update({ blueFilterWarmth: Math.min(100, settings.blueFilterWarmth + 5) });
      });
    });

    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        update({ theme: btn.getAttribute('data-theme') });
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
