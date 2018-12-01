/**
 * @desc 爬取古诗的数据
 * @author Jafeney
 * @datetime 2016-09-15
 **/

var fs = require('fs')
var request = require('request')
var http = require('http')
var cheerio = require('cheerio')
var _ = require('../util')
const GS_PATH = '../../data/gs.json'

module.exports = {
  getData () {
    var URL = 'http://www.shicimingju.com/chaxun/list/26317.html'
    return new Promise(function (resolve, reject) {
      request(URL, function (err, res, body) {
        if (!err && res.statusCode === 200) {
          resolve([1, 2, 3, 4])
        } else {
          reject(err)
        }
      })
    })
  }
}
