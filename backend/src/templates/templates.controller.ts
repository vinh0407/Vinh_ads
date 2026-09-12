import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("templates")
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Post("captions")
  async createCaption(
    @CurrentUser("id") userId: string,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    return this.templatesService.createCaption(userId, createTemplateDto);
  }

  @Post("comments")
  async createComment(
    @CurrentUser("id") userId: string,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    return this.templatesService.createComment(userId, createTemplateDto);
  }

  @Get("captions")
  async findAllCaptions(@CurrentUser("id") userId: string) {
    return this.templatesService.findAllCaptions(userId);
  }

  @Get("comments")
  async findAllComments(@CurrentUser("id") userId: string) {
    return this.templatesService.findAllComments(userId);
  }

  @Get("captions/:id")
  async findOneCaption(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    return this.templatesService.findOneCaption(userId, id);
  }

  @Get("comments/:id")
  async findOneComment(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    return this.templatesService.findOneComment(userId, id);
  }

  @Patch("captions/:id")
  async updateCaption(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.updateCaption(userId, id, updateTemplateDto);
  }

  @Patch("comments/:id")
  async updateComment(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.updateComment(userId, id, updateTemplateDto);
  }

  @Delete("captions/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCaption(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    await this.templatesService.deleteCaption(userId, id);
  }

  @Delete("comments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    await this.templatesService.deleteComment(userId, id);
  }

  @Post("captions/:id/render")
  async renderCaption(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() body: { variables: Record<string, string> },
  ) {
    return this.templatesService.renderCaption(userId, id, body.variables);
  }

  @Post("comments/:id/render")
  async renderComment(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() body: { variables: Record<string, string> },
  ) {
    return this.templatesService.renderComment(userId, id, body.variables);
  }
}
