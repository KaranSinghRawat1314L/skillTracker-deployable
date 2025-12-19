const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { createQuiz, getQuizzesByUser } = require('../services/quizService');
const { getSkillsByUser } = require('../services/skillService');
const axios = require('axios');

const router = express.Router();

const GEMINI_API_URL =
  process.env.GEMINI_API_URL ||
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

router.use(authMiddleware);

// ----------------------------------------------------------------------
// 📌 GENERATE QUIZ (via Gemini)
// ----------------------------------------------------------------------
router.post('/generate', async (req, res) => {
  const { skill, difficulty } = req.body;

  if (!skill || !difficulty) {
    return res.status(400).json({ message: 'Missing skill or difficulty' });
  }

  try {
    // Fetch user skills
    const skills = await getSkillsByUser(req.user.userId);
    const skillDoc = skills.find((s) => s.name === skill);

    if (!skillDoc) {
      return res.status(400).json({ message: 'Skill not found for this user' });
    }

    const subSkills =
      Array.isArray(skillDoc.subSkills) && skillDoc.subSkills.length > 0
        ? skillDoc.subSkills.join(', ')
        : 'no specific subskills';

    // Gemini Prompt
    const promptText = `
Generate 5 ${difficulty} level multiple choice questions on the topic: "${skill}". 
Include subskills: ${subSkills}.

Format the output strictly as a JSON array of objects with fields:
- prompt: string
- options: array of strings
- answer: string (must match one option)
- explanation: string
`;

    // ------------------------------------------------------------------
    // ✅ CORRECTED GEMINI REQUEST BODY (new API format)
    // ------------------------------------------------------------------
    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };

    // ------------------------------------------------------------------
    // ✅ CALL GEMINI API (correct headers + no role field)
    // ------------------------------------------------------------------
    const response = await axios.post(GEMINI_API_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      }
    });

    // Extract text safely
    let rawText =
      response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean markdown / code blocks (if any)
    rawText = rawText
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    // Parse JSON from Gemini
    let questions;
    try {
      questions = JSON.parse(rawText);

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Parsed result is not a valid question array');
      }
    } catch (err) {
      console.error('❌ JSON Parse Error:', err);
      console.error('Raw Gemini Output:', rawText);
      return res.status(500).json({
        message: 'AI response not in expected JSON format.'
      });
    }

    // Save quiz to DB
    const quiz = await createQuiz({
      skillId: skillDoc.skillId,
      questions,
      createdBy: req.user.userId,
      difficulty,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return res.json(quiz);
  } catch (err) {
    console.error('\n❌ GEMINI API ERROR:');
    console.error('Status:', err.response?.status);
    console.error('Body:', err.response?.data);

    return res.status(503).json({
      message: 'AI quiz generation failed. Try again later.',
      error: err.response?.data || err.message
    });
  }
});

// ----------------------------------------------------------------------
// 📌 GET QUIZZES
// ----------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const quizzes = await getQuizzesByUser(req.user.userId);
    res.json(quizzes);
  } catch (err) {
    console.error('Failed to fetch quizzes:', err);
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
});

module.exports = router;
