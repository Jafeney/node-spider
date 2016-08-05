var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '基于Node的爬虫工具' });
});

/* GET 56Top page. */
router.get('/56top', function(req, res, next) {
    request('http://www.56top.com/queryLogisticsCompanyInfoPage.jspx', function(err,response,body) {
        if(!err && response.statusCode==200){
            $ = cheerio.load(body); //当前$相当于整个body的选择器
            var contentList = $('.contentList');
            var dataList = [];

            for (var i = 0; i < contentList.length; i++) {
                var content = {};
                content.company = contentList.eq(i).find('h1').text();
                content.address = contentList.eq(i).find('.companyAdd').text();
                content.name = contentList.eq(i).find('h4').text();
                var info = contentList.eq(i).find('.placeInfo').text().split('\n');

                var temp = [];
                info.forEach(function(item) {
                    if (!!item) temp.push(item.replace(/(^\s+)|(\s+$)/g,""));
                })
                info = temp.splice(0,4);

                content.info = {
                    mobilephone: info[0],
                    telphone: info[2],
                    fax: info[3],
                };

                dataList.push(content);
            }

            res.send({ res: dataList});
        }
    })
})


module.exports = router;
