import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlannerService } from './planner.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { CreatePlannerEntryDto } from './dto/create-planner-entry.dto';
import { UpdatePlannerEntryDto } from './dto/update-planner-entry.dto';

@Controller('api/planner')
@UseGuards(JwtAuthGuard)
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  // ── CRUD ──────────────────────────────────────────

  @Post('entries')
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePlannerEntryDto,
  ) {
    const entry = await this.plannerService.create(user.id, dto);
    return { success: true, data: entry };
  }

  @Get('entries')
  async findAll(
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const entries = await this.plannerService.findAll(
      user.id,
      date,
      startDate,
      endDate,
    );
    return { success: true, data: entries };
  }

  @Get('entries/:id')
  async findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const entry = await this.plannerService.findOne(user.id, id);
    return { success: true, data: entry };
  }

  @Patch('entries/:id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdatePlannerEntryDto,
  ) {
    const entry = await this.plannerService.update(user.id, id, dto);
    return { success: true, data: entry };
  }

  @Delete('entries/:id')
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const result = await this.plannerService.remove(user.id, id);
    return { success: true, data: result };
  }

  // ── AI Generate ────────────────────────────────────

  @Post('generate')
  async generate(
    @CurrentUser() user: { id: string },
    @Body() dto: GeneratePlanDto,
  ) {
    const result = await this.plannerService.generate(
      user.id,
      dto.energyLevel,
      dto.mood,
      dto.date,
      dto.startDate,
      dto.endDate,
    );
    return { success: true, data: result };
  }
}
