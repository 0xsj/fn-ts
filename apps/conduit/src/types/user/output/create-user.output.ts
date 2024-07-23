import { ObjectType, Field } from '@nestjs/graphql';
import { UserDTO } from '../user.dto';

@ObjectType()
export class CreateUserOutput {
  @Field()
  success: boolean;

  @Field(() => UserDTO, { nullable: true })
  user?: UserDTO;

  @Field({ nullable: true })
  message?: string;
}
