import { fileNameFromUrl } from "./api.js";
import { displayWarning } from "./errors.js";
import {
  formatSize,
  setLoadingText,
  setProgress,
  showSpinner,
  uiTick,
} from "./progress.js";
import {
  loadDatasetStreaming,
  parseJsonWithNaN,
  progressMessage,
  shouldUseStreaming,
} from "./streaming.js";
import { buildVisualizer, teardownVisualizer } from "./visualizer.js";

/**
 * Download a dataset URL (streaming reads with a determinate progress bar),
 * then hand the bytes to the shared loadFile() path.
 */
export async function loadDataset(url) {
  showSpinner();
  setLoadingText("");
  setProgress(0);
  teardownVisualizer();

  const response = await fetch(url);
  if (!response.ok) {
    throw Error("unable to load file at '" + url + "'");
  }

  const contentLength = +response.headers.get("Content-Length");
  const chunks = [];

  if (contentLength === 0) {
    setLoadingText("Loading data: unknown size \u2026");
    setProgress(null);
    const buffer = await response.arrayBuffer();
    if (
      buffer.byteLength === 0 &&
      url.startsWith("https://cors.materialscloud.org/")
    ) {
      throw Error("unable to load file at '" + url + "'");
    }
    chunks.push(new Uint8Array(buffer));
  } else {
    if (contentLength / (1024 * 1024) > 300) {
      displayWarning(
        "You are trying to load a very large file (" +
          formatSize(contentLength) +
          "), JavaScript might not have access to enough memory to process it",
      );
    }

    const reader = response.body.getReader();
    let receivedLength = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      chunks.push(result.value);
      receivedLength += result.value.byteLength;
      const percent = receivedLength / contentLength;
      setLoadingText(
        "Loading data: " +
          formatSize(receivedLength) +
          " out of " +
          formatSize(contentLength) +
          " (" +
          Math.round(percent * 100) +
          "%) \u2026",
      );
      setProgress(percent);
    }
  }

  const fileName = fileNameFromUrl(url);
  const totalLength = chunks.reduce(function (sum, c) {
    return sum + c.byteLength;
  }, 0);
  const combined = new Uint8Array(totalLength);
  var offset = 0;
  for (var i = 0; i < chunks.length; i++) {
    combined.set(chunks[i], offset);
    offset += chunks[i].byteLength;
  }
  const file = new File([combined], fileName);
  await loadFile(file);
}

/**
 * Load a locally selected/dropped file (already validated as .json/.json.gz).
 */
export async function loadLocalFile(file) {
  showSpinner();
  setLoadingText("Loading local file: " + file.name + " \u2026");
  setProgress(null);
  teardownVisualizer();
  await loadFile(file);
}

/**
 * Shared path: stream datasets large enough to justify the IndexedDB plumbing
 * (chemiscope's own >75 MB threshold), parse smaller files fully in memory.
 */
async function loadFile(file) {
  if (shouldUseStreaming(file)) {
    setLoadingText("Streaming " + file.name + " \u2026");
    setProgress(null);
    const { dataset, loadStructure } = await loadDatasetStreaming(
      file,
      function (progress) {
        setLoadingText(
          progressMessage(progress) +
            " \u2014 " +
            formatSize(progress.bytesRead) +
            " of " +
            formatSize(progress.bytesTotal),
        );
        setProgress(progress.bytesRead / progress.bytesTotal);
      },
    );
    await buildVisualizer(dataset, { loadStructure: loadStructure });
  } else {
    const dataset = await readSmallFile(file);
    await buildVisualizer(dataset);
  }
}

/** Parse a small (< streaming threshold) dataset fully in memory. */
async function readSmallFile(file) {
  let text;
  if (/\.gz$/i.test(file.name)) {
    setLoadingText("Decompressing \u2026");
    setProgress(null);
    await uiTick();
    text = await gunzipText(file);
  } else {
    text = await file.text();
  }

  setLoadingText("Parsing JSON \u2026");
  setProgress(null);
  await uiTick();

  return parseJsonWithNaN(text);
}

/** Native gzip decompression via DecompressionStream (no pako anymore). */
function gunzipText(file) {
  const streamed = file.stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(streamed).text();
}
