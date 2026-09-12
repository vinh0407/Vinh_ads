import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { SchedulesService } from "./schedules.service";
import { JobStatus, PostStatus } from "@prisma/client";

describe("SchedulesService (Scheduler Business Logic)", () => {
  let service: SchedulesService;
  let prisma: any;
  let queue: any;

  beforeEach(() => {
    prisma = {
      post: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      schedule: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    queue = {
      addScheduleJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
      removeScheduleJob: jest.fn().mockResolvedValue(true),
    };
    service = new SchedulesService(prisma, queue);
  });

  describe("create schedule", () => {
    it("rejects scheduling when post does not belong to user", async () => {
      // ARRANGE
      prisma.post.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.create("user-1", {
          postId: "other-post",
          scheduledAt: "2026-09-10T12:00:00Z",
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.schedule.create).not.toHaveBeenCalled();
    });

    it("rejects scheduling when post is already published", async () => {
      // ARRANGE
      prisma.post.findFirst.mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        status: PostStatus.PUBLISHED,
        schedule: null,
      });

      // ACT & ASSERT
      await expect(
        service.create("user-1", {
          postId: "post-1",
          scheduledAt: "2026-09-10T12:00:00Z",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("rejects scheduling when post is cancelled", async () => {
      // ARRANGE
      prisma.post.findFirst.mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        status: PostStatus.CANCELLED,
        schedule: null,
      });

      // ACT & ASSERT
      await expect(
        service.create("user-1", {
          postId: "post-1",
          scheduledAt: "2026-09-10T12:00:00Z",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("rejects scheduling when post already has an active schedule", async () => {
      // ARRANGE
      prisma.post.findFirst.mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        status: PostStatus.DRAFT,
        schedule: { id: "existing-schedule" },
      });

      // ACT & ASSERT
      await expect(
        service.create("user-1", {
          postId: "post-1",
          scheduledAt: "2026-09-10T12:00:00Z",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("creates schedule, marks post as SCHEDULED, and enqueues job", async () => {
      // ARRANGE
      const scheduledAtStr = "2026-09-10T12:00:00Z";
      const scheduledAtDate = new Date(scheduledAtStr);
      prisma.post.findFirst.mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        status: PostStatus.DRAFT,
        schedule: null,
      });
      prisma.schedule.create.mockResolvedValue({
        id: "schedule-1",
        postId: "post-1",
        scheduledAt: scheduledAtDate,
        status: JobStatus.PENDING,
      });

      // ACT
      const result = await service.create("user-1", {
        postId: "post-1",
        scheduledAt: scheduledAtStr,
      });

      // ASSERT
      expect(result.id).toBe("schedule-1");
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: "post-1" },
        data: { status: PostStatus.SCHEDULED },
      });
      expect(queue.addScheduleJob).toHaveBeenCalledWith(
        { scheduleId: "schedule-1" },
        scheduledAtDate,
      );
    });
  });

  describe("update & delete schedule ownership", () => {
    it("does not reveal another user's schedule during update", async () => {
      // ARRANGE
      prisma.schedule.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.update(
          "user-1",
          "other-schedule",
          "2026-09-10T12:00:00Z",
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.schedule.update).not.toHaveBeenCalled();
      expect(queue.removeScheduleJob).not.toHaveBeenCalled();
    });

    it("updates schedule date, status, and replaces queue job", async () => {
      // ARRANGE
      const updatedDateStr = "2026-09-15T10:00:00Z";
      const updatedDate = new Date(updatedDateStr);
      prisma.schedule.findFirst.mockResolvedValue({
        id: "schedule-1",
        post: { userId: "user-1" },
      });
      prisma.schedule.update.mockResolvedValue({
        id: "schedule-1",
        scheduledAt: updatedDate,
        status: JobStatus.PENDING,
      });

      // ACT
      const result = await service.update("user-1", "schedule-1", updatedDateStr);

      // ASSERT
      expect(result.id).toBe("schedule-1");
      expect(queue.removeScheduleJob).toHaveBeenCalledWith("schedule-1");
      expect(queue.addScheduleJob).toHaveBeenCalledWith(
        { scheduleId: "schedule-1" },
        updatedDate,
      );
    });

    it("rejects update when scheduledAt is an invalid date string", async () => {
      // ARRANGE
      prisma.schedule.findFirst.mockResolvedValue({
        id: "schedule-1",
        post: { userId: "user-1" },
      });

      // ACT & ASSERT
      await expect(
        service.update("user-1", "schedule-1", "not-a-valid-date"),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.schedule.update).not.toHaveBeenCalled();
      expect(queue.removeScheduleJob).not.toHaveBeenCalled();
    });

    it("deletes schedule and removes queue job", async () => {
      // ARRANGE
      prisma.schedule.findFirst.mockResolvedValue({
        id: "schedule-1",
        post: { userId: "user-1" },
      });
      prisma.schedule.delete.mockResolvedValue({ id: "schedule-1" });

      // ACT
      await service.delete("user-1", "schedule-1");

      // ASSERT
      expect(queue.removeScheduleJob).toHaveBeenCalledWith("schedule-1");
      expect(prisma.schedule.delete).toHaveBeenCalledWith({
        where: { id: "schedule-1" },
      });
    });
  });
});
