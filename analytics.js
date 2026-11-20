/* Ember Labs event tracking for the Country grid assessment tool.
 *
 * Uses Umami (cookieless, no personal data), loaded in index.html. This file only watches
 * the page and reports the events below; it doesn't touch the tool's own code. If Umami is
 * blocked or missing, nothing happens and the tool works as normal.
 *
 * Every event carries tool: 'country-grid-assessment' and the country currently selected.
 * Event names follow the draft Labs vocabulary where one fits.
 *
 * Events
 *   country_selected    {}                        the Country drop-down
 *   section_toggled     {section, open}           a section opened or closed (sum, chars,
 *                                                 gen, flex, dem, rel, cong, util), or
 *                                                 section 'all' for Expand all / Collapse all
 *   section_jumped      {section, from}           a jump to a section: from 'nav' (the jump
 *                                                 links) or 'summary_tile' (a summary tile)
 *   indicator_selected  {section, column, indicator}  an indicator drop-down, where a section
 *                                                 offers more than one indicator
 *   method_opened       {panel, section, metric}  'How this is calculated', 'How to interpret
 *                                                 this data' or 'How the indicators are built'
 *                                                 opened
 *
 * The page relies on these hooks (keep them if the page is rebuilt): #sel-country,
 * data-acc, data-all, data-jump, data-ind, .sumtile, details > summary, .sec, .mtitle.
 */
(function () {
    'use strict';

    var TOOL = 'country-grid-assessment';

    function text(el, max) {
        if (!el) return undefined;
        var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return t ? t.slice(0, max || 60) : undefined;
    }
    function country() {
        var sel = document.getElementById('sel-country');
        return sel && sel.selectedIndex >= 0 ? text(sel.options[sel.selectedIndex]) : undefined;
    }
    function track(name, data) {
        try {
            if (!window.umami || typeof window.umami.track !== 'function') return;
            var payload = { tool: TOOL, country: country() };
            if (data) Object.keys(data).forEach(function (k) {
                if (data[k] !== undefined && data[k] !== null && data[k] !== '') payload[k] = data[k];
            });
            window.umami.track(name, payload);
        } catch (e) { /* never let tracking break the tool */ }
    }
    window.labsTrack = track;

    // Only count what a visitor actually did (script-made events are marked untrusted).
    // (__labsTrackUntrusted exists only so automated tests can simulate clicks.)
    function byVisitor(e) { return e.isTrusted !== false || window.__labsTrackUntrusted === true; }

    function sectionOf(el) {
        var sec = el && el.closest ? el.closest('section.sec, [id^="thing-"], [id^="sec-"]') : null;
        if (!sec || !sec.id) return undefined;
        return sec.id.replace(/^thing-/, '').replace(/^sec-/, '');
    }

    document.addEventListener('click', function (e) {
        if (!byVisitor(e)) return;
        var t = e.target && e.target.closest ? e.target.closest('[data-acc],[data-all],[data-jump]') : null;
        if (!t) return;
        if (t.hasAttribute('data-acc')) {
            // Runs before the page re-renders, so aria-expanded is still the old state.
            var wasOpen = t.getAttribute('aria-expanded') === 'true';
            return track('section_toggled', { section: t.getAttribute('data-acc'), open: !wasOpen });
        }
        if (t.hasAttribute('data-all')) {
            return track('section_toggled', { section: 'all', open: t.getAttribute('data-all') === 'open' });
        }
        if (t.hasAttribute('data-jump')) {
            return track('section_jumped', {
                section: t.getAttribute('data-jump'),
                from: t.classList.contains('sumtile') ? 'summary_tile' : 'nav'
            });
        }
    }, true);

    document.addEventListener('change', function (e) {
        if (!byVisitor(e)) return;
        var t = e.target;
        if (!t) return;
        if (t.id === 'sel-country') {
            // The page re-renders on change; report once the new country is selected.
            return setTimeout(function () { track('country_selected'); }, 0);
        }
        if (t.hasAttribute && t.hasAttribute('data-ind')) {
            var parts = t.getAttribute('data-ind').split('|');
            var opt = t.options && t.selectedIndex >= 0 ? t.options[t.selectedIndex] : null;
            var name = opt ? text(opt).replace(/\s*\(data not reported\)$/, '') : undefined;
            track('indicator_selected', { section: parts[0], column: parts[1], indicator: name });
        }
    }, true);

    // <details> panels fire 'toggle', which doesn't bubble, so listen in the capture phase.
    // The metric is the chart's title line (.mtitle) in the indicator columns, or the card's
    // heading (h3) in the country characteristics. One opening counts once.
    var lastOpened = null, lastOpenedAt = 0;
    document.addEventListener('toggle', function (e) {
        if (!byVisitor(e)) return;
        var d = e.target;
        if (!d || d.tagName !== 'DETAILS' || !d.open) return;
        var now = Date.now();
        if (d === lastOpened && now - lastOpenedAt < 1000) return;
        lastOpened = d; lastOpenedAt = now;
        var card = d.closest('.colx');
        track('method_opened', {
            panel: text(d.querySelector('summary')),
            section: sectionOf(d),
            metric: card ? (text(card.querySelector('.mtitle')) || text(card.querySelector('h3'))) : undefined
        });
    }, true);
})();
