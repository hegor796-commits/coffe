import { Role } from '@coffee/shared';

/** Полезная нагрузка JWT access-токена. */
export interface JwtPayload {
  /** customer.id или staff_user.id в зависимости от роли. */
  sub: string;
  tenantId: string;
  role: Role;
  tgUserId: string;
  /** Точка, к которой привязан сотрудник (для бариста). */
  locationId?: string;
}

/** Аутентифицированный контекст запроса (кладётся в req.user). */
export interface AuthContext extends JwtPayload {}
