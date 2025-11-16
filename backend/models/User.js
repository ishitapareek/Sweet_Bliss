const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  cart: [
    {
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ]
});

module.exports = mongoose.model("User", UserSchema);
