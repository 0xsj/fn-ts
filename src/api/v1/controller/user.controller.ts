import { injectable } from "tsyringe";
import { UserService } from "../../../domain/services/user.service";
import { DIContainer } from "../../../core/di/container";
import { TOKENS } from "../../../core/di/tokens";

@injectable()
export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = DIContainer.resolve<UserService>(TOKENS.UserService)
    }

    async createUser() {}

    async getUserById() {}

    async getUsers() {}
}