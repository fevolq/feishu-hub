type LogMeta = unknown;

const formatMessage = (level: "info" | "error", message: string) =>
  `[${new Date().toISOString()}] [${level}] ${message}`;

const writeLog = (
  writer: (message?: unknown, ...optionalParams: unknown[]) => void,
  level: "info" | "error",
  message: string,
  meta?: LogMeta
) => {
  const formattedMessage = formatMessage(level, message);
  if (meta === undefined) {
    writer(formattedMessage);
    return;
  }

  writer(formattedMessage, meta);
};

export const serverLogger = {
  info(message: string, meta?: LogMeta) {
    writeLog(console.log, "info", message, meta);
  },
  error(message: string, meta?: LogMeta) {
    writeLog(console.error, "error", message, meta);
  }
};
