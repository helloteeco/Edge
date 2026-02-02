import crypto from "crypto";

// Secret key for signing tokens - in production, use environment variable
const SECRET_KEY = process.env.MAGIC_LINK_SECRET || "teeco-edge-magic-link-secret-2026";

interface TokenPayload {
  email: string;
  exp: number; // expiry timestamp
  iat: number; // issued at timestamp
}

// Create a signed magic link token
export function createMagicToken(email: string, expiresInMinutes: number = 15): string {
  const payload: TokenPayload = {
    email: email.toLowerCase(),
    exp: Date.now() + (expiresInMinutes * 60 * 1000),
    iat: Date.now(),
  };
  
  // Encode payload as base64
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  
  // Create signature
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payloadBase64)
    .digest("base64url");
  
  // Return token as payload.signature
  return `${payloadBase64}.${signature}`;
}

// Verify and decode a magic link token
export function verifyMagicToken(token: string): { valid: boolean; email?: string; error?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return { valid: false, error: "Invalid token format" };
    }
    
    const [payloadBase64, signature] = parts;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(payloadBase64)
      .digest("base64url");
    
    if (signature !== expectedSignature) {
      return { valid: false, error: "Invalid token signature" };
    }
    
    // Decode payload
    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf-8")
    );
    
    // Check expiry
    if (payload.exp < Date.now()) {
      return { valid: false, error: "Link has expired. Please request a new one." };
    }
    
    return { valid: true, email: payload.email };
  } catch (err) {
    console.error("Token verification error:", err);
    return { valid: false, error: "Invalid token" };
  }
}
