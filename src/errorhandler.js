class ValidationError extends Error {
  constructor(message) {
    super(message); 
    this.name = "ValidationError"; 
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message); 
    this.name = "NotFoundError"; 
  }
}

class BadRequestError extends Error {
  constructor(message) {
    super(message); 
    this.name = "BadRequestError"; 
  }
}

module.exports = {
  ValidationError,
  NotFoundError,
  BadRequestError
}