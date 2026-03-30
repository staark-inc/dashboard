import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.render("home", {
    title: "Staark Dashboard",
    message: "Merge cum trebuie."
  });
});

export default router;