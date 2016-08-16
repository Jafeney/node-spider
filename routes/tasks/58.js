/**
 * @desc 爬取58同城的数据
 * @author Jafeney
 * @datetime 2016-08-15
 **/

var fs = require('fs'),
    request = require('request'),
    cheerio = require('cheerio');


var getAllCitys = function() {
    return new Promise(function(resolve, reject) {
        request('http://www.58.com/changecity.aspx', function(err, res, body) {
            if(!err && res.statusCode === 200) {
                var $ = cheerio.load(body),
                    citys = $('#clist').find('a'),
                    len = citys.length,
                    i = 0,
                    arr = [];
                while(i < len) {
                    var item = citys.eq(i);
                    arr.push({
                        name: item.text(),
                        link: item.attr('href')
                    });
                    i++;
                }
                resolve(arr)
            } else {
                reject(err)
            }
        })
    })
}

var getURL = function(url, type) {
    return new Promise(function(resolve, reject) {
        request(url, function(err, res, body) {
            if (!err && res.statusCode === 200) {
                var $ = cheerio.load(body),
                    company = $('.companyName'),
                    name = company.text(),
                    url = company.attr('href');
                resolve({
                    type: type,
                    company: name,
                    url: url
                })
            } else {
                reject(err)
            }
        })
    })
}

module.exports = { getAllCitys: getAllCitys, getURL: getURL }
