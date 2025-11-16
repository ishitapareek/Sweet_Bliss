const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = "donutSecret";

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.json({ status: "error", msg: "Email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name, email, passwordHash, cart: [] });

  res.json({ status: "ok" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.json({ status: "error", msg: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.json({ status: "error", msg: "Invalid credentials" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET);
  res.json({ status: "ok", token });
});

module.exports = router;
