/**
 * @desc 爬取ic98的物流信息
 * @author Jafeney
 * @datetime 2016-08-15
 **/

var fs = require('fs')

var cheerio = require('cheerio')

var iconv = require('iconv-lite')

var install = require('superagent-charset')

var request = require('superagent')

const IC98_PATH = './data/ic98.json'
const RELDATA_PATH = './data/relData.json'

var pad = function (number, length, pos) {
  var str = '%' + number
  while (str.length < length) {
    // 向右边补0
    if (pos === 'r') {
      str = str + '0'
    } else {
      str = '0' + str
    }
  }
  return str
}

var toHex = function (chr, padLen) {
  if (padLen == null) {
    padLen = 2
  }
  return pad(chr.toString(16), padLen)
}

var chinese2Gb2312 = function (data) {
  var gb2312 = iconv.encode(data.toString('UCS2'), 'GB2312')
  var gb2312Hex = ''
  for (var i = 0; i < gb2312.length; ++i) {
    gb2312Hex += toHex(gb2312[i])
  }
  return gb2312Hex.toUpperCase()
}

var getIC98Init = function (page) {
  return new Promise(function (resolve, reject) {
    var url = 'http://www.ic98.com/company/v4604/' + page + '/'
    	var superagent = install(request)
    console.log('开始获取' + url + '...')
    	superagent.get(url).charset('gb2312').end(function (err, response) {
    		if (err) {
        reject(err)
      } else {
        var $ = cheerio.load(response.text, { decodeEntities: false })
        var contentList = $('.products.f')
        var dataList = []
        for (var i = 0; i < contentList.length; i++) {
          var content = {}
          var _node = contentList.eq(i).find('.tab_ss1_l').find('a')
          if (_node.text().indexOf('物流') > 0 && _node.attr('href').indexOf('ic98') > 0) {
            content.company = _node.text()
            content.link = _node.attr('href')
            dataList.push(content)
          }
        }
        // 合并数据到 json
        var source = JSON.parse(fs.readFileSync(IC98_PATH))
        source = source.concat(dataList)
        resolve(source)
      }
    	})
  })
}

var getIC98Deep = function (item) {
  return new Promise(function (resolve, reject) {
    var obj = {}
    obj.company = item.company
    var superagent = install(request)
    console.log('开始爬取' + item.link + '...')
    superagent.get(item.link).charset('gb2312').end(function (err, response) {
      // 一旦出现错误结束操作并对外抛出异常
      if (err) {
        reject(err)
      } else if (response) {
        var $ = cheerio.load(response.text, { decodeEntities: false })
        if (item.link.indexOf('http://www.ic98.com/') >= 0) {
          var content = $('.m_xq_mid').find('ul').eq(0).find('li')
          obj.address = content.eq(4).text().split('：')[1]
          var _tel = content.eq(2).find('img').attr('src')
          obj.info = {
            telphone: '',
            fax: '',
            mobilephone: '',
            email: content.eq(5).text().split('：')[1]
          }
          obj.name = content.eq(0).find('strong').text()
        } else {
          var content = $('.mp7')
          obj.address = content.eq(0).text()
          obj.info = {
            telphone: content.eq(1).text(),
            fax: content.eq(2).text(),
            mobilephone: content.eq(4).text(),
            email: ''
          }
          obj.name = $('.mp4').find('.mtext').text()
        }
        // 在原有的基础上组合成新的json数据
        var source = JSON.parse(fs.readFileSync(RELDATA_PATH))
        source.push(obj)
        // 结束并对外传递
        resolve(source)
      } else {
        // .... 什么都不做
      }
    })
  })
}

module.exports = {
  getIC98Init: getIC98Init,
  getIC98Deep: getIC98Deep
}
