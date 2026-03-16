import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";

const getAuthCookieOptions = () => ({
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  httpOnly: true,
  secure: isProduction,
  // Cross-site cookies are required when frontend and backend are on different domains (e.g., Render).
  sameSite: isProduction ? "none" : "lax",
});

const generateToken = (payload, res) => {
  // const expiresIn = parseInt(process.env.JWT_EXPIRES_IN);
  const secret = process.env.JWT_SECRET;
  const token = jwt.sign(payload, secret, { expiresIn: "7d" });

  res.cookie("token", token, getAuthCookieOptions());

  return token;
};

export { generateToken, getAuthCookieOptions };
