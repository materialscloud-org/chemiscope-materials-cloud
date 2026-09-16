/**
 * Render the archive entry's chemiscope files as clickable pills.
 * `onClick(key, button)` is invoked when a pill is clicked; all rendering
 * stays here so this module has no dependency on the loading logic.
 */
export function renderFileButtons(element, record, onClick) {
    element.innerHTML = '';
    record.files.forEach(function (file) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'file-button';

        var name = document.createElement('span');
        name.className = 'file-button-name';
        name.textContent = file.key;
        button.appendChild(name);

        if (file.size_human) {
            var size = document.createElement('span');
            size.className = 'file-button-size';
            size.textContent = file.size_human;
            button.appendChild(size);
        }

        button.addEventListener('click', function () {
            var active = element.querySelectorAll('.file-button.active');
            for (var i = 0; i < active.length; i++) {
                active[i].classList.remove('active');
            }
            button.classList.add('active');
            if (onClick) {
                onClick(file.key, button);
            }
        });

        element.appendChild(button);
    });
    element.style.display = 'flex';
}

export function highlightFileButton(container, fileKey) {
    var buttons = container.querySelectorAll('.file-button');
    for (var i = 0; i < buttons.length; i++) {
        var name = buttons[i].querySelector('.file-button-name');
        if (name && name.textContent === fileKey) {
            buttons[i].classList.add('active');
        } else {
            buttons[i].classList.remove('active');
        }
    }
}