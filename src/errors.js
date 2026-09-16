export function displayError(error) {
    const display = document.getElementById('error-display');
    display.style.display = 'block';
    display.getElementsByTagName('p')[0].innerText = error.toString();
    const stacktrace = display.getElementsByTagName('details')[0];
    stacktrace.getElementsByTagName('p')[0].innerText = error.stack || '';
}

export function displayWarning(message, timeout) {
    if (timeout === undefined) timeout = 4000;
    const display = document.getElementById('warning-display');
    display.style.display = 'block';
    display.getElementsByTagName('p')[0].innerText = message;
    if (timeout > 0) {
        setTimeout(function () {
            display.style.display = 'none';
        }, timeout);
    }
}