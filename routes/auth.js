const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');
const { getUserByEmail, createUser, getUserById } = require('../services/userService');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    if (await getUserByEmail(email)) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      userId: uuidv4(),
      name,
      email,
      passwordHash,
      authProvider: 'email',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await createUser(user);
    const token = jwt.sign({ id: user.userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Missing fields' });

  try {
    const user = await getUserByEmail(email);
    if (!user || !user.passwordHash)
      return res.status(400).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/google', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Missing token' });

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload.email_verified)
      return res.status(400).json({ message: 'Email not verified by Google' });

    let user = await getUserByEmail(payload.email);
    if (!user) {
      user = {
        userId: uuidv4(),
        name: payload.name,
        email: payload.email,
        authProvider: 'google',
        profilePic: payload.picture,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createUser(user);
    }

    const appToken = jwt.sign({ id: user.userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: appToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Google login failed' });
  }
});

module.exports = router;
