// services/skillService.js
const { ddbDocClient } = require('./awsClients');
const {
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const SKILLS_TABLE = process.env.SKILLS_TABLE || 'Skills';

// Create skill
async function createSkill(skill) {
  skill.skillId = uuidv4();
  skill.createdAt = new Date().toISOString();
  skill.updatedAt = new Date().toISOString();

  const params = {
    TableName: SKILLS_TABLE,
    Item: skill,
  };
  await ddbDocClient.send(new PutCommand(params));
  return skill;
}

// Get skills by user
async function getSkillsByUser(userId) {
  const params = {
    TableName: SKILLS_TABLE,
    IndexName: 'createdBy-index', // GSI on createdBy must be created
    KeyConditionExpression: 'createdBy = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  const data = await ddbDocClient.send(new QueryCommand(params));
  return data.Items || [];
}

// Get skill by id
async function getSkillById(skillId) {
  const params = {
    TableName: SKILLS_TABLE,
    Key: { skillId },
  };
  const data = await ddbDocClient.send(new GetCommand(params));
  return data.Item || null;
}

// Update skill
async function updateSkill(skillId, updateData) {
  const updateExpressions = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  for (const key in updateData) {
    updateExpressions.push(`#${key} = :${key}`);
    expressionAttributeNames[`#${key}`] = key;
    expressionAttributeValues[`:${key}`] = updateData[key];
  }

  const params = {
    TableName: SKILLS_TABLE,
    Key: { skillId },
    UpdateExpression: 'set ' + updateExpressions.join(', '),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const data = await ddbDocClient.send(new UpdateCommand(params));
  return data.Attributes;
}

// Delete skill
async function deleteSkill(skillId) {
  const params = {
    TableName: SKILLS_TABLE,
    Key: { skillId },
  };
  await ddbDocClient.send(new DeleteCommand(params));
}

module.exports = {
  createSkill,
  getSkillsByUser,
  getSkillById,
  updateSkill,
  deleteSkill,
};
