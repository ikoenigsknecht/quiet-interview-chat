import dotenv from 'dotenv'; 
import { EnvVars } from './env_vars';
dotenv.config();  // Load environment variables from .env file

export class EnvVarHandler {
    private static instance: EnvVarHandler;

    private constructor() {}

    public static getInstance(): EnvVarHandler {
        if (!EnvVarHandler.instance) {
            EnvVarHandler.instance = new EnvVarHandler();
        }

        return EnvVarHandler.instance;
    }

    public getString(key: string | EnvVars, defaultValue?: string): string | undefined {
        const rawValue = process.env[key];
        if (!rawValue) {
            return defaultValue || undefined;
        }
        return rawValue;
    }

    public getInt(key: string | EnvVars, defaultValue?: number): number | undefined {
        const stringValue = this.getString(key);
        if (!stringValue) {
            return defaultValue || undefined;
        }

        return parseInt(stringValue);
    }

    public getBool(key: string | EnvVars, defaultValue?: boolean): boolean | undefined {
        const stringValue = this.getString(key);
        if (!stringValue) {
            return defaultValue || undefined;
        }

        return stringValue === "true" ? true : false;
    }
}