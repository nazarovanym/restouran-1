import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole, AuthUser } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Daxilolma tokeni tələb olunur' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ success: false, message: 'Keçərsiz və ya vaxtı bitmiş sessiya tokeni' });
  }
};

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'İcazəsiz müraciət' });
      return;
    }

    // SUPER_ADMIN has access to everything
    if (req.user.role === UserRole.SUPER_ADMIN || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `Bu əməliyyat üçün səlahiyyətiniz çatmır. Tələb olunan rollar: ${allowedRoles.join(', ')}`
    });
  };
};
