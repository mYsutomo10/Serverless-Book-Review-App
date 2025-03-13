const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };
  
  module.exports = {
    success: (body) => ({
      statusCode: 200,
      headers,
      body: JSON.stringify(body),
    }),
    
    created: (body) => ({
      statusCode: 201,
      headers,
      body: JSON.stringify(body),
    }),
    
    error: (statusCode, message) => ({
      statusCode,
      headers,
      body: JSON.stringify({
        error: message,
      }),
    }),
  };