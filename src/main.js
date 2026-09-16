import { init } from './controller.js';
import { displayError } from './errors.js';

// Surface any uncaught errors in the error banner
window.onerror = function (msg, url, line, col, error) {
    if (error !== undefined) {
        displayError(error);
    }
};
window.onunhandledrejection = function (event) {
    displayError(event.reason);
};

// Module scripts are deferred (run after parsing), so the DOM is ready.
// Add a DOMContentLoaded listener anyway — the mc-header defer script
// adds its own DOM work, and we need to fire after all deferred scripts
// have finished.
document.addEventListener('DOMContentLoaded', init);

// Hide mc-header and the loaded-from notice when ?minimal=true
(function () {
    var params = new URLSearchParams(window.location.search);
    if (params.get('minimal') === 'true') {
        var header = document.querySelector('mc-header');
        if (header) {
            header.style.display = 'none';
        }
        var mcInfo = document.getElementById('loaded-from-materialscloud');
        if (mcInfo) {
            mcInfo.style.display = 'none';
        }
    }
})();