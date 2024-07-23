import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserService } from '@fromis/repositories';
import { UserEntity } from '@fromis/shared';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('user-get')
  handleGetUser(email: string) {
    // Fetch user by email
    return this.userService.getUserByEmail(email);
  }

  @MessagePattern('user-create')
  handleCreateUser(data: {
    email: string;
    username: string;
    fullName: string;
    bio: string;
  }) {
    // Create a new user with the provided data
    const { email, username, fullName, bio } = data;
    return this.userService.create(email, username, fullName, bio);
  }
}
