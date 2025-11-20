import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include user and multer file
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        collectionPrefix: string;
        organizationName: string;
      };
      file?: Multer.File;
    }
  }
}

// Protect routes - verify JWT token
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

      // Add user info to request
      req.user = decoded.user;

      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ msg: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ msg: 'Not authorized, no token' });
  }
};

// Authorize routes - check if user has required role
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authorized, no user' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Not authorized to access this resource' });
    }

    next();
  };
};

