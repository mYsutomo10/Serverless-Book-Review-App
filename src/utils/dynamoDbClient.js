const AWS = require('aws-sdk');
const { nanoid } = require('nanoid');

// Enable X-Ray tracing for AWS SDK
const AWSXRay = require('aws-xray-sdk');
const XRayAWS = AWSXRay.captureAWS(AWS);

let options = {};

// If running offline, use local DynamoDB instance
if (process.env.IS_OFFLINE) {
  options = {
    region: 'localhost',
    endpoint: 'http://localhost:8000'
  };
}

const dynamoDb = new XRayAWS.DynamoDB.DocumentClient(options);

const TableName = process.env.REVIEWS_TABLE;

module.exports = {
  dynamoDb,
  TableName,
  generateId: () => nanoid()
};