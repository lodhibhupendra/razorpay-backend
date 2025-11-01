const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// --- Razorpay setup ---
const razorpay = new Razorpay({
  key_id: process.env.RZP_KEY_ID,       // test key id
  key_secret: process.env.RZP_KEY_SECRET // test key secret
});

// --- Create order API ---
app.post("/create-order", async (req, res) => {
  try {
    const { amountRupees } = req.body;
    if (!amountRupees) return res.status(400).json({ error: "Amount missing" });

    const order = await razorpay.orders.create({
      amount: Math.round(amountRupees * 100), // paise
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RZP_KEY_ID,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

// --- Verify payment API ---
app.post("/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RZP_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true, message: "Payment verified" });
  } else {
    res.status(400).json({ success: false, message: "Invalid signature" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port", PORT));
