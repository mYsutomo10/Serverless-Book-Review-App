const ReviewModel = require('../models/reviewModel');
const response = require('../utils/response');

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    
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
        return response.error(403, 'You can only delete your own reviews');
      }
    }
    
    await ReviewModel.delete(id);
    
    return response.success({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return response.error(500, 'Could not delete the review');
  }
};