/**
 * @desc 项目的路由
 * @author Jafeney
 * @datetime 2016-08-06
 **/

// 依赖的 node 模块
var express = require('express')

var fs = require('fs')

var _ = require('./util')

var router = express.Router()

// 任务
var task58 = require('./tasks/58')

var task56Top = require('./tasks/56top')

var taskAibang = require('./tasks/aibang')

var taskIC98 = require('./tasks/ic98')

// 全局变量
const IC98_PATH = './data/ic98.json'

const RELDATA_PATH = './data/relData.json'

const URL_PATH = './data/58_urls.json'

const DATA_PATH = './data/58_data.json'

const NAIL_PATH = './data/nail.json'

const COPY_PATH = './data/copy.json'

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: '基于Node的爬虫工具' })
})

/* GET 56Top page. */
router.get('/56top', function (req, res, next) {
  // 清空原有数据
  fs.writeFileSync(RELDATA_PATH, JSON.stringify([]))
  task56Top.get56Top().then(function (source) {
    fs.writeFileSync(RELDATA_PATH, JSON.stringify(source))
    var _res = _.unique(JSON.parse(fs.readFileSync(RELDATA_PATH)))
    var _length = _res.length
    res.send({
      message: '56Top的物流信息已经抓取完成!',
      length: _length,
      res: _res
    })
  }).catch(function (err) {
    console.log(err)
  })
})

/* GET http://www.ic98.com page. */
router.get('/ic98/init', function (req, res, next) {
  // 构造promises数组
  var promises = []
  for (var i = 1; i < 68; i++) {
    promises.push(i)
  }
  promises = promises.map(function (item) {
    return taskIC98.getIC98Init(item).then(function (source) {
      fs.writeFileSync(IC98_PATH, JSON.stringify(source))
    })
  })
  // 用all依次发出所有请求
  Promise.all(promises).then(function () {
    var _res = _.unique(JSON.parse(fs.readFileSync(IC98_PATH)))
    var ic98_length = _res.length
    res.send({
      message: 'ic98的物流信息初步抓取完成!',
      length: ic98_length,
      res: _res
    })
  }).catch(function (err) {
    console.log(err)
  })
})
router.get('/ic98/deep', function (req, res, next) {
  // 通过all依次发出所有请求
  var promises = JSON.parse(fs.readFileSync(IC98_PATH)).map(function (item) {
    return taskIC98.getIC98Deep(item).then(function (source) {
      fs.writeFileSync(RELDATA_PATH, JSON.stringify(source))
    })
  })
  Promise.all(promises).then(function () {
    var _res = _.unique(JSON.parse(fs.readFileSync(RELDATA_PATH)))
    var _length = _res.length
    res.send({
      message: 'ic98的物流信息深度抓取完成!',
      length: _length,
      res: _res
    })
  }).catch(function (err) {
    console.log(err)
  })
})

/* GET available data */
router.get('/data', function (req, res, next) {
  var source = _.unique(JSON.parse(fs.readFileSync(COPY_PATH)))
  var _length = source.length
  res.send({
    message: '物流信息抓取完成！',
    length: _length,
    res: source
  })
})

router.get('/latest', function (req, res, next) {
  var _promises = [firstStep, nextStep].map(function (item) {
    return item()
  })
  var firstStep = function () {
    return new Promise(function (resolve, reject) {
      fs.writeFileSync(RELDATA_PATH, JSON.stringify([])) // 清空
      var promises = JSON.parse(fs.readFileSync(IC98_PATH)).map(function (item) {
        return taskIC98.getIC98Deep(item).then(function (source) {
          fs.writeFileSync(RELDATA_PATH, JSON.stringify(source))
        })
      })
      Promise.all(promises).then(function () {
        resolve()
      }).catch(function (err) {
        reject(err)
      })
    })
  }
  var nextStep = function () {
    return new Promise(function (resolve, reject) {
      task56Top.get56Top().then(function (source) {
        fs.writeFileSync(RELDATA_PATH, JSON.stringify(source))
        resolve()
      }).catch(function (err) {
        reject(err)
      })
    })
  }
  Promise.all(_promises).then(function () {
    var _res = _.unique(JSON.parse(fs.readFileSync(RELDATA_PATH)))
    var _length = _res.length
    res.send({
      message: 'ic98的物流信息深度抓取完成!',
      length: _length,
      res: _res
    })
  }).catch(function (err) {
    console.log(err)
  })
})

// 爬取58同城的数据
router.get('/58/first', function (req, res, next) {
  var { firstStep } = task58
  firstStep()
    .then(function (data) {
      fs.writeFileSync(URL_PATH)
      res.send({
        data: data
      })
    })
    .catch(function (err) {
      console.log(err)
    })
})
router.get('/58/next', function (req, res, next) {
  var { nextStep } = task58
  nextStep()
    .then(function (data) {
      fs.writeFileSync(DATA_PATH, data)
      res.send({
        data: data
      })
    })
    .catch(function (err) {
      console.log(err)
    })
})

// 爬取爱网王的数据
router.get('/aibang', function (req, res, next) {
  var { getAllNailData } = taskAibang
  getAllNailData(1, 11).then(function (data) {
    var arr = []
    data.forEach(function (item) {
      arr = arr.concat(item)
    })
    fs.writeFileSync(NAIL_PATH, JSON.stringify(arr))
    res.send({ length: arr.length, data: arr })
  }).catch(function (err) {
    console.log(err)
  })
})

module.exports = router
