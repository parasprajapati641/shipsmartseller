// Pure TypeScript Zero-Dependency ZIP Archive Exporter
// Formats files into standard PKZIP zip archive for batch catalog export.

export type ZipItemInput = {
  filename: string;
  blob: Blob;
};

/** Build CRC32 lookup table & calculate CRC32 checksum for buffer */
function crc32(buf: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    crc = crc ^ byte;
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ -1) >>> 0;
}

/** Convert Date object to MS-DOS Time and Date format */
function toDosTimeDate(date: Date) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1f);
  const d =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { time, date: d };
}

/** Create standard ZIP Blob from list of filenames and Blobs */
export async function createZipArchive(items: ZipItemInput[]): Promise<Blob> {
  const parts: Uint8Array[] = [];
  const centralDirectoryHeaders: Uint8Array[] = [];

  let currentOffset = 0;
  const now = new Date();
  const { time: dosTime, date: dosDate } = toDosTimeDate(now);

  for (const item of items) {
    const fileBytes = new Uint8Array(await item.blob.arrayBuffer());
    const nameBytes = new TextEncoder().encode(item.filename);
    const checksum = crc32(fileBytes);
    const uncompressedSize = fileBytes.length;
    const compressedSize = fileBytes.length; // Stored (no compression) method 0

    // Local file header (30 bytes + name length)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local header signature
    view.setUint16(4, 20, true); // Version needed
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method (0 = store)
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, checksum, true);
    view.setUint32(18, compressedSize, true);
    view.setUint32(22, uncompressedSize, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true); // Extra field length

    localHeader.set(nameBytes, 30);

    parts.push(localHeader);
    parts.push(fileBytes);

    // Central directory header (46 bytes + name length)
    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cdHeader.buffer);

    cdView.setUint32(0, 0x02014b50, true); // Central header signature
    cdView.setUint16(4, 20, true); // Version made by
    cdView.setUint16(6, 20, true); // Version needed
    cdView.setUint16(8, 0, true); // Bit flag
    cdView.setUint16(10, 0, true); // Compression method (0)
    cdView.setUint16(12, dosTime, true);
    cdView.setUint16(14, dosDate, true);
    cdView.setUint32(16, checksum, true);
    cdView.setUint32(20, compressedSize, true);
    cdView.setUint32(24, uncompressedSize, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint16(30, 0, true); // Extra field len
    cdView.setUint16(32, 0, true); // Comment len
    cdView.setUint16(34, 0, true); // Disk start
    cdView.setUint16(36, 0, true); // Internal attrs
    cdView.setUint32(38, 0, true); // External attrs
    cdView.setUint32(42, currentOffset, true); // Local header offset

    cdHeader.set(nameBytes, 46);
    centralDirectoryHeaders.push(cdHeader);

    currentOffset += localHeader.length + fileBytes.length;
  }

  // Calculate central directory offset & size
  const cdOffset = currentOffset;
  let cdSize = 0;
  for (const cd of centralDirectoryHeaders) {
    parts.push(cd);
    cdSize += cd.length;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Disk num
  eocdView.setUint16(6, 0, true); // Disk with CD
  eocdView.setUint16(8, items.length, true); // Entries on disk
  eocdView.setUint16(10, items.length, true); // Total entries
  eocdView.setUint32(12, cdSize, true); // CD size
  eocdView.setUint32(16, cdOffset, true); // CD offset
  eocdView.setUint16(20, 0, true); // Comment length

  parts.push(eocd);

  return new Blob(parts as unknown as BlobPart[], { type: "application/zip" });
}

/** Helper to trigger browser download of a Zip Blob */
export function downloadZipFile(zipBlob: Blob, zipFilename: string = "ship_smart_catalog.zip") {
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
