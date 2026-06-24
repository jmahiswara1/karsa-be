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
import { AdminService } from './admin.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('api/admin')
@SkipThrottle()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    const stats = await this.adminService.getStats();
    return { success: true, data: stats };
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
    return {
      success: true,
      data: result.items,
      meta: { total: result.total },
    };
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
  async approveUser(@Param('id') id: string) {
    const updated = await this.adminService.approveUser(id);
    return { success: true, data: updated, message: 'User approved' };
  }

  @Patch('users/:id/reject')
  async rejectUser(@Param('id') id: string) {
    const updated = await this.adminService.rejectUser(id);
    return { success: true, data: updated, message: 'User rejected' };
  }

  @Patch('users/:id/role')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const updated = await this.adminService.updateUserRole(id, dto);
    return { success: true, data: updated, message: 'User role updated' };
  }

  @Patch('users/:id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    const updated = await this.adminService.updateUserStatus(id, dto);
    return { success: true, data: updated, message: 'User status updated' };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    const result = await this.adminService.deleteUser(id);
    return { success: true, data: result, message: 'User deleted' };
  }
}
