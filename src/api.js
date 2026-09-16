export const MCA_API = 'https://archive.materialscloud.org/api/records';

export const DEFAULT_DATASET_REF = 'arginine-kpcovr-0.55-chemiscope.json';

/**
 * Build the download URL for one file of an archive record. The `filename`
 * query parameter carries the original file key, which we need to detect .gz
 * input when the downloaded bytes are handed to the streaming loader.
 */
export function datasetUrlFromRecord(record, fileKey) {
    return (
        MCA_API +
        '/' +
        record.id +
        '/files/' +
        encodeURIComponent(fileKey) +
        '/content?filename=' +
        encodeURIComponent(fileKey) +
        '&materials_cloud_doi=' +
        encodeURIComponent(record.doi || '')
    );
}

/**
 * Download URL for one file of a record.
 */
export function fileDownloadUrl(record, fileKey) {
    return datasetUrlFromRecord(record, fileKey);
}

export function externalDataUrl(external) {
    const url = new URL(external);
    if (url.hostname.includes('materialscloud.org')) {
        // we control materialscloud so we can add cors on those endpoints.
        return external;
    }
    return 'https://cors.materialscloud.org/' + external; // the others we use our own cors workaround.
}

export function isExternalUrl(value) {
    return value.indexOf('://') !== -1;
}

/**
 * Extract the archive record id + file key from a materialscloud archive file
 * URL, matching both the API form
 * (`https://archive.materialscloud.org/api/records/ENTRYID/files/KEY/content`)
 * and the direct download form used by the index `dlURL`
 * (`https://archive.materialscloud.org/records/ENTRYID/files/KEY?download=1`).
 * Returns null when the URL does not point at an archive file. Also unwraps
 * the `cors.materialscloud.org` proxy prefix so proxied archive links resolve
 * too.
 */
export function parseArchiveFileUrl(url) {
    var raw = url;
    var proxyPrefix = 'https://cors.materialscloud.org/';
    if (raw.indexOf(proxyPrefix) === 0) {
        raw = raw.slice(proxyPrefix.length);
    }
    var match = raw.match(
        /^https?:\/\/archive\.materialscloud\.org\/(?:api\/records|records)\/([^/]+)\/files\/([^/?]+)/
    );
    if (!match) {
        return null;
    }
    return {
        id: decodeURIComponent(match[1]),
        fileKey: decodeURIComponent(match[2]),
    };
}

/**
 * Guess a file name (used to build a `File` for streaming/parsing) from a
 * dataset URL: prefer the `filename` query parameter, then the last path
 * segment, then a neutral fallback. Handles both absolute and relative URLs.
 */
export function fileNameFromUrl(url) {
    try {
        var parsed = new URL(url, window.location.href);
        var name = parsed.searchParams.get('filename');
        if (name) {
            return name;
        }
        var segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
            return decodeURIComponent(segments[segments.length - 1]);
        }
    } catch (e) {
        // fall through — use raw string
    }
    var fallback = url.split('/').pop();
    return fallback || 'dataset.json';
}

/**
 * Load the cached index written by scripts/update-chemiscope-index.mjs
 * (see public/chemiscope-datasets.json).
 */
export async function fetchChemiscopeDatasets() {
    var response = await fetch('chemiscope-datasets.json');
    if (!response.ok) {
        throw Error('HTTP ' + response.status);
    }
    return await response.json();
}