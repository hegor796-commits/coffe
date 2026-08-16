import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/** Пайп валидации тела/квери через zod-схему. */
export class ZodBody<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Ошибка валидации',
        issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}
