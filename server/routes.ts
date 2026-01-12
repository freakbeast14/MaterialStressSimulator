import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { cancelSimulation, enqueueSimulation } from "./fea/queue";
import {
  ensureLocalStorageRoot,
  readStoragePath,
  saveGeometryFile,
} from "./storage-backend";
import fs from "fs";
import path from "path";
import session from "express-session";
import memorystore from "memorystore";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const assistantRequestSchema = z.object({
  question: z.string().min(1).max(1000),
  page: z.string().optional(),
  context: z.record(z.unknown()).nullable().optional(),
});

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
      "Password must include at least a number and a special character.",
    ),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.name || data.email, {
    message: "Provide a name or email to update.",
  });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
      "Password must include at least a number and a special character.",
    ),
});


const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/,
      "Password must include at least a number and a special character.",
    ),
});

const ASSISTANT_SYSTEM_PROMPT =
  "You are the MatSim assistant. You may answer questions about MatSim features, pages, UI controls, workflows, and MatSim-specific simulation concepts (stress, strain, stress-strain curves, safety factor, boundary conditions, mesh outputs, 3D results viewer concepts such as iso-surface, slice, volume, playback controls, and chart interpretation). Use the provided page context and the App Guide to summarize or analyze results. If the question is about MatSim features or concepts, answer even if no context data is provided. Treat questions that mention MatSim UI sections or terms (e.g., mesh outputs, stress, strain, iso-surface, playback, heatmap, metrics space, results comparison) as in-scope and answer them. If a question is unrelated to MatSim or requires specific data not present, refuse with: \"I can only answer questions related to **MatSim**.\" Do not guess missing values or invent results. Keep responses concise and helpful.\n\nAccepted examples: \"What is stress?\", \"What does the stress-strain chart show?\", \"How do I use the 3D Results Viewer playback?\", \"Explain the results comparison weights.\", \"What are mesh outputs?\" Refuse examples: general trivia, coding help, or anything not about MatSim.";
const ASSISTANT_APP_GUIDE_INDEX =
  "Use the MatSim knowledge base to answer feature and how-to questions. The guide covers pages, tabs, charts, 3D viewer modes, data model, and API routes.";
const ASSISTANT_GUIDE_PATH = path.join(process.cwd(), "docs", "assistant_guide.md");
let assistantGuideCache: string | null = null;

const loadAssistantGuide = () => {
  if (assistantGuideCache !== null) return assistantGuideCache;
  try {
    assistantGuideCache = fs.readFileSync(ASSISTANT_GUIDE_PATH, "utf8");
  } catch {
    assistantGuideCache = "";
  }
  return assistantGuideCache;
};

const selectGuideSnippets = (guide: string, page: string, question: string) => {
  if (!guide) return "";
  const sections = guide.split(/\n(?=##\s)/g);
  const tokens = `${page} ${question}`
    .toLowerCase()
    .match(/[a-z0-9]+/g);
  if (!tokens || tokens.length === 0) {
    return sections.slice(0, 2).join("\n");
  }
  const scored = sections
    .map((section) => {
      const lower = section.toLowerCase();
      const score = tokens.reduce((sum, token) => {
        if (token.length < 3) return sum;
        return sum + (lower.includes(token) ? 1 : 0);
      }, 0);
      return { section, score };
    })
    .sort((a, b) => b.score - a.score);
  const top = scored.filter((item) => item.score > 0).slice(0, 3);
  if (top.length) return top.map((item) => item.section).join("\n");
  return sections.slice(0, 2).join("\n");
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getAppBaseUrl = () => process.env.APP_BASE_URL || "http://localhost:5000";


const sendPasswordResetEmail = async (email: string, token: string, name?: string) => {
  const baseUrl = getAppBaseUrl();
  const normalizedBaseUrl = /^https?:\/\//i.test(baseUrl)
    ? baseUrl
    : `https://${baseUrl}`;
  const resetUrl = new URL("/reset-password", normalizedBaseUrl);
  resetUrl.searchParams.set("token", token);
  const gmailUser = process.env.GMAIL_SMTP_USER;
  const gmailPass = process.env.GMAIL_SMTP_PASS;
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
      const safeName = name?.trim() ? name.trim() : "there";
      const logoUrl =
        process.env.EMAIL_LOGO_URL ||
        `${normalizedBaseUrl.replace(/\/$/, "")}/logo.png`;
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Reset your MatSim password</title>
  </head>
  <body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:24px 28px;background:#eef4ff;">
                <div style="display:flex;align-items:center;">
                  <div>
                    <img src="${logoUrl}" width="24" height="24" alt="MatSim" style="display:block;width:24px;height:24px;" />
                  </div>
                  <div style="font-size:18px;font-weight:700;padding-left:12px;">MatSim</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 8px;font-size:22px;">Reset your password</h1>
                <p style="margin:0 0 18px;font-size:14px;color:#475569;">Hi ${safeName},</p>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155;">
                  We received a request to reset your MatSim password. Use the button below to
                  choose a new password.
                </p>
                <div style="margin:20px 0;">
                  <a href="${resetUrl.toString()}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
                    Reset Password
                  </a>
                </div>
                <p style="margin:0 0 12px;font-size:12px;color:#64748b;">
                  This link expires in 1 hour. If you did not request a reset, you can ignore this email.
                </p>
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  Or copy and paste this link into your browser:<br />
                  <span style="word-break:break-all;color:#2563eb;">${resetUrl.toString()}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                Copyright ${new Date().getFullYear()} MatSim - Simulation workspace for materials and geometry
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
      await transporter.sendMail({
        from: `MatSim <${gmailUser}>`,
        to: email,
        subject: "Reset your MatSim password",
        html,
        text: `Hi ${safeName},

Reset your MatSim password: ${resetUrl.toString()}

This link expires in 1 hour. If you did not request a reset, you can ignore this email.

- MatSim`,
      });
      console.log(`[auth] Gmail reset email sent to ${email}`);
      return;
    } catch (err) {
      console.error("[auth] Gmail SMTP send failed:", err);
      console.log(`[auth] Password reset link for ${email}: ${resetUrl.toString()}`);
      return;
    }
  }
  console.log(`[auth] Password reset link for ${email}: ${resetUrl.toString()}`);
};

const sendVerificationEmail = async (email: string, token: string, name?: string) => {
  const baseUrl = getAppBaseUrl();
  const normalizedBaseUrl = /^https?:\/\//i.test(baseUrl)
    ? baseUrl
    : `https://${baseUrl}`;
  const verifyUrl = new URL("/verify", normalizedBaseUrl);
  verifyUrl.searchParams.set("token", token);
  const gmailUser = process.env.GMAIL_SMTP_USER;
  const gmailPass = process.env.GMAIL_SMTP_PASS;
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });
      const safeName = name?.trim() ? name.trim() : "there";
      const logoUrl =
        process.env.EMAIL_LOGO_URL ||
        `${normalizedBaseUrl.replace(/\/$/, "")}/logo.png`;
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Verify your MatSim email</title>
  </head>
  <body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:24px 28px;background:#eef4ff;">
                <div style="display:flex;align-items:center;">
                  <div>
                    <img src="${logoUrl}" width="24" height="24" alt="MatSim" style="display:block;width:24px;height:24px;" />
                  </div>
                  <div style="font-size:18px;font-weight:700;padding-left:12px;">MatSim</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 8px;font-size:22px;">Verify your email</h1>
                <p style="margin:0 0 18px;font-size:14px;color:#475569;">Hi ${safeName},</p>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155;">
                  Welcome to MatSim! Please confirm your email address to activate your account and
                  start running simulations.
                </p>
                <div style="margin:20px 0;">
                  <a href="${verifyUrl.toString()}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
                    Verify Email
                  </a>
                </div>
                <p style="margin:0 0 12px;font-size:12px;color:#64748b;">
                  This link expires in 24 hours. If you didn’t create a MatSim account, you can ignore this email.
                </p>
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  Or copy and paste this link into your browser:<br />
                  <span style="word-break:break-all;color:#2563eb;">${verifyUrl.toString()}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} MatSim • Simulation workspace for materials & geometry
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
      await transporter.sendMail({
        from: `MatSim <${gmailUser}>`,
        to: email,
        subject: "Verify your MatSim email",
        html,
        text: `Hi ${safeName},\n\nWelcome to MatSim! Please confirm your email address to activate your account.\n\nVerify email: ${verifyUrl.toString()}\n\nThis link expires in 24 hours. If you didn’t create a MatSim account, you can ignore this email.\n\n— MatSim`,
      });
      console.log(`[auth] Gmail verification email sent to ${email}`);
      return;
    } catch (err) {
      console.error("[auth] Gmail SMTP send failed:", err);
      console.log(`[auth] Verification link for ${email}: ${verifyUrl.toString()}`);
      return;
    }
  }
  console.log(`[auth] Verification link for ${email}: ${verifyUrl.toString()}`);
};

const seedGeometries = [
  {
    name: "Unit Cube",
    originalName: "unit-cube.stl",
    format: "stl",
    content: `solid unit_cube
  facet normal 0 0 1
    outer loop
      vertex 0 0 1
      vertex 1 0 1
      vertex 1 1 1
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 1
      vertex 1 1 1
      vertex 0 1 1
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 1 1 0
      vertex 1 0 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 1 0
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 1 0
      vertex 1 1 1
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 1 0
      vertex 0 1 1
      vertex 1 1 1
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 1 0 1
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 1 0 1
      vertex 0 0 1
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 1 0 0
      vertex 1 1 0
      vertex 1 1 1
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 1 0 0
      vertex 1 1 1
      vertex 1 0 1
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 1 1
      vertex 0 1 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0 1
      vertex 0 1 1
    endloop
  endfacet
endsolid unit_cube
`,
  },
  {
    name: "Square Pyramid",
    originalName: "square-pyramid.stl",
    format: "stl",
    content: `solid square_pyramid
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 1 1 0
      vertex 0 1 0
    endloop
  endfacet
  facet normal 0 1 1
    outer loop
      vertex 0 1 0
      vertex 1 1 0
      vertex 0.5 0.5 1
    endloop
  endfacet
  facet normal 1 0 1
    outer loop
      vertex 1 0 0
      vertex 1 1 0
      vertex 0.5 0.5 1
    endloop
  endfacet
  facet normal 0 -1 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0.5 0.5 1
    endloop
  endfacet
  facet normal -1 0 1
    outer loop
      vertex 0 0 0
      vertex 0.5 0.5 1
      vertex 0 1 0
    endloop
  endfacet
endsolid square_pyramid
`,
  },
  {
    name: "Rectangular Plate",
    originalName: "rectangular-plate.stl",
    format: "stl",
    content: `solid rectangular_plate
  facet normal 0 0 1
    outer loop
      vertex 0 0 0.2
      vertex 2 0 0.2
      vertex 2 2 0.2
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 0.2
      vertex 2 2 0.2
      vertex 0 2 0.2
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 2 2 0
      vertex 2 0 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 2 0
      vertex 2 2 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 2 0
      vertex 2 2 0
      vertex 2 2 0.2
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 2 0
      vertex 2 2 0.2
      vertex 0 2 0.2
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 2 0 0.2
      vertex 2 0 0
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 0 0 0.2
      vertex 2 0 0.2
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 2 0 0
      vertex 2 2 0
      vertex 2 2 0.2
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 2 0 0
      vertex 2 2 0.2
      vertex 2 0 0.2
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 2 0.2
      vertex 0 2 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0 0.2
      vertex 0 2 0.2
    endloop
  endfacet
endsolid rectangular_plate
`,
  },
  {
    name: "Beam",
    originalName: "beam.stl",
    format: "stl",
    content: `solid beam
  facet normal 0 0 1
    outer loop
      vertex 0 0 0.5
      vertex 3 0 0.5
      vertex 3 0.5 0.5
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 0.5
      vertex 3 0.5 0.5
      vertex 0 0.5 0.5
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 3 0.5 0
      vertex 3 0 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 0.5 0
      vertex 3 0.5 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 0.5 0
      vertex 3 0.5 0
      vertex 3 0.5 0.5
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 0.5 0
      vertex 3 0.5 0.5
      vertex 0 0.5 0.5
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 3 0 0.5
      vertex 3 0 0
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 0 0 0.5
      vertex 3 0 0.5
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 3 0 0
      vertex 3 0.5 0
      vertex 3 0.5 0.5
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 3 0 0
      vertex 3 0.5 0.5
      vertex 3 0 0.5
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0.5 0.5
      vertex 0 0.5 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0 0.5
      vertex 0 0.5 0.5
    endloop
  endfacet
endsolid beam
`,
  },
  {
    name: "Cylinder",
    originalName: "cylinder.stl",
    format: "stl",
    content: `solid cylinder
  facet normal -0.965926 -0.258819 0.000000
    outer loop
      vertex 10.000000 0.000000 -10.000000
      vertex 10.000000 0.000000 10.000000
      vertex 8.660254 5.000000 10.000000
    endloop
  endfacet
  facet normal -0.965926 -0.258819 0.000000
    outer loop
      vertex 10.000000 0.000000 -10.000000
      vertex 8.660254 5.000000 10.000000
      vertex 8.660254 5.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 10.000000 0.000000 10.000000
      vertex 8.660254 5.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 8.660254 5.000000 -10.000000
      vertex 10.000000 0.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.707107 -0.707107 0.000000
    outer loop
      vertex 8.660254 5.000000 -10.000000
      vertex 8.660254 5.000000 10.000000
      vertex 5.000000 8.660254 10.000000
    endloop
  endfacet
  facet normal -0.707107 -0.707107 0.000000
    outer loop
      vertex 8.660254 5.000000 -10.000000
      vertex 5.000000 8.660254 10.000000
      vertex 5.000000 8.660254 -10.000000
    endloop
  endfacet
  facet normal 0.000000 -0.000000 1.000000
    outer loop
      vertex 8.660254 5.000000 10.000000
      vertex 5.000000 8.660254 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 5.000000 8.660254 -10.000000
      vertex 8.660254 5.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.258819 -0.965926 0.000000
    outer loop
      vertex 5.000000 8.660254 -10.000000
      vertex 5.000000 8.660254 10.000000
      vertex 0.000000 10.000000 10.000000
    endloop
  endfacet
  facet normal -0.258819 -0.965926 0.000000
    outer loop
      vertex 5.000000 8.660254 -10.000000
      vertex 0.000000 10.000000 10.000000
      vertex 0.000000 10.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 5.000000 8.660254 10.000000
      vertex 0.000000 10.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 0.000000 10.000000 -10.000000
      vertex 5.000000 8.660254 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.258819 -0.965926 0.000000
    outer loop
      vertex 0.000000 10.000000 -10.000000
      vertex 0.000000 10.000000 10.000000
      vertex -5.000000 8.660254 10.000000
    endloop
  endfacet
  facet normal 0.258819 -0.965926 0.000000
    outer loop
      vertex 0.000000 10.000000 -10.000000
      vertex -5.000000 8.660254 10.000000
      vertex -5.000000 8.660254 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 0.000000 10.000000 10.000000
      vertex -5.000000 8.660254 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -5.000000 8.660254 -10.000000
      vertex 0.000000 10.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.707107 -0.707107 0.000000
    outer loop
      vertex -5.000000 8.660254 -10.000000
      vertex -5.000000 8.660254 10.000000
      vertex -8.660254 5.000000 10.000000
    endloop
  endfacet
  facet normal 0.707107 -0.707107 0.000000
    outer loop
      vertex -5.000000 8.660254 -10.000000
      vertex -8.660254 5.000000 10.000000
      vertex -8.660254 5.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -5.000000 8.660254 10.000000
      vertex -8.660254 5.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -8.660254 5.000000 -10.000000
      vertex -5.000000 8.660254 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.965926 -0.258819 0.000000
    outer loop
      vertex -8.660254 5.000000 -10.000000
      vertex -8.660254 5.000000 10.000000
      vertex -10.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.965926 -0.258819 0.000000
    outer loop
      vertex -8.660254 5.000000 -10.000000
      vertex -10.000000 0.000000 10.000000
      vertex -10.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -8.660254 5.000000 10.000000
      vertex -10.000000 0.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -10.000000 0.000000 -10.000000
      vertex -8.660254 5.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.965926 0.258819 0.000000
    outer loop
      vertex -10.000000 0.000000 -10.000000
      vertex -10.000000 0.000000 10.000000
      vertex -8.660254 -5.000000 10.000000
    endloop
  endfacet
  facet normal 0.965926 0.258819 0.000000
    outer loop
      vertex -10.000000 0.000000 -10.000000
      vertex -8.660254 -5.000000 10.000000
      vertex -8.660254 -5.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -10.000000 0.000000 10.000000
      vertex -8.660254 -5.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 -0.000000 -1.000000
    outer loop
      vertex -8.660254 -5.000000 -10.000000
      vertex -10.000000 0.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.707107 0.707107 0.000000
    outer loop
      vertex -8.660254 -5.000000 -10.000000
      vertex -8.660254 -5.000000 10.000000
      vertex -5.000000 -8.660254 10.000000
    endloop
  endfacet
  facet normal 0.707107 0.707107 0.000000
    outer loop
      vertex -8.660254 -5.000000 -10.000000
      vertex -5.000000 -8.660254 10.000000
      vertex -5.000000 -8.660254 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -8.660254 -5.000000 10.000000
      vertex -5.000000 -8.660254 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -5.000000 -8.660254 -10.000000
      vertex -8.660254 -5.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.258819 0.965926 0.000000
    outer loop
      vertex -5.000000 -8.660254 -10.000000
      vertex -5.000000 -8.660254 10.000000
      vertex -0.000000 -10.000000 10.000000
    endloop
  endfacet
  facet normal 0.258819 0.965926 0.000000
    outer loop
      vertex -5.000000 -8.660254 -10.000000
      vertex -0.000000 -10.000000 10.000000
      vertex -0.000000 -10.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -5.000000 -8.660254 10.000000
      vertex -0.000000 -10.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex -0.000000 -10.000000 -10.000000
      vertex -5.000000 -8.660254 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.258819 0.965926 0.000000
    outer loop
      vertex -0.000000 -10.000000 -10.000000
      vertex -0.000000 -10.000000 10.000000
      vertex 5.000000 -8.660254 10.000000
    endloop
  endfacet
  facet normal -0.258819 0.965926 0.000000
    outer loop
      vertex -0.000000 -10.000000 -10.000000
      vertex 5.000000 -8.660254 10.000000
      vertex 5.000000 -8.660254 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex -0.000000 -10.000000 10.000000
      vertex 5.000000 -8.660254 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 5.000000 -8.660254 -10.000000
      vertex -0.000000 -10.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.707107 0.707107 0.000000
    outer loop
      vertex 5.000000 -8.660254 -10.000000
      vertex 5.000000 -8.660254 10.000000
      vertex 8.660254 -5.000000 10.000000
    endloop
  endfacet
  facet normal -0.707107 0.707107 0.000000
    outer loop
      vertex 5.000000 -8.660254 -10.000000
      vertex 8.660254 -5.000000 10.000000
      vertex 8.660254 -5.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 5.000000 -8.660254 10.000000
      vertex 8.660254 -5.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 8.660254 -5.000000 -10.000000
      vertex 5.000000 -8.660254 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal -0.965926 0.258819 0.000000
    outer loop
      vertex 8.660254 -5.000000 -10.000000
      vertex 8.660254 -5.000000 10.000000
      vertex 10.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal -0.965926 0.258819 0.000000
    outer loop
      vertex 8.660254 -5.000000 -10.000000
      vertex 10.000000 0.000000 10.000000
      vertex 10.000000 0.000000 -10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 1.000000
    outer loop
      vertex 8.660254 -5.000000 10.000000
      vertex 10.000000 0.000000 10.000000
      vertex 0.000000 0.000000 10.000000
    endloop
  endfacet
  facet normal 0.000000 0.000000 -1.000000
    outer loop
      vertex 10.000000 0.000000 -10.000000
      vertex 8.660254 -5.000000 -10.000000
      vertex 0.000000 0.000000 -10.000000
    endloop
  endfacet
endsolid cylinder`,
  },
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const MemoryStore = memorystore(session);
  const sessionStore = new MemoryStore({ checkPeriod: 1000 * 60 * 60 * 24 });
  const sessionSecret = process.env.SESSION_SECRET || "matsim-dev-secret";

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    }),
  );

  const getSessionUser = async (
    req: Express.Request,
    res: Express.Response,
    options?: { requireVerified?: boolean },
  ) => {
    if (!req.session?.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return null;
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return null;
    }
    if (options?.requireVerified !== false && !user.emailVerified) {
      return res.status(403).json({ message: "Email verification required" });
    }
    return user;
  };

  const requireAuth = async (
    req: Express.Request,
    res: Express.Response,
    next: Express.NextFunction,
  ) => {
    const user = await getSessionUser(req, res, { requireVerified: true });
    if (!user) return;
    res.locals.user = user;
    return next();
  };

  const requireAdmin = async (
    req: Express.Request,
    res: Express.Response,
    next: Express.NextFunction,
  ) => {
    const user = await getSessionUser(req, res, { requireVerified: true });
    if (!user) return;
    if (user.roleId !== 2) {
      return res.status(403).json({ message: "Admin access required" });
    }
    res.locals.user = user;
    return next();
  };

  await ensureLocalStorageRoot();
  await storage.ensureRoles();
  await seedDefaultData();

  app.post("/api/auth/register", async (req, res) => {
    try {
      const input = registerSchema.parse(req.body);
      const email = normalizeEmail(input.email);
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser(email, passwordHash, input.name);
      await seedUserData(user.id);

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
      await storage.createEmailVerificationToken(user.id, tokenHash, expiresAt);
      await sendVerificationEmail(email, token, input.name);

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        roleId: user.roleId,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const input = loginSchema.parse(req.body);
      const email = normalizeEmail(input.email);
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }
      if (!user.emailVerified) {
        return res.status(403).json({ message: "Please verify your email before logging in" });
      }
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        return res.status(400).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        roleId: user.roleId,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ message: "Email verification required" });
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      roleId: user.roleId,
    });
  });

  app.put("/api/auth/profile", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const input = updateProfileSchema.parse(req.body);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const normalizedEmail = input.email ? normalizeEmail(input.email) : undefined;
      const emailChanged = normalizedEmail && normalizedEmail !== user.email;
      if (emailChanged) {
        const existing = await storage.getUserByEmail(normalizedEmail);
        if (existing && existing.id !== userId) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      const updated = await storage.updateUserProfile(userId, {
        name: input.name ?? user.name,
        email: normalizedEmail ?? user.email,
        emailVerified: emailChanged ? false : user.emailVerified,
      });
      if (!updated) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (emailChanged) {
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
        await storage.createEmailVerificationToken(updated.id, tokenHash, expiresAt);
        await sendVerificationEmail(updated.email, token, updated.name);
      }

      res.json({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        emailVerified: updated.emailVerified,
        roleId: updated.roleId,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post("/api/auth/password", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const input = changePasswordSchema.parse(req.body);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const nextHash = await bcrypt.hash(input.newPassword, 10);
      await storage.updateUserPassword(userId, nextHash);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });


  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const input = forgotPasswordSchema.parse(req.body);
      const email = normalizeEmail(input.email);
      const user = await storage.getUserByEmail(email);
      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
        await storage.createPasswordResetToken(user.id, tokenHash, expiresAt);
        await sendPasswordResetEmail(user.email, token, user.name);
      }
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const input = resetPasswordSchema.parse(req.body);
      const tokenHash = hashToken(input.token);
      const record = await storage.getPasswordResetTokenByHash(tokenHash);
      if (!record || record.usedAt) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      if (record.expiresAt.getTime() < Date.now()) {
        return res.status(400).json({ message: "Token expired" });
      }
      const user = await storage.getUserById(record.userId);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      const nextHash = await bcrypt.hash(input.password, 10);
      await storage.updateUserPassword(user.id, nextHash);
      await storage.markPasswordResetTokenUsed(record.id);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get("/api/auth/verify", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      return res.status(400).json({ message: "Missing token" });
    }
    const tokenHash = hashToken(token);
    const record = await storage.getEmailVerificationTokenByHash(tokenHash);
    if (!record || record.usedAt) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Token expired" });
    }
    await storage.markEmailVerificationTokenUsed(record.id);
    await storage.markUserVerified(record.userId);
    res.json({ success: true });
  });

  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth")) return next();
    return Promise.resolve(requireAuth(req, res, next)).catch(next);
  });

  // === Admin Routes ===
  app.post(api.admin.users.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.users.create.input.parse(req.body);
      const email = normalizeEmail(input.email);
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      const created = await storage.createUser(email, passwordHash, input.name);
      let user = created;
      if (input.roleId || typeof input.emailVerified === "boolean") {
        const updated = await storage.updateUserProfile(created.id, {
          roleId: input.roleId ?? created.roleId,
          emailVerified: input.emailVerified ?? created.emailVerified,
        });
        if (updated) user = updated;
      }
      await seedUserData(user.id);
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        roleId: user.roleId,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get(api.admin.users.list.path, requireAdmin, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        roleId: user.roleId,
        createdAt: user.createdAt,
        deletedAt: user.deletedAt ?? null,
      }))
    );
  });

  app.put(api.admin.users.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.users.update.input.parse(req.body);
      const userId = Number(req.params.id);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const normalizedEmail = input.email ? normalizeEmail(input.email) : undefined;
      if (normalizedEmail && normalizedEmail !== user.email) {
        const existing = await storage.getUserByEmail(normalizedEmail);
        if (existing && existing.id !== userId) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      const emailChanged = normalizedEmail && normalizedEmail !== user.email;
      const updated = await storage.updateUserProfile(userId, {
        name: input.name ?? user.name,
        email: normalizedEmail ?? user.email,
        emailVerified:
          input.emailVerified ??
          (emailChanged ? true : user.emailVerified),
        roleId: input.roleId ?? user.roleId,
      });

      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        emailVerified: updated.emailVerified,
        roleId: updated.roleId,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post(api.admin.users.resetPassword.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.users.resetPassword.input.parse(req.body);
      const userId = Number(req.params.id);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const nextHash = await bcrypt.hash(input.newPassword, 10);
      await storage.updateUserPassword(userId, nextHash);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.admin.users.delete.path, requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const user = await storage.softDeleteUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await storage.softDeleteSimulationsByUser(userId);
    res.json({ success: true });
  });

  app.get(api.admin.users.materials.list.path, requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const materials = await storage.getMaterials(userId);
    res.json(materials);
  });

  app.post(api.admin.users.materials.create.path, requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const input = api.admin.users.materials.create.input.parse(req.body);
      const material = await storage.createMaterial(userId, input);
      res.status(201).json(material);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.put(api.admin.users.materials.update.path, requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const materialId = Number(req.params.materialId);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const existing = await storage.getMaterial(materialId, userId);
      if (!existing) {
        return res.status(404).json({ message: "Material not found" });
      }
      const input = api.admin.users.materials.update.input.parse(req.body);
      const updated = await storage.updateMaterial(materialId, userId, input);
      if (!updated) {
        return res.status(404).json({ message: "Material not found" });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.admin.users.materials.delete.path, requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const materialId = Number(req.params.materialId);
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const deleted = await storage.deleteMaterial(materialId, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Material not found" });
    }
    res.json({ success: true });
  });

  app.get(api.admin.users.geometries.list.path, requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const geometries = await storage.getGeometries(userId);
    res.json(geometries);
  });

  app.post(api.admin.users.geometries.create.path, requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const input = api.admin.users.geometries.create.input.parse(req.body);
      const normalized = input.contentBase64.includes(",")
        ? input.contentBase64.split(",")[1]
        : input.contentBase64;
      const buffer = Buffer.from(normalized, "base64");
      const safeFormat = input.format.replace(".", "").toLowerCase();
      const safeName = input.name.replace(/[^a-z0-9-_]+/gi, "_");
      const fileName = `${Date.now()}-${safeName}.${safeFormat}`;
      const saved = await saveGeometryFile(fileName, buffer);
      const geometry = await storage.createGeometry(userId, {
        name: input.name,
        originalName: input.originalName,
        format: safeFormat,
        storagePath: saved.storagePath,
        sizeBytes: saved.sizeBytes,
      });
      res.status(201).json(geometry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.put(api.admin.users.geometries.update.path, requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const geometryId = Number(req.params.geometryId);
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const geometry = await storage.getGeometry(geometryId, userId);
      if (!geometry) {
        return res.status(404).json({ message: "Geometry not found" });
      }
      const input = api.admin.users.geometries.update.input.parse(req.body);
      let updatePayload: Partial<typeof geometry> = { name: input.name };

      if (input.contentBase64) {
        if (!input.originalName || !input.format) {
          return res.status(400).json({
            message: "originalName and format are required when uploading new geometry content.",
            field: "contentBase64",
          });
        }
        const normalized = input.contentBase64.includes(",")
          ? input.contentBase64.split(",")[1]
          : input.contentBase64;
        const buffer = Buffer.from(normalized, "base64");
        const safeFormat = input.format.replace(".", "").toLowerCase();
        const safeName = input.name.replace(/[^a-z0-9-_]+/gi, "_");
        const fileName = `${Date.now()}-${safeName}.${safeFormat}`;
        const saved = await saveGeometryFile(fileName, buffer);
        updatePayload = {
          name: input.name,
          originalName: input.originalName,
          format: safeFormat,
          storagePath: saved.storagePath,
          sizeBytes: saved.sizeBytes,
        };
      }

      const updated = await storage.updateGeometry(geometryId, userId, updatePayload);
      if (!updated) {
        return res.status(404).json({ message: "Geometry not found" });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.admin.users.geometries.delete.path, requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const geometryId = Number(req.params.geometryId);
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const deleted = await storage.deleteGeometry(geometryId, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Geometry not found" });
    }
    res.json({ success: true });
  });

  app.get(api.admin.defaultMaterials.list.path, requireAdmin, async (req, res) => {
    const materials = await storage.getDefaultMaterials();
    res.json(materials);
  });

  app.post(api.admin.defaultMaterials.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.defaultMaterials.create.input.parse(req.body);
      const material = await storage.createDefaultMaterial(input);
      const users = await storage.getAllUsers();
      for (const user of users) {
        await storage.createMaterial(user.id, { ...input, defaultMaterialId: material.id });
      }
      res.status(201).json(material);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.put(api.admin.defaultMaterials.update.path, requireAdmin, async (req, res) => {
    try {
      const defaultId = Number(req.params.id);
      const existing = await storage.getDefaultMaterial(defaultId);
      if (!existing) {
        return res.status(404).json({ message: "Default material not found" });
      }
      const input = api.admin.defaultMaterials.update.input.parse(req.body);
      const updated = await storage.updateDefaultMaterial(defaultId, input);
      if (!updated) {
        return res.status(404).json({ message: "Default material not found" });
      }
      await storage.linkDefaultMaterialToUsers(defaultId, existing);
      await storage.syncDefaultMaterialToUsers(defaultId, updated);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.admin.defaultMaterials.delete.path, requireAdmin, async (req, res) => {
    const deleted = await storage.deleteDefaultMaterial(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Default material not found" });
    }
    res.json({ success: true });
  });

  app.get(api.admin.defaultGeometries.list.path, requireAdmin, async (req, res) => {
    const geometries = await storage.getDefaultGeometries();
    res.json(geometries);
  });

  app.get(api.admin.defaultGeometries.content.path, requireAdmin, async (req, res) => {
    const geometry = await storage.getDefaultGeometry(Number(req.params.id));
    if (!geometry) {
      return res.status(404).json({ message: "Default geometry not found" });
    }
    try {
      const buffer = await readStoragePath(geometry.storagePath);
      res.json({
        name: geometry.name,
        format: geometry.format,
        contentBase64: buffer.toString("base64"),
      });
    } catch (err) {
      res.status(404).json({
        message: "Default geometry file missing on server.",
      });
    }
  });

  app.post(api.admin.defaultGeometries.create.path, requireAdmin, async (req, res) => {
    try {
      const input = z
        .object({
          name: z.string().min(1),
          originalName: z.string().min(1),
          format: z.string().min(1),
          contentBase64: z.string().min(1),
        })
        .parse(req.body);
      const normalized = input.contentBase64.includes(",")
        ? input.contentBase64.split(",")[1]
        : input.contentBase64;
      const buffer = Buffer.from(normalized, "base64");
      const safeFormat = input.format.replace(".", "").toLowerCase();
      const safeName = input.name.replace(/[^a-z0-9-_]+/gi, "_");
      const fileName = `${Date.now()}-${safeName}.${safeFormat}`;
      const saved = await saveGeometryFile(fileName, buffer);
      const geometry = await storage.createDefaultGeometry({
        name: input.name,
        originalName: input.originalName,
        format: safeFormat,
        storagePath: saved.storagePath,
        sizeBytes: saved.sizeBytes,
      });
      const users = await storage.getAllUsers();
      for (const user of users) {
        await storage.createGeometry(user.id, {
          name: geometry.name,
          originalName: geometry.originalName,
          format: geometry.format,
          storagePath: geometry.storagePath,
          sizeBytes: geometry.sizeBytes,
          defaultGeometryId: geometry.id,
        });
      }
      res.status(201).json(geometry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.put(api.admin.defaultGeometries.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.defaultGeometries.update.input.parse(req.body);
      const geometryId = Number(req.params.id);
      const existing = await storage.getDefaultGeometry(geometryId);
      if (!existing) {
        return res.status(404).json({ message: "Default geometry not found" });
      }
      let updatePayload: Partial<typeof input> & {
        storagePath?: string;
        sizeBytes?: number;
      } = { name: input.name };

      if (input.contentBase64) {
        if (!input.originalName || !input.format) {
          return res.status(400).json({
            message: "originalName and format are required when uploading new geometry content.",
            field: "contentBase64",
          });
        }
        const normalized = input.contentBase64.includes(",")
          ? input.contentBase64.split(",")[1]
          : input.contentBase64;
        const buffer = Buffer.from(normalized, "base64");
        const safeFormat = input.format.replace(".", "").toLowerCase();
        const safeName = input.name.replace(/[^a-z0-9-_]+/gi, "_");
        const fileName = `${Date.now()}-${safeName}.${safeFormat}`;
        const saved = await saveGeometryFile(fileName, buffer);
        updatePayload = {
          name: input.name,
          originalName: input.originalName,
          format: safeFormat,
          storagePath: saved.storagePath,
          sizeBytes: saved.sizeBytes,
        };
      }

      const updated = await storage.updateDefaultGeometry(geometryId, updatePayload);
      if (!updated) {
        return res.status(404).json({ message: "Default geometry not found" });
      }
      await storage.linkDefaultGeometryToUsers(geometryId, existing);
      await storage.syncDefaultGeometryToUsers(geometryId, updated);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.admin.defaultGeometries.delete.path, requireAdmin, async (req, res) => {
    const deleted = await storage.deleteDefaultGeometry(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Default geometry not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/assistant", async (req, res) => {
    try {
      const input = assistantRequestSchema.parse(req.body);
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          answer:
            "Assistant is not configured yet. Please set the OpenAI API key.",
        });
      }

      const page = input.page ?? "unknown";
      const contextText = input.context ? JSON.stringify(input.context) : "null";
      const trimmedContext =
        contextText.length > 6000 ? contextText.slice(0, 6000) : contextText;

      const guide = loadAssistantGuide();
      const guideSnippets = selectGuideSnippets(guide, page, input.question);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
            { role: "system", content: ASSISTANT_APP_GUIDE_INDEX },
            ...(guideSnippets
              ? [{ role: "system", content: `MatSim Guide Snippets:\n${guideSnippets}` }]
              : []),
            {
              role: "user",
              content: `Page: ${page}\nContext: ${trimmedContext}\nQuestion: ${input.question}`,
            },
          ],
          max_completion_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({
          answer: "The assistant service is unavailable right now.",
          details: errorText,
        });
      }

      const data = await response.json();
      if (data?.error) {
        return res.status(502).json({
          answer: "The assistant service is unavailable right now.",
          details: JSON.stringify(data.error, null, 2),
        });
      }
      const answer = data?.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        return res.status(502).json({
          answer: "The assistant service is unavailable right now.",
          details: JSON.stringify(data, null, 2),
        });
      }
      return res.json({
        answer,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          answer: "Invalid assistant request.",
          details: err.errors,
        });
      }
      return res.status(500).json({
        answer: "Unexpected error while generating a response.",
      });
    }
  });
  
  // === Materials Routes ===
  app.get(api.materials.list.path, async (req, res) => {
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const allMaterials =
      sessionUser?.roleId === 2
        ? await storage.getAllMaterials()
        : await storage.getMaterials(userId);
    res.json(allMaterials);
  });

  app.get(api.materials.get.path, async (req, res) => {
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const material =
      sessionUser?.roleId === 2
        ? await storage.getMaterialById(Number(req.params.id))
        : await storage.getMaterial(Number(req.params.id), userId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    res.json(material);
  });

  app.post(api.materials.create.path, async (req, res) => {
    try {
      const input = api.materials.create.input.parse(req.body);
      const userId = req.session.userId!;
      const material = await storage.createMaterial(userId, input);
      res.status(201).json(material);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.materials.update.path, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const input = api.materials.update.input.parse(req.body);
      const updated = await storage.updateMaterial(Number(req.params.id), userId, input);
      if (!updated) {
        return res.status(404).json({ message: "Material not found" });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.materials.delete.path, async (req, res) => {
    const userId = req.session.userId!;
    const deleted = await storage.deleteMaterial(Number(req.params.id), userId);
    if (!deleted) {
      return res.status(404).json({ message: "Material not found" });
    }
    res.json({ success: true });
  });

  // === Simulations Routes ===
  app.get(api.simulations.list.path, async (req, res) => {
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    if (sessionUser?.roleId === 2) {
      const allSimulations = await storage.getSimulationsWithUsers();
      res.json(allSimulations);
      return;
    }
    const allSimulations = await storage.getSimulations(userId);
    res.json(allSimulations);
  });

  app.get(api.simulations.get.path, async (req, res) => {
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const simulationId = Number(req.params.id);
    const simulation =
      sessionUser?.roleId === 2
        ? await storage.getSimulationById(simulationId)
        : await storage.getSimulation(simulationId, userId);
    if (!simulation) {
      return res.status(404).json({ message: 'Simulation not found' });
    }
    res.json(simulation);
  });

  app.put(api.simulations.update.path, async (req, res) => {
    try {
      const simulationId = Number(req.params.id);
      const userId = req.session.userId!;
      const sessionUser = res.locals.user;
      const isAdmin = sessionUser?.roleId === 2;
      const simulation = isAdmin
        ? await storage.getSimulationById(simulationId)
        : await storage.getSimulation(simulationId, userId);
      if (!simulation) {
        return res.status(404).json({ message: "Simulation not found" });
      }
      const input = api.simulations.update.input.parse(req.body);
      const { boundaryConditions, run, ...updateFields } = input;
      const shouldRun = Boolean(run);
      const ownerId = simulation.userId;
      const existingConditions = isAdmin
        ? await storage.getBoundaryConditionsBySimulation(simulationId)
        : await storage.getBoundaryConditions(simulationId, userId);
      const existingPayload = existingConditions.map((condition) => ({
        type: condition.type,
        face: condition.face,
        magnitude: condition.magnitude ?? null,
        unit: condition.unit ?? null,
      }));
      const nextPayload = boundaryConditions ?? existingPayload;
      const normalizeBoundaryCondition = (item: {
        type: string;
        face: string;
        magnitude?: number | null;
        unit?: string | null;
      }) => ({
        type: item.type,
        face: item.face,
        magnitude: item.magnitude ?? null,
        unit: item.unit ?? null,
      });
      const normalizeForCompare = (items: typeof nextPayload) =>
        JSON.stringify(
          items
            .map(normalizeBoundaryCondition)
            .sort((a, b) =>
              `${a.face}-${a.type}`.localeCompare(`${b.face}-${b.type}`)
            )
        );
      const normalizedExisting = normalizeForCompare(existingPayload);
      const normalizedNext = normalizeForCompare(nextPayload);
      const hasBoundaryChanges =
        boundaryConditions ? normalizedExisting !== normalizedNext : false;
      const hasNonNameUpdates = Object.entries(updateFields).some(([key, value]) => {
        if (key === "name" || value === undefined) return false;
        const current = (simulation as any)[key];
        return (value ?? null) !== (current ?? null);
      });
      const hasParamChanges = hasNonNameUpdates || hasBoundaryChanges;
      const merged = {
        ...simulation,
        ...updateFields,
        status: shouldRun ? "pending" : simulation.status,
        progress: shouldRun ? 0 : simulation.progress,
        results: shouldRun ? null : simulation.results,
        completedAt: shouldRun ? null : simulation.completedAt,
        paramsDirty: shouldRun
          ? false
          : hasParamChanges
          ? true
          : simulation.paramsDirty ?? false,
      };
      const updated = isAdmin
        ? await storage.updateSimulationById(simulationId, {
            name: merged.name,
            materialId: merged.materialId,
            geometryId: merged.geometryId,
            type: merged.type,
            appliedLoad: merged.appliedLoad,
            temperature: merged.temperature,
            duration: merged.duration,
            frequency: merged.frequency,
            dampingRatio: merged.dampingRatio,
            materialModel: merged.materialModel,
            yieldStrength: merged.yieldStrength,
            hardeningModulus: merged.hardeningModulus,
            status: merged.status,
            progress: merged.progress ?? 0,
            results: merged.results ?? null,
            completedAt: merged.completedAt ?? null,
            paramsDirty: merged.paramsDirty ?? false,
          })
        : await storage.updateSimulation(simulationId, userId, {
          name: merged.name,
          materialId: merged.materialId,
          geometryId: merged.geometryId,
          type: merged.type,
          appliedLoad: merged.appliedLoad,
        temperature: merged.temperature,
        duration: merged.duration,
        frequency: merged.frequency,
        dampingRatio: merged.dampingRatio,
        materialModel: merged.materialModel,
        yieldStrength: merged.yieldStrength,
        hardeningModulus: merged.hardeningModulus,
        status: merged.status,
        progress: merged.progress ?? 0,
        results: merged.results ?? null,
        completedAt: merged.completedAt ?? null,
        paramsDirty: merged.paramsDirty ?? false,
      });
      if (!updated) {
        return res.status(404).json({ message: "Simulation not found" });
      }

      if (boundaryConditions) {
        await storage.deleteBoundaryConditions(simulationId, ownerId);
        if (boundaryConditions.length) {
          await Promise.all(
            boundaryConditions.map((condition) =>
              storage.createBoundaryCondition(ownerId, {
                simulationId,
                type: condition.type,
                face: condition.face,
                magnitude: condition.magnitude ?? null,
                unit: condition.unit ?? null,
              })
            )
          );
        }
      }

      if (shouldRun) {
        const payload = {
          name: updated.name,
          materialId: updated.materialId,
          geometryId: updated.geometryId,
          type: updated.type,
          appliedLoad: updated.appliedLoad,
          temperature: updated.temperature,
          duration: updated.duration,
          frequency: updated.frequency,
          dampingRatio: updated.dampingRatio,
          materialModel: updated.materialModel,
          yieldStrength: updated.yieldStrength,
          hardeningModulus: updated.hardeningModulus,
          boundaryConditions:
            boundaryConditions ??
            (isAdmin
              ? await storage.getBoundaryConditionsBySimulation(simulationId)
              : await storage.getBoundaryConditions(simulationId, userId)),
        };
        enqueueSimulation(simulationId, ownerId, payload);
      }

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.simulations.cancel.path, async (req, res) => {
    const simulationId = Number(req.params.id);
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const simulation =
      sessionUser?.roleId === 2
        ? await storage.getSimulationById(simulationId)
        : await storage.getSimulation(simulationId, userId);
    if (!simulation) {
      return res.status(404).json({ message: "Simulation not found" });
    }
    await cancelSimulation(simulationId, simulation.userId);
    const updated =
      sessionUser?.roleId === 2
        ? await storage.getSimulationById(simulationId)
        : await storage.getSimulation(simulationId, userId);
    return res.json(updated ?? simulation);
  });

  app.delete(api.simulations.delete.path, async (req, res) => {
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const simulationId = Number(req.params.id);
    const deleted =
      sessionUser?.roleId === 2
        ? await storage.softDeleteSimulationById(simulationId)
        : await storage.deleteSimulation(simulationId, userId);
    if (!deleted) {
      return res.status(404).json({ message: 'Simulation not found' });
    }
    res.json({ success: true });
  });

  app.post(api.simulations.create.path, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const input = api.simulations.create.input.parse(req.body);
      const { boundaryConditions, ...simulationInput } = input;
      const simulation = await storage.createSimulation(userId, simulationInput);
      
      if (simulation) {
        if (boundaryConditions?.length) {
          await Promise.all(
            boundaryConditions.map((condition) =>
              storage.createBoundaryCondition(userId, {
                simulationId: simulation.id,
                type: condition.type,
                face: condition.face,
                magnitude: condition.magnitude ?? null,
                unit: condition.unit ?? null,
              })
            )
          );
        }
        enqueueSimulation(simulation.id, userId, input);
      }

      res.status(201).json(simulation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === Geometry Routes ===
  app.get(api.geometries.list.path, async (req, res) => {
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const allGeometries =
      sessionUser?.roleId === 2
        ? await storage.getAllGeometries()
        : await storage.getGeometries(userId);
    res.json(allGeometries);
  });

  app.get(api.geometries.get.path, async (req, res) => {
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const geometry =
      sessionUser?.roleId === 2
        ? await storage.getGeometryById(Number(req.params.id))
        : await storage.getGeometry(Number(req.params.id), userId);
    if (!geometry) {
      return res.status(404).json({ message: "Geometry not found" });
    }
    res.json(geometry);
  });

  app.get(api.geometries.content.path, async (req, res) => {
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const geometry =
      sessionUser?.roleId === 2
        ? await storage.getGeometryById(Number(req.params.id))
        : await storage.getGeometry(Number(req.params.id), userId);
    if (!geometry) {
      return res.status(404).json({ message: "Geometry not found" });
    }
    let buffer: Buffer;
    try {
      buffer = await readStoragePath(geometry.storagePath);
    } catch (err) {
      const seedMatch = seedGeometries.find(
        (item) => item.originalName === geometry.originalName
      );
      if (!seedMatch) {
        return res.status(404).json({
          message:
            "Geometry file missing on server. Re-upload the geometry or attach persistent storage.",
        });
      }
      const fileName = `${Date.now()}-${seedMatch.originalName}`;
      const saved = await saveGeometryFile(
        fileName,
        Buffer.from(seedMatch.content),
      );
      await storage.updateGeometryStorage(
        geometry.id,
        userId,
        saved.storagePath,
        saved.sizeBytes,
      );
      buffer = Buffer.from(seedMatch.content);
    }
    res.json({
      name: geometry.name,
      format: geometry.format,
      contentBase64: buffer.toString("base64"),
    });
  });

  app.post(api.geometries.create.path, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const input = api.geometries.create.input.parse(req.body);
      const { name, originalName, format, contentBase64 } = input;
      const normalized = contentBase64.includes(",")
        ? contentBase64.split(",")[1]
        : contentBase64;
      const buffer = Buffer.from(normalized, "base64");
      const safeFormat = format.replace(".", "").toLowerCase();
      const safeName = name.replace(/[^a-z0-9-_]+/gi, "_");
      const fileName = `${Date.now()}-${safeName}.${safeFormat}`;
      const saved = await saveGeometryFile(fileName, buffer);

      const geometry = await storage.createGeometry(userId, {
        name,
        originalName,
        format: safeFormat,
        storagePath: saved.storagePath,
        sizeBytes: saved.sizeBytes,
      });

      res.status(201).json(geometry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.put(api.geometries.update.path, async (req, res) => {
    try {
      const input = api.geometries.update.input.parse(req.body);
      const geometryId = Number(req.params.id);
      const userId = req.session.userId!;
      const geometry = await storage.getGeometry(geometryId, userId);
      if (!geometry) {
        return res.status(404).json({ message: "Geometry not found" });
      }

      let updatePayload: Partial<typeof geometry> = { name: input.name };

      if (input.contentBase64) {
        if (!input.originalName || !input.format) {
          return res.status(400).json({
            message: "originalName and format are required when uploading new geometry content.",
            field: "contentBase64",
          });
        }
        const normalized = input.contentBase64.includes(",")
          ? input.contentBase64.split(",")[1]
          : input.contentBase64;
        const buffer = Buffer.from(normalized, "base64");
        const safeFormat = input.format.replace(".", "").toLowerCase();
        const safeName = input.name.replace(/[^a-z0-9-_]+/gi, "_");
        const fileName = `${Date.now()}-${safeName}.${safeFormat}`;
        const saved = await saveGeometryFile(fileName, buffer);
        updatePayload = {
          name: input.name,
          originalName: input.originalName,
          format: safeFormat,
          storagePath: saved.storagePath,
          sizeBytes: saved.sizeBytes,
        };
      }

      const updated = await storage.updateGeometry(geometryId, userId, updatePayload);
      if (!updated) {
        return res.status(404).json({ message: "Geometry not found" });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.geometries.delete.path, async (req, res) => {
    const userId = req.session.userId!;
    const deleted = await storage.deleteGeometry(Number(req.params.id), userId);
    if (!deleted) {
      return res.status(404).json({ message: "Geometry not found" });
    }
    res.json({ success: true });
  });

  // === Simulation Mesh Routes ===
  app.get(api.simulationMeshes.listBySimulation.path, async (req, res) => {
    const simulationId = Number(req.params.id);
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const meshes =
      sessionUser?.roleId === 2
        ? await storage.getSimulationMeshesBySimulation(simulationId)
        : await storage.getSimulationMeshes(simulationId, userId);
    res.json(meshes);
  });

  app.get(api.simulationMeshes.content.path, async (req, res) => {
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const meshId = Number(req.params.id);
    const mesh =
      sessionUser?.roleId === 2
        ? await storage.getSimulationMeshById(meshId)
        : await storage.getSimulationMesh(meshId, userId);
    if (!mesh) {
      return res.status(404).json({ message: "Simulation mesh not found" });
    }
    let buffer: Buffer;
    try {
      buffer = await readStoragePath(mesh.storagePath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") {
        return res.status(404).json({ message: "Mesh file missing on disk" });
      }
      return res.status(500).json({ message: "Failed to read mesh file" });
    }
    res.json({
      name: mesh.name,
      format: mesh.format,
      contentBase64: buffer.toString("base64"),
    });
  });

  // === Simulation Boundary Conditions ===
  app.get(api.simulationBoundaryConditions.listBySimulation.path, async (req, res) => {
    const simulationId = Number(req.params.id);
    const userId = req.session.userId!;
    const sessionUser = res.locals.user;
    const simulation =
      sessionUser?.roleId === 2
        ? await storage.getSimulationById(simulationId)
        : await storage.getSimulation(simulationId, userId);
    if (!simulation) {
      return res.status(404).json({ message: "Simulation not found" });
    }
    const conditions =
      sessionUser?.roleId === 2
        ? await storage.getBoundaryConditionsBySimulation(simulationId)
        : await storage.getBoundaryConditions(simulationId, userId);
    res.json(conditions);
  });

  app.post(api.simulationBoundaryConditions.create.path, async (req, res) => {
    try {
      const simulationId = Number(req.params.id);
      const userId = req.session.userId!;
      const sessionUser = res.locals.user;
      const simulation =
        sessionUser?.roleId === 2
          ? await storage.getSimulationById(simulationId)
          : await storage.getSimulation(simulationId, userId);
      if (!simulation) {
        return res.status(404).json({ message: "Simulation not found" });
      }
      const input = api.simulationBoundaryConditions.create.input.parse(req.body);
      const condition = await storage.createBoundaryCondition(simulation.userId, {
        simulationId,
        type: input.type,
        face: input.face,
        magnitude: input.magnitude ?? null,
        unit: input.unit ?? null,
      });
      res.status(201).json(condition);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  return httpServer;
}

async function seedDefaultData() {
  const existingDefaults = await storage.getDefaultMaterials();
  if (existingDefaults.length === 0) {
    await storage.createDefaultMaterial({
      name: "Structural Steel ASTM A36",
      category: "Metal",
      description: "Common structural steel used in construction and machinery.",
      density: 7850,
      youngsModulus: 200, // GPa
      poissonRatio: 0.26,
      thermalConductivity: 45,
      meltingPoint: 1425,
      stressStrainCurve: [
        { strain: 0, stress: 0 },
        { strain: 0.001, stress: 200 },
        { strain: 0.002, stress: 250 }, // Yield point approx
        { strain: 0.05, stress: 400 },
        { strain: 0.1, stress: 450 },
        { strain: 0.2, stress: 400 }, // Necking
      ],
      thermalExpansionCurve: [
        { temperature: 20, coefficient: 12 },
        { temperature: 100, coefficient: 12.5 },
        { temperature: 200, coefficient: 13 },
        { temperature: 300, coefficient: 13.6 },
        { temperature: 400, coefficient: 14.2 },
      ],
    });

    await storage.createDefaultMaterial({
      name: "Aluminum Alloy 6061-T6",
      category: "Metal",
      description: "Precipitation-hardened aluminum alloy, used in aircraft structures.",
      density: 2700,
      youngsModulus: 68.9, // GPa
      poissonRatio: 0.33,
      thermalConductivity: 167,
      meltingPoint: 582,
      stressStrainCurve: [
        { strain: 0, stress: 0 },
        { strain: 0.002, stress: 240 },
        { strain: 0.004, stress: 270 },
        { strain: 0.06, stress: 310 },
        { strain: 0.12, stress: 290 },
      ],
      thermalExpansionCurve: [
        { temperature: 20, coefficient: 23 },
        { temperature: 100, coefficient: 24 },
        { temperature: 200, coefficient: 25.2 },
        { temperature: 300, coefficient: 26.5 },
      ],
    });

    await storage.createDefaultMaterial({
      name: "Titanium Ti-6Al-4V",
      category: "Metal",
      description: "Workhorse titanium alloy for aerospace and biomedical applications.",
      density: 4430,
      youngsModulus: 113.8, // GPa
      poissonRatio: 0.34,
      thermalConductivity: 6.7,
      meltingPoint: 1604,
      stressStrainCurve: [
        { strain: 0, stress: 0 },
        { strain: 0.005, stress: 800 },
        { strain: 0.008, stress: 880 }, // Yield
        { strain: 0.05, stress: 950 },
        { strain: 0.1, stress: 900 },
      ],
      thermalExpansionCurve: [
        { temperature: 20, coefficient: 8.6 },
        { temperature: 100, coefficient: 8.9 },
        { temperature: 300, coefficient: 9.5 },
        { temperature: 500, coefficient: 10.1 },
      ],
    });

    await storage.createDefaultMaterial({
      name: "Polyetheretherketone (PEEK)",
      category: "Polymer",
      description: "High-performance organic thermoplastic polymer.",
      density: 1320,
      youngsModulus: 3.6, // GPa
      poissonRatio: 0.4,
      thermalConductivity: 0.25,
      meltingPoint: 343,
      stressStrainCurve: [
        { strain: 0, stress: 0 },
        { strain: 0.02, stress: 80 },
        { strain: 0.05, stress: 100 },
        { strain: 0.2, stress: 90 },
      ],
      thermalExpansionCurve: [
        { temperature: 20, coefficient: 45 },
        { temperature: 100, coefficient: 55 },
        { temperature: 150, coefficient: 120 }, // Glass transition area
      ],
    });
  }

  const existingDefaultGeometries = await storage.getDefaultGeometries();
  if (existingDefaultGeometries.length === 0) {
    for (const sample of seedGeometries) {
      const safeName = sample.originalName.replace(/[^a-z0-9-_.]+/gi, "_");
      const fileName = `${Date.now()}-${safeName}`;
      const saved = await saveGeometryFile(
        fileName,
        Buffer.from(sample.content),
      );
      await storage.createDefaultGeometry({
        name: sample.name,
        originalName: sample.originalName,
        format: sample.format,
        storagePath: saved.storagePath,
        sizeBytes: saved.sizeBytes,
      });
    }
  }
}

async function seedUserData(userId: number) {
  const existingMaterials = await storage.getMaterials(userId);
  if (existingMaterials.length === 0) {
    const defaults = await storage.getDefaultMaterials();
    for (const material of defaults) {
      const { id, createdAt, ...payload } = material;
      await storage.createMaterial(userId, { ...payload, defaultMaterialId: id });
    }
  }

  const existingGeometries = await storage.getGeometries(userId);
  if (existingGeometries.length === 0) {
    const defaults = await storage.getDefaultGeometries();
    for (const geometry of defaults) {
      const { id, createdAt, ...payload } = geometry;
      await storage.createGeometry(userId, { ...payload, defaultGeometryId: id });
    }
    return;
  }
}
