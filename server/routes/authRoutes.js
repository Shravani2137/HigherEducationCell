const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const auth = require("../middleware/auth");
const driveService = require("../services/driveService");
const driveOAuth = require("../services/driveOAuth");

const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../.env"),
});

require("dotenv").config();

// ============================================================
// POST /api/auth/login
// Admin Login
// ============================================================

router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
      return res.status(503).json({
        message: "Admin authentication is not configured.",
      });
    }

    const expectedPassword = process.env.ADMIN_PASSWORD;

    let isMatch = false;

    // Check hashed admin password if available
    if (process.env.ADMIN_HASH) {
      isMatch = await bcrypt.compare(password, process.env.ADMIN_HASH);
    }

    // Fallback to normal password
    if (!isMatch) {
      isMatch = password === expectedPassword;
    }

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    const token = jwt.sign(
      {
        role: "admin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      },
    );

    res.json({
      token,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// ============================================================
// GET /api/auth/verify
// Verify Admin JWT
// ============================================================

router.get("/verify", auth, (req, res) => {
  res.json({
    valid: true,
  });
});

// ============================================================
// GOOGLE DRIVE OAUTH
// ============================================================

// GET /api/auth/google
// Starts Google Drive OAuth authorization

router.get("/google", (req, res) => {
  try {
    const authUrl = driveOAuth.getAuthorizationUrl();

    console.log("🔐 Redirecting to Google OAuth...");

    res.redirect(authUrl);
  } catch (error) {
    console.error("❌ Google OAuth start error:", error);

    res.status(500).json({
      error: "Failed to start Google OAuth",
      message: error.message,
    });
  }
});

// ============================================================
// GET /api/auth/google/callback
// Google redirects here after authorization
// ============================================================

router.get("/google/callback", async (req, res) => {
  try {
    const { code, error } = req.query;

    // User cancelled Google authorization
    if (error) {
      console.error("❌ Google OAuth denied:", error);

      return res.status(400).send(`
        <html>
          <head>
            <title>HEC - Google Drive Authorization</title>
          </head>

          <body style="
            font-family: Arial;
            padding: 40px;
          ">

            <h2>❌ Google Drive Authorization Failed</h2>

            <p>
              Authorization was denied or cancelled.
            </p>

            <p>
              You can close this page and try again.
            </p>

          </body>
        </html>
      `);
    }

    // No authorization code received
    if (!code) {
      return res.status(400).send(`
        <html>
          <head>
            <title>HEC - Google Drive Authorization</title>
          </head>

          <body style="
            font-family: Arial;
            padding: 40px;
          ">

            <h2>❌ Google Drive Authorization Failed</h2>

            <p>
              Authorization code was not received.
            </p>

          </body>
        </html>
      `);
    }

    // Exchange authorization code for tokens
    await driveOAuth.handleOAuthCallback(code);

    console.log("✅ Google Drive OAuth completed successfully.");

    // Success page
    res.send(`
      <html>

        <head>
          <title>HEC - Google Drive Connected</title>
        </head>

        <body style="
          font-family: Arial;
          padding: 40px;
        ">

          <h2>
            ✅ Google Drive Connected Successfully!
          </h2>

          <p>
            Your HEC application is now authorized
            to access your Google Drive.
          </p>

          <p>
            You can close this page and return
            to the HEC application.
          </p>

        </body>

      </html>
    `);
  } catch (error) {
    console.error("❌ Google OAuth callback error:", error);

    res.status(500).send(`
      <html>

        <head>
          <title>HEC - Google Drive Error</title>
        </head>

        <body style="
          font-family: Arial;
          padding: 40px;
        ">

          <h2>
            ❌ Google Drive Authorization Failed
          </h2>

          <p>
            ${error.message}
          </p>

          <p>
            Check the server console for more details.
          </p>

        </body>

      </html>
    `);
  }
});

// ============================================================
// GET /api/auth/drive-status
// Check Google Drive Parent Folder Access
// ============================================================

router.get("/drive-status", auth, async (req, res) => {
  try {
    const result = await driveService.checkParentFolderAccess();

    res.json({
      configured: result.configured,

      accessible: result.success,

      folderName: result.folder?.name || null,

      message: result.message || (result.success
        ? "Google Drive parent folder is accessible."
        : "Google Drive parent folder is not accessible."),
    });
  } catch (error) {
    console.error("❌ Drive status error:", error);

    res.status(500).json({
      configured: false,

      accessible: false,

      folderName: null,

      message: "Unable to check Google Drive status.",

      error: error.message,
    });
  }
});

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
