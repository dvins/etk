import { default as color } from "colors-cli/safe";
import stableStringify from "safe-stable-stringify";
import glob from "glob";

type LogLevel = "debug" | "error" | "info" | "warn";

export const log = (level: LogLevel, message: string): string | void => {
  if (!logLevels.includes(level)) {
    throw new Error(`Invalid log level: ${level}`);
  }

  // check if the log level is enabled
  if (logLevels.indexOf(level) < logLevels.indexOf(logLevel)) {
    return;
  }

  const lineProg = `[${color.blue_bt("domain")}]`;

  var lineLevel = ``;
  var lineMessage = message;

  switch (level) {
    case "debug":
      lineLevel = color.green.faint("DEBUG:");
      lineMessage = color.faint(message);
      break;
    case "error":
      lineLevel = color.red_b.bold("ERROR") + ":";
      lineMessage = color.red(message);
      break;
    case "info":
      lineLevel = color.green("INFO: ");
      break;
    case "warn":
      lineLevel = color.yellow_b.bold("WARN") + ": ";
      lineMessage = color.yellow(message);
      break;
    default:
      lineLevel = color.white("INFO: ");
  }

  const logLine = `  ${lineLevel} ${lineProg}  ${lineMessage}`;

  // We always use INFO because Bazel prioritizes output for
  // the WARN and ERROR levels  such that the linear history and
  // context are lost. The main program is wrapped with an
  // exception capture mechanism to throw a program level error
  // message.
  console.info(logLine);
};

// Log levels
const logLevels = ["debug", "error", "info", "warn"];
const logLevel = process.env.LOG_LEVEL || "info";

export const logger = {
  debug: (message: string) => log("debug", message),
  error: (message: string) => log("error", message),
  info: (message: string) => log("info", message),
  warn: (message: string) => log("warn", message),
};

export const withFileLink = (outputFile: string) => {
  const fileLink = outputFile.replace("bazel-out/", "dist/out/");
  return color.green.underline(fileLink);
};

export const listAllFiles = (folder: string) => {
  glob(folder + "/**/*", (error, result) =>
    logger.debug(stableStringify(result, null, 2))
  );
};

export const onError = (reason: any) => {
  // As our logger technically only logs info lines, the second explicit
  // console log statement will raise the error for Bazel
  logger.error(reason);
  console.error(color.red(reason));

  throw reason;
};
