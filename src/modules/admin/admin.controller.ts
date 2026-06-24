import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import type { User, AuditAction } from '@prisma/client';

@Controller('api/admin')
@SkipThrottle()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('stats')
  async getStats() {
    const stats = await this.adminService.getStats();
    return { success: true, data: stats };
  }

  @Get('audit-logs')
  async listAuditLogs(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('action') action?: AuditAction,
    @Query('adminUserId') adminUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.auditLogService.list({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      action,
      adminUserId,
      from,
      to,
    });
    return { success: true, data: result.items, meta: { total: result.total } };
  }

  @Get('users')
  async listUsers(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.adminService.listUsers({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      search,
      role,
      status,
    });
    return { success: true, data: result.items, meta: { total: result.total } };
  }

  @Get('users/pending')
  async listPendingUsers() {
    const users = await this.adminService.listPendingUsers();
    return { success: true, data: users };
  }

  @Get('users/:id')
  async getUserDetail(@Param('id') id: string) {
    const user = await this.adminService.getUserDetail(id);
    return { success: true, data: user };
  }

  @Patch('users/:id/approve')
  async approveUser(@CurrentUser() admin: User, @Param('id') id: string) {
    const updated = await this.adminService.approveUser(admin.id, id);
    return { success: true, data: updated, message: 'User approved' };
  }

  @Patch('users/:id/reject')
  async rejectUser(@CurrentUser() admin: User, @Param('id') id: string) {
    const updated = await this.adminService.rejectUser(admin.id, id);
    return { success: true, data: updated, message: 'User rejected' };
  }

  @Patch('users/:id/role')
  async updateRole(
    @CurrentUser() admin: User,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const updated = await this.adminService.updateUserRole(admin.id, id, dto);
    return { success: true, data: updated, message: 'User role updated' };
  }

  @Patch('users/:id/status')
  async updateStatus(
    @CurrentUser() admin: User,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const updated = await this.adminService.updateUserStatus(admin.id, id, dto);
    return { success: true, data: updated, message: 'User status updated' };
  }

  @Delete('users/:id')
  async deleteUser(@CurrentUser() admin: User, @Param('id') id: string) {
    const result = await this.adminService.deleteUser(admin.id, id);
    return { success: true, data: result, message: 'User deleted' };
  }
}
