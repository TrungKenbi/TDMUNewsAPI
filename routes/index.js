var express = require("express");
var router = express.Router();

var tdmu = require("../tdmu");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "TDMU Unofficial API" });
});

router.get("/api/news", async (req, res) => {
  try {
    let startID = req.query.start && req.query.start >= 0 ? req.query.start : 0;
    let category = req.query.cat && req.query.cat > 0 ? req.query.cat : null;
    let news = await tdmu.getNewsTDMU(startID, category);
    res.json(news);
  } catch (error) {
    res.status(400).send(error);
    console.log(error);
  }
});

router.get("/api/news/:newsId", async (req, res) => {
  try {
    let news = await tdmu.getNewsTDMUById(req.params.newsId);
    res.json(news);
  } catch (error) {
    res.status(400).send(error);
    console.log(error);
  }
});

router.get("/api/student/:studentId", async (req, res) => {
  try {
    let schedule = await tdmu.getTKB(req.params.studentId);
    res.json(schedule);
  } catch (error) {
    res.status(400).send(error);
    console.log(error);
  }
});

router.get("/api/mark", async (req, res) => {
  let studentId = req.query.student_id;
  let password = req.query.password;
  try {
    let schedule = await tdmu.getMark(studentId, password);
    res.json(schedule);
  } catch (error) {
    res.status(400).send(error);
    console.log(error);
  }
});

module.exports = router;
