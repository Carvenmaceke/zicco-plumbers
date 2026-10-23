// Node-only modules (SMTP, files, PDF library) that the Apps Script backend never calls.
const unavailable = () => { throw new Error("Not available in Google Apps Script"); };
export default { createTransport: unavailable, mkdir: unavailable, writeFile: unavailable, join: unavailable };
export const createTransport = unavailable, mkdir = unavailable, writeFile = unavailable, join = unavailable;
export const PDFDocument = { create: unavailable }, StandardFonts = {};
export const rgb = () => ({}); // colour constants are created when the shared code loads; harmless here
