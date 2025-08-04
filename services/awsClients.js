// services/awsClients.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');

const REGION = process.env.AWS_REGION || 'us-east-1';

const ddbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const s3Client = new S3Client({ region: REGION });

module.exports = { ddbDocClient, s3Client };
