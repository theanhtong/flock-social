import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Role, Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AdminUsersService } from './services/admin-users.service.js';
import {
  AdminQueryUsersDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  BanUserDto,
  UnbanUserDto,
  SystemStatsDto,
  SanctionUserDto,
} from './admin-users.dto.js';
import { UserProfileDto } from './users.dto.js';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MODERATOR)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) { }

  @Get()
  @ApiOperation({ summary: 'Get users list' })
  @ApiResponse({ status: 200 })
  async getUsers(@Query() query: AdminQueryUsersDto) {
    return this.adminUsersService.getUsers(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get system stats' })
  @ApiResponse({ status: 200, type: SystemStatsDto })
  async getSystemStats() {
    return this.adminUsersService.getSystemStats();
  }

  @Get('audit-logs')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiResponse({ status: 200 })
  async getAuditLogs(
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.adminUsersService.getAuditLogs(cursor, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user detail' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getUserById(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  @Post(':id/sanction')
  @ApiOperation({ summary: 'Sanction user: warning, suspension, or ban' })
  @ApiResponse({ status: 200 })
  async sanctionUser(
    @Param('id') id: string,
    @Body() dto: SanctionUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminUsersService.sanctionUser(id, dto, adminId);
  }

  @Get(':id/sanctions')
  @ApiOperation({ summary: 'Get user sanctions' })
  @ApiResponse({ status: 200 })
  async getUserSanctions(@Param('id') id: string) {
    return this.adminUsersService.getUserSanctions(id);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user role' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminUsersService.updateUserRole(id, dto, adminId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminUsersService.updateUserStatus(id, dto, adminId);
  }

  @Post(':id/ban')
  @ApiOperation({ summary: 'Ban user' })
  @ApiResponse({ status: 200 })
  async banUser(
    @Param('id') id: string,
    @Body() dto: BanUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminUsersService.banUser(id, dto, adminId);
  }

  @Post(':id/unban')
  @ApiOperation({ summary: 'Unban user' })
  @ApiResponse({ status: 200 })
  async unbanUser(
    @Param('id') id: string,
    @Body() dto: UnbanUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminUsersService.unbanUser(id, dto, adminId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200 })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminUsersService.deleteUser(id, adminId);
  }
}
