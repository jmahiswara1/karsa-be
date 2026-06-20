import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('api/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    const project = await this.projectsService.create(
      user.id,
      createProjectDto,
    );
    return {
      success: true,
      message: 'Project created successfully',
      data: project,
    };
  }

  @Get()
  async findAll(@CurrentUser() user: User, @Query() query: ProjectQueryDto) {
    try {
      console.log(
        '[ProjectsController] findAll -> user:',
        user.id,
        'query:',
        query,
      );
      const result = await this.projectsService.findAll(user.id, query);
      console.log(
        '[ProjectsController] result data length:',
        result.data.length,
      );
      return {
        success: true,
        message: 'Projects retrieved successfully',
        ...result,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message,
        stack: err.stack,
      };
    }
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    const project = await this.projectsService.findOne(user.id, id);
    return {
      success: true,
      message: 'Project retrieved successfully',
      data: project,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.update(
      user.id,
      id,
      updateProjectDto,
    );
    return {
      success: true,
      message: 'Project updated successfully',
      data: project,
    };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.projectsService.remove(user.id, id);
    return {
      success: true,
      message: 'Project deleted successfully',
    };
  }
}
