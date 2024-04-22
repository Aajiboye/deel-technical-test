 class ResponseHandler {
  static success = (data, statusCode=200, message = "OK", ) => {
    return {
      message,
      error: false,
      code: statusCode,
      data
    };
  };
  
  static error = (error, message, statusCode) => {
    const codes = {
      'BadRequestError':400, 
      'UnAuthorized':401, 
      'NotFoundError':404, 
      'ForbiddenResource':403, 
      'ForbiddenResource':403, 
      'InternalServerError':500
    };
  
  
    return {
      message,
      code: codes[error.name] || 500,
      error: true,
    };
  };
  
  static validation = (errors) => {
    return {
      message: "Validation errors",
      error: true,
      code: 422,
      errors
    };
  };
}



 module.exports = {
  ResponseHandler
 }
 