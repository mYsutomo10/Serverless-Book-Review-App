const { handler } = require('../../src/functions/createReview');
const ReviewModel = require('../../src/models/reviewModel');

jest.mock('../../src/models/reviewModel');

describe('createReview', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  it('should create a review with valid data', async () => {
    const mockReview = {
      id: '123',
      bookId: 'test-book',
      bookTitle: 'Test Book',
      authorName: 'Test Author',
      rating: 5,
      reviewText: 'This is a test review',
      userId: 'user123',
      username: 'testuser',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z'
    };
    
    ReviewModel.create.mockResolvedValue(mockReview);
    
    const event = {
      body: JSON.stringify({
        bookId: 'test-book',
        bookTitle: 'Test Book',
        authorName: 'Test Author',
        rating: 5,
        reviewText: 'This is a test review'
      }),
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user123',
            'cognito:username': 'testuser'
          }
        }
      }
    };
    
    const response = await handler(event);
    
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual(mockReview);
    expect(ReviewModel.create).toHaveBeenCalledWith({
      bookId: 'test-book',
      bookTitle: 'Test Book',
      authorName: 'Test Author',
      rating: 5,
      reviewText: 'This is a test review',
      userId: 'user123',
      username: 'testuser'
    });
  });
  
  it('should return 400 with invalid data', async () => {
    const event = {
      body: JSON.stringify({
        bookId: 'test-book',
        bookTitle: 'Test Book',
        authorName: 'Test Author',
        rating: 10, // Invalid rating (should be 1-5)
        reviewText: 'This is a test review'
      })
    };
    
    const response = await handler(event);
    
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain('Invalid request');
    expect(ReviewModel.create).not.toHaveBeenCalled();
  });
  
  it('should return 500 on server error', async () => {
    ReviewModel.create.mockRejectedValue(new Error('Database error'));
    
    const event = {
      body: JSON.stringify({
        bookId: 'test-book',
        bookTitle: 'Test Book',
        authorName: 'Test Author',
        rating: 5,
        reviewText: 'This is a test review'
      })
    };
    
    const response = await handler(event);
    
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).error).toBe('Could not create the review');
  });
});