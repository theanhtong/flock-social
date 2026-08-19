import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
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
import { ReportsService } from './reports.service.js';
import {
  CreateReportDto,
  QueryReportsDto,
  ResolveReportDto,
  DismissReportDto,
} from './reports.dto.js';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('reports')
  @ApiOperation({ summary: 'Submit a new content or user report (with optional evidence)' })
  @ApiResponse({ status: 201 })
  async createReport(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.createReport(userId, dto);
  }

  @Get('admin/reports')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get list of submitted reports for moderation' })
  @ApiResponse({ status: 200 })
  async getReports(@Query() query: QueryReportsDto) {
    return this.reportsService.getReports(query);
  }

  @Get('admin/reports/pending-count')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get pending reports count' })
  @ApiResponse({ status: 200 })
  async getPendingReportsCount() {
    return this.reportsService.getPendingReportsCount();
  }

  @Patch('admin/reports/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Resolve a report – optionally issue a sanction against reported user/author' })
  @ApiResponse({ status: 200 })
  async resolveReport(
    @Param('id') id: string,
    @CurrentUser('id') moderatorId: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.reportsService.resolveReport(id, moderatorId, dto);
  }

  @Patch('admin/reports/:id/dismiss')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Dismiss a report as invalid – optionally sanction the reporter' })
  @ApiResponse({ status: 200 })
  async dismissReport(
    @Param('id') id: string,
    @CurrentUser('id') moderatorId: string,
    @Body() dto: DismissReportDto,
  ) {
    return this.reportsService.dismissReport(id, moderatorId, dto);
  }
}
