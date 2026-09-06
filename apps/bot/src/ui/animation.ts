import type { ChatInputCommandInteraction } from "discord.js";
import { NF } from "./icons.js";

/**
 * Executes an async task while progressively rendering smooth animated status messages.
 * Uses Discord rate-limit safe timing (200ms intervals, max 2 frames).
 */
export async function withProgressAnimation<T>(
  interaction: ChatInputCommandInteraction,
  frames: string[],
  task: () => Promise<T>,
): Promise<T> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }

  if (frames.length > 0) {
    await interaction
      .editReply({ content: `${NF.spinner} [ GITBOT ] ${frames[0]}` })
      .catch(() => {});
  }

  let currentFrame = 1;
  const interval = setInterval(async () => {
    if (currentFrame < frames.length) {
      const frameText = frames[currentFrame];
      currentFrame++;
      await interaction
        .editReply({ content: `${NF.spinner} [ GITBOT ] ${frameText}` })
        .catch(() => {});
    }
  }, 220);

  try {
    const result = await task();
    clearInterval(interval);
    return result;
  } catch (err) {
    clearInterval(interval);
    throw err;
  }
}
