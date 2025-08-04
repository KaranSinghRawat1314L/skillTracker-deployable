const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { createQuiz, getQuizzesByUser } = require('../services/quizService');
const { getSkillsByUser } = require('../services/skillService');
const axios = require('axios');

const router = express.Router();

const GEMINI_API_URL =
  process.env.GEMINI_API_URL ||
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

router.use(authMiddleware);

// POST /quiz/generate - Generate AI quiz for authenticated user
router.post('/generate', async (req, res) => {
  const { skill, difficulty } = req.body;
  if (!skill || !difficulty) {
    return res.status(400).json({ message: 'Missing skill or difficulty' });
  }

  try {
    // Verify skill ownership
    const skills = await getSkillsByUser(req.user.userId);
    const skillDoc = skills.find((s) => s.name === skill);
    if (!skillDoc) {
      return res.status(400).json({ message: 'Skill not found for this user' });
    }

    const subSkills = Array.isArray(skillDoc.subSkills) && skillDoc.subSkills.length > 0
      ? skillDoc.subSkills.join(', ')
      : 'no specific subskills';

    // Prompt for Gemini
    const promptText = `Generate 5 ${difficulty} level multiple choice questions on the topic: "${skill}". Include subskills: ${subSkills}. 
Format the output strictly as a JSON array of objects with these fields: 
- prompt: string 
- options: array of strings 
- answer: string (must match one of the options) 
- explanation: string`;

    const requestBody = {
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
    };

    const urlWithKey = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    const response = await axios.post(urlWithKey, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    let rawText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean markdown code block (remove ```json or ``` and closing ```)
    rawText = rawText
      .replace(/^\s*```(?:json)?\s*/i, '')   // remove opening ```
      .replace(/\s*```\s*$/i, '')            // remove closing ```
      .trim();

    // Parse JSON
    let questions;
    try {
      questions = JSON.parse(rawText);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Parsed data is not a valid question array.');
      }
    } catch (err) {
      console.error('Failed to parse AI quiz questions:', err);
      console.error('Raw Gemini response:', rawText);
      return res.status(500).json({ message: 'AI response not in expected format. Try again later.' });
    }

    // Save quiz to DB
    const quiz = await createQuiz({
      skillId: skillDoc.skillId,
      questions,
      createdBy: req.user.userId,
      difficulty,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.json(quiz);
  } catch (err) {
    console.error('AI quiz generation failed:', err.response?.data || err.message || err);
    res.status(503).json({ message: 'AI quiz generation failed. Please try later.' });
  }
});

// GET /quiz - Fetch all quizzes for logged-in user
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
