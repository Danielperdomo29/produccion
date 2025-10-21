// middlewares/sanitize.js
const xss = require("xss");

/**
 * sanitizeBody(fields) => middleware that sanitizes listed fields in req.body
 */
function sanitizeBody(fields = []) {
  return (req, res, next) => {
    if (!req.body) return next();
    for (const f of fields) {
      if (typeof req.body[f] === "string") {
        req.body[f] = xss(req.body[f], { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ["script"] });
      }
    }
    next();
  };
}

module.exports = { sanitizeBody };
