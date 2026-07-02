import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services';
import { sendSuccess, sendCreated } from '../utils';
import { StatusCodes } from 'http-status-codes';

class AuthController {
  async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, first_name, last_name, password } = req.body;

      const result = await AuthService.register(
        email,
        first_name,
        last_name,
        password
      );

      sendCreated(res, 'Account created successfully', {
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      sendSuccess(res, StatusCodes.OK, 'Login successful', {
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
