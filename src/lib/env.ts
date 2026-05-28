// src/lib/env.ts
export const getEnvVar = (name: string, defaultValue?: string): string => {
  return process.env[name] || defaultValue || '';
};

export const requireEnvVar = (name: string, description: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${description} is required but not set (env var: ${name})`);
  }
  return value;
};