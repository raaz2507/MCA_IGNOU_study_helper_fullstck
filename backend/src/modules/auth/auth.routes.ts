import { Router } from "express";
import rateLimit from "express-rate-limit";
import { changePassword, login, logout, me, profile, refresh, register, resendVerification, updateProfile, verifyEmail } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

export const authRouter = Router();

authRouter.post("/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }), login);
authRouter.post("/register", rateLimit({ windowMs: 60 * 60 * 1000, limit: 10 }), register);
authRouter.post("/verify-email", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }), verifyEmail);
authRouter.post("/resend-verification", rateLimit({ windowMs: 60 * 60 * 1000, limit: 5 }), resendVerification);
authRouter.post("/refresh", rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 }), refresh);
authRouter.get("/me", requireAuth, me);
authRouter.get("/profile", requireAuth, profile);
authRouter.put("/profile", requireAuth, updateProfile);
authRouter.put("/password", requireAuth, changePassword);
authRouter.post("/logout", logout);

