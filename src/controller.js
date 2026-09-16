import {
  DEFAULT_DATASET_REF,
  fileDownloadUrl,
  externalDataUrl,
  fetchChemiscopeDatasets,
  isExternalUrl,
  parseArchiveFileUrl,
} from "./api.js";
import { displayError, displayWarning } from "./errors.js";
import { renderFileButtons } from "./files.js";
import { loadDataset, loadLocalFile } from "./dataset-loader.js";
import { renderRecordMeta } from "./meta.js";
import { resolveEntryRef, setLoadParam } from "./state.js";
import { teardownVisualizer } from "./visualizer.js";

let datasetRecords = [];

// Identity of the dataset currently displayed in the visualizer, in one of:
//   'ENTRYID_KEY' for an archive file, a raw URL for a direct external load,
//   'local' for a dropped file, DEFAULT_DATASET_REF for the bundled example.
let currentLoadedRef = null;

function recordIdFromRef(ref) {
  if (!ref) {
    return null;
  }
  var i = ref.indexOf("_");
  return i === -1 ? ref : ref.slice(0, i);
}

function showLoadPrompt(message) {
  var placeholder = document.getElementById("viewer-placeholder");
  placeholder.querySelector("p").textContent =
    message || "Select one of the files above to load it.";
  placeholder.style.display = "block";
  document.getElementById("viewer-row").style.display = "none";
}

function hideLoadPrompt() {
  document.getElementById("viewer-placeholder").style.display = "none";
  document.getElementById("viewer-row").style.display = "flex";
}

function loadFile(record, fileKey) {
  currentLoadedRef = record.id + "_" + fileKey;
  setLoadParam(record.id, fileKey);
  hideLoadPrompt();
  loadDataset(externalDataUrl(fileDownloadUrl(record, fileKey)))
    .then(hideLoadPrompt)
    .catch(function (error) {
      showLoadPrompt(
        "Could not load " +
          fileKey +
          " \u2014 pick one of the files above to retry.",
      );
      displayError(error);
    });
}

function highlightFile(filesElement, fileKey) {
  var buttons = filesElement.querySelectorAll(".file-button");
  for (var i = 0; i < buttons.length; i++) {
    var nameEl = buttons[i].querySelector(".file-button-name");
    buttons[i].classList.toggle(
      "active",
      nameEl && nameEl.textContent === fileKey,
    );
  }
}

export function populateDatasetSelect(records) {
  datasetRecords = records;
  var select = document.getElementById("dataset-select");
  select.innerHTML = "";
  select.disabled = records.length === 0;

  if (records.length === 0) {
    select.appendChild(new Option("No chemiscope datasets found", ""));
    return;
  }

  select.appendChild(new Option("\u2014 example dataset \u2014", ""));
  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    var meta = record.metadata || {};
    var count =
      record.files.length + " file" + (record.files.length === 1 ? "" : "s");
    var tag = record.doi || record.id;
    var label = (meta.title || record.id) + " (" + count + ") [" + tag + "]";
    var option = new Option(label, record.id);
    option.dataset.recordIndex = i;
    select.appendChild(option);
  }
}

function findRecordById(id) {
  for (var i = 0; i < datasetRecords.length; i++) {
    if (datasetRecords[i].id === id) {
      return datasetRecords[i];
    }
  }
  return null;
}

function fileKeyInRecord(record, fileKey) {
  for (var i = 0; i < record.files.length; i++) {
    if (record.files[i].key === fileKey) {
      return true;
    }
  }
  return false;
}

function selectRecord(record, fileKey, autoLoadFirst) {
  var metaElement = document.getElementById("record-meta");
  var filesElement = document.getElementById("dataset-files");
  renderRecordMeta(metaElement, record);
  renderFileButtons(filesElement, record, function (key) {
    loadFile(record, key);
  });
  if (fileKey) {
    // Highlight the correct pill and load it (caller updates ?load=)
    highlightFile(filesElement, fileKey);
    loadFile(record, fileKey);
  } else if (autoLoadFirst) {
    var first = filesElement.querySelector(".file-button");
    if (first) {
      first.click();
    }
  } else {
    showLoadPrompt("Select one of the files above to load it.");
  }
}

function handleLocalFile(file) {
  if (!/\.json(\.gz)?$/i.test(file.name)) {
    displayWarning("Not a .json / .json.gz file: " + file.name);
    return;
  }

  // Reset UI state from any archive selection
  var select = document.getElementById("dataset-select");
  select.selectedIndex = 0;
  setLoadParam("", null);
  document.getElementById("dataset-files").style.display = "none";

  // Tracking + prompt: we're about to load a local dataset, not from the index
  currentLoadedRef = "local";
  hideLoadPrompt();

  // Populate meta with custom file info
  var metaElement = document.getElementById("record-meta");
  renderRecordMeta(metaElement, {
    id: "local",
    url: null,
    doi: null,
    metadata: {
      title: "Custom file: " + file.name,
      description:
        "Loaded from your local disk. This file may not be part of the Materials Cloud Archive.",
    },
  });

  loadLocalFile(file)
    .then(hideLoadPrompt)
    .catch(function (error) {
      showLoadPrompt(
        "Could not load " + file.name + " \u2014 try another chemiscope file.",
      );
      displayError(error);
    });
}

export function init() {
  var select = document.getElementById("dataset-select");
  var url = new URL(window.location.href);
  var hasLoadParam = url.searchParams.get("load") !== null;
  var external = url.searchParams.get("load") || DEFAULT_DATASET_REF;

  select.addEventListener("change", function (event) {
    var option = event.target.selectedOptions[0];
    if (!option || option.value === "") {
      document.getElementById("dataset-files").style.display = "none";
      document.getElementById("record-meta").style.display = "none";
      setLoadParam("", null);
      teardownVisualizer();
      showLoadPrompt("Select an archive entry above, then one of its files.");
      return;
    }
    var record = datasetRecords[Number(option.dataset.recordIndex)];
    if (!record) {
      return;
    }
    renderRecordMeta(document.getElementById("record-meta"), record);
    var filesElement = document.getElementById("dataset-files");
    renderFileButtons(filesElement, record, function (key) {
      loadFile(record, key);
    });
    // The dropdown moved away from the currently displayed dataset: hide the
    // visualizer until one of the record's files is actually loaded.
    if (option.dataset.autoLoad === "true") {
      var first = filesElement.querySelector(".file-button");
      if (first) {
        first.click();
      }
    } else {
      if (recordIdFromRef(currentLoadedRef) !== record.id) {
        teardownVisualizer();
        showLoadPrompt("Select one of the files above to load it.");
      }
      setLoadParam(record.id, null);
    }
    option.dataset.autoLoad = "false";
  });

  var fileInput = document.getElementById("file-input");
  var dropZone = document.getElementById("drop-zone");

  fileInput.addEventListener("change", function () {
    if (fileInput.files.length > 0) {
      handleLocalFile(fileInput.files[0]);
    }
    fileInput.value = "";
  });

  dropZone.addEventListener("click", function () {
    fileInput.click();
  });

  dropZone.addEventListener("dragover", function (event) {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });

  dropZone.addEventListener("dragleave", function () {
    dropZone.classList.remove("dragging");
  });

  dropZone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    if (event.dataTransfer.files.length > 0) {
      handleLocalFile(event.dataTransfer.files[0]);
    }
  });

  window.addEventListener("dragover", function (event) {
    event.preventDefault();
  });

  window.addEventListener("drop", function (event) {
    event.preventDefault();
  });

  // Archive URLs may still point at entries we know about locally; defer
  // their load until the index arrives so we can canonicalize ?load=.
  var pendingArchive = null;

  if (external) {
    if (isExternalUrl(external)) {
      if (parseArchiveFileUrl(external)) {
        pendingArchive = external;
      } else {
        currentLoadedRef = external;
        hideLoadPrompt();
        loadDataset(externalDataUrl(external))
          .then(hideLoadPrompt)
          .catch(function (error) {
            showLoadPrompt("Could not load the dataset from the URL above.");
            displayError(error);
          });
      }
    }
  }
  fetchChemiscopeDatasets()
    .then(function (records) {
      populateDatasetSelect(records);
      if (pendingArchive) {
        var ref = parseArchiveFileUrl(pendingArchive);
        var record = ref ? findRecordById(ref.id) : null;
        if (record && fileKeyInRecord(record, ref.fileKey)) {
          select.selectedIndex = datasetRecords.indexOf(record) + 1;
          selectRecord(record, ref.fileKey, false);
        } else {
          displayWarning(
            "Archive entry not in local index \u2014 loading URL directly: " +
              ref.fileKey,
          );
          currentLoadedRef = pendingArchive;
          hideLoadPrompt();
          loadDataset(externalDataUrl(pendingArchive))
            .then(hideLoadPrompt)
            .catch(function (error) {
              showLoadPrompt("Could not load the dataset from the URL above.");
              displayError(error);
            });
        }
        return;
      }
      if (external && !isExternalUrl(external)) {
        var resolved = resolveEntryRef(external, datasetRecords);
        if (resolved) {
          select.selectedIndex = resolved.index + 1;
          selectRecord(resolved.record, resolved.file, false);
        } else if (hasLoadParam) {
          displayWarning("Unknown entry/file in URL: " + external);
        } else {
          // default dataset is a local file in public/ — load it directly
          var metaElement = document.getElementById("record-meta");
          renderRecordMeta(metaElement, {
            id: "example",
            url: null,
            doi: null,
            metadata: {
              title: "Example Dataset",
              description:
                "You are viewing a bundled example dataset. You can select a Materials Cloud Archive record from the menu above, or drop your own chemiscope file to visualize it.",
            },
          });
          currentLoadedRef = external;
          hideLoadPrompt();
          loadDataset(external)
            .then(hideLoadPrompt)
            .catch(function (error) {
              showLoadPrompt("Could not load the example dataset.");
              displayError(error);
            });
        }
      }
    })
    .catch(function (error) {
      if (pendingArchive) {
        currentLoadedRef = pendingArchive;
        hideLoadPrompt();
        loadDataset(externalDataUrl(pendingArchive))
          .then(hideLoadPrompt)
          .catch(function (err) {
            showLoadPrompt("Could not load the dataset from the URL above.");
            displayError(err);
          });
      } else {
        displayWarning("Could not load the dataset index: " + error.toString());
      }
    });
}
