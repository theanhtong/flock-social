import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return null;

    const userId = user.id || user.sub;
    const normalizedUser = {
      ...user,
      id: userId,
    };

    if (data === 'id') {
      return userId;
    }

    return data ? normalizedUser?.[data] : normalizedUser;
  },
);
