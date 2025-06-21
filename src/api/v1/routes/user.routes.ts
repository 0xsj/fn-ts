import { Router } from "express";
import { UserController } from "../controller/user.controller";

export function createUserRoutes(): Router {
    const router = Router();
    const userController = new UserController();

    router.post('/', userController.createUser.bind(userController))
    router.get('/:id', userController.getUserById.bind(userController))
    router.get('/', userController.getUsers.bind(userController))

    return router;
}