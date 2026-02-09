const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function makeToken(user) {
  const secret = process.env.JWT_SECRET || "dev_secret";
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    secret,
    { expiresIn: "2h" }
  );
}

exports.register = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: "Bad Request", details: ["email and password (>=6) required"] });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already exists" });
    
    // ✅ FIX: Create the user with hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      email, 
      passwordHash: hashedPassword,
      role: "user"
    });
    
    return res.status(201).json({
      message: "Registered",
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (e) {
    next(e);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) return res.status(400).json({ error: "Bad Request" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = makeToken(user);
    return res.json({ token, role: user.role });
  } catch (e) {
    next(e);
  }
};

exports.makeAdmin = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Bad Request" });

    const user = await User.findOneAndUpdate({ email }, { role: "admin" }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User is now admin", user: { email: user.email, role: user.role } });
  } catch (e) {
    next(e);
  }
};