import { z } from 'zod';

const originsSchema = z
  .string()
  .transform((value) => value.split(',').map((origin) => origin.trim()))
  .pipe(
    z
      .array(
        z.string().refine((origin) => {
          try {
            const url = new URL(origin);
            return (
              ['http:', 'https:'].includes(url.protocol) &&
              url.origin === origin
            );
          } catch {
            return false;
          }
        }),
      )
      .min(1),
  );

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    CORS_ORIGINS: originsSchema.prefault(
      'http://localhost:3000,http://127.0.0.1:3000',
    ),
    DATABASE_URL: z.url().refine((value) => {
      try {
        const url = new URL(value);
        return (
          ['postgres:', 'postgresql:'].includes(url.protocol) &&
          url.hostname.length > 0 &&
          url.pathname.length > 1 &&
          // TLS is configured by DATABASE_SSL, not competing URL parameters.
          ![...url.searchParams.keys()].some((key) => key.startsWith('ssl'))
        );
      } catch {
        return false;
      }
    }),
    DATABASE_SSL: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.DATABASE_SSL, {
    path: ['DATABASE_SSL'],
  })
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' ||
      env.CORS_ORIGINS.every((origin) => origin.startsWith('https://')),
    {
      path: ['CORS_ORIGINS'],
    },
  );

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }
  return result.data;
}
