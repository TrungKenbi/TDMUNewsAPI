const axios = require("axios").default;
const cheerio = require("cheerio");
const axiosCookieJarSupport = require("axios-cookiejar-support").default;
const tough = require("tough-cookie");
const qs = require("qs");
const utils = require("./utils");
const util = require('util')

const TDMU_BASE_URL = "https://dkmh.tdmu.edu.vn";
const transport = axios.create({
  baseURL: TDMU_BASE_URL,
  timeout: 1000,
  withCredentials: true,
});

async function cURL(url) {
  return axios
    .get(url)
    .then(function (response) {
      // handle success
      return response;
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    });
}

async function getNewsTDMU(startID = 0, category = null) {
  var news = [];
  var URL = "https://tdmu.edu.vn/News/_PartialLoadIndex?start=" + startID;
  if (category)
    URL =
      "https://tdmu.edu.vn/News/_PartialLoad?start=" +
      startID +
      "&idloaibd=" +
      category;

  let res = await cURL(URL);
  if (res.status != 200) return news;

  let $ = await cheerio.load(res.data);
  $("body > div.new_item").each(function (index) {
    let name = $(this).find("div.col-lg-6 > h4.new_item_title > a").text();
    let link = $(this)
      .find("div.col-lg-6 > h4.new_item_title > a")
      .attr("href");
    let img = $(this).find("div.col-lg-6 > img.new_item_img").attr("src");
    let desc = $(this).find("div.col-lg-6 > span.new_item_desc").text();
    let timeAndView = $(this)
      .find("div.col-lg-6 > span.new_item_time")
      .text()
      .trim();

    let _timeAndView = timeAndView.split(" —  ");
    let time = _timeAndView[0];
    let view = _timeAndView[1];

    let _link = link.split("/");
    let cat = _link[2];
    let id = _link[3];

    img = img.replace("184x115_goc_", "");

    let news_item = {
      name: name,
      desc: desc,
      img: 'https://tdmu.edu.vn' + img,
      link: 'https://tdmu.edu.vn' + link,
      time: time,
      view: view,
      cat_name: cat,
      id_name: id,
    };
    news.push(news_item);
  });
  return news;
}

async function getNewsTDMUById(newsId) {
  let _newsId = newsId.split("|");
  let category = _newsId[0];
  let nameNews = _newsId[1];

  var URL = "https://tdmu.edu.vn/tin-tuc/" + category + "/" + nameNews;

  let res = await cURL(URL);
  if (res.status != 200) return news;

  let $ = await cheerio.load(res.data, {
    normalizeWhitespace: true,
    xmlMode: true,
  });
  const title = $("div.nd-tintuc-phai > h2").text();
  let content = $("div.noidungbaidang").html();

  content = content.replace(/<\s*img [^\>]*src\s*=\s*([\"|\'])(.*?)[\"|\'][^']*?>/gi, "<img src=\"https://tdmu.edu.vn\$2\">");

  const time_view = $(
    "#renderBody > div > div > div:nth-child(2) > div.col-xs-12.col-sm-9.col-md-9.nd-tintuc-phai > span"
  )
    .text()
    .trim();

  let _time_view = time_view.split(" &mdash;  ");
  let time = _time_view[0];
  let view = _time_view[1];

  return {
    title: title,
    time: time,
    view: view,
    content: content,
  };
}

async function getTKB(user) {
  let schedule = [];
  let URL =
    "https://dkmh.tdmu.edu.vn/default.aspx?page=thoikhoabieu&sta=0&id=" + user;

  let res = await cURL(URL);
  if (res.status != 200) return schedule;

  let $ = await cheerio.load(res.data);

  let contentStudent = $("#ctl00_ContentPlaceHolder1_ctl00_lblContentTenSV")
    .text()
    .split("-");

  let ele = $("#ctl00_ContentPlaceHolder1_ctl00_lblContentLopSV");

  let classStudent;

  if (ele)
    classStudent = $("#ctl00_ContentPlaceHolder1_ctl00_lblContentLopSV")
      .text()
      .split("-");
  else classStudent = ["", "", "", ""];

  let parentTable = $("#ctl00_ContentPlaceHolder1_ctl00_Table1")
    .children("tbody")
    .children();

  parentTable.map(function () {
    $(this)
      .children()
      .map(function () {
        let element = $(this).attr("onmouseover");
        if (element) {
          let item = element.split(`','`);
          let startPeriod = parseInt(item[6]);
          let numberOfPeriods = parseInt(item[7]);
          schedule.push({
            subjectName: item[1].split("(")[0].trim(),
            SubjectCode: item[2],
            dayOfWeekVi: item[3],
            dayOfWeek: utils.dayOfWeekViToNum(item[3]),
            roomName: item[5],
            teacherName: item[8],
            timeStart: startPeriod,
            timeStop: startPeriod + numberOfPeriods - 1,
          });
        }
      });
  });

  schedule.sort(function (a, b) {
    if (a.dayOfWeek === 0) return 1;
    if (b.dayOfWeek === 0) return -1;
    return a.dayOfWeek - b.dayOfWeek;
  });

  let result = {
    studentInfo: {
      id: user,
      name: contentStudent[0].trim(),
      birthday:
        contentStudent.length > 1 ? contentStudent[1].split(":")[1] : "",
      class: classStudent.length > 0 ? classStudent[0].trim() : "",
      major:
        classStudent.length > 1 ? classStudent[1].split(":")[1].trim() : "",
      department:
        classStudent.length > 2 ? classStudent[2].split(":")[1].trim() : "",
    },
    timetable: schedule,
  };
  return result;
}

async function getMark(studentCode, password) {
  return getSession(studentCode, password);
}

async function getExam(studentCode, password) {
	let exams = [];

  axiosCookieJarSupport(axios);
  const cookieJar = new tough.CookieJar();

  let viewState = "";
  let viewStateGenerator = "";

  await axios
    .get("https://dkmh.tdmu.edu.vn/", {
      jar: cookieJar,
      withCredentials: true,
    })
    .then(async (response) => {
      let $ = await cheerio.load(response.data, {
        normalizeWhitespace: true,
        xmlMode: true,
      });

      viewState = $("#__VIEWSTATE").val();
      viewStateGenerator = $("#__VIEWSTATEGENERATOR").val();

      let dataForm = qs.stringify({
        '__VIEWSTATE': viewState,
        '__VIEWSTATEGENERATOR': viewStateGenerator,
        'ctl00$ContentPlaceHolder1$ctl00$ucDangNhap$txtTaiKhoa': studentCode,
        'ctl00$ContentPlaceHolder1$ctl00$ucDangNhap$txtMatKhau': password,
        'ctl00$ContentPlaceHolder1$ctl00$ucDangNhap$btnDangNhap': "Đăng Nhập",
      });

      await axios
        .post("https://dkmh.tdmu.edu.vn/default.aspx", dataForm, {
          headers: {
            'accept':
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            'content-type': "application/x-www-form-urlencoded",
          },
          jar: cookieJar,
          withCredentials: true,
        })
        .then(async (res) => {
          $ = await cheerio.load(res.data, {
            normalizeWhitespace: true,
            xmlMode: true,
          });


          await axios
            .get(
              "https://dkmh.tdmu.edu.vn/Default.aspx?page=xemlichthi",
              {
                jar: cookieJar,
                withCredentials: true,
              }
            )
            .then(async (res) => {
              $ = await cheerio.load(res.data, {
                normalizeWhitespace: true,
                xmlMode: true,
              });
			  
			// LAY DIEM KIEM TRA
				
			let parentTable = $("#ctl00_ContentPlaceHolder1_ctl00_gvXem").children();

			parentTable.map(function () {
				let row = [];
				$(this).children('td').map(function (index, element) {
					row.push($(this).text().trim());
				});

				let exam = {
					id: row[1],
					name: row[2],
					group: row[3],
					num: row[4],
					day: row[5],
					time: row[6],
					minutes: row[7],
					room: row[8],
					type: row[9],
				};

				exams.push(exam);
			});
			// END LAY DIEM KIEM TRA

            });




        });
    });

	return exams.slice(1);
  }

async function getSession(username, password) {
	let marks = [];

  axiosCookieJarSupport(axios);
  const cookieJar = new tough.CookieJar();

  let viewState = "";
  let viewStateGenerator = "";

  await axios
    .get("https://dkmh.tdmu.edu.vn/", {
      jar: cookieJar,
      withCredentials: true,
    })
    .then(async (response) => {
      let $ = await cheerio.load(response.data, {
        normalizeWhitespace: true,
        xmlMode: true,
      });

      viewState = $("#__VIEWSTATE").val();
      viewStateGenerator = $("#__VIEWSTATEGENERATOR").val();

      let dataForm = qs.stringify({
        '__VIEWSTATE': viewState,
        '__VIEWSTATEGENERATOR': viewStateGenerator,
        'ctl00$ContentPlaceHolder1$ctl00$ucDangNhap$txtTaiKhoa': username,
        'ctl00$ContentPlaceHolder1$ctl00$ucDangNhap$txtMatKhau': password,
        'ctl00$ContentPlaceHolder1$ctl00$ucDangNhap$btnDangNhap': "Đăng Nhập",
      });

      await axios
        .post("https://dkmh.tdmu.edu.vn/default.aspx", dataForm, {
          headers: {
            'accept':
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            'content-type': "application/x-www-form-urlencoded",
          },
          jar: cookieJar,
          withCredentials: true,
        })
        .then(async (res) => {
          $ = await cheerio.load(res.data, {
            normalizeWhitespace: true,
            xmlMode: true,
          });


          await axios
            .get(
              "https://dkmh.tdmu.edu.vn/Default.aspx?page=xemdiemthi",
              // dataForm,
              {
                headers: {
                  accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                  	"content-type": "application/x-www-form-urlencoded",
                },
                jar: cookieJar,
                withCredentials: true,
              }
            )
            .then(async (res) => {
              $ = await cheerio.load(res.data, {
                normalizeWhitespace: true,
                xmlMode: true,
              });
			  




			  dataForm = qs.stringify({
				'__EVENTTARGET': 'ctl00$ContentPlaceHolder1$ctl00$lnkChangeview2',
				'__EVENTARGUMENT':  '',
				'__LASTFOCUS': '',
				'__VIEWSTATE': $("#__VIEWSTATE").val(),
				'__VIEWSTATEGENERATOR': $("#__VIEWSTATEGENERATOR").val(),
				'ctl00$ContentPlaceHolder1$ctl00$txtChonHK': ''
			  });
	
			  await axios
				.post(
				  "https://dkmh.tdmu.edu.vn/Default.aspx?page=xemdiemthi",
				  dataForm,
				  {
					headers: {
					  accept:
						"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
						  "content-type": "application/x-www-form-urlencoded",
					},
					jar: cookieJar,
					withCredentials: true,
				  }
				)
				.then(async (resXemDiem) => {
				  $ = await cheerio.load(resXemDiem.data, {
					normalizeWhitespace: true,
					xmlMode: true,
				  });

				  // LAY DIEM KIEM TRA
	
				  	let parentTable = $("#ctl00_ContentPlaceHolder1_ctl00_div1")
						.children("table")
						.children('tr.row-diem');

					parentTable.map(function () {
						const clearWhiteSpace = (inputText) => {
							temp = inputText.replace('&nbsp;', '');
							return temp.replace('DT', 'Đạt');
						}

						let row = [];
						$(this).children('td').map(function (index, element) {
							row.push($(this).text().trim());
							// console.log(index, $(this).text().trim());
						});

						let mark = {
							id: row[1],
							name: row[2],
							mPoint: clearWhiteSpace(row[7]),
							ePoint: clearWhiteSpace(row[8]),
							avgPoint: clearWhiteSpace(row[10]),
						};

						marks.push(mark);
					});
				  // END LAY DIEM KIEM TRA
				  
				})
				.catch(function (error) {
				  // handle error
				  console.log(error);
				});







            });




        });
    });

	return marks;
}

module.exports.getNewsTDMU = getNewsTDMU;
module.exports.getNewsTDMUById = getNewsTDMUById;
module.exports.getTKB = getTKB;
module.exports.getMark = getMark;
module.exports.getExam = getExam;
