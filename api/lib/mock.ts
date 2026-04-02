// Recursive Mock Prisma Client and Utilities for Stateless Prototype
// This prevents circular dependencies between index.ts and routes.

export const createMockProxy = (name: string = 'prisma'): any => {
    const fn = (...args: any[]) => {
        console.warn(`Prisma method "${name}" called in prototype mode.`);
        return Promise.resolve(null);
    };
    return new Proxy(fn, {
        get: (target, prop) => {
            if (typeof prop === 'string') {
                return createMockProxy(`${name}.${prop}`);
            }
            return (target as any)[prop];
        }
    });
};

export const prisma = createMockProxy();

export const getJwtSecret = (): string => {
    return process.env.JWT_SECRET || 'fleetsync-demo-secret-key-2026';
};
