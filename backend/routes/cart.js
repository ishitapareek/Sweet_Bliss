const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = "donutSecret";

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.json({ status: "error", msg: "No token" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.json({ status: "error", msg: "Invalid token" });
    req.userId = decoded.id;
    next();
  });
}

router.get("/get", auth, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json(user.cart);
});

router.post("/add", auth, async (req, res) => {
  const { name, price, image } = req.body;

  const user = await User.findById(req.userId);
  const existing = user.cart.find(item => item.name === name);

  if (existing) existing.quantity++;
  else user.cart.push({ name, price, quantity: 1, image });

  await user.save();
  res.json({ status: "ok" });
});

router.post("/update", auth, async (req, res) => {
  const { name, quantity } = req.body;
  const user = await User.findById(req.userId);

  const item = user.cart.find(i => i.name === name);
  if (item) item.quantity = quantity;

  await user.save();
  res.json({ status: "ok" });
});

router.post("/remove", auth, async (req, res) => {
  const { name } = req.body;
  const user = await User.findById(req.userId);

  user.cart = user.cart.filter(i => i.name !== name);
  await user.save();

  res.json({ status: "ok" });
});

module.exports = router;