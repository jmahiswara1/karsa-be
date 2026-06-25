import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';
import { InviteService } from './invite.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { GenerateInviteDto } from './dto/generate-invite.dto';
import type { User, AuditAction } from '@prisma/client';

@Controller('api/admin')
@Throttle({ default: { ttl: 60000, limit: 120 } })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
    private readonly inviteService: InviteService,
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

  @Get('activities')
  async listActivities(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.adminService.listActivities({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      userId,
      action,
      entityType,
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

  @Get('users/:id/activities')
  async getUserActivities(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const result = await this.adminService.getUserActivities(
      id,
      skip ? Number(skip) : undefined,
      take ? Number(take) : undefined,
    );
    return { success: true, data: result.items, meta: { total: result.total } };
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

  @Post('invites')
  async generateInvite(
    @CurrentUser() admin: User,
    @Body() dto: GenerateInviteDto,
  ) {
    const invite = await this.inviteService.generate(
      admin.id,
      dto.email,
      dto.expiresInDays,
    );

    await this.auditLogService.log({
      adminUserId: admin.id,
      action: 'GENERATE_INVITE',
      details: { code: invite.code, email: invite.email },
    });

    return { success: true, data: invite };
  }

  @Get('invites')
  async listInvites() {
    const invites = await this.inviteService.list();
    return { success: true, data: invites };
  }

  @Delete('invites/:id')
  async revokeInvite(@CurrentUser() admin: User, @Param('id') id: string) {
    const result = await this.inviteService.revoke(id);

    await this.auditLogService.log({
      adminUserId: admin.id,
      action: 'REVOKE_INVITE',
      details: { inviteId: id },
    });

    return { success: true, data: result, message: 'Invite revoked' };
  }
}
