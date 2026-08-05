import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export enum Role {
    CUSTOMER = 'customer',
    BOT_SYSTEM = 'bot_system',
    MODERATOR = 'moderator',
    ADMIN = 'admin',
}

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);