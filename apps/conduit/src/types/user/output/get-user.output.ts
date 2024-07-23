import { ObjectType, Field } from '@nestjs/graphql';
import { UserDTO } from '../user.dto';

@ObjectType()
export class GetUserOutput {
  @Field(() => UserDTO, { nullable: true })
  user?: UserDTO;

  @Field({ nullable: true })
  message?: string;
}
