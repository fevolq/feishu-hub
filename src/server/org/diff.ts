import type { User } from "@/server/org/types";

export type UserDiffType = "created" | "updated" | "resigned" | "restored";

export type UserDiff = {
  type: UserDiffType;
  changedFields: string[];
  before: User | null;
  after: User | null;
};

const comparableFields: Array<keyof User> = [
  "unionId",
  "name",
  "email",
  "jobTitle",
  "leaderOpenId",
  "primaryDepartmentId",
  "departmentIds",
  "avatarUrl",
  "mobile",
  "status"
];

const normalizeForCompare = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeForCompare).sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeForCompare(item)])
    );
  }

  return value ?? null;
};

const stableStringify = (value: unknown) => JSON.stringify(normalizeForCompare(value));

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

export const diffExtraFields = (
  previous: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined,
  prefix = "extra"
): string[] => {
  if (stableStringify(previous) === stableStringify(next)) {
    return [];
  }

  if (!isPlainObject(previous) && !isPlainObject(next)) {
    return [prefix];
  }

  const previousObject = isPlainObject(previous) ? previous : {};
  const nextObject = isPlainObject(next) ? next : {};

  const changedFields = [...new Set([...Object.keys(previousObject), ...Object.keys(nextObject)])]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((key) => {
      const previousValue = previousObject[key];
      const nextValue = nextObject[key];
      const path = `${prefix}.${key}`;

      if (
        (previousValue === undefined || isPlainObject(previousValue)) &&
        (nextValue === undefined || isPlainObject(nextValue))
      ) {
        return diffExtraFields(
          previousValue as Record<string, unknown> | undefined,
          nextValue as Record<string, unknown> | undefined,
          path
        );
      }

      return stableStringify(previousValue) === stableStringify(nextValue) ? [] : [path];
    });

  return changedFields.length ? changedFields : [prefix];
};

export const diffUserSnapshots = (previous: User | null, next: User | null): UserDiff | null => {
  if (!previous && !next) {
    return null;
  }

  if (!previous && next) {
    return {
      type: "created",
      changedFields: ["openId"],
      before: null,
      after: next
    };
  }

  if (previous && !next) {
    return {
      type: "resigned",
      changedFields: ["status"],
      before: previous,
      after: { ...previous, status: "resigned" }
    };
  }

  if (!previous || !next) {
    return null;
  }

  const changedFields = comparableFields.filter(
    (field) => stableStringify(previous[field]) !== stableStringify(next[field])
  ) as string[];
  changedFields.push(...diffExtraFields(previous.extra, next.extra));

  if (!changedFields.length) {
    return null;
  }

  return {
    type: previous.status === "resigned" && next.status === "active" ? "restored" : "updated",
    changedFields,
    before: previous,
    after: next
  };
};
