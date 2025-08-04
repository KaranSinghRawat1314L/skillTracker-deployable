// services/quizService.js
const { ddbDocClient } = require('./awsClients');
const { PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const QUIZZES_TABLE = process.env.QUIZZES_TABLE || 'Quizzes';

async function createQuiz(quiz) {
  quiz.quizId = uuidv4();
  quiz.createdAt = new Date().toISOString();
  quiz.updatedAt = new Date().toISOString();

  const params = {
    TableName: QUIZZES_TABLE,
    Item: quiz,
  };
  await ddbDocClient.send(new PutCommand(params));
  return quiz;
}

async function getQuizzesByUser(userId) {
  const params = {
    TableName: QUIZZES_TABLE,
    IndexName: 'createdBy-index', // GSI for createdBy
    KeyConditionExpression: 'createdBy = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  const data = await ddbDocClient.send(new QueryCommand(params));
  return data.Items || [];
}

async function getQuizById(quizId) {
  const params = {
    TableName: QUIZZES_TABLE,
    Key: { quizId },
  };
  const data = await ddbDocClient.send(new GetCommand(params));
  return data.Item || null;
}

module.exports = {
  createQuiz,
  getQuizzesByUser,
  getQuizById,
};
