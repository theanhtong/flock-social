import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { UpdateUserSettingDto } from '../users.dto.js';

@Injectable()
export class UserSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSettings(userId: string) {
    const userBigInt = BigInt(userId);
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId: userBigInt },
    });
    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: { userId: userBigInt },
      });
    }
    return {
      ...settings,
      userId: settings.userId.toString(),
    };
  }

  async updateConfiguration(userId: string, dto: UpdateUserSettingDto) {
    const userBigInt = BigInt(userId);
    await this.getUserSettings(userId);
    const updated = await this.prisma.userSettings.update({
      where: {
        userId: userBigInt,
      },
      data: dto,
    });
    return {
      ...updated,
      userId: updated.userId.toString(),
    };
  }
}