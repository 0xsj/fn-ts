import { Injectable, Logger } from '@nestjs/common';
import { ProfileRepository } from './profile.repository';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async getProfile() {
    Logger.log('REPOSITORY: GETPROFILE');
    return { message: 'profile' };
  }
}
