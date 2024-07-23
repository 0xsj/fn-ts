import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserInput } from '../../types/user/input/create-user.input';
import { UserDTO } from '../../types/user/user.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  onModuleInit() {
    Logger.log('GATEWAY: AUTH SERVICE');
  }

  getUsers(): { success: boolean; users: UserDTO[] } {
    return {
      success: true,
      users: [
        {
          email: 'john.doe@example.com',
          username: 'johndoe',
          fullName: 'John Doe',
          bio: 'Software Developer',
        },
        {
          email: 'jane.doe@example.com',
          username: 'janedoe',
          fullName: 'Jane Doe',
          bio: 'Graphic Designer',
        },
      ],
    };
  }

  async getUserByEmail(
    email: string
  ): Promise<{ success: boolean; user: UserDTO }> {
    Logger.log('GET USER BY EMAIL');
    return {
      success: true,
      user: {
        email: email,
        username: 'johndoe',
        fullName: 'John Doe',
        bio: 'Software Developer',
      },
    };
  }

  async createUser(
    user: CreateUserInput
  ): Promise<{ success: boolean; message: string; user: UserDTO }> {
    Logger.log('CREATE USER');
    return {
      success: true,
      message: 'User created successfully',
      user: {
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        bio: user.bio,
      },
    };
  }
}
