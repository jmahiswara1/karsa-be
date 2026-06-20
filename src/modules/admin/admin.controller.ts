import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async listUsers(@Query('skip') skip?: string, @Query('take') take?: string) {
    const result = await this.adminService.listUsers({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
    return {
      success: true,
      data: result.items,
      meta: { total: result.total },
    };
  }

  @Patch('users/:id/role')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const updated = await this.adminService.updateUserRole(id, dto);
    return {
      success: true,
      data: updated,
      message: 'User role updated',
    };
  }
}
