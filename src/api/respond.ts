import { Response } from "express";

// Thin wrappers around the `{ success, ... }` envelope every route in this
// API responds with, so handlers don't each hand-write res.json({ success, ... }).

export function sendOk(res: Response, data: unknown, extraFields: Record<string, unknown> = {}): void {
  res.json({ success: true, data, ...extraFields });
}

export function sendMessage(res: Response, message: string): void {
  res.json({ success: true, message });
}

export function sendError(res: Response, status: number, error: string): void {
  res.status(status).json({ success: false, error });
}
