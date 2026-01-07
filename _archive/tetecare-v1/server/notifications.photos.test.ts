import { describe, it, expect } from "vitest";
import * as db from "./db";
import * as notificationService from "./notificationService";

describe("Notification Service", () => {
  it("should create a notification", async () => {
    const result = await notificationService.createNotification({
      userId: 1,
      petId: 1,
      type: "check_in",
      title: "Test notification",
      message: "Test message",
    });

    expect(result.success).toBe(true);
  });

  it("should handle check-in notification", async () => {
    // This will create notifications for all tutors of the pet
    await notificationService.notifyCheckIn(1);
    
    // Success if no errors thrown
    expect(true).toBe(true);
  });

  it("should handle check-out notification", async () => {
    await notificationService.notifyCheckOut(1);
    expect(true).toBe(true);
  });

  it("should handle daily report notification", async () => {
    await notificationService.notifyDailyReport(1, "Pet teve um ótimo dia!");
    expect(true).toBe(true);
  });

  it("should handle medication reminder", async () => {
    await notificationService.notifyMedicationReminder(1, "Antipulgas");
    expect(true).toBe(true);
  });

  it("should handle low credits notification", async () => {
    await notificationService.notifyLowCredits(1, 2);
    expect(true).toBe(true);
  });
});

describe("Photo Comments", () => {
  let photoId = 1;
  let commentId: number;

  it("should add a comment to a photo", async () => {
    const comment = await db.addPhotoComment(photoId, 1, "Que foto linda!");
    expect(comment).toBeDefined();
    expect(comment.comment).toBe("Que foto linda!");
    commentId = comment.id;
  });

  it("should get comments for a photo", async () => {
    const comments = await db.getPhotoComments(photoId);
    expect(Array.isArray(comments)).toBe(true);
  });

  it("should delete a comment", async () => {
    await db.deletePhotoComment(commentId);
    // Success if no errors thrown
    expect(true).toBe(true);
  });
});

describe("Photo Reactions", () => {
  let photoId = 1;

  it("should add a reaction to a photo", async () => {
    const reaction = await db.addPhotoReaction(photoId, 1, "like");
    expect(reaction).toBeDefined();
  });

  it("should get reactions for a photo", async () => {
    const reactions = await db.getPhotoReactions(photoId);
    expect(Array.isArray(reactions)).toBe(true);
  });

  it("should get reaction counts for a photo", async () => {
    const counts = await db.getPhotoReactionCounts(photoId);
    expect(counts).toBeDefined();
    expect(typeof counts.total).toBe("number");
    expect(typeof counts.like).toBe("number");
    expect(typeof counts.love).toBe("number");
    expect(typeof counts.laugh).toBe("number");
  });

  it("should update reaction type when user reacts again", async () => {
    const reaction1 = await db.addPhotoReaction(photoId, 1, "like");
    const reaction2 = await db.addPhotoReaction(photoId, 1, "love");
    
    // Should update, not create new
    expect(reaction1.id).toBe(reaction2.id);
  });

  it("should remove a reaction", async () => {
    await db.removePhotoReaction(photoId, 1);
    // Success if no errors thrown
    expect(true).toBe(true);
  });
});
