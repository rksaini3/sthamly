export const RECORDS_BUCKET = "medical-records";
export const MAX_RECORD_BYTES = 4 * 1024 * 1024; // Vercel request limit ~4.5 MB
export const RECORD_KINDS = ["xray", "report", "prescription", "other"] as const;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RecordMime = "application/pdf" | "image/jpeg" | "image/png";

// फ़ाइल की असली पहचान उसके शुरुआती bytes से। Browser के दिए type पर भरोसा नहीं।
export function sniffType(buf: Buffer): RecordMime | null {
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  return null;
}