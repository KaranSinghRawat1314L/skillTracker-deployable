require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const skillRoutes = require('./routes/skills');   // to be created similarly
const quizRoutes = require('./routes/quizzes');   // to be created similarly
const resultRoutes = require('./routes/results'); // to be created similarly

const app = express();

app.use(cors());
app.use(express.json());

// Your static assets (profile pics now on S3, so this may be optional)
app.use('/profile_pics', express.static(path.join(__dirname, 'public/profile_pics')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/results', resultRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
