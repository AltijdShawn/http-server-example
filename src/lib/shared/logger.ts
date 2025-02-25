const colorHandler_ = {
  blue: (inp) => `${Logger.ANSI_ESCAPE}[1;94m${inp}${Logger.ANSI_ESCAPE}[0m`,
  yellow: (inp) => `${Logger.ANSI_ESCAPE}[1;33m${inp}${Logger.ANSI_ESCAPE}[0m`,
  red: (inp) => `${Logger.ANSI_ESCAPE}[1;31m${inp}${Logger.ANSI_ESCAPE}[0m`,
  green: (inp) => `${Logger.ANSI_ESCAPE}[1;32m${inp}${Logger.ANSI_ESCAPE}[0m`,
  magenta: (inp) => `${Logger.ANSI_ESCAPE}[1;95m${inp}${Logger.ANSI_ESCAPE}[0m`,
};

export enum ELoggerLevels {
  Info,
  Warn,
  Error,
  Debug,
  Http,
}

export const levels = ELoggerLevels;

export class Logger {
  static ANSI_ESCAPE = "\x1b";
  private output = console;
  public log_(...args: any[]) {
    this.output.log(...args);
  }
  static timestamp() {
    const d = new Date();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    const ms = d.getMilliseconds()

    return {
      hours,
      minutes,
      seconds,
      combined: `${hours}:${minutes}:${seconds}:${ms}`,
    };
  }

  public prefix = "";

  constructor(
    prefix = "",
    output = console,
    private colorHandler = colorHandler_
  ) {
    this.prefix = prefix;
    this.output = output;
  }

  public log(level: string | number | ELoggerLevels, ...args: any[]) {
    this.log_(
      `[${Logger.timestamp().combined}]:`,
      this.prefix !== "" ? `[${this.prefix}]` : "",
      `${this.levelColor(this.parseLevel(level))}`,
      ...args
    );
  }

  public info(...args: any[]) {
    this.log("info", ...args);
  }
  public warn(...args: any[]) {
    this.log("warn", ...args);
  }
  public error(...args: any[]) {
    this.log("error", ...args);
  }
  public debug(...args: any[]) {
    if (
      String(process.env.LOG_LEVEL).toLowerCase() === "verbose"
    ) this.log("debug", ...args);
    else void(args)
  }
  public http(...args: any[]) {
    this.log("http", ...args);
  }

  public levelColor(level: ELoggerLevels) {
    if (level === 0) {
      // Info
      return this.colorHandler.blue(`INFO:`);
    }
    if (level === 1) {
      // Warn
      return this.colorHandler.yellow(`WARN:`);
    }
    if (level === 2) {
      // Error
      return this.colorHandler.red(`ERROR:`);
    }
    if (level === 3) {
      // Debug
      return this.colorHandler.green(`DEBUG:`);
    }
    if (level === 4) {
      // Http
      return this.colorHandler.magenta(`HTTP:`);
    }
  }

  public parseLevel(
    level: string | number | ELoggerLevels
  ): ELoggerLevels | number {
    let Converted: ELoggerLevels | number;
    if (typeof level === "string") {
      if (level.toLowerCase() == "info" || level.toLowerCase() == "log")
        Converted = ELoggerLevels.Info;
      if (level.toLowerCase() == "warn" || level.toLowerCase() == "warning")
        Converted = ELoggerLevels.Warn;
      if (level.toLowerCase() == "err" || level.toLowerCase() == "error")
        Converted = ELoggerLevels.Error;
      if (level.toLowerCase() == "debug") Converted = ELoggerLevels.Debug;
      if (level.toLowerCase() == "http") Converted = ELoggerLevels.Http;
    } else Converted = level;
    return Converted;
  }
}
