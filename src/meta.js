export function renderRecordMeta(element, record) {
  element.innerHTML = "";
  var meta = record.metadata || {};

  var title = document.createElement("h2");
  title.className = "record-meta-title";
  var text = `${meta.title || record.id}` + (record.doi ? ` [${record.doi}]` : "");
  if (record.url) {
    var link = document.createElement("a");
    link.href = record.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = text;
    title.appendChild(link);
  } else {
    // e.g. the bundled example dataset / locally dropped file: no link target
    title.textContent = text;
  }

  element.appendChild(title);

  var details = [];
  if (meta.publication_date) {
    details.push(new Date(meta.publication_date).getUTCFullYear());
  }
  if (meta.creators && meta.creators.length > 0) {
    details.push(meta.creators.join(", "));
  }
  if (meta.license) {
    details.push(meta.license);
  }
  if (details.length > 0) {
    var line = document.createElement("div");
    line.className = "record-meta-line";
    line.textContent = details.join(" · ");
    element.appendChild(line);
  }

  if (meta.description) {
    var description = document.createElement("div");
    description.className = "record-meta-description";
    var full = document.createElement("p");
    full.textContent = meta.description;
    description.appendChild(full);
    element.appendChild(description);
  }

  element.style.display = "block";
}
