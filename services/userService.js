// services/userService.js
const { ddbDocClient } = require('./awsClients');
const {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

const USERS_TABLE = process.env.USERS_TABLE || 'Users';

async function getUserByEmail(email) {
  const params = {
    TableName: USERS_TABLE,
    IndexName: 'email-index', // Ensure GSI on email attribute exists
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
  };

  const data = await ddbDocClient.send(new QueryCommand(params));
  return data.Items && data.Items.length ? data.Items[0] : null;
}

async function getUserById(userId) {
  const params = {
    TableName: USERS_TABLE,
    Key: { userId },
  };
  const data = await ddbDocClient.send(new GetCommand(params));
  return data.Item || null;
}

async function createUser(user) {
  const params = {
    TableName: USERS_TABLE,
    Item: user,
  };
  await ddbDocClient.send(new PutCommand(params));
  return user;
}

async function updateUserProfilePic(userId, profilePicUrl) {
  const params = {
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'set profilePic = :pic',
    ExpressionAttributeValues: { ':pic': profilePicUrl },
    ReturnValues: 'ALL_NEW',
  };
  const data = await ddbDocClient.send(new UpdateCommand(params));
  return data.Attributes;
}

async function updateUserAddress(userId, address, mobile) {
  const params = {
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'set #addr = :address, mobile = :mobile',
    ExpressionAttributeNames: { '#addr': 'address' },
    ExpressionAttributeValues: { ':address': address, ':mobile': mobile },
    ReturnValues: 'ALL_NEW',
  };
  const data = await ddbDocClient.send(new UpdateCommand(params));
  return data.Attributes;
}

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  updateUserProfilePic,
  updateUserAddress,
};
