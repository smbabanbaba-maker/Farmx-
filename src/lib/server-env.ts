/**
 * Read a server-only environment variable using the Goall26 name first.
 * The legacy FarmX name is retained only as a compatibility fallback so a
 * deployed environment is not disconnected during the infrastructure rename.
 */
export function getServerEnv(primary: string, legacy?: string): string | undefined {
  return process.env[primary] ?? (legacy ? process.env[legacy] : undefined);
}
