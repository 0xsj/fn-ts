import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { UserDTO } from '../../types/user/user.dto';
import { CreateUserInput } from '../../types/user/input/create-user.input';
import { CreateUserOutput } from '../../types/user/output/create-user.output';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => UserDTO)
  async getUser(@Args('email') email: string): Promise<UserDTO> {
    const result = await this.authService.getUserByEmail(email);
    return result.user;
  }

  @Mutation(() => CreateUserOutput)
  async createUser(
    @Args('user') user: CreateUserInput
  ): Promise<CreateUserOutput> {
    const result = await this.authService.createUser(user);
    return result;
  }
}
