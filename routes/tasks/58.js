/**
 * @desc 爬取58同城的数据
 * @author Jafeney
 * @dateTime 2016-08-15
 **/

var fs = require('fs')

var request = require('request')

var http = require('http')

var cheerio = require('cheerio')

var tesseract = require('node-tesseract')

var gm = require('gm')

var _ = require('../util')

const IMG_PATH = './public/images/'

const URL_PATH = './data/58_urls.json'

/* 获取所有的城市信息 */
var getAllCitys = function () {
  return new Promise(function (resolve, reject) {
    request('http://www.58.com/changecity.aspx', function (err, res, body) {
      if (!err && res.statusCode === 200) {
        var $ = cheerio.load(body)

        var citys = $('#clist').find('a')

        var len = citys.length

        var i = 0

        var arr = []
        while (i < len) {
          var item = citys.eq(i)
          arr.push({ name: item.text(), link: item.attr('href') })
          i++
        }
        resolve(arr)
      } else {
        reject(err)
      }
    })
  })
}

/* 获取店铺的基本信息 */
var getBasicInfo = function (url, type) {
  return new Promise(function (resolve, reject) {
    var obj = {}
    console.log(url)
    request(url, function (err, res, body) {
      if (!err && res.statusCode === 200) {
        var $ = cheerio.load(body)

        var company = $('.companyName')
        obj.category = type
        obj.name = company.text()
        obj.url = company.attr('href')
        console.log(obj)
        resolve(obj)
      } else {
        reject(err)
      }
    })
  })
}

/* 获取店铺的所有信息 */
var getCompeleteInfo = function (source) {
  return new Promise(function (resolve, reject) {
    request(source.url, function (err, res, body) {
      if (!err && res.statusCode === 200) {
        var $ = cheerio.load(body); var phone = ''; var contact = ''
        try {
          phone = $('.basicMsgListo>li').eq(3).find('img').attr('src')
          contact = $('.basicMsgListo>li').eq(1).text().replace(/[\r\n\s]|['联系人：']/g, '')
        } catch (err) {
          reject(err)
        }
        if (!phone) reject()
        source = Object.assign({ phone: phone, contact: contact }, source)
        delete source.url
        resolve(source)
      }
    })
  })
}

/* 保存图片到本地 */
var saveImg = function (source) {
  return new Promise(function (resolve, reject) {
    http.get(source.phone, function (res) {
      res.setEncoding('binary')
      var imageData = ''
      res.on('data', function (data) {
        imageData += data
      }).on('end', function () {
        var timeStr = new Date().getTime()
        var path = IMG_PATH + timeStr + '.jpg'
        try {
          fs.writeFileSync(path, imageData, 'binary')
        } catch (err) {
          reject(err)
        }
        source.phone = path
        resolve(source)
      })
    })
  })
}

/* 优化图片识别率 */
var processImg = function (source) {
  return new Promise(function (resolve, reject) {
    gm(source.img)
      .resize(400)
    // .threshold(68)
      .write(source.img, function (err) {
        if (err) return reject(err)
        resolve(source)
      })
  })
}

/* 识别图片中的数字 */
var identifyImg = function (source, options) {
  options = Object.assign({
    l: 'deu',
    psm: 6,
    binary: '/usr/local/bin/tesseract'
  }, options)
  return new Promise(function (resolve, reject) {
    tesseract.process(source.img, options, function (err, txt) {
      if (err) reject(err)
      // source.phone = txt.replace(/[\r\n\s]/gm, '');
      source.phone = txt
      resolve(source)
    })
  })
}

/* 获取每个类别需要爬取的页面 */
var getAllPages = function () {
  var page_num = 1
  // 默认爬取10页

  var categorys = ['美甲师', '美容师', '理发师', '健身师', '纤体瘦身师', '纹身师', '足疗按摩师', '育儿教育师', '口腔师']

  var arrs = []
  categorys.forEach(function (item) {
    arrs.push({
      key: item.replace('师', ''),
      url: 'http://hz.58.com/job/?key=' + item
    })
    for (var i = 2; i < page_num; i++) {
      arrs.push({
        key: item.replace('师', ''),
        url: 'http://hz.58.com/job/pn' + i + '/?key=' + item
      })
    }
  })
  return arrs
}

/* 根据页面中信息列表获取对应子页面的URL */
var getURL = function (page) {
  return new Promise(function (resolve, reject) {
    request(page.url, function (err, res, body) {
      if (!err && res.statusCode === 200) {
        var $ = cheerio.load(body)

        var source = $('a.t')

        var arrs = []
        Array.from(source).forEach(function (item, i) {
          var _url = source.eq(i).attr('href')
          _url && arrs.push(_url)
        })
        console.log(arrs)
        resolve(arrs)
      } else {
        reject(err)
      }
    })
  })
}

/* 第一步 */
var firstStep = function () {
  var promises = getAllPages().map(function (page) {
    return getURL(page)
  })
  return Promise.all(promises).then(function (data) {
    var arr = []
    data.forEach(function (item) {
      arr.concat(item)
    })
    console.log('爬取完成！')
    console.log(arr)
    return Promise.resolve(arr)
  })
}

/* 第二步 */
var nextStep = function () {
  var promises = JSON.parse(fs.readFileSync(URL_PATH)).map(function (item) {
    return new Promise(function (resolve, reject) {
      getBasicInfo(item.url, item.key)
        .then(getCompeleteInfo)
        .then(saveImg)
        .then(function (source) {
          var _port = process.env.PORT || '8888'
          source.phone = 'http://192.168.2.156:8888' + source.phone.replace('./public', '')
          resolve(source)
        })
        .catch(function (err) {
          reject(err)
        })
    })
  })
  return Promise.all(promises).then(function (data) {
    var arr = []
    data.forEach(function (item) {
      arr = arr.concat(item)
    })
    return Promise.resolve(arr)
  }).catch(function (err) {
    return Promise.reject(err)
  })
}

module.exports = {
  firstStep: firstStep,
  nextStep: nextStep
}
