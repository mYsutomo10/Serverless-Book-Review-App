const ReviewModel = require('../models/reviewModel');
const response = require('../utils/response');

module.exports.handler = async (event) => {
  try {
    const { limit, lastEvaluatedKey, bookId } = event.queryStringParameters || {};
    
    let result;
    if (bookId) {
      result = await ReviewModel.getByBookId(
        bookId,
        limit ? parseInt(limit, 10) : 100,
        lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : null
      );
    } else {
      result = await ReviewModel.list(
        limit ? parseInt(limit, 10) : 100,
        lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : null
      );
    }
    
    return response.success(result);
  } catch (error) {
    console.error('Error listing reviews:', error);
    return response.error(500, 'Could not retrieve reviews');
  }
};