const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { createSkill, getSkillsByUser, getSkillById, updateSkill, deleteSkill } = require('../services/skillService');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const skills = await getSkillsByUser(req.user.userId);
    res.json(skills);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch skills' });
  }
});

router.post('/', async (req, res) => {
  const { name, difficultyLevel, subSkills } = req.body;
  if (!name || !difficultyLevel)
    return res.status(400).json({ message: 'Name and difficultyLevel are required' });

  try {
    // Note: uniqueness checks if needed must be done here (e.g., by querying skills for user)
    const skill = {
      name,
      difficultyLevel,
      subSkills: Array.isArray(subSkills) ? subSkills : [],
      createdBy: req.user.userId,
    };
    const createdSkill = await createSkill(skill);
    res.json(createdSkill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create skill' });
  }
});

router.put('/:id', async (req, res) => {
  const skillId = req.params.id;
  try {
    const skill = await getSkillById(skillId);
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    if (skill.createdBy !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

    const updatedSkill = await updateSkill(skillId, req.body);
    res.json(updatedSkill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update skill' });
  }
});

router.delete('/:id', async (req, res) => {
  const skillId = req.params.id;
  try {
    const skill = await getSkillById(skillId);
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    if (skill.createdBy !== req.user.userId) return res.status(403).json({ message: 'Not authorized' });

    await deleteSkill(skillId);
    res.json({ message: 'Skill deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete skill' });
  }
});

module.exports = router;
