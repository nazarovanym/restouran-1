import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'İstifadəçi adı və şifrə daxil edilməlidir' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !user.isActive) {
        res.status(401).json({ success: false, message: 'İstifadəçi adı və ya şifrə yanlışdır' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'İstifadəçi adı və ya şifrə yanlışdır' });
        return;
      }

      const tokenPayload = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      };

      const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

      // Audit log qeydiyyatı
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          details: `İstifadəçi daxil oldu: ${user.fullName} (${user.role})`
        }
      });

      res.json({
        success: true,
        message: 'Daxilolma uğurludur',
        token,
        user: tokenPayload
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Daxili server xətası' });
    }
  }

  public static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'İcazəsiz müraciət' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          phone: true,
          isActive: true
        }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'İstifadəçi tapılmadı' });
        return;
      }

      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server xətası' });
    }
  }

  public static async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, users });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server xətası' });
    }
  }

  public static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username, password, fullName, role, phone } = req.body;
      if (!username || !password || !fullName || !role) {
        res.status(400).json({ success: false, message: 'Bütün məcburi xanaları doldurun' });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        res.status(400).json({ success: false, message: 'Bu istifadəçi adı artıq mövcuddur' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          username,
          passwordHash,
          fullName,
          role,
          phone: phone || null
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          phone: true
        }
      });

      res.status(201).json({ success: true, user: newUser, message: 'İstifadəçi uğurla yaradıldı' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Server xətası' });
    }
  }
}
