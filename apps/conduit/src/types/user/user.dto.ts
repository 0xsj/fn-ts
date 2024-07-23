import { ArgsType, Field, ObjectType } from '@nestjs/graphql';

@ArgsType()
@ObjectType()
export class UserDTO {
  @Field()
  email: string;

  @Field()
  fullName: string;

  @Field()
  username: string;

  @Field()
  bio: string;
}
