/**
 * @desc 爬取56Top的数据
 * @author Jafeney
 * @datetime 2016-08-16
 **/

var fs = require('fs')

var cheerio = require('cheerio')

var iconv = require('iconv-lite')

var install = require('superagent-charset')

var request = require('superagent')

var _ = require('../util')

const RELDATA_PATH = './data/relData.json'

var get56Top = function () {
  return new Promise(function (resolve, reject) {
    console.log('开始爬取 http://www.56top.com ...')
    request('http://www.56top.com/queryLogisticsCompanyInfoPage.jspx', function (err, response, body) {
      if (!err && response.statusCode === 200) {
        var $ = cheerio.load(body) // 当前$相当于整个body的选择器
        var contentList = $('.contentList')
        var dataList = []

        for (var i = 0; i < contentList.length; i++) {
          var content = {}
          content.company = contentList.eq(i).find('h1').text()
          content.address = contentList.eq(i).find('.companyAdd').text()
          content.name = contentList.eq(i).find('h4').text().split('主营线路')[0]
          var info = contentList.eq(i).find('.placeInfo').text().split('\n')

          var temp = []
          info.forEach(function (item) {
            if (item) temp.push(_.trim(item))
          })
          info = temp.splice(0, 4)
          content.info = {
            mobilephone: info[0],
            telphone: info[2],
            fax: info[3],
            email: ''
          }
          dataList.push(content)
        }
        var source = JSON.parse(fs.readFileSync(RELDATA_PATH))
        source = source.concat(dataList)
        resolve(source)
      } else {
        reject(err)
      }
    })
  })
}

module.exports = get56Top
