import { hideProgress, hideSpinner, setLoadingText, setProgress, uiTick } from './progress.js';
import { releaseActiveStream } from './streaming.js';

// chemiscope 1.1.0 only accepts these top-level settings keys (anything else
// throws `invalid key "<key>" in settings`).
const ALLOWED_SETTINGS = ['map', 'structure', 'pinned', 'target'];

export function sanitizeSettings(settings) {
    if (!settings || typeof settings !== 'object') {
        return {};
    }
    const out = {};
    for (const key of ALLOWED_SETTINGS) {
        if (key in settings) {
            out[key] = settings[key];
        }
    }
    return out;
}

let currentVisualizer = undefined;

export function teardownVisualizer() {
    if (currentVisualizer !== undefined) {
        try {
            currentVisualizer.remove();
        } catch (e) {}
        currentVisualizer = undefined;
    }
    // drop the IndexedDB store of a previously streamed dataset (no-op if none)
    releaseActiveStream();
}

/**
 * Create the chemiscope viewer. For streamed datasets, `options.loadStructure`
 * lazily materializes structures from IndexedDB on demand.
 */
export async function buildVisualizer(dataset, options) {
    options = options || {};
    const config = {
        meta: 'chemiscope-meta',
        map: 'chemiscope-map',
        info: 'chemiscope-info',
        structure: 'chemiscope-structure',
        settings: sanitizeSettings(dataset.settings),
    };
    if (options.loadStructure) {
        config.loadStructure = options.loadStructure;
    }

    setLoadingText('Creating chemiscope visualizer \u2026');
    setProgress(null);
    await uiTick();

    const visualizer = await Chemiscope.DefaultVisualizer.load(config, dataset);

    visualizer.structure.positionSettingsModal = function (rect) {
        var structureRect = document.getElementById('chemiscope-structure').getBoundingClientRect();
        return { top: structureRect.top, left: structureRect.left - rect.width - 25 };
    };

    visualizer.map.positionSettingsModal = function (rect) {
        var mapRect = document.getElementById('chemiscope-map').getBoundingClientRect();
        var left;
        if (window.innerWidth < 1400) {
            left = window.innerWidth - rect.width - 10;
        } else {
            left = mapRect.left + mapRect.width + 25;
        }
        return { top: mapRect.top, left: left };
    };

    currentVisualizer = visualizer;
    hideSpinner();
    hideProgress();
}