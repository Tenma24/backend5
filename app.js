const express = require("express");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const carRoutes = require("./routes/carRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const statsRoutes = require("./routes/statsRoutes");
const currencyRoutes = require("./routes/currencyRoutes"); // ✅ NEW!
const errorLogger = require("./middleware/errorLogger");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/api", (req, res) => {
  res.json({ 
    message: "Auto Dealership API is running", 
    version: "1.0.0",
    features: ["Auth", "Cars", "Reviews", "Stats", "Currency Converter"]
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/currency", currencyRoutes); // ✅ NEW!

// API 404
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// error middleware last
app.use(errorLogger);

module.exports = app;