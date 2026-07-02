import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../../src/database/connection', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../../src/models/user.model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
  },
}));

jest.mock('../../../src/models/account.model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('../../../src/services/karma.service', () => ({
  __esModule: true,
  default: {
    isBlacklisted: jest.fn(),
  },
}));

jest.mock('../../../src/config/environment', () => ({
  config: {
    nodeEnv: 'test',
    port: 3000,
    isProduction: false,
    db: {
      host: 'localhost',
      port: 3306,
      name: 'test_db',
      user: 'test_user',
      password: 'test_pass',
    },
    jwt: {
      secret: 'test-secret-key-at-least-32-characters-long!',
      expiresIn: '1h',
    },
    adjutor: {
      baseUrl: 'https://adjutor.test.com/v2',
      apiKey: 'test-api-key',
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100,
    },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import AuthService from '../../../src/services/auth.service';
import UserModel from '../../../src/models/user.model';
import AccountModel from '../../../src/models/account.model';
import KarmaService from '../../../src/services/karma.service';
import db from '../../../src/database/connection';
import { ApiError } from '../../../src/utils/ApiError';

describe('AuthService', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'Password123!',
    };

    // POSITIVE TESTS

    it('should successfully register a new user', async () => {
      // Arrange: Set up mocks to return successful data
      (KarmaService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (UserModel.existsByEmail as jest.Mock).mockResolvedValue(false);

      // Mock the database transaction
      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (UserModel.create as jest.Mock).mockResolvedValue(1);
        (AccountModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      // Act: Call the method
      const result = await AuthService.register(
        validRegistrationData.email,
        validRegistrationData.firstName,
        validRegistrationData.lastName,
        validRegistrationData.password
      );

      // Assert: Verify the result
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(validRegistrationData.email);
      expect(result.user.first_name).toBe(validRegistrationData.firstName);
      expect(result.user.last_name).toBe(validRegistrationData.lastName);
      expect(result.user).not.toHaveProperty('password_hash');

      // Verify dependencies were called correctly
      expect(KarmaService.isBlacklisted).toHaveBeenCalledWith(validRegistrationData.email);
      expect(UserModel.existsByEmail).toHaveBeenCalledWith(validRegistrationData.email);
    });

    it('should generate a valid JWT token on registration', async () => {
      (KarmaService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (UserModel.existsByEmail as jest.Mock).mockResolvedValue(false);

      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (UserModel.create as jest.Mock).mockResolvedValue(1);
        (AccountModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      const result = await AuthService.register(
        validRegistrationData.email,
        validRegistrationData.firstName,
        validRegistrationData.lastName,
        validRegistrationData.password
      );

      // Verify the token is a valid JWT
      const decoded = jwt.verify(
        result.token,
        'test-secret-key-at-least-32-characters-long!'
      ) as { userId: number };
      expect(decoded).toHaveProperty('userId', 1);
    });

    it('should hash the password before storing', async () => {
      (KarmaService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (UserModel.existsByEmail as jest.Mock).mockResolvedValue(false);

      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (UserModel.create as jest.Mock).mockResolvedValue(1);
        (AccountModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      await AuthService.register(
        validRegistrationData.email,
        validRegistrationData.firstName,
        validRegistrationData.lastName,
        validRegistrationData.password
      );

      // Verify that UserModel.create was called with a hashed password
      const createCall = (UserModel.create as jest.Mock).mock.calls[0][0];
      expect(createCall.password_hash).toBeDefined();
      expect(createCall.password_hash).not.toBe(validRegistrationData.password);

      // Verify the hash is valid bcrypt
      const isValid = await bcrypt.compare(
        validRegistrationData.password,
        createCall.password_hash
      );
      expect(isValid).toBe(true);
    });

    // NEGATIVE TESTS

    it('should reject registration for blacklisted users', async () => {
      // Arrange: User IS on the blacklist
      (KarmaService.isBlacklisted as jest.Mock).mockResolvedValue(true);

      // Act & Assert: Should throw a forbidden error
      await expect(
        AuthService.register(
          validRegistrationData.email,
          validRegistrationData.firstName,
          validRegistrationData.lastName,
          validRegistrationData.password
        )
      ).rejects.toThrow(ApiError);

      await expect(
        AuthService.register(
          validRegistrationData.email,
          validRegistrationData.firstName,
          validRegistrationData.lastName,
          validRegistrationData.password
        )
      ).rejects.toThrow('Unable to create account');

      // Verify we checked the blacklist but didn't proceed to create user
      expect(KarmaService.isBlacklisted).toHaveBeenCalled();
      expect(UserModel.create).not.toHaveBeenCalled();
    });

    it('should reject registration for duplicate email', async () => {
      (KarmaService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (UserModel.existsByEmail as jest.Mock).mockResolvedValue(true); // Email exists!

      await expect(
        AuthService.register(
          validRegistrationData.email,
          validRegistrationData.firstName,
          validRegistrationData.lastName,
          validRegistrationData.password
        )
      ).rejects.toThrow('An account with this email already exists');
    });

    it('should not expose sensitive data in the response', async () => {
      (KarmaService.isBlacklisted as jest.Mock).mockResolvedValue(false);
      (UserModel.existsByEmail as jest.Mock).mockResolvedValue(false);

      const mockTrx = jest.fn();
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        (UserModel.create as jest.Mock).mockResolvedValue(1);
        (AccountModel.create as jest.Mock).mockResolvedValue(1);
        return callback(mockTrx);
      });

      const result = await AuthService.register(
        validRegistrationData.email,
        validRegistrationData.firstName,
        validRegistrationData.lastName,
        validRegistrationData.password
      );

      // SECURITY: Ensure password_hash is NEVER in the response
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).not.toHaveProperty('password');
    });
  });

  // LOGIN TESTS
  describe('login', () => {
    const validPassword = 'Password123!';
    let hashedPassword: string;

    beforeAll(async () => {
      hashedPassword = await bcrypt.hash(validPassword, 10);
    });

    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      password_hash: '', // Will be set in beforeAll
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // POSITIVE TESTS 

    it('should successfully login with valid credentials', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      const result = await AuthService.login('test@example.com', validPassword);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should return a valid JWT token on login', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      const result = await AuthService.login('test@example.com', validPassword);

      const decoded = jwt.verify(
        result.token,
        'test-secret-key-at-least-32-characters-long!'
      ) as { userId: number };
      expect(decoded).toHaveProperty('userId', 1);
    });

    // NEGATIVE TESTS

    it('should reject login with non-existent email', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(undefined);

      await expect(
        AuthService.login('nonexistent@example.com', validPassword)
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject login with wrong password', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      await expect(
        AuthService.login('test@example.com', 'WrongPassword123!')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should use the SAME error message for wrong email and wrong password', async () => {
      // This is a SECURITY test — different error messages allow email enumeration

      // Test 1: Non-existent email
      (UserModel.findByEmail as jest.Mock).mockResolvedValue(undefined);
      let emailError: ApiError | undefined;
      try {
        await AuthService.login('nonexistent@example.com', validPassword);
      } catch (e) {
        emailError = e as ApiError;
      }

      // Test 2: Wrong password
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });
      let passwordError: ApiError | undefined;
      try {
        await AuthService.login('test@example.com', 'WrongPassword123!');
      } catch (e) {
        passwordError = e as ApiError;
      }

      // Both should have the SAME message
      expect(emailError?.message).toBe(passwordError?.message);
      expect(emailError?.message).toBe('Invalid email or password');
    });

    it('should reject login for deactivated accounts', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
        is_active: false, // Deactivated!
      });

      await expect(
        AuthService.login('test@example.com', validPassword)
      ).rejects.toThrow('Account has been deactivated');
    });

    it('should not expose password_hash in login response', async () => {
      (UserModel.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        password_hash: hashedPassword,
      });

      const result = await AuthService.login('test@example.com', validPassword);

      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).not.toHaveProperty('password');
    });
  });
});
