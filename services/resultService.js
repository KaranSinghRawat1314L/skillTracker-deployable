// services/resultService.js
const { ddbDocClient } = require('./awsClients');
const { PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const RESULTS_TABLE = process.env.RESULTS_TABLE || 'Results';

async function createResult(result) {
  result.resultId = uuidv4();
  result.createdAt = new Date().toISOString();
  result.updatedAt = new Date().toISOString();

  const params = {
    TableName: RESULTS_TABLE,
    Item: result,
  };
  await ddbDocClient.send(new PutCommand(params));
  return result;
}

async function getResultsByUser(userId) {
  const params = {
    TableName: RESULTS_TABLE,
    IndexName: 'userId-index', // GSI on userId must exist
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  const data = await ddbDocClient.send(new QueryCommand(params));
  return data.Items || [];
}

async function getResultById(resultId) {
  const params = {
    TableName: RESULTS_TABLE,
    Key: { resultId },
  };
  const data = await ddbDocClient.send(new GetCommand(params));
  return data.Item || null;
}

module.exports = {
  createResult,
  getResultsByUser,
  getResultById,
};
