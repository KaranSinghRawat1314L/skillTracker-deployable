const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { s3Client } = require('../services/awsClients');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { updateUserProfilePic, updateUserAddress, getUserById } = require('../services/userService');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

router.put('/address', authMiddleware, async (req, res) => {
  const { line1, line2, city, state, postalCode, country, mobile } = req.body;
  if (!postalCode || !country) return res.status(400).json({ message: 'Postal code and country required' });

  try {
    const address = { line1, line2, city, state, postalCode, country };
    const updated = await updateUserAddress(req.user.userId, address, mobile);
    const { passwordHash, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update address' });
  }
});

router.post('/profile-pic', authMiddleware, upload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif'];
    if (!allowedExts.includes(ext)) return res.status(400).json({ message: 'Only image files are allowed' });

    const key = `profile_pics/${req.user.userId}${ext}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    }));

    const profilePicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    await updateUserProfilePic(req.user.userId, profilePicUrl);

    res.json({ profilePic: profilePicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to upload profile picture' });
  }
});

module.exports = router;
