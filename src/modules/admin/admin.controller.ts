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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
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

@ApiTags('Admin')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getStats() {
    const stats = await this.adminService.getStats();
    return { success: true, data: stats };
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'List audit logs' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiQuery({ name: 'skip', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'adminUserId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
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
  @ApiOperation({ summary: 'List all user activities' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiQuery({ name: 'skip', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
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
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiQuery({ name: 'skip', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
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
  @ApiOperation({ summary: 'List pending users awaiting approval' })
  @ApiResponse({ status: 200, description: 'Success' })
  async listPendingUsers() {
    const users = await this.adminService.listPendingUsers();
    return { success: true, data: users };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  async getUserDetail(@Param('id') id: string) {
    const user = await this.adminService.getUserDetail(id);
    return { success: true, data: user };
  }

  @Get('users/:id/activities')
  @ApiOperation({ summary: 'Get activities for a specific user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'skip', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: String })
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
  @ApiOperation({ summary: 'Approve a pending user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  async approveUser(@CurrentUser() admin: User, @Param('id') id: string) {
    const updated = await this.adminService.approveUser(admin.id, id);
    return { success: true, data: updated, message: 'User approved' };
  }

  @Patch('users/:id/reject')
  @ApiOperation({ summary: 'Reject a pending user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  async rejectUser(@CurrentUser() admin: User, @Param('id') id: string) {
    const updated = await this.adminService.rejectUser(admin.id, id);
    return { success: true, data: updated, message: 'User rejected' };
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: "Update a user's role" })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateRoleDto })
  async updateRole(
    @CurrentUser() admin: User,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const updated = await this.adminService.updateUserRole(admin.id, id, dto);
    return { success: true, data: updated, message: 'User role updated' };
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: "Update a user's status" })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateStatusDto })
  async updateStatus(
    @CurrentUser() admin: User,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const updated = await this.adminService.updateUserStatus(admin.id, id, dto);
    return { success: true, data: updated, message: 'User status updated' };
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
  async deleteUser(@CurrentUser() admin: User, @Param('id') id: string) {
    const result = await this.adminService.deleteUser(admin.id, id);
    return { success: true, data: result, message: 'User deleted' };
  }

  @Post('invites')
  @ApiOperation({ summary: 'Generate an invite code' })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiBody({ type: GenerateInviteDto })
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
  @ApiOperation({ summary: 'List all invite codes' })
  @ApiResponse({ status: 200, description: 'Success' })
  async listInvites() {
    const invites = await this.inviteService.list();
    return { success: true, data: invites };
  }

  @Delete('invites/:id')
  @ApiOperation({ summary: 'Revoke an invite code' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiParam({ name: 'id', type: String })
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
