const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const CREDENTIALS_PATH = path.join(
  __dirname,
  "../../credentials/oauth-client.json",
);

const TOKEN_PATH = path.join(
  __dirname,
  "../../credentials/google-drive-token.json",
);

const REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT_URI ||
  "http://localhost:5000/api/auth/google/callback";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

function loadOAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`OAuth credentials file not found: ${CREDENTIALS_PATH}`);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

  const config = credentials.web || credentials.installed || credentials;

  if (!config.client_id || !config.client_secret) {
    throw new Error(
      "Invalid OAuth credentials: client_id/client_secret missing.",
    );
  }

  return new google.auth.OAuth2(
    config.client_id,
    config.client_secret,
    REDIRECT_URI,
  );
}

function getAuthorizationUrl() {
  const oauth2Client = loadOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPES,
    include_granted_scopes: true,
  });
}

async function handleOAuthCallback(code) {
  const oauth2Client = loadOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf8");

  console.log("✅ Google Drive OAuth authorization successful.");
  console.log(`✅ Token saved to: ${TOKEN_PATH}`);

  return tokens;
}

function getAuthenticatedOAuthClient() {
  if (!fs.existsSync(TOKEN_PATH)) {
    return null;
  }

  const oauth2Client = loadOAuthClient();

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));

  oauth2Client.setCredentials(tokens);

  return oauth2Client;
}

function isOAuthConfigured() {
  return fs.existsSync(CREDENTIALS_PATH) && fs.existsSync(TOKEN_PATH);
}

module.exports = {
  getAuthorizationUrl,
  handleOAuthCallback,
  getAuthenticatedOAuthClient,
  isOAuthConfigured,
  TOKEN_PATH,
};
