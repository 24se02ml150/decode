import { BadRequestError } from '../utils/errors.js';

export function validate(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const message = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new BadRequestError(message);
      }
      req.validatedBody = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        const message = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new BadRequestError(message);
      }
      req.validatedQuery = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}
