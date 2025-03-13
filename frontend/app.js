// Configuration
const apiUrl = 'API_GATEWAY_URL'; // Replace with your API Gateway URL after deployment
const userPoolId = 'USER_POOL_ID'; // Replace with your Cognito User Pool ID after deployment
const clientId = 'USER_POOL_CLIENT_ID'; // Replace with your Cognito User Pool Client ID after deployment

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const reviewForm = document.getElementById('reviewForm');
const reviewsList = document.getElementById('reviewsList');
const reviewFormContainer = document.querySelector('.review-form-container');

// Cognito User Pool configuration
const poolData = {
  UserPoolId: userPoolId,
  ClientId: clientId
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

// Check if user is logged in
function checkAuth() {
  const cognitoUser = userPool.getCurrentUser();
  
  if (cognitoUser != null) {
    cognitoUser.getSession((err, session) => {
      if (err) {
        console.error('Error getting session:', err);
        return;
      }
      
      if (session.isValid()) {
        loginBtn.classList.add('hidden');
        registerBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        reviewFormContainer.classList.remove('hidden');
      }
    });
  } else {
    loginBtn.classList.remove('hidden');
    registerBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    reviewFormContainer.classList.add('hidden');
  }
}

// Load reviews
async function loadReviews() {
  try {
    const response = await fetch(`${apiUrl}/reviews`);
    const data = await response.json();
    
    reviewsList.innerHTML = '';
    
    if (data.reviews.length === 0) {
      reviewsList.innerHTML = '<p>No reviews yet. Be the first to add one!</p>';
      return;
    }
    
    data.reviews.forEach(review => {
      const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      const date = new Date(review.createdAt).toLocaleDateString();
      const currentUser = userPool.getCurrentUser();
      let isOwner = false;
      
      if (currentUser) {
        currentUser.getSession((err, session) => {
          if (!err && session.isValid()) {
            const idToken = session.getIdToken().getJwtToken();
            const payload = parseJwt(idToken);
            isOwner = payload.sub === review.userId;
          }
        });
      }
      
      const reviewCard = document.createElement('div');
      reviewCard.className = 'review-card';
      reviewCard.innerHTML = `
        <div class="review-header">
          <h3 class="review-title">${review.bookTitle}</h3>
          <div class="review-author">by ${review.authorName}</div>
        </div>
        <div class="review-rating">
          <div class="stars">${stars}</div>
        </div>
        <div class="review-text">${review.reviewText}</div>
        <div class="review-meta">
          <div>Posted by ${review.username || 'Anonymous'} on ${date}</div>
          <div class="review-actions">
            ${isOwner ? `
              <button class="btn btn-sm btn-edit" data-id="${review.id}">Edit</button>
              <button class="btn btn-sm btn-delete" data-id="${review.id}">Delete</button>
            ` : ''}
          </div>
        </div>
      `;
      
      reviewsList.appendChild(reviewCard);
    });
    
    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', handleEditReview);
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', handleDeleteReview);
    });
  } catch (error) {
    console.error('Error loading reviews:', error);
    reviewsList.innerHTML = '<p>Error loading reviews. Please try again later.</p>';
  }
}

// Helper function to parse JWT
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  
  return JSON.parse(jsonPayload);
}

// Register user
async function registerUser() {
  const username = prompt('Enter your email:');
  const password = prompt('Create a password:');
  
  if (!username || !password) return;
  
  const attributeList = [
    new AmazonCognitoIdentity.CognitoUserAttribute({
      Name: 'email',
      Value: username
    })
  ];
  
  userPool.signUp(username, password, attributeList, null, (err, result) => {
    if (err) {
        alert(err.message || 'Error registering user');
        console.error('Error registering user:', err);
        return;
      }
      
      const cognitoUser = result.user;
      console.log('User registration successful:', cognitoUser.getUsername());
      
      const verificationCode = prompt(`Verification code has been sent to ${username}. Enter the code:`);
      
      if (!verificationCode) return;
      
      cognitoUser.confirmRegistration(verificationCode, true, (err, result) => {
        if (err) {
          alert(err.message || 'Error confirming registration');
          console.error('Error confirming registration:', err);
          return;
        }
        
        alert('Registration confirmed. You can now log in.');
      });
    });
  }
  
  // Login user
  async function loginUser() {
    const username = prompt('Enter your email:');
    const password = prompt('Enter your password:');
    
    if (!username || !password) return;
    
    const authenticationData = {
      Username: username,
      Password: password
    };
    
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    
    const userData = {
      Username: username,
      Pool: userPool
    };
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        console.log('Login successful');
        checkAuth();
        loadReviews();
      },
      onFailure: (err) => {
        alert(err.message || 'Error logging in');
        console.error('Error logging in:', err);
      }
    });
  }
  
  // Logout user
  function logoutUser() {
    const cognitoUser = userPool.getCurrentUser();
    
    if (cognitoUser) {
      cognitoUser.signOut();
      checkAuth();
      loadReviews();
    }
  }
  
  // Submit review
  async function submitReview(event) {
    event.preventDefault();
    
    const bookTitle = document.getElementById('bookTitle').value;
    const authorName = document.getElementById('authorName').value;
    const rating = document.getElementById('rating').value;
    const reviewText = document.getElementById('reviewText').value;
    
    const review = {
      bookId: bookTitle.toLowerCase().replace(/\s+/g, '-'), // Simple slug for bookId
      bookTitle,
      authorName,
      rating: parseInt(rating, 10),
      reviewText
    };
    
    try {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        alert('Please log in to submit a review');
        return;
      }
      
      cognitoUser.getSession(async (err, session) => {
        if (err) {
          alert('Please log in to submit a review');
          console.error('Error getting session:', err);
          return;
        }
        
        const token = session.getIdToken().getJwtToken();
        
        const response = await fetch(`${apiUrl}/reviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify(review)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }
        
        reviewForm.reset();
        loadReviews();
      });
    } catch (error) {
      alert(error.message || 'Error submitting review');
      console.error('Error submitting review:', error);
    }
  }
  
  // Handle edit review
  async function handleEditReview(event) {
    const reviewId = event.target.dataset.id;
    
    try {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        alert('Please log in to edit a review');
        return;
      }
      
      cognitoUser.getSession(async (err, session) => {
        if (err) {
          alert('Please log in to edit a review');
          console.error('Error getting session:', err);
          return;
        }
        
        const token = session.getIdToken().getJwtToken();
        
        // Get the current review
        const response = await fetch(`${apiUrl}/reviews/${reviewId}`, {
          headers: {
            'Authorization': token
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }
        
        const review = await response.json();
        
        // Populate form with review data
        document.getElementById('bookTitle').value = review.bookTitle;
        document.getElementById('authorName').value = review.authorName;
        document.getElementById('rating').value = review.rating;
        document.getElementById('reviewText').value = review.reviewText;
        
        // Change form submission to update instead of create
        reviewForm.onsubmit = (event) => updateReview(event, reviewId);
        
        // Scroll to form
        reviewFormContainer.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (error) {
      alert(error.message || 'Error loading review for editing');
      console.error('Error loading review for editing:', error);
    }
  }
  
  // Update review
  async function updateReview(event, reviewId) {
    event.preventDefault();
    
    const bookTitle = document.getElementById('bookTitle').value;
    const authorName = document.getElementById('authorName').value;
    const rating = document.getElementById('rating').value;
    const reviewText = document.getElementById('reviewText').value;
    
    const review = {
      bookTitle,
      authorName,
      rating: parseInt(rating, 10),
      reviewText
    };
    
    try {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        alert('Please log in to update a review');
        return;
      }
      
      cognitoUser.getSession(async (err, session) => {
        if (err) {
          alert('Please log in to update a review');
          console.error('Error getting session:', err);
          return;
        }
        
        const token = session.getIdToken().getJwtToken();
        
        const response = await fetch(`${apiUrl}/reviews/${reviewId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify(review)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }
        
        // Reset form submission back to create
        reviewForm.onsubmit = submitReview;
        
        reviewForm.reset();
        loadReviews();
      });
    } catch (error) {
      alert(error.message || 'Error updating review');
      console.error('Error updating review:', error);
    }
  }
  
  // Handle delete review
  async function handleDeleteReview(event) {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }
    
    const reviewId = event.target.dataset.id;
    
    try {
      const cognitoUser = userPool.getCurrentUser();
      
      if (!cognitoUser) {
        alert('Please log in to delete a review');
        return;
      }
      
      cognitoUser.getSession(async (err, session) => {
        if (err) {
          alert('Please log in to delete a review');
          console.error('Error getting session:', err);
          return;
        }
        
        const token = session.getIdToken().getJwtToken();
        
        const response = await fetch(`${apiUrl}/reviews/${reviewId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': token
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }
        
        loadReviews();
      });
    } catch (error) {
      alert(error.message || 'Error deleting review');
      console.error('Error deleting review:', error);
    }
  }
  
  // Event listeners
  loginBtn.addEventListener('click', loginUser);
  registerBtn.addEventListener('click', registerUser);
  logoutBtn.addEventListener('click', logoutUser);
  reviewForm.addEventListener('submit', submitReview);
  
  // Initialize
  checkAuth();
  loadReviews();