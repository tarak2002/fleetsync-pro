import dotenv from 'dotenv';
dotenv.config();

export const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('FATAL: JWT_SECRET is not defined in environment variables.');
        process.exit(1);
    }
    return secret;
};
