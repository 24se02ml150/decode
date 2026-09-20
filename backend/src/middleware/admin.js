import { ForbiddenError } from '../utils/errors.js';

export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ForbiddenError('Admin access required.'));
  }
  next();
}
