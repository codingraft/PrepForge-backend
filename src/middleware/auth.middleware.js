import jwt from "jsonwebtoken";
import Blacklist from "../models/blacklist.model.js";

export const authUser = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const isTokenBlacklisted = await Blacklist.findOne({ token });
  if (isTokenBlacklisted) {
    return res.status(401).json({ message: "Token is blacklisted" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    res.status(401).json({ message: "Token is not valid", error: err.message });
  }
};
 