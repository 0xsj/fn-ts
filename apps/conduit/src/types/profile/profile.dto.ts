import { ArgsType, Field, ObjectType } from '@nestjs/graphql';

@ArgsType()
@ObjectType()
export class ProfileDTO {
  @Field()
  username: string;

  @Field()
  bio?: string;

  @Field()
  image?: string;

  @Field()
  active?: boolean;
}
