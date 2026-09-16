export const MCA_API = 'https://archive.materialscloud.org/api/records';

export const DEFAULT_DATASET_REF = 'gxcgf-rkh55_arginine-kpcovr-0.55-chemiscope.json.gz';

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
 * Guess a file name (used to build a `File` for streaming/parsing) from a
 * dataset URL: prefer the `filename` query parameter, then the last path
 * segment, then a neutral fallback.
 */
export function fileNameFromUrl(url) {
    var parsed = new URL(url);
    var name = parsed.searchParams.get('filename');
    if (name) {
        return name;
    }
    var segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
        return decodeURIComponent(segments[segments.length - 1]);
    }
    return 'dataset.json';
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