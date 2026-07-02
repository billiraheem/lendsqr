import { Router } from 'express';
import { AuthController } from '../controllers';
import { validate, authLimiter } from '../middlewares';
import { registerSchema, loginSchema } from '../validators';

const router = Router();

// Apply strict rate limiting to all auth routes
router.use(authLimiter);

router.post(
  '/register',
  validate(registerSchema),
  AuthController.register.bind(AuthController)
);

router.post(
  '/login',
  validate(loginSchema),
  AuthController.login.bind(AuthController)
);

export default router;
