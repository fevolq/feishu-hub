import { CronExpressionParser } from "cron-parser";
import { appConfig } from "../config";

export const normalizeCrontabExpression = (expression: string) => expression.trim().replace(/\s+/g, " ");

export const validateCrontabExpression = (expression: string, timeZone = appConfig.timezone) => {
  const normalized = normalizeCrontabExpression(expression);
  const parts = normalized.split(" ");

  if (parts.length !== 5 || parts.some((part) => part.length === 0)) {
    throw new Error("Invalid crontab expression: expected 5 fields");
  }

  try {
    CronExpressionParser.parse(normalized, {
      currentDate: new Date(),
      hashSeed: normalized,
      tz: timeZone
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid crontab expression: ${message}`);
  }

  return normalized;
};

export const getNextCronRunAt = (
  expression: string,
  from: string | Date = new Date(),
  timeZone = appConfig.timezone
) => {
  const normalized = validateCrontabExpression(expression, timeZone);
  const interval = CronExpressionParser.parse(normalized, {
    currentDate: from,
    hashSeed: normalized,
    tz: timeZone
  });
  const nextRunAt = interval.next().toISOString();

  if (!nextRunAt) {
    throw new Error("Invalid crontab expression: unable to calculate next run");
  }

  return nextRunAt;
};
