const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { createWorker } = require("tesseract.js");
require("dotenv").config();

const geminiModelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

async function extractDocumentText(fileBuffer, mimeType) {
  if (!fileBuffer) return { text: "", status: "unreadable", engine: "none" };

  if (
    mimeType === "application/pdf" ||
    fileBuffer.toString("utf8", 0, 4) === "%PDF"
  ) {
    try {
      const pdfData = await pdfParse(fileBuffer);
      if (pdfData.text && pdfData.text.trim()) {
        return { text: pdfData.text, status: "readable", engine: "pdf-parse" };
      }
    } catch (error) {
      console.error("PDF text extraction failed:", error.message);
    }
  }

  if (mimeType && mimeType.startsWith("image/")) {
    try {
      const worker = await createWorker("eng");
      const result = await worker.recognize(fileBuffer);
      await worker.terminate();
      const text = result.data.text || "";
      return {
        text,
        status: text.trim() ? "readable" : "unreadable",
        engine: "tesseract.js",
      };
    } catch (error) {
      console.error("Image OCR failed:", error.message);
    }
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = docxData.value || "";
      return {
        text,
        status: text.trim() ? "readable" : "unreadable",
        engine: "mammoth",
      };
    } catch (error) {
      console.error("DOCX text extraction failed:", error.message);
    }
  }

  return { text: "", status: "unreadable", engine: "none" };
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparable(value) {
  return normalizeText(value)
    .replace(/[.,/\\()\-_:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compareText(entered, document) {
  if (!entered) return "not_applicable";
  if (!document) return "missing";
  const enteredWords = normalizeComparable(entered).split(" ").sort().join(" ");
  const documentWords = normalizeComparable(document)
    .split(" ")
    .sort()
    .join(" ");
  return enteredWords === documentWords ? "match" : "mismatch";
}

function compareNumber(entered, document) {
  if (entered === undefined || entered === null || entered === "")
    return "not_applicable";
  if (document === undefined || document === null || document === "")
    return "missing";
  const enteredNumber = Number(String(entered).replace(/[^0-9.\-]/g, ""));
  const documentNumber = Number(String(document).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(enteredNumber) || !Number.isFinite(documentNumber))
    return "unclear";
  return Math.abs(enteredNumber - documentNumber) < 0.1 ? "match" : "mismatch";
}

function buildField(entered, document, status) {
  return { entered: entered ?? null, document: document ?? null, status };
}

function normalizeStructuredResult(parsed, enteredData, extraction) {
  const documentData = parsed.documentData || {};
  const fields = {
    name: buildField(
      enteredData.name,
      documentData.name,
      compareText(enteredData.name, documentData.name),
    ),
    university: buildField(
      enteredData.university,
      documentData.university,
      compareText(enteredData.university, documentData.university),
    ),
    department: buildField(
      enteredData.department,
      documentData.department,
      compareText(enteredData.department, documentData.department),
    ),
    course: buildField(
      enteredData.course,
      documentData.course,
      compareText(enteredData.course, documentData.course),
    ),
    examName: buildField(
      enteredData.examName,
      documentData.examName,
      compareText(enteredData.examName, documentData.examName),
    ),
    rollNumber: buildField(
      enteredData.rollNumber,
      documentData.rollNumber,
      compareText(enteredData.rollNumber, documentData.rollNumber),
    ),
    passingYear: buildField(
      enteredData.passingYear,
      documentData.passingYear,
      compareNumber(enteredData.passingYear, documentData.passingYear),
    ),
    marks: buildField(
      enteredData.marks,
      documentData.marks,
      compareNumber(enteredData.marks, documentData.marks),
    ),
    percentage: buildField(
      enteredData.percentage,
      documentData.percentage,
      compareNumber(enteredData.percentage, documentData.percentage),
    ),
    cgpa: buildField(
      enteredData.cgpa,
      documentData.cgpa,
      compareNumber(enteredData.cgpa, documentData.cgpa),
    ),
    entranceScore: buildField(
      enteredData.entranceScore,
      documentData.entranceScore,
      compareNumber(enteredData.entranceScore, documentData.entranceScore),
    ),
    rank: buildField(
      enteredData.rank,
      documentData.rank,
      compareNumber(enteredData.rank, documentData.rank),
    ),
  };
  const issues = Object.entries(fields)
    .filter(([, field]) =>
      ["mismatch", "missing", "unclear"].includes(field.status),
    )
    .map(([field, value]) => `${field}: ${value.status}`);
  const statuses = Object.values(fields).map((field) => field.status);
  const overallStatus = !extraction?.text?.trim()
    ? "needs_review"
    : statuses.includes("mismatch")
      ? "mismatch"
      : statuses.includes("unclear") || statuses.includes("missing")
        ? "needs_review"
        : "verified";
  return {
    overallStatus,
    confidence: Math.max(
      0,
      Math.min(
        100,
        Number(parsed.confidence) || (overallStatus === "verified" ? 85 : 55),
      ),
    ),
    fields,
    issues: parsed.issues || issues,
    summary:
      parsed.summary ||
      "Document fields were compared with the submitted application.",
    documentType: parsed.documentType || null,
    extractedText: parsed.extractedText || extraction?.text || "",
    engine: parsed.engine || "Google Gemini",
  };
}

function createDocumentVerification({
  documentType,
  extractedText,
  enteredData = {},
  scoreResult = null,
  extraction,
}) {
  const normalizedText = normalizeText(extractedText);
  const name = normalizeText(enteredData.name);
  const id = normalizeText(enteredData.tu4fId);
  const nameMatch = !name || normalizedText.includes(name);
  const idMatch = !id || normalizedText.includes(id);
  const scoreMatch = scoreResult
    ? scoreResult.verificationStatus === "verified"
    : null;
  const authenticityStatus = "manual_review"; // Default status
  const checks = [nameMatch, idMatch, scoreMatch].filter(
    (check) => check !== null,
  );
  const result =
    authenticityStatus !== "genuine"
      ? checks.includes(false)
        ? "MISMATCH"
        : "MANUAL_REVIEW"
      : checks.includes(false)
        ? "MISMATCH"
        : checks.length && checks.every(Boolean)
          ? "PASS"
          : "MANUAL_REVIEW";

  const fallback = normalizeStructuredResult(
    {
      documentType,
      confidence: extraction.status === "readable" ? 55 : 0,
      documentData: {
        name: nameMatch ? enteredData.name : null,
        rollNumber: idMatch ? enteredData.tu4fId : null,
      },
      summary:
        "Local OCR completed, but AI-assisted field extraction and authenticity review require manual confirmation.",
      engine: extraction.engine,
    },
    enteredData,
    extraction,
  );

  return {
    ...fallback,
    documentType,
    ocrStatus: extraction.status,
    nameMatch,
    idMatch,
    marksMatch: null,
    scoreMatch,
    authenticityStatus,
    editingRisk: "unknown",
    documentReadable: extraction.status === "readable",
    legacyConfidence:
      extraction.status === "readable"
        ? result === "PASS"
          ? "high"
          : "medium"
        : "low",
    verificationResult: result,
    explanation:
      result === "PASS"
        ? "Available entered values matched the extracted document text. Authenticity still requires review."
        : "Manual review is required for fields that could not be confirmed automatically or whose authenticity could not be assessed.",
    engine: extraction.engine,
    extractedText,
  };
}

async function verifyDocument({
  fileBuffer,
  mimeType,
  documentType,
  enteredData = {},
  extraction,
}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && extraction.status === "readable") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: geminiModelName });
      const prompt = `You are a document verification assistant reviewing a ${documentType} for a higher-education application. Extract every reasonably visible relevant value, then compare it with the application data. Handle harmless case, whitespace, punctuation, and common university-name formatting differences. Do not invent unreadable values. Return ONLY JSON: {"documentType":"${documentType}","documentReadable":true,"confidence":0,"documentData":{"name":null,"university":null,"department":null,"course":null,"examName":null,"rollNumber":null,"passingYear":null,"marks":null,"percentage":null,"cgpa":null,"entranceScore":null,"rank":null,"admissionDetails":null},"issues":[],"summary":"short explanation","extractedText":"useful text"}. The application values are ${JSON.stringify(enteredData)}. AI is an assistant: report mismatches and uncertainty, never make an approval decision.`;
      const content = [prompt];
      if (mimeType === "application/pdf" || mimeType?.startsWith("image/")) {
        content.push({
          inlineData: {
            data: fileBuffer.toString("base64"),
            mimeType: mimeType || "application/pdf",
          },
        });
      } else {
        content.push(`Extracted document text:\n${extraction.text}`);
      }
      const response = await model.generateContent(content);
      const jsonMatch = response.response.text().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return normalizeStructuredResult(parsed, enteredData, extraction);
        const nameMatch = parsed.nameMatch !== false;
        const idMatch = parsed.idMatch !== false;
        const documentTypeMatch = parsed.documentTypeMatch !== false;
        const documentReadable = parsed.documentReadable !== false;
        const authenticityStatus = [
          "genuine",
          "suspicious",
          "manual_review",
        ].includes(parsed.authenticityStatus)
          ? parsed.authenticityStatus
          : "manual_review";
        const result =
          nameMatch &&
          idMatch &&
          documentTypeMatch &&
          documentReadable &&
          authenticityStatus === "genuine"
            ? "PASS"
            : authenticityStatus === "suspicious" ||
                !nameMatch ||
                !idMatch ||
                !documentTypeMatch
              ? "MISMATCH"
              : "MANUAL_REVIEW";
        return {
          documentType,
          ocrStatus: documentReadable ? "readable" : "unreadable",
          nameMatch,
          idMatch,
          documentTypeMatch,
          authenticityStatus,
          editingRisk: parsed.editingRisk || "unknown",
          authenticityExplanation:
            parsed.authenticityExplanation ||
            "Authenticity could not be established automatically.",
          marksMatch: null,
          scoreMatch: null,
          documentReadable,
          confidence: "high",
          verificationResult: result,
          explanation:
            parsed.explanation ||
            "Google Gemini checked the uploaded document.",
          engine: `Google Gemini ${geminiModelName}`,
          extractedText: parsed.extractedText || extraction.text,
        };
      }
    } catch (error) {
      console.error(
        "General document AI verification failed; using OCR checks:",
        error.message,
      );
    }
  }

  return createDocumentVerification({
    documentType,
    extractedText: extraction.text,
    enteredData,
    extraction,
  });
}

/**
 * AI Score Extraction and Verification Service
 * Supports Google Gemini Vision AI OCR + Local Rule-Based NLP engine fallback
 */
async function verifyScoreCardDocument(
  fileBuffer,
  mimeType,
  examName,
  enteredScore,
  enteredData = {},
) {
  let result = {
    extractedScore: null,
    verificationStatus: "unverified",
    verificationNotes: "",
    confidence: "low",
    engine: "local",
  };

  if (!fileBuffer) {
    result.verificationNotes = "No document buffer provided.";
    return result;
  }

  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Try Google Gemini Multimodal Vision API if API Key is configured
  if (geminiKey) {
    try {
      console.log(
        `[Google Gemini AI] Initiating Multimodal OCR for ${examName || "Exam"} scorecard...`,
      );
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: geminiModelName });

      const base64Data = fileBuffer.toString("base64");
      const filePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || "application/pdf",
        },
      };

      const prompt = `
You are an expert academic document verification AI for Terna Engineering College Higher Education Cell.
Carefully inspect the attached official entrance exam scorecard (${examName || "competitive exam"}).
The student claims they scored: "${enteredScore}".
    The submitted student name is "${enteredData.name || ""}" and TU4F ID is "${enteredData.tu4fId || ""}".

Your task:
1. OCR the entire document and extract the candidate's official total score / marks / percentile.
2. Check if the extracted score matches the student's entered score "${enteredScore}".
3. Check whether the candidate name and TU4F ID match.
4. Inspect signs of editing, compositing, synthetic/AI-generated content, inconsistent fonts, alignment, metadata-like artifacts, or score tampering. This is a risk assessment, not proof of origin.

Return ONLY a valid JSON object with the following schema:
{
  "extractedScore": "the numeric score or percentile found on the document (or null if not found)",
  "candidateName": "candidate name on document (or null)",
  "nameMatch": true or false,
  "idMatch": true or false,
  "isMatch": true or false,
  "discrepancyDetected": true or false,
  "authenticityStatus": "genuine" or "suspicious" or "manual_review",
  "editingRisk": "low" or "medium" or "high" or "unknown",
  "authenticityExplanation": "short evidence-based explanation",
  "explanation": "Concise 1-2 sentence explanation of your verification findings"
}
`;

      const response = await model.generateContent([prompt, filePart]);
      const responseText = response.response.text();

      // Parse JSON from Gemini response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.extractedScore = parsed.extractedScore;
        result.nameMatch = parsed.nameMatch !== false;
        result.idMatch = parsed.idMatch !== false;
        result.authenticityStatus = [
          "genuine",
          "suspicious",
          "manual_review",
        ].includes(parsed.authenticityStatus)
          ? parsed.authenticityStatus
          : "manual_review";
        result.editingRisk = parsed.editingRisk || "unknown";
        result.authenticityExplanation =
          parsed.authenticityExplanation ||
          "Authenticity could not be established automatically.";
        result.engine = `Google Gemini ${geminiModelName}`;
        result.confidence = "high";

        if (
          parsed.isMatch &&
          result.nameMatch &&
          result.idMatch &&
          result.authenticityStatus === "genuine"
        ) {
          result.verificationStatus = "verified";
          result.verificationNotes = `🤖 Google Gemini AI Verified: Score (${parsed.extractedScore}) matches student entry (${enteredScore}). ${parsed.explanation || ""}`;
        } else if (parsed.discrepancyDetected) {
          result.verificationStatus = "discrepancy_detected";
          result.verificationNotes = `⚠️ Google Gemini AI Alert: Document shows score "${parsed.extractedScore}", but entered was "${enteredScore}"! ${parsed.explanation || ""}`;
        } else {
          result.verificationStatus = "manual_check_needed";
          result.verificationNotes = `🔍 Google Gemini AI: ${parsed.explanation || "Manual inspection recommended."}`;
        }

        console.log(
          `[Google Gemini AI] Verification complete: ${result.verificationStatus}`,
        );
        return result;
      }
    } catch (geminiError) {
      console.error(
        "[Google Gemini AI Error] Falling back to local OCR engine:",
        geminiError.message,
      );
    }
  }

  // 2. Fallback: Local OCR & Pattern Recognition Engine
  return await verifyLocally(
    fileBuffer,
    mimeType,
    examName,
    enteredScore,
    enteredData,
  );
}

/**
 * Local Rule-Based NLP & PDF Text Extraction Engine
 */
async function verifyLocally(
  fileBuffer,
  mimeType,
  examName,
  enteredScore,
  enteredData = {},
) {
  let result = {
    extractedScore: null,
    verificationStatus: "unverified",
    verificationNotes: "",
    confidence: "low",
    engine: "Local Heuristic OCR",
  };

  try {
    const extraction = await extractDocumentText(fileBuffer, mimeType);
    const extractedText = extraction.text;
    result.ocrStatus = extraction.status;
    result.ocrEngine = extraction.engine;
    result.ocrText = extractedText;
    const normalizedText = normalizeText(extractedText);
    result.nameMatch =
      !enteredData.name ||
      normalizedText.includes(normalizeText(enteredData.name));
    result.idMatch =
      !enteredData.tu4fId ||
      normalizedText.includes(normalizeText(enteredData.tu4fId));
    result.authenticityStatus = "manual_review";
    result.editingRisk = "unknown";
    result.authenticityExplanation =
      "Local OCR can compare text and scores but cannot reliably assess whether a document was edited or AI-generated.";

    const normalizedEntered = (enteredScore || "").toString().trim();
    const examUpper = (examName || "").toUpperCase().trim();

    let foundScore = extractScoreByExamType(
      extractedText,
      examUpper,
      normalizedEntered,
    );

    if (foundScore) {
      result.extractedScore = foundScore;
      result.confidence = "high";

      if (compareScores(foundScore, normalizedEntered)) {
        result.verificationStatus = "verified";
        result.verificationNotes = `✅ AI Verified: Document score (${foundScore}) matches entered score (${normalizedEntered}).`;
      } else {
        result.verificationStatus = "discrepancy_detected";
        result.verificationNotes = `⚠️ AI Discrepancy Alert: Entered score is "${normalizedEntered}", but document shows "${foundScore}"!`;
      }
    } else {
      if (normalizedEntered && extractedText.includes(normalizedEntered)) {
        result.extractedScore = normalizedEntered;
        result.verificationStatus = "verified";
        result.confidence = "medium";
        result.verificationNotes = `✅ AI Verified: Score (${normalizedEntered}) found in uploaded scorecard.`;
      } else {
        result.verificationStatus = "manual_check_needed";
        result.confidence = "low";
        result.verificationNotes = `🔍 AI Note: Scorecard uploaded. Automatic score scan flagged for manual review.`;
      }
    }
    if (
      result.verificationStatus === "verified" &&
      result.authenticityStatus !== "genuine"
    ) {
      result.verificationStatus = "manual_check_needed";
      result.verificationNotes +=
        " Authenticity could not be established without Gemini AI.";
    }
    if (!result.nameMatch || !result.idMatch) {
      result.verificationStatus = "discrepancy_detected";
      result.verificationNotes += ` Identity mismatch: ${!result.nameMatch ? "name" : ""}${!result.nameMatch && !result.idMatch ? " and " : ""}${!result.idMatch ? "TU4F ID" : ""} was not found in OCR text.`;
    }
  } catch (error) {
    console.error("Local Verification Error:", error.message);
    result.verificationStatus = "manual_check_needed";
    result.verificationNotes = `Error during score scan: ${error.message}`;
  }

  return result;
}

function extractScoreByExamType(text, examName, enteredScore) {
  if (!text) return null;

  if (examName.includes("GRE")) {
    const greMatches =
      text.match(/(?:Total|Score|GRE|Marks|Result)[:\s=]*([23]\d{2})/i) ||
      text.match(/\b([23]\d{2})\b/);
    if (
      greMatches &&
      parseInt(greMatches[1]) >= 260 &&
      parseInt(greMatches[1]) <= 340
    ) {
      return greMatches[1];
    }
  }

  if (examName.includes("GATE")) {
    const gateMatches = text.match(
      /(?:GATE Score|Score|Marks)[:\s=]*(\d{2,4}(?:\.\d+)?)/i,
    );
    if (gateMatches) return gateMatches[1];
  }

  if (examName.includes("IELTS")) {
    const ieltsMatches = text.match(
      /(?:Overall|Band|Score)[:\s=]*([1-9](?:\.[05])?)/i,
    );
    if (ieltsMatches) return ieltsMatches[1];
  }

  if (examName.includes("TOEFL")) {
    const toeflMatches = text.match(/(?:Total|Score|TOEFL)[:\s=]*(\d{1,3})/i);
    if (toeflMatches && parseInt(toeflMatches[1]) <= 120)
      return toeflMatches[1];
  }

  if (examName.includes("CAT") || examName.includes("GMAT")) {
    const catMatches = text.match(
      /(?:Percentile|Total|Score)[:\s=]*(\d{2,3}(?:\.\d+)?)/i,
    );
    if (catMatches) return catMatches[1];
  }

  if (enteredScore && text.includes(enteredScore)) {
    return enteredScore;
  }

  return null;
}

function compareScores(extracted, entered) {
  if (!extracted || !entered) return false;
  const cleanExtracted = extracted.toString().replace(/[^0-9.]/g, "");
  const cleanEntered = entered.toString().replace(/[^0-9.]/g, "");
  if (cleanExtracted === cleanEntered) return true;

  const num1 = parseFloat(cleanExtracted);
  const num2 = parseFloat(cleanEntered);
  if (!isNaN(num1) && !isNaN(num2)) {
    return Math.abs(num1 - num2) < 0.1;
  }
  return false;
}

module.exports = {
  verifyScoreCardDocument,
  verifyDocument,
  extractDocumentText,
  createDocumentVerification,
};
