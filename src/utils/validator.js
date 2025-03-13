const Joi = require('joi');

// Review schema validation
const reviewSchema = Joi.object({
  bookId: Joi.string().required(),
  bookTitle: Joi.string().required(),
  authorName: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  reviewText: Joi.string().min(10).max(5000).required(),
  userId: Joi.string(),
  username: Joi.string(),
});

module.exports = {
  validateReview: (review) => reviewSchema.validate(review),
};