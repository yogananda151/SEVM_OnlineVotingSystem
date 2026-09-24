import { userRepository } from '../repositories/user.repository';
import { comparePassword } from '../utils/crypto';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';
import { auditRepository } from '../repositories/audit.repository';

export class AuthService {
  async login(email: string, password: string, ipAddress: string, userAgent?: string) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Contact administrator.', 403);
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    // Log attempt regardless of success
    await userRepository.logLogin({ userId: user.id, ipAddress, userAgent, success: isPasswordValid });

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Get profile (commissioner or officer)
    const profile = await userRepository.findById(user.id) as {
      id: number; email: string; role: string;
      commissioner?: { fullName: string; employeeId: string };
      officer?: { fullName: string; employeeId: string; pollingStationId: number | null };
    };

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      stationId: profile?.officer?.pollingStationId ?? undefined,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await userRepository.updateLastLogin(user.id);

    // Audit log
    await auditRepository.create({
      userId: user.id,
      action: 'LOGIN',
      module: 'Auth',
      description: `User ${email} logged in successfully`,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: profile?.commissioner || profile?.officer,
      },
    };
  }

  async logout(userId: number, ipAddress: string, userAgent?: string) {
    await auditRepository.create({
      userId,
      action: 'LOGOUT',
      module: 'Auth',
      description: `User logged out`,
      ipAddress,
      userAgent,
    });
  }

  async getProfile(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }
}

export const authService = new AuthService();
