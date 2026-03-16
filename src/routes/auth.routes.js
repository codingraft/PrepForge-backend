import express from "express";
import { loginUser, logoutUser, profile, registerUser } from "../controllers/auth.controller.js";
import { authUser } from "../middleware/auth.middleware.js";
const router = express.Router();

// Register route
router.post("/register", registerUser);

// Login route
router.post("/login", loginUser);

// Logout route
router.post("/logout", logoutUser);

router.get("/me", authUser, profile);

export default router;
