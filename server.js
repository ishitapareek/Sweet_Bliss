require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Public folder
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "sweetblisssecret",
    resave: false,
    saveUninitialized: false,
  })
);

// EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Mongodb connection
const client = new MongoClient(process.env.MONGO_URI);

let db, usersCollection, cartCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("sweet_bliss");
    usersCollection = db.collection("auth");
    cartCollection = db.collection("cart");
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}
connectDB();

// ===================== MIDDLEWARE: PASS USER TO VIEWS =====================
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// =========================== ROUTES ===============================

// ---------- Home ----------
app.get("/", (req, res) => {
  res.render("home", { title: "Sweet Bliss – Home" });
});

// ---------- Menu ----------
app.get("/menu", (req, res) => {
  res.render("menu", { title: "Menu" });
});

// ---------- About ----------
app.get("/about", (req, res) => {
  res.render("about", { title: "About Us" });
});

// ---------- Auth ----------
app.get("/auth", (req, res) => {
  res.render("auth", { title: "Login | Signup" });
});

// ---------- Cart ----------
app.get("/cart", (req, res) => {
  res.render("cart", { title: "Cart | Shop" });
});
// ---------- Profile ----------
app.get("/profile", (req, res) => {
  if (!req.session.user) return res.redirect("/auth");
  res.render("profile", { title: "Your Profile" });
});

// ============= AUTH API =============

// Signup
app.post("/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await usersCollection.findOne({ email });
  if (userExists)
    return res.json({ success: false, message: "Email already exists" });

  const result = await usersCollection.insertOne({
    name,
    email,
    password,
    createdAt: new Date(),
  });

  req.session.user = {
    _id: result.insertedId,
    name,
    email,
  };

  res.json({ success: true });
});

// Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await usersCollection.findOne({ email, password });

  if (!user)
    return res.json({ success: false, message: "Invalid email or password" });

  req.session.user = {
    _id: user._id,
    name: user.name,
    email: user.email,
  };

  res.json({ success: true });
});

// Logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ===================== CART API =====================

// Get user's cart
app.get("/api/cart", async (req, res) => {
  if (!req.session.user) return res.status(401).json([]);

  const userId = req.session.user._id;

  const cart = await cartCollection.findOne({ userId });

  res.json(cart ? cart.items : []);
});

// Add to cart
app.post("/api/cart/add", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ success: false, message: "Login required" });

  const userId = req.session.user._id;
  const { name, price, image } = req.body;

  let cart = await cartCollection.findOne({ userId });

  if (!cart) {
    await cartCollection.insertOne({
      userId,
      items: [{ name, price, image, quantity: 1 }],
    });
  } else {
    const existingItem = cart.items.find((item) => item.name === name);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({ name, price, image, quantity: 1 });
    }

    await cartCollection.updateOne(
      { userId },
      { $set: { items: cart.items } }
    );
  }

  res.json({ success: true });
});

// Update quantity
app.post("/api/cart/update", async (req, res) => {
  if (!req.session.user) return res.sendStatus(401);

  const { name, quantity } = req.body;
  const userId = req.session.user._id;

  const cart = await cartCollection.findOne({ userId });

  if (!cart) return res.sendStatus(404);

  const item = cart.items.find((i) => i.name === name);
  if (!item) return res.sendStatus(404);

  item.quantity = quantity;

  await cartCollection.updateOne(
    { userId },
    { $set: { items: cart.items } }
  );

  res.json({ success: true });
});

// Remove item
app.delete("/api/cart/item", async (req, res) => {
  if (!req.session.user) return res.sendStatus(401);

  const { name } = req.body;
  const userId = req.session.user._id;

  const cart = await cartCollection.findOne({ userId });
  if (!cart) return res.sendStatus(404);

  const updatedItems = cart.items.filter((i) => i.name !== name);

  await cartCollection.updateOne(
    { userId },
    { $set: { items: updatedItems } }
  );

  res.json({ success: true });
});

// Clear entire cart
app.delete("/api/cart", async (req, res) => {
  if (!req.session.user) return res.sendStatus(401);

  const userId = req.session.user._id;

  await cartCollection.updateOne(
    { userId },
    { $set: { items: [] } }
  );

  res.json({ success: true });
});

// ---------------- SERVER LISTEN ----------------
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on http://localhost:" + (process.env.PORT || 3000));
});