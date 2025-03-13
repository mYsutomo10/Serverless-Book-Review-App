const ReviewModel = require('../models/reviewModel');
const { validateReview } = require('../utils/validator');
const response = require('../utils/response');

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const requestBody = JSON.parse(event.body);
    
    // Get existing review
    const existingReview = await ReviewModel.get(id);
    
    if (!existingReview) {
      return response.error(404, 'Review not found');
    }
    
    // Check if the user owns this review
    if (event.requestContext && event.requestContext.authorizer) {
      const claims = event.requestContext.authorizer.claims;
      const userId = claims.sub;
      
      if (existingReview.userId !== userId) {
        return response.error(403, 'You can only update your own reviews');
      }
    }
    
    // Validate the update data
    const { error, value } = validateReview({ ...existingReview, ...requestBody });
    if (error) {
      return response.error(400, `Invalid request: ${error.message}`);
    }
    
    const updatedReview = await ReviewModel.update(id, value);
    
    return response.success(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    return response.error(500, 'Could not update the review');
  }
};