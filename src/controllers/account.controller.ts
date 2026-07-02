import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services';
import { sendSuccess } from '../utils';
import { StatusCodes } from 'http-status-codes';

class AccountController {
  async getAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const account = await AccountService.getAccount(userId);

      sendSuccess(res, StatusCodes.OK, 'Account retrieved successfully', account);
    } catch (error) {
      next(error);
    }
  }

  async fundAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { amount } = req.body;

      const transaction = await AccountService.fundAccount(userId, amount);

      sendSuccess(res, StatusCodes.OK, 'Account funded successfully', transaction);
    } catch (error) {
      next(error);
    }
  }

  async withdraw(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { amount } = req.body;

      const transaction = await AccountService.withdraw(userId, amount);

      sendSuccess(res, StatusCodes.OK, 'Withdrawal successful', transaction);
    } catch (error) {
      next(error);
    }
  }

  async transfer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { recipient_account_number, amount, description } = req.body;

      const transaction = await AccountService.transfer(
        userId,
        recipient_account_number,
        amount,
        description
      );

      sendSuccess(res, StatusCodes.OK, 'Transfer successful', transaction);
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page

      const result = await AccountService.getTransactionHistory(userId, page, limit);

      sendSuccess(res, StatusCodes.OK, 'Transactions retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

export default new AccountController();
