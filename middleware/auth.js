export function requireAuth(req, res, next) {
  if (!req.cookies?.accessToken) return res.redirect('/login');
  next();
}
