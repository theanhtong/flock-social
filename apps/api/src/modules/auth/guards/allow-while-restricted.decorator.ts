import { SetMetadata } from '@nestjs/common';

export const ALLOW_WHILE_RESTRICTED_KEY = 'allowWhileRestricted';
export const AllowWhileRestricted = () => SetMetadata(ALLOW_WHILE_RESTRICTED_KEY, true);