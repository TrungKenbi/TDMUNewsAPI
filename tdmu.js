// Write Javascript code here
const axios = require('axios');
const cheerio = require('cheerio');

const TDMU_BASE_URL = 'https://tdmu.edu.vn';

async function cURL(url)
{
    return axios.get(url)
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
        URL = "https://tdmu.edu.vn/News/_PartialLoad?start=" + startID + "&idloaibd=" + category;

    let res = await cURL(URL);
    if (res.status != 200)
        return news;

    let $ = await cheerio.load(res.data);
    $('body > div.new_item').each(function (index) {
        let name = $(this).find('div.col-lg-6 > h4.new_item_title > a').text();
        let link = $(this).find('div.col-lg-6 > h4.new_item_title > a').attr('href');
        let img = $(this).find('div.col-lg-6 > img.new_item_img').attr('src');
        let desc = $(this).find('div.col-lg-6 > span.new_item_desc').text();
        let timeAndView = $(this).find('div.col-lg-6 > span.new_item_time').text().trim();

        let _timeAndView = timeAndView.split(' —  ');
        let time = _timeAndView[0];
        let view = _timeAndView[1];

        let _link = link.split('/');
        let cat = _link[2];
        let id = _link[3];
		
		img = img.replace('184x115_goc_', '');

        let news_item = {
            name: name,
            desc: desc,
            img: TDMU_BASE_URL + img,
            link: TDMU_BASE_URL + link,
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
    let _newsId = newsId.split('|');
    let category = _newsId[0];
    let nameNews = _newsId[1];

    var URL = "https://tdmu.edu.vn/tin-tuc/" + category + "/" + nameNews;

    let res = await cURL(URL);
    if (res.status != 200)
        return news;

    let $ = await cheerio.load(res.data, {
        normalizeWhitespace: true,
        xmlMode: true
    });
    const title = $('div.nd-tintuc-phai > h2').text();
    const content = $('div.noidungbaidang').html();
    const time_view = $('#renderBody > div > div > div:nth-child(2) > div.col-xs-12.col-sm-9.col-md-9.nd-tintuc-phai > span').text().trim();


    let _time_view = time_view.split(' &mdash;  ');
    let time = _time_view[0];
    let view = _time_view[1];

    return {
        title: title,
        time: time,
        view: view,
        content: content
    };
}


async function getTKB(user) {
    let schedule = [];
    let URL = "https://dkmh.tdmu.edu.vn/default.aspx?page=thoikhoabieu&sta=0&id=" + user;

    let res = await cURL(URL);
    if (res.status != 200)
        return schedule;

    let $ = await cheerio.load(res.data);
	
	let contentStudent = $('#ctl00_ContentPlaceHolder1_ctl00_lblContentTenSV').text().split('-');

	let ele = $('#ctl00_ContentPlaceHolder1_ctl00_lblContentLopSV');
	
	let classStudent;
	
	if (ele)
		classStudent = $('#ctl00_ContentPlaceHolder1_ctl00_lblContentLopSV').text().split('-');
	else
		classStudent = ['', '', '', ''];

	let parentTable = $('#ctl00_ContentPlaceHolder1_ctl00_Table1').children('tbody').children();
	
	parentTable.map(function(){
		$(this).children().map(function(){
			let element = $(this).attr('onmouseover');
			if (element){
				let item = element.split(`','`);
				let startPeriod = parseInt(item[6]);
				let numberOfPeriods = parseInt(item[7]);
				schedule.push({
					subjectName: item[1].split('(')[0].trim(),
					SubjectCode: item[2],
					dayOfWeekVi: item[3],
					dayOfWeek: dayOfWeekViToNum(item[3]),
					roomName: item[5],
					teacherName: item[8],
					timeStart: startPeriod,
					timeStop: startPeriod + numberOfPeriods - 1,
				});
			}
		});              
	});
	
	schedule.sort(function(a, b) {
		if (a.dayOfWeek === 0)
			return 1;
		if (b.dayOfWeek === 0)
			return -1;
		return a.dayOfWeek - b.dayOfWeek;
	});

	let result = {
		studentInfo: {
			id: user,
			name: contentStudent[0].trim(),
			birthday: contentStudent.length > 1 ? contentStudent[1].split(':')[1] : '',
			class: classStudent.length > 0 ? classStudent[0].trim() : '',
			major: classStudent.length > 1 ? classStudent[1].split(':')[1].trim() : '',
			department: classStudent.length > 2 ? classStudent[2].split(':')[1].trim() : ''
		},
		timetable: schedule
	};
	return result;
}


function dayOfWeekViToNum (dayOfWeekVi)
{
    switch (dayOfWeekVi) {

        case 'Thứ Hai':
            return 1;

        case 'Thứ Ba':
            return 2;

        case 'Thứ Tư':
            return 3;

        case 'Thứ Năm':
            return 4;

        case 'Thứ Sáu':
            return 5;

        case 'Thứ Bảy':
            return 6;

        default:
        case 'Chủ Nhật':
            return 0;
    }
}

module.exports.getNewsTDMU = getNewsTDMU;
module.exports.getNewsTDMUById = getNewsTDMUById;
module.exports.getTKB = getTKB;