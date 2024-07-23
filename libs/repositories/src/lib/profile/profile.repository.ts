import { CassandraService } from '@fromis/cassandra';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class ProfileRepository implements OnModuleInit {
  // Simulated database
  constructor(private cassandraService: CassandraService) {}
  private profiles: { username: string; bio: string; avatarUrl: string }[] = [
    {
      username: 'user1',
      bio: 'Bio of User One',
      avatarUrl: 'http://example.com/avatar1.png',
    },
    {
      username: 'user2',
      bio: 'Bio of User Two',
      avatarUrl: 'http://example.com/avatar2.png',
    },
  ];

  onModuleInit() {
    console.log('ProfileRepository module initialized');
  }

  async getProfileByUserName(username: string) {
    console.log(`Fetching profile for username: ${username}`);
    // Simulate async operation
    return new Promise((resolve) => {
      setTimeout(() => {
        const profile = this.profiles.find(
          (profile) => profile.username === username
        );
        resolve(profile || null);
      }, 1000);
    });
  }

  async createProfile(username: string, bio: string, avatarUrl: string) {
    console.log(`Creating profile for username: ${username}`);
    // Simulate async operation
    return new Promise((resolve) => {
      setTimeout(() => {
        const newProfile = { username, bio, avatarUrl };
        this.profiles.push(newProfile);
        resolve(newProfile);
      }, 1000);
    });
  }

  async updateProfile(
    username: string,
    updatedFields: Partial<{ bio: string; avatarUrl: string }>
  ) {
    console.log(`Updating profile for username: ${username}`);
    // Simulate async operation
    return new Promise((resolve) => {
      setTimeout(() => {
        const profile = this.profiles.find(
          (profile) => profile.username === username
        );
        if (profile) {
          Object.assign(profile, updatedFields);
          resolve(profile);
        } else {
          resolve(null);
        }
      }, 1000);
    });
  }
}
