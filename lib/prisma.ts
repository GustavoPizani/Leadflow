/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import { createPrismaMock } from './prisma-mock';

function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  if (url.includes('<') || url.includes('>') || url.includes('pooler-host')) return false;
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaInstance() {
  if (!isDatabaseConfigured()) {
    console.warn('[AI Studio] PostgreSQL database not configured — using interactive mock store');
    return createPrismaMock();
  }

  try {
    const realClient = new PrismaClient();
    const mock = createPrismaMock();
    return new Proxy(realClient, {
      get(target: any, prop: string) {
        const orig = target[prop];
        if (typeof orig === 'function') {
          return async (...args: any[]) => {
            try {
              return await orig.apply(target, args);
            } catch (err: any) {
              console.warn(`[AI Studio] Real Prisma ${prop} failed, falling back to mock:`, err?.message);
              return typeof mock[prop] === 'function' ? mock[prop](...args) : mock[prop];
            }
          };
        }
        if (orig && typeof orig === 'object') {
          return new Proxy(orig, {
            get(subTarget: any, subProp: string) {
              const subOrig = subTarget[subProp];
              if (typeof subOrig === 'function') {
                return async (...args: any[]) => {
                  try {
                    return await subOrig.apply(subTarget, args);
                  } catch (err: any) {
                    console.warn(`[AI Studio] Real Prisma ${prop}.${subProp} failed, falling back to mock:`, err?.message);
                    return mock[prop]?.[subProp]?.(...args);
                  }
                };
              }
              return subOrig;
            },
          });
        }
        return orig;
      },
    });
  } catch {
    console.warn('[AI Studio] Failed to initialize PrismaClient — using mock');
    return createPrismaMock();
  }
}

export const prisma: PrismaClient = (globalForPrisma.prisma ?? getPrismaInstance()) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
