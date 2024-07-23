import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUserByEmail(email: string) {
    console.log(`UserService: Fetching user by email: ${email}`);
    // Call the repository method to fetch the user by email
    const user = await this.userRepository.getUserByEmail(email);
    return user;
  }

  async create(email: string, username: string, fullName: string, bio: string) {
    console.log(`UserService: Creating user with email: ${email}`);
    // Call the repository method to create a new user
    const newUser = await this.userRepository.createUser(
      email,
      username,
      fullName,
      bio
    );
    return newUser;
  }
}
