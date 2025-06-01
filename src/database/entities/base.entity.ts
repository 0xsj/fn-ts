import {
  IsDateString,
  IsEntityId,
  IsInt,
  IsOptional,
  Min,
} from 'src/common/decorators/validation.decorator';
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsEntityId()
  id!: string;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  @IsDateString()
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
  })
  @IsDateString()
  updatedAt!: Date;

  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  deletedAt?: Date | null;

  @VersionColumn({
    name: 'version',
    default: 1,
  })
  @IsInt()
  @Min(1)
  version!: number;

  public isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  public isRecentlyCreated(): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.createdAt > oneHourAgo;
  }

  public isRecentlyUpdated(): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.updatedAt > oneHourAgo;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString() || null,
      version: this.version,
    };
  }
}
