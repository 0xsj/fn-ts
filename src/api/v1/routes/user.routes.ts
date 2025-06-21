import { Router, Request, Response } from "express";
import { UserController } from '../controller/user.controller';

export function createUserRoutes(): Router {
  const router = Router();
  const userController = new UserController();

  router.get('/health', (req: Request, res: Response) => {
        res.json({ message: 'User routes are working!' });
    });


  router.post('/', userController.createUser.bind(userController));
  router.get('/', userController.getUsers.bind(userController));
  router.get('/:id', userController.getUserById.bind(userController));
  router.put('/:id', userController.updateUser.bind(userController));
  router.delete('/:id', userController.deleteUser.bind(userController));

  return router;
}
