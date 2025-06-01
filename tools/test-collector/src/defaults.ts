export const cliDefaults = {
  gather: {
    destinationPath: 'coverage/raw',
    fileType: '*coverage-final.json',
    folderPatterns:  ['**/coverage/unit', '**/coverage/integration'],
    sourcePath: process.cwd(),
  }
}
