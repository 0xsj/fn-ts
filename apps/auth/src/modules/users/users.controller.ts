import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserService } from './users.service';

@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @MessagePattern('user-get')
  handleGetUsers() {
    return this.userService.getUserByEmail();
  }

  @MessagePattern('user-create')
  handleCreateUsers() {
    return this.userService.create();
  }
}
