const NodeCache = require("node-cache");
const counts = new NodeCache({ stdTTL: 60 });

module.exports = function rateLimiter(max = 200) {
  return (req, res, next) => {
    const key = `rl:${req.ip}`;
    const n = counts.get(key) || 0;
    if (n >= max) return res.status(429).json({ success: false, error: "Rate limit exceeded" });
    counts.set(key, n + 1);
    next();
  };
};
