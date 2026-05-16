/**
 * VULNERABILITY: Hardcoded Credentials (CWE-798)
 *
 * API keys, database passwords, and JWT secrets are embedded directly
 * in source code. Anyone with read access to the repo (or the compiled
 * bundle) can extract them. Once leaked to git history, rotation is the
 * only remedy.
 *
 * Severity: HIGH
 */

const express = require("express");
const app = express();

// ❌ VULNERABLE: secrets committed to source control
const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
const AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
const DB_PASSWORD = "SuperSecret123!";
const JWT_SECRET = "my-jwt-signing-key-do-not-share";
const STRIPE_API_KEY = "sk_live_EXAMPLE_KEY_DO_NOT_USE";

app.get("/charge", (req, res) => {
  // Uses the hardcoded Stripe key directly
  const stripe = require("stripe")(STRIPE_API_KEY);
  // ...
});

module.exports = { AWS_ACCESS_KEY, DB_PASSWORD, JWT_SECRET };
