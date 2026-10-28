const path = require("path");
const { parseQuestions } = require("../utils/parsers");
const { extractText, SUPPORTED_EXTENSIONS } = require("../utils/extractText");

const FORMATS = ["auto", "text", "gift", "csv"];

const importQuestions = async (req, res) => {
  try {
    const format = FORMATS.includes(req.body.format) ? req.body.format : "auto";
    let text = "";
    let sourceName = "Pasted text";

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({
          message: `Unsupported file type. Use ${SUPPORTED_EXTENSIONS.join(", ")}`,
        });
      }
      sourceName = req.file.originalname;
      text = await extractText(req.file);
    } else {
      text = String(req.body.text || "");
    }

    if (!text.trim()) {
      return res.status(400).json({
        message: req.file
          ? "No readable text found. Scanned/image PDFs are not supported — export the PDF with selectable text."
          : "Paste some questions first",
      });
    }

    const result = parseQuestions(text, format, sourceName);

    if (!result.questions.length) {
      return res.status(422).json({
        message:
          "No questions could be detected. Check the format guide or download a template.",
        warnings: result.warnings,
        format: result.format,
      });
    }

    return res.json({ ...result, sourceName });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Import failed" });
  }
};

module.exports = { importQuestions };
