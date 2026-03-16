import jwt from "jsonwebtoken";

const generateToken = (payload, res) => {
  // const expiresIn = parseInt(process.env.JWT_EXPIRES_IN);
  const secret = process.env.JWT_SECRET;
  const token = jwt.sign(payload, secret, {    expiresIn: "7d", });

  res.cookie("token", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // millisecond to 7 days
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return token;
};

export { generateToken };
