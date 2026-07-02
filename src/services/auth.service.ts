import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserModel, AccountModel } from '../models';
import KarmaService from './karma.service';
import { IUserResponse } from '../interfaces';
import { ApiError, logger, BCRYPT_SALT_ROUNDS } from '../utils';
import db from '../database/connection';

class AuthService {
  async register(
    email: string,
    firstName: string,
    lastName: string,
    password: string
  ): Promise<{ user: IUserResponse; token: string }> {
    // Step 1: Check Karma blacklist
    const isBlacklisted = await KarmaService.isBlacklisted(email);
    if (isBlacklisted) {
      logger.warn('Registration rejected: user is blacklisted', { email });
      throw ApiError.forbidden(
        'Unable to create account. Please contact support for assistance.'
      );
    }

    // Step 2: Check if email already exists
    const existingUser = await UserModel.existsByEmail(email);
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Step 3: Hash the password
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Step 4: Create user AND account in a transaction
    const result = await db.transaction(async (trx) => {
      // Create the user
      const userId = await UserModel.create(
        {
          email,
          first_name: firstName,
          last_name: lastName,
          password_hash: passwordHash,
        },
        trx
      );

      const accountNumber = this.generateAccountNumber();

      // Create the wallet account
      await AccountModel.create(
        {
          user_id: userId,
          account_number: accountNumber,
        },
        trx
      );

      return { userId, accountNumber };
    });

    const token = this.generateToken(result.userId);

    const userResponse: IUserResponse = {
      id: result.userId,
      email,
      first_name: firstName,
      last_name: lastName,
      is_active: true,
      created_at: new Date(),
    };

    logger.info('User registered successfully', {
      userId: result.userId,
      email,
    });

    return { user: userResponse, token };
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: IUserResponse; token: string }> {
    const user = await UserModel.findByEmail(email);

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.is_active) {
      throw ApiError.forbidden('Account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = this.generateToken(user.id);

    const userResponse: IUserResponse = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      created_at: user.created_at,
    };

    logger.info('User logged in successfully', { userId: user.id, email });

    return { user: userResponse, token };
  }


  private generateToken(userId: number): string {
    // Convert time string to seconds for type compatibility
    const expiresIn = this.parseExpiresIn(config.jwt.expiresIn);
    return jwt.sign(
      { userId },
      config.jwt.secret,
      { expiresIn }
    );
  }

  /**
   * Parse an expiry string like '1h', '30m', '7d' to seconds.
   */
  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour
    const num = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 3600;
      case 'd': return num * 86400;
      default: return 3600;
    }
  }


  private generateAccountNumber(): string {
    const prefix = '20';
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
    return prefix + randomDigits;
  }
}

export default new AuthService();
