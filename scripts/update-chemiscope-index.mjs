#!/usr/bin/env node
/**
 * Query the Materials Cloud Archive for every record containing a chemiscope
 * data file (a file with "chemiscope" in its name ending in `.json` or
 * `.json.gz`) and write a static JSON index to public/chemiscope-datasets.json.
 *
 * Usage:
 *     node scripts/update-chemiscope-index.mjs
 */

import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const MCA_API = "https://archive.materialscloud.org/api/records";
const MCA_QUERY = "files.entries.key:*chemiscope*";
const OUTPUT = "public/chemiscope-datasets.json";

function stripHtml(html) {
  if (!html) return "";
  const entities = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&ndash;": "–",
    "&mdash;": "—",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&hellip;": "…",
  };
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, (entity) => entities[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function recordMetadata(metadata) {
  metadata = metadata || {};
  return {
    title: metadata.title || "",
    description: stripHtml(metadata.description) || "",
    creators: (metadata.creators || [])
      .map((creator) => creator.person_or_org && creator.person_or_org.name)
      .filter(Boolean),
    publication_date: metadata.publication_date || "",
    license:
      (metadata.rights &&
        metadata.rights[0] &&
        metadata.rights[0].title &&
        metadata.rights[0].title.en) ||
      "",
    subjects: (metadata.subjects || [])
      .map((subject) => subject.subject)
      .filter(Boolean),
  };
}

function isChemiscopeFile(key) {
  return (
    key.toLowerCase().includes("chemiscope") && /\.json(\.gz)?$/i.test(key)
  );
}

function formatHumanSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function chemiscopeFiles(entries, recordId) {
  return Object.entries(entries)
    .filter(([key]) => isChemiscopeFile(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => {
      const size = entry && entry.size ? entry.size : 0;
      return {
        key: key,
        size: size,
        size_human: formatHumanSize(size),
        description:
          (entry && entry.metadata && entry.metadata.description) || "",
        dlURL: `https://archive.materialscloud.org/records/${recordId}/files/${encodeURIComponent(key)}`,
      };
    });
}

export async function fetchChemiscopeDatasets() {
  const records = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      q: MCA_QUERY,
      size: 100,
      page: page,
      sort: "updated-desc",
    });
    const url = `${MCA_API}?${params}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`search failed with HTTP ${response.status}`);
    }
    const data = await response.json();

    for (const hit of data.hits.hits) {
      const entries = hit.files && hit.files.entries ? hit.files.entries : {};
      const files = chemiscopeFiles(entries, hit.id);
      if (files.length > 0) {
        records.push({
          id: hit.id,
          url:
            (hit.links && hit.links.self_html) ||
            `https://archive.materialscloud.org/records/${hit.id}`,
          doi: hit.pids && hit.pids.doi ? hit.pids.doi.identifier : "",
          metadata: recordMetadata(hit.metadata),
          files: files,
        });
      }
    }

    console.log(
      `  page ${page}: ${data.hits.total} total hits, ${records.length} records so far`,
    );
    if (page * 100 >= data.hits.total) {
      break;
    }
    page += 1;
  }

  return records;
}

async function main() {
  console.log(`Querying ${MCA_API} ...`);
  const records = await fetchChemiscopeDatasets();
  console.log(`Found ${records.length} records with chemiscope files`);

  await writeFile(OUTPUT, JSON.stringify(records, null, 2) + "\n");
  console.log(`Written to ${OUTPUT}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
