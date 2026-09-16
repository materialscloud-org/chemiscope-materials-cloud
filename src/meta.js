export function renderRecordMeta(element, record) {
  element.innerHTML = "";
  var meta = record.metadata || {};

  var title = document.createElement("h2");
  title.className = "record-meta-title";
  var link = document.createElement("a");
  link.href =
    record.url || "https://archive.materialscloud.org/records/" + record.id;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent =
    `${meta.title || record.id}` + (record.doi ? ` [${record.doi}]` : "");
  title.appendChild(link);

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
