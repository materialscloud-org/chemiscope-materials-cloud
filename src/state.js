/**
 * Resolve a `ENTRYID` or `ENTRYID_FILE` reference (from the `?load=`
 * search param) against the dataset index.
 * Returns { record, index, file } or null.
 */
export function resolveEntryRef(ref, records) {
    for (var i = 0; i < records.length; i++) {
        var record = records[i];
        if (ref === record.id) {
            return { record: record, index: i, file: null };
        }
        if (ref.indexOf(record.id + '_') === 0) {
            var fileKey = ref.slice(record.id.length + 1);
            for (var j = 0; j < record.files.length; j++) {
                if (record.files[j].key === fileKey) {
                    return { record: record, index: i, file: fileKey };
                }
            }
        }
    }
    return null;
}

/**
 * Keep the `?load=` search param in sync with the user's selection, so the
 * current view can be shared as a URL. `fileKey` empty clears the param.
 */
export function setLoadParam(recordId, fileKey) {
    var url = new URL(window.location.href);
    if (fileKey) {
        url.searchParams.set('load', recordId + '_' + fileKey);
    } else {
        url.searchParams.delete('load');
    }
    history.replaceState(null, '', url.toString());
}