import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { CreateMissionDto, ApprovalActionDto } from './dto/create-mission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('missions')
@Controller('missions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Khởi tạo và điều phối nhiệm vụ đa tác tử mới (Mission Mode)' })
  @ApiResponse({ status: 201, description: 'Nhiệm vụ được tạo và bắt đầu phân rã kế hoạch' })
  async createMission(@Body() dto: CreateMissionDto) {
    const mission = await this.missionsService.createAndExecuteMission(dto.goal);
    return {
      success: true,
      data: mission,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách toàn bộ nhiệm vụ và tiến độ' })
  async getAllMissions() {
    const missions = this.missionsService.getAllMissions();
    return {
      success: true,
      data: missions,
    };
  }

  @Get('kill-switch/status')
  @ApiOperation({ summary: 'Kiểm tra trạng thái Nút Dừng Khẩn Cấp (Emergency Kill-Switch)' })
  getKillSwitchStatus() {
    return {
      success: true,
      isHalted: this.missionsService.isHalted(),
    };
  }

  @Post('kill-switch/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '🛑 DỪNG KHẨN CẤP TOÀN BỘ AGENT VÀ TRÌNH DUYỆT (STOP ALL AGENTS)' })
  stopAllAgents() {
    const result = this.missionsService.stopAllAgents();
    return {
      success: true,
      data: result,
    };
  }

  @Post('kill-switch/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mở khóa hệ thống sau khi dừng khẩn cấp' })
  resumeAllAgents() {
    const result = this.missionsService.resumeAllAgents();
    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết tiến độ một nhiệm vụ cụ thể' })
  getMissionById(@Param('id') id: string) {
    const mission = this.missionsService.getMissionById(id);
    return {
      success: true,
      data: mission,
    };
  }

  @Post(':id/approval')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Phê duyệt hoặc Từ chối hành động nhạy cảm trong Hàng đợi (Approval Queue)' })
  async handleApproval(@Param('id') id: string, @Body() dto: ApprovalActionDto) {
    const result = await this.missionsService.handleApprovalDecision(
      id,
      dto.decision,
      dto.editedPayload,
      dto.platforms,
    );
    return {
      success: true,
      data: result,
    };
  }
}
