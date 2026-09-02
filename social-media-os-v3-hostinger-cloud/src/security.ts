import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import crypto from "node:crypto";

function safeEqual(a:string,b:string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa,bb);
}

export function cronGuard(req: Request, res: Response, next: NextFunction) {
  const supplied = String(req.header("x-cron-secret") || "");
  if (!safeEqual(supplied, config.CRON_SECRET)) return res.status(401).json({error:"unauthorized"});
  next();
}

export function basicGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  if (!header.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Social Media OS"');
    return res.status(401).end();
  }
  const [user,pass] = Buffer.from(header.slice(6),"base64").toString("utf8").split(":");
  if (!safeEqual(user || "", config.DASHBOARD_USER) || !safeEqual(pass || "", config.DASHBOARD_PASSWORD)) {
    return res.status(401).end();
  }
  next();
}
