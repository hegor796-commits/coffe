import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Помечает эндпоинт как не требующий JWT. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
