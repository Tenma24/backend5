const Car = require("../models/Car");
const Review = require("../models/Review");
const User = require("../models/User");

// GET /api/stats
exports.getStats = async (req, res, next) => {
  try {
    // Count totals
    const totalCars = await Car.countDocuments();
    const totalReviews = await Review.countDocuments();
    const totalUsers = await User.countDocuments();

    // Calculate average rating
    const reviews = await Review.find();
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    // Get recent cars (last 5)
    const recentCars = await Car.find().sort({ createdAt: -1 }).limit(5);

    // Get top rated cars (cars with reviews avg >= 4)
    const allCars = await Car.find();
    const carsWithRatings = await Promise.all(
      allCars.map(async (car) => {
        const carReviews = await Review.find({ carId: car._id });
        const avgCarRating = carReviews.length > 0
          ? carReviews.reduce((sum, r) => sum + r.rating, 0) / carReviews.length
          : 0;
        return {
          ...car.toObject(),
          avgRating: avgCarRating,
          reviewCount: carReviews.length
        };
      })
    );

    const topRatedCars = carsWithRatings
      .filter(c => c.avgRating >= 4)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5);

    res.json({
      totalCars,
      totalReviews,
      totalUsers,
      avgRating: Number(avgRating),
      recentCars,
      topRatedCars
    });
  } catch (e) {
    next(e);
  }
};