const ReviewModel = require('../models/reviewModel');
const response = require('../utils/response');

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    
    const review = await ReviewModel.get(id);
    
    if (!review) {
      return response.error(404, 'Review not found');
    }
    
    return response.success(review);
  } catch (error) {
    console.error('Error getting review:', error);
    return response.error(500, 'Could not retrieve the review');
  }
};