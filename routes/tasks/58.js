/**
 * @desc 爬取58同城的数据
 * @author Jafeney
 * @datetime 2016-08-15
 **/

var fs = require('fs'),
    request = require('request'),
    http = require('http'),
    cheerio = require('cheerio'),
    tesseract = require('node-tesseract'),
    gm = require('gm'),
    _ = require('../util');

const IMG_PATH = './data/img/';

/*获取所有的城市信息*/
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
                    arr.push({ name: item.text(),link: item.attr('href')});
                    i++;
                }
                resolve(arr)
            } else {
                reject(err)
            }
        })
    })
}

/*获取店铺的基本信息*/
var getBasicInfo = function(url, type) {
    return new Promise(function(resolve, reject) {
        request(url, function(err, res, body) {
            if (!err && res.statusCode === 200) {
                var $ = cheerio.load(body),
                    company = $('.companyName'),
                    name = company.text(),
                    url = company.attr('href');
                resolve({
                    type: type,
                    company: _.trim(name),
                    url: url
                })
            } else {
                reject(err)
            }
        })
    })
}

/*获取店铺的所有信息*/
var getCompeleteInfo = function(source) {
    return new Promise(function(resolve, reject) {
        request(source.url, function(err, res, body) {
            if (!err && res.statusCode === 200) {
                var $ = cheerio.load(body), img = '';
                try {
                    img = $('.basicMsgListo>li').eq(3).find('img').attr('src')
                } catch(err) {
                    reject(err)
                }
                if (!img) reject()
                source = Object.assign({img: img}, source)
                resolve(source)
            }
        })
    })
}

/*保存图片到本地*/
var saveImg = function(source) {
    return new Promise(function(resolve, reject) {
        http.get(source.img, function(res) {
            res.setEncoding('binary');
            var imageData = '';
            res.on('data', function(data) {
                imageData += data;
            }).on('end', function() {
                var timeStr = new Date().getTime();
                var path = IMG_PATH + timeStr + '.jpg';
                try {
                    fs.writeFileSync(path, imageData, 'binary');
                } catch(err) {
                    reject(err)
                }
                source.img = path;
                resolve(source)
            })
        })
    })
}

/*优化图片识别率*/
var processImg = function(source) {
    return new Promise(function(resolve, reject) {
        gm(source.img)
        .resize(400)
        // .threshold(68)
        .write(source.img, function(err) {
            if (err) return reject(err);
            resolve(source)
        })
    })
}

/*识别图片中的数字*/
var identifyImg = function(source, options) {
    options = Object.assign({
        l: 'deu',
        psm: 6,
        binary: '/usr/local/bin/tesseract'
    }, options);
    return new Promise(function(resolve, reject) {
        tesseract.process(source.img, options, function(err, txt) {
            if (err) reject(err);
            // source.phone = txt.replace(/[\r\n\s]/gm, '');
            source.phone = txt;
            resolve(source)
        })
    })
}

module.exports = {
    getAllCitys: getAllCitys,
    getBasicInfo: getBasicInfo,
    getCompeleteInfo: getCompeleteInfo,
    saveImg: saveImg,
    processImg: processImg,
    identifyImg: identifyImg,
}
