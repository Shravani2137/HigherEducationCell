const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

/**
 * AI Score Extraction and Verification Service
 * Supports Google Gemini Vision AI OCR + Local Rule-Based NLP engine fallback
 */
async function verifyScoreCardDocument(fileBuffer, mimeType, examName, enteredScore) {
    let result = {
        extractedScore: null,
        verificationStatus: 'unverified',
        verificationNotes: '',
        confidence: 'low',
        engine: 'local'
    };

    if (!fileBuffer) {
        result.verificationNotes = 'No document buffer provided.';
        return result;
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Try Google Gemini Multimodal Vision API if API Key is configured
    if (geminiKey) {
        try {
            console.log(`[Google Gemini AI] Initiating Multimodal OCR for ${examName || 'Exam'} scorecard...`);
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const base64Data = fileBuffer.toString('base64');
            const filePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType || 'application/pdf'
                }
            };

            const prompt = `
You are an expert academic document verification AI for Terna Engineering College Higher Education Cell.
Carefully inspect the attached official entrance exam scorecard (${examName || 'competitive exam'}).
The student claims they scored: "${enteredScore}".

Your task:
1. OCR the entire document and extract the candidate's official total score / marks / percentile.
2. Check if the extracted score matches the student's entered score "${enteredScore}".
3. Identify any discrepancy or score tampering.

Return ONLY a valid JSON object with the following schema:
{
  "extractedScore": "the numeric score or percentile found on the document (or null if not found)",
  "candidateName": "candidate name on document (or null)",
  "isMatch": true or false,
  "discrepancyDetected": true or false,
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
                result.engine = 'Google Gemini 1.5 Flash';
                result.confidence = 'high';

                if (parsed.isMatch) {
                    result.verificationStatus = 'verified';
                    result.verificationNotes = `🤖 Google Gemini AI Verified: Score (${parsed.extractedScore}) matches student entry (${enteredScore}). ${parsed.explanation || ''}`;
                } else if (parsed.discrepancyDetected) {
                    result.verificationStatus = 'discrepancy_detected';
                    result.verificationNotes = `⚠️ Google Gemini AI Alert: Document shows score "${parsed.extractedScore}", but entered was "${enteredScore}"! ${parsed.explanation || ''}`;
                } else {
                    result.verificationStatus = 'manual_check_needed';
                    result.verificationNotes = `🔍 Google Gemini AI: ${parsed.explanation || 'Manual inspection recommended.'}`;
                }

                console.log(`[Google Gemini AI] Verification complete: ${result.verificationStatus}`);
                return result;
            }
        } catch (geminiError) {
            console.error('[Google Gemini AI Error] Falling back to local OCR engine:', geminiError.message);
        }
    }

    // 2. Fallback: Local OCR & Pattern Recognition Engine
    return await verifyLocally(fileBuffer, mimeType, examName, enteredScore);
}

/**
 * Local Rule-Based NLP & PDF Text Extraction Engine
 */
async function verifyLocally(fileBuffer, mimeType, examName, enteredScore) {
    let result = {
        extractedScore: null,
        verificationStatus: 'unverified',
        verificationNotes: '',
        confidence: 'low',
        engine: 'Local Heuristic OCR'
    };

    try {
        let extractedText = '';

        if (mimeType === 'application/pdf' || (fileBuffer && fileBuffer.toString('utf8', 0, 4) === '%PDF')) {
            try {
                const pdfData = await pdfParse(fileBuffer);
                extractedText = pdfData.text || '';
            } catch (pdfErr) {
                extractedText = fileBuffer.toString('utf8');
            }
        } else {
            extractedText = fileBuffer.toString('utf8');
        }

        const normalizedEntered = (enteredScore || '').toString().trim();
        const examUpper = (examName || '').toUpperCase().trim();

        let foundScore = extractScoreByExamType(extractedText, examUpper, normalizedEntered);

        if (foundScore) {
            result.extractedScore = foundScore;
            result.confidence = 'high';

            if (compareScores(foundScore, normalizedEntered)) {
                result.verificationStatus = 'verified';
                result.verificationNotes = `✅ AI Verified: Document score (${foundScore}) matches entered score (${normalizedEntered}).`;
            } else {
                result.verificationStatus = 'discrepancy_detected';
                result.verificationNotes = `⚠️ AI Discrepancy Alert: Entered score is "${normalizedEntered}", but document shows "${foundScore}"!`;
            }
        } else {
            if (normalizedEntered && extractedText.includes(normalizedEntered)) {
                result.extractedScore = normalizedEntered;
                result.verificationStatus = 'verified';
                result.confidence = 'medium';
                result.verificationNotes = `✅ AI Verified: Score (${normalizedEntered}) found in uploaded scorecard.`;
            } else {
                result.verificationStatus = 'manual_check_needed';
                result.confidence = 'low';
                result.verificationNotes = `🔍 AI Note: Scorecard uploaded. Automatic score scan flagged for manual review.`;
            }
        }

    } catch (error) {
        console.error('Local Verification Error:', error.message);
        result.verificationStatus = 'manual_check_needed';
        result.verificationNotes = `Error during score scan: ${error.message}`;
    }

    return result;
}

function extractScoreByExamType(text, examName, enteredScore) {
    if (!text) return null;

    if (examName.includes('GRE')) {
        const greMatches = text.match(/(?:Total|Score|GRE|Marks|Result)[:\s=]*([23]\d{2})/i) || text.match(/\b([23]\d{2})\b/);
        if (greMatches && parseInt(greMatches[1]) >= 260 && parseInt(greMatches[1]) <= 340) {
            return greMatches[1];
        }
    }

    if (examName.includes('GATE')) {
        const gateMatches = text.match(/(?:GATE Score|Score|Marks)[:\s=]*(\d{2,4}(?:\.\d+)?)/i);
        if (gateMatches) return gateMatches[1];
    }

    if (examName.includes('IELTS')) {
        const ieltsMatches = text.match(/(?:Overall|Band|Score)[:\s=]*([1-9](?:\.[05])?)/i);
        if (ieltsMatches) return ieltsMatches[1];
    }

    if (examName.includes('TOEFL')) {
        const toeflMatches = text.match(/(?:Total|Score|TOEFL)[:\s=]*(\d{1,3})/i);
        if (toeflMatches && parseInt(toeflMatches[1]) <= 120) return toeflMatches[1];
    }

    if (examName.includes('CAT') || examName.includes('GMAT')) {
        const catMatches = text.match(/(?:Percentile|Total|Score)[:\s=]*(\d{2,3}(?:\.\d+)?)/i);
        if (catMatches) return catMatches[1];
    }

    if (enteredScore && text.includes(enteredScore)) {
        return enteredScore;
    }

    return null;
}

function compareScores(extracted, entered) {
    if (!extracted || !entered) return false;
    const cleanExtracted = extracted.toString().replace(/[^0-9.]/g, '');
    const cleanEntered = entered.toString().replace(/[^0-9.]/g, '');
    if (cleanExtracted === cleanEntered) return true;

    const num1 = parseFloat(cleanExtracted);
    const num2 = parseFloat(cleanEntered);
    if (!isNaN(num1) && !isNaN(num2)) {
        return Math.abs(num1 - num2) < 0.1;
    }
    return false;
}

module.exports = {
    verifyScoreCardDocument
};
