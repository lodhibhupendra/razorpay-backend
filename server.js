import express from "express";
import cors from "cors";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("✅ Razorpay Backend is running successfully!");
});

// ✅ Debug logs for environment variables (for testing on Render)
console.log("🔑 RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID);
console.log(
  "🔒 RAZORPAY_KEY_SECRET:",
  process.env.RAZORPAY_KEY_SECRET ? "✅ Loaded" : "❌ Missing"
);

// ✅ Create Razorpay order
app.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    // 🧠 Check env variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        error: "Razorpay credentials not configured properly on server.",
      });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount, // amount in paise
      currency,
      receipt,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    console.log("✅ Order created:", order.id);

    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error) {
    console.error("❌ Error creating Razorpay order:", error);
    res.status(500).json({
      error: "Failed to create order",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ✅ Verify Razorpay payment
app.post("/verify-payment", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing payment details" });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      console.log("✅ Payment verified successfully");
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      console.error("❌ Invalid payment signature");
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("❌ Verification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
