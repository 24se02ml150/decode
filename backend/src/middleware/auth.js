import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors.js';

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided. Please log in.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.id,
      role: decoded.role,
      teamId: decoded.teamId,
      teamName: decoded.teamName,
      mustResetPassword: decoded.mustResetPassword,
    };
    
    // Block API access if forced password reset is required, except for necessary auth routes
    if (req.user.mustResetPassword && 
        req.user.role === 'team' &&
        !['/api/auth/change-password', '/api/auth/me', '/api/auth/login'].includes(req.originalUrl.split('?')[0])) {
      throw new UnauthorizedError('You must change your default password before continuing.');
    }
    
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
    } else if (err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Session expired. Please log in again.'));
    } else if (err.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid session. Please log in again.'));
    } else {
      next(new UnauthorizedError('Authentication failed.'));
    }
  }
}
