import { Router } from 'express';
import { AccountController } from '../controllers';
import { authenticate, validate } from '../middlewares';
import { fundAccountSchema, withdrawSchema, transferSchema } from '../validators';

const router = Router();

router.use(authenticate);
router.get(
  '/',
  AccountController.getAccount.bind(AccountController)
);

router.post(
  '/fund',
  validate(fundAccountSchema),
  AccountController.fundAccount.bind(AccountController)
);

router.post(
  '/withdraw',
  validate(withdrawSchema),
  AccountController.withdraw.bind(AccountController)
);

router.post(
  '/transfer',
  validate(transferSchema),
  AccountController.transfer.bind(AccountController)
);

router.get(
  '/transactions',
  AccountController.getTransactions.bind(AccountController)
);

export default router;
