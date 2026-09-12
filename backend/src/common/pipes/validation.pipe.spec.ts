import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { IsString, IsUUID, IsOptional, IsArray } from 'class-validator';
import { ValidationPipe } from './validation.pipe';

class CreateTestDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

describe('ValidationPipe (API Validation)', () => {
  let pipe: ValidationPipe;
  const dtoMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateTestDto,
  };

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  it('transforms valid payload into instance and passes validation', async () => {
    // ARRANGE
    const validPayload = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Valid Name',
      tags: ['tag1', 'tag2'],
    };

    // ACT
    const result = (await pipe.transform(validPayload, dtoMetadata)) as CreateTestDto;

    // ASSERT
    expect(result).toBeInstanceOf(CreateTestDto);
    expect(result.id).toBe(validPayload.id);
    expect(result.name).toBe(validPayload.name);
    expect(result.tags).toEqual(validPayload.tags);
  });

  it('rejects properties that are not declared on the DTO (forbidNonWhitelisted)', async () => {
    // ARRANGE: includes malicious or unintended 'isAdmin' property
    const payloadWithExtra = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Valid Name',
      isAdmin: true,
    };

    // ACT & ASSERT
    await expect(pipe.transform(payloadWithExtra, dtoMetadata)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns structured VALIDATION_ERROR details when required fields fail validation', async () => {
    // ARRANGE: invalid UUID and missing name
    const invalidPayload = {
      id: 'not-a-uuid',
    };

    // ACT & ASSERT
    try {
      await pipe.transform(invalidPayload, dtoMetadata);
      fail('Should have thrown BadRequestException');
    } catch (error: any) {
      // ASSERT
      expect(error).toBeInstanceOf(BadRequestException);
      const response = error.getResponse();
      expect(response).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      });
      expect(Array.isArray(response.details)).toBe(true);
      expect(response.details.length).toBeGreaterThan(0);
    }
  });

  it('bypasses validation when target metatype is a primitive type or absent', async () => {
    // ARRANGE
    const stringMetadata: ArgumentMetadata = {
      type: 'param',
      metatype: String,
    };

    // ACT
    const result = await pipe.transform('raw-param-string', stringMetadata);

    // ASSERT
    expect(result).toBe('raw-param-string');
  });
});
