const path = require("path");
// The package entry point runs a self-test when required directly, so load the library file.
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const mammoth = require("mammoth");

const SUPPORTED_EXTENSIONS = [".txt", ".gift", ".csv", ".pdf", ".docx", ".md"];

async function extractText(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (ext === ".pdf") {
    const result = await pdfParse(file.buffer);
    return result.text || "";
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || "";
  }

  return file.buffer.toString("utf8");
}

module.exports = { extractText, SUPPORTED_EXTENSIONS };
