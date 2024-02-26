import { randomUUID } from "crypto";

export function generateUuidWithNoDashes(): string {
    return randomUUID().replace(/\-/gi, "");
}