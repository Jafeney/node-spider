/**
 * @desc 爬取爱帮网的数据
 * @author Jafeney
 * @datetime 2016-09-15
 **/

var fs = require('fs')

var request = require('request')

var http = require('http')

var cheerio = require('cheerio')

var _ = require('../util')

var getAllNailData = function (startPage, endPage) {
  var promises = []; var arr = []
  for (var i = startPage; i <= endPage; i++) {
    promises.push(i)
  }
  promises = promises.map(item => getNailData(item))
  return Promise.all(promises)
    .then(data => Promise.resolve(data))
    .catch(err => Promise.reject(err))
}

var getNailData = function (page) {
  var URL = 'http://www.aibang.com/hangzhou/meijia/p' + page
  return new Promise(function (resolve, reject) {
    request(URL, function (err, res, body) {
      if (!err && res.statusCode === 200) {
        var $ = cheerio.load(body)

        var list = $('#bizshow').find('.cell')

        var len = list.length

        var i = 1

        var arr = []
        for (i; i < len; i++) {
          var item = list.eq(i)
          var text = item.find('.part1').find('p')
          try {
            arr.push({
              img: item.find('.imgvc').find('img').attr('src'),
              name: item.find('h4').find('a').text(),
              address: text.eq(0).text().split('：')[1],
              phone: text.eq(1).find('.biztel').text().split('：')[1],
              category: text.eq(2).find('a').text()
            })
          } catch (e) {
            throw (e)
          }
        }
        resolve(arr)
      } else {
        reject(err)
      }
    })
  })
}

module.exports = {
  getAllNailData: getAllNailData
}
