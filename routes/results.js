const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { createResult, getResultsByUser } = require('../services/resultService');
const { getQuizById } = require('../services/quizService');
const axios = require('axios');

const router = express.Router();

const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    const results = await getResultsByUser(req.user.userId);
    res.json(results);
  } catch (err) {
    console.error('Failed to get results:', err);
    res.status(500).json({ message: 'Failed to get results' });
  }
});

router.post('/evaluate', async (req, res) => {
  const { quizId, userAnswers = [], timeTaken } = req.body;
  try {
    const quiz = await getQuizById(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const questions = quiz.questions.map((q, i) => ({
      prompt: q.prompt,
      options: q.options,
      correctAnswer: q.answer,
      userAnswer: userAnswers[i] || null,
      explanation: q.explanation,
    }));

    const prompt = `You are an expert quiz evaluator. For the following questions:
- Compare each userAnswer with the correctAnswer.
- Indicate correctness and briefly explain why.
- Summarize strengths, weaknesses, and recommend next steps.

Input:
${JSON.stringify(questions, null, 2)}`;

    const requestBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
    };
    const urlWithKey = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    const response = await axios.post(urlWithKey, requestBody, { headers: { 'Content-Type': 'application/json' } });

    const aiFeedback = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const score = quiz.questions.reduce((acc, q, idx) => acc + (userAnswers[idx] === q.answer ? 1 : 0), 0);

    const result = await createResult({
      userId: req.user.userId,
      quizId,
      score,
      timeTaken,
      date: new Date().toISOString(),
      insights: { aiFeedback },
    });

    res.json({ score, total: quiz.questions.length, aiFeedback, result });
  } catch (err) {
    console.error('AI evaluation error:', err.response?.data || err.message || err);
    res.status(500).json({ message: 'Failed to evaluate quiz answers with AI' });
  }
});

module.exports = router;
