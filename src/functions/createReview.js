const ReviewModel = require('../models/reviewModel');
const { validateReview } = require('../utils/validator');
const response = require('../utils/response');

module.exports.handler = async (event) => {
  try {
    const requestBody = JSON.parse(event.body);
    
    // Add user information from the authorizer if available
    if (event.requestContext && event.requestContext.authorizer) {
      const claims = event.requestContext.authorizer.claims;
      requestBody.userId = claims.sub;
      requestBody.username = claims['cognito:username'];
    }
    
    // Validate the request body
    const { error, value } = validateReview(requestBody);
    if (error) {
      return response.error(400, `Invalid request: ${error.message}`);
    }
    
    const review = await ReviewModel.create(value);
    
    return response.created(review);
  } catch (error) {
    console.error('Error creating review:', error);
    return response.error(500, 'Could not create the review');
  }
};