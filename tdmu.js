// Write Javascript code here
const axios = require('axios');
const cheerio = require('cheerio');

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
        let name = $(this).find('div.row > div.col-lg-12 > h4.new_item_title > a').text();
        let link = $(this).find('div.row > div.col-lg-12 > h4.new_item_title > a').attr('href');
        let img = encodeURI($(this).find('div.row > div.col-lg-12 > img.new_item_img').attr('src'));
        let desc = $(this).find('div.row > div.col-lg-12 > span.new_item_desc').text();
        let timeAndView = $(this).find('div.row > div.col-lg-12 > span.new_item_time').text().trim();

        let _timeAndView = timeAndView.split(' —  ');
        let time = _timeAndView[0];
        let view = _timeAndView[1];

        let _link = link.split('/');
        let cat = _link[2];
        let id = _link[3];

        let news_item = {
            name: name,
            desc: desc,
            img: img,
            link: link,
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

module.exports.getNewsTDMU = getNewsTDMU;
module.exports.getNewsTDMUById = getNewsTDMUById;