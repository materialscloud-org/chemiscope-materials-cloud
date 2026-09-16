export function showSpinner() {
    document.getElementById('spinner').style.display = 'block';
}

export function hideSpinner() {
    document.getElementById('spinner').style.display = 'none';
}

export function setLoadingText(text) {
    document.getElementById('loading-text').innerText = text === undefined ? '' : text;
}

/**
 * Drive the loading progress bar. `percent` is a number in [0, 1] for a
 * determinate bar; `null` switches to the indeterminate animation (used for
 * phases whose duration cannot be measured, e.g. JSON parsing).
 */
export function setProgress(percent) {
    var bar = document.getElementById('progress-bar');
    var wrap = document.getElementById('progress');
    if (percent === null || percent === undefined) {
        wrap.classList.add('indeterminate');
    } else {
        wrap.classList.remove('indeterminate');
        bar.style.width = Math.max(0, Math.min(1, percent)) * 100 + '%';
    }
    wrap.style.display = 'block';
}

export function hideProgress() {
    document.getElementById('progress').style.display = 'none';
}

export function uiTick() {
    return new Promise(function (r) {
        setTimeout(r, 10);
    });
}

export function formatSize(size) {
    return (size / (1024 * 1024)).toFixed(2) + ' MiB';
}