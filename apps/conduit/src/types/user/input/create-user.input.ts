import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {
  @Field()
  email: string;

  @Field()
  fullName: string;

  @Field()
  username: string;

  @Field()
  bio: string;
}
