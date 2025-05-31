import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsInt,
  IsPositive,
  IsArray,
  IsObject,
  IsDate,
  IsDateString,
  IsEnum,
  IsUrl,
  IsPhoneNumber,
  Length,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
  IsEmpty,
  Contains,
  NotContains,
  IsAlpha,
  IsAlphanumeric,
  IsDecimal,
  IsJSON,
  IsMimeType,
  IsBase64,
  IsHexColor,
  IsLatitude,
  IsLongitude,
  IsCreditCard,
  IsISBN,
  IsISO8601,
  IsCurrency,
  IsIP,
  IsPort,
  IsFQDN,
  IsHash,
  IsMACAddress,
  ValidationArguments as VA,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Re-export common validators for convenience
export {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsInt,
  IsPositive,
  IsArray,
  IsObject,
  IsDate,
  IsDateString,
  IsEnum,
  IsUrl,
  IsPhoneNumber,
  Length,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
  IsEmpty,
  Contains,
  NotContains,
  IsAlpha,
  IsAlphanumeric,
  IsDecimal,
  IsJSON,
  IsMimeType,
  IsBase64,
  IsHexColor,
  IsLatitude,
  IsLongitude,
  IsCreditCard,
  IsISBN,
  IsISO8601,
  IsCurrency,
  IsIP,
  IsPort,
  IsFQDN,
  IsHash,
  IsMACAddress,
  Transform,
  Type,
};

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password) return false;
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  defaultMessage(): string {
    return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
  }
}

@ValidatorConstraint({ name: 'isSlug', async: false })
class IsSlugConstraint implements ValidatorConstraintInterface {
  validate(slug: string): boolean {
    if (!slug) return false;
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  }

  defaultMessage(): string {
    return 'Must be a valid slug (lowercase letters, numbers, and hyphens only)';
  }
}

@ValidatorConstraint({ name: 'isColorHex', async: false })
class IsColorHexConstraint implements ValidatorConstraintInterface {
  validate(color: string): boolean {
    if (!color) return false;
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  }

  defaultMessage(): string {
    return 'Must be a valid hex color (e.g., #ff0000 or #f00)';
  }
}

@ValidatorConstraint({ name: 'isFileExtension', async: false })
class IsFileExtensionConstraint implements ValidatorConstraintInterface {
  validate(filename: string, args: VA): boolean {
    if (!filename) return false;
    const allowedExtensions = args.constraints[0] || [];
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    return allowedExtensions.includes(fileExtension);
  }

  defaultMessage(args: VA): string {
    const allowedExtensions = args.constraints[0] || [];
    return `File must have one of the following extensions: ${allowedExtensions.join(', ')}`;
  }
}

export function IsEntityId(validationOptions?: ValidationOptions) {
  return IsUUID(4, validationOptions);
}

export function IsOptionalEntityId(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsOptional()(object, propertyName);
    IsEntityId(validationOptions)(object, propertyName);
  };
}

export function IsEntityIdArray(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsArray(validationOptions)(object, propertyName);
    IsUUID(4, { each: true, ...validationOptions })(object, propertyName);
  };
}

export function IsText(
  minLength = 1,
  maxLength = 1000,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsString(validationOptions)(object, propertyName);
    Length(minLength, maxLength, validationOptions)(object, propertyName);
    Transform(({ value }) => value?.trim())(object, propertyName);
  };
}

export function IsOptionalText(
  minLength = 1,
  maxLength = 1000,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsOptional()(object, propertyName);
    IsText(minLength, maxLength, validationOptions)(object, propertyName);
  };
}

export function IsName(
  minLength = 2,
  maxLength = 50,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsString(validationOptions)(object, propertyName);
    Length(minLength, maxLength, validationOptions)(object, propertyName);
    Matches(/^[a-zA-Z\s\-'\.]+$/, {
      message:
        'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
      ...validationOptions,
    })(object, propertyName);
    Transform(({ value }) => value?.trim())(object, propertyName);
  };
}

export function IsUsername(
  minLength = 3,
  maxLength = 30,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsString(validationOptions)(object, propertyName);
    Length(minLength, maxLength, validationOptions)(object, propertyName);
    Matches(/^[a-zA-Z0-9_]+$/, {
      message: 'Username can only contain letters, numbers, and underscores',
      ...validationOptions,
    })(object, propertyName);
    Transform(({ value }) => value?.toLowerCase()?.trim())(
      object,
      propertyName,
    );
  };
}

export function IsSlug(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSlugConstraint,
    });
    Transform(({ value }) => value?.toLowerCase()?.trim())(
      object,
      propertyName,
    );
  };
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

export function IsNormalizedEmail(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsEmail({}, validationOptions)(object, propertyName);
    Transform(({ value }) => value?.toLowerCase()?.trim())(
      object,
      propertyName,
    );
  };
}

export function IsColorHex(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsColorHexConstraint,
    });
  };
}

export function IsPositiveInt(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsInt(validationOptions)(object, propertyName);
    IsPositive(validationOptions)(object, propertyName);
    Transform(({ value }) => parseInt(value, 10))(object, propertyName);
  };
}

export function IsNumberRange(
  min: number,
  max: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsNumber({}, validationOptions)(object, propertyName);
    Min(min, validationOptions)(object, propertyName);
    Max(max, validationOptions)(object, propertyName);
    Transform(({ value }) => parseFloat(value))(object, propertyName);
  };
}

export function IsPaginationLimit(
  maxLimit = 100,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsInt(validationOptions)(object, propertyName);
    Min(1, validationOptions)(object, propertyName);
    Max(maxLimit, validationOptions)(object, propertyName);
    Transform(({ value }) => parseInt(value, 10))(object, propertyName);
  };
}

export function IsPaginationOffset(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsInt(validationOptions)(object, propertyName);
    Min(0, validationOptions)(object, propertyName);
    Transform(({ value }) => parseInt(value, 10))(object, propertyName);
  };
}

export function IsBooleanField(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsBoolean(validationOptions)(object, propertyName);
    Transform(({ value }) => {
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return Boolean(value);
    })(object, propertyName);
  };
}

export function IsDateField(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsDateString({}, validationOptions)(object, propertyName);
    Transform(({ value }) => new Date(value))(object, propertyName);
    Type(() => Date)(object, propertyName);
  };
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsDate(validationOptions)(object, propertyName);
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(value: Date) {
          return value > new Date();
        },
        defaultMessage() {
          return 'Date must be in the future';
        },
      },
    });
  };
}

export function IsStringArray(
  minSize = 1,
  maxSize = 100,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsArray(validationOptions)(object, propertyName);
    ArrayMinSize(minSize, validationOptions)(object, propertyName);
    ArrayMaxSize(maxSize, validationOptions)(object, propertyName);
    IsString({ each: true, ...validationOptions })(object, propertyName);
  };
}

export function IsOptionalStringArray(
  minSize = 1,
  maxSize = 100,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsOptional()(object, propertyName);
    IsStringArray(minSize, maxSize, validationOptions)(object, propertyName);
  };
}

export function IsFileExtension(
  allowedExtensions: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [allowedExtensions],
      validator: IsFileExtensionConstraint,
    });
  };
}

export function IsImageFile(validationOptions?: ValidationOptions) {
  return IsFileExtension(
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    validationOptions,
  );
}

export function IsDocumentFile(validationOptions?: ValidationOptions) {
  return IsFileExtension(
    ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    validationOptions,
  );
}

export function IsOptionalName(
  minLength = 2,
  maxLength = 50,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsOptional()(object, propertyName);
    IsName(minLength, maxLength, validationOptions)(object, propertyName);
  };
}

export function IsOptionalUsername(
  minLength = 3,
  maxLength = 30,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    IsOptional()(object, propertyName);
    IsUsername(minLength, maxLength, validationOptions)(object, propertyName);
  };
}

export function IsOptionalEmail(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsOptional()(object, propertyName);
    IsNormalizedEmail(validationOptions)(object, propertyName);
  };
}

export function IsOptionalUrl(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    IsOptional()(object, propertyName);
    IsUrl({}, validationOptions)(object, propertyName);
  };
}
