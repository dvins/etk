declare module 'nyc/index.js' {
  export interface NYCOptions {
    cwd?: string;
    reporter?: string[];
    reportDir?: string;
    tempDirectory?: string;
    silent?: boolean;
    excludeAfterRemap?: boolean;
  }

  export default class NYC {
    constructor(options?: NYCOptions);

    /**
     * Generates a report from collected coverage data.
     */
    report(): Promise<void>;

    /**
     * Loads and merges all `.json` coverage files from a directory.
     * This method is used internally by NYC but not part of its official API.
     * It returns a coverage map object (e.g., from istanbul-lib-coverage).
     *
     * @param dir - Path to a directory containing coverage `.json` files.
     */
    getCoverageMapFromAllCoverageFiles(dir: string): Promise<any>;

    /**
     * Create the temp directory where coverage output is written.
     */
    createTempDirectory(): Promise<void>;
  }
}
