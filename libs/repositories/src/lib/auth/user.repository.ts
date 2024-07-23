import { CassandraService } from '@fromis/cassandra';
import { Injectable, OnModuleInit } from '@nestjs/common';
import {} from '@fromis/shared';

@Injectable()
export class UserRepository implements OnModuleInit {
  constructor(private cassandraService: CassandraService) {}
  // Simulated database
  private users: {
    email: string;
    username: string;
    fullName: string;
    bio: string;
  }[] = [
    {
      email: 'user@example.com',
      username: 'user1',
      fullName: 'User One',
      bio: 'Bio of User One',
    },
    {
      email: 'test@example.com',
      username: 'user2',
      fullName: 'User Two',
      bio: 'Bio of User Two',
    },
  ];

  onModuleInit() {
    console.log('UserRepository module initialized');
  }

  async getUserByEmail(email: string) {
    console.log(`Fetching user with email: ${email}`);
    // Simulate async operation
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = this.users.find((user) => user.email === email);
        resolve(user || null);
      }, 1000);
    });
  }

  async createUser(
    email: string,
    username: string,
    fullName: string,
    bio: string
  ) {
    console.log(`Creating user with email: ${email}`);
    // Simulate async operation
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser = { email, username, fullName, bio };
        this.users.push(newUser);
        resolve(newUser);
      }, 1000);
    });
  }

  async updateUser(
    email: string,
    updatedFields: Partial<{ username: string; fullName: string; bio: string }>
  ) {
    console.log(`Updating user with email: ${email}`);
    // Simulate async operation
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = this.users.find((user) => user.email === email);
        if (user) {
          Object.assign(user, updatedFields);
          resolve(user);
        } else {
          resolve(null);
        }
      }, 1000);
    });
  }
}
