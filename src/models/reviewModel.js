const { dynamoDb, TableName, generateId } = require('../utils/dynamoDbClient');

class ReviewModel {
  static async create(reviewData) {
    const timestamp = new Date().toISOString();
    const id = generateId();
    
    const review = {
      id,
      ...reviewData,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    
    await dynamoDb.put({
      TableName,
      Item: review,
    }).promise();
    
    return review;
  }
  
  static async get(id) {
    const result = await dynamoDb.get({
      TableName,
      Key: { id },
    }).promise();
    
    return result.Item;
  }
  
  static async list(limit = 100, lastEvaluatedKey = null) {
    const params = {
      TableName,
      Limit: limit,
    };
    
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await dynamoDb.scan(params).promise();
    
    return {
      reviews: result.Items,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }
  
  static async getByBookId(bookId, limit = 100, lastEvaluatedKey = null) {
    const params = {
      TableName,
      IndexName: 'BookIdIndex',
      KeyConditionExpression: 'bookId = :bookId',
      ExpressionAttributeValues: {
        ':bookId': bookId,
      },
      Limit: limit,
    };
    
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await dynamoDb.query(params).promise();
    
    return {
      reviews: result.Items,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }
  
  static async update(id, reviewData) {
    const timestamp = new Date().toISOString();
    
    // Build update expression dynamically
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':updatedAt': timestamp,
    };
    
    Object.keys(reviewData).forEach((key) => {
      if (key !== 'id') {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = reviewData[key];
      }
    });
    
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    
    const params = {
      TableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    
    const result = await dynamoDb.update(params).promise();
    
    return result.Attributes;
  }
  
  static async delete(id) {
    await dynamoDb.delete({
      TableName,
      Key: { id },
    }).promise();
    
    return { id };
  }
}

module.exports = ReviewModel;