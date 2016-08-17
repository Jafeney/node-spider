/**
 * @desc 项目的路由
 * @author Jafeney
 * @datetime 2016-08-06
 **/

// 依赖的 node 模块
var express = require('express'),
    fs = require('fs'),
    _ = require('./util'),
    router = express.Router();

// 任务
var task58 = require('./tasks/58'),
    task56Top = require('./tasks/56top'),
    taskIC98 = require('./tasks/ic98');

// 全局变量
const IC98_PATH = './data/ic98.json',
      RELDATA_PATH = './data/relData.json',
      COPY_PATH = './data/copy.json';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '基于Node的爬虫工具' });
});

/* GET 56Top page. */
router.get('/56top', function(req, res, next) {
    // 清空原有数据
    fs.writeFileSync(RELDATA_PATH, JSON.stringify([]));
    task56Top.get56Top().then(function(source) {
        fs.writeFileSync(RELDATA_PATH, JSON.stringify(source));
        var _res = _.unique(JSON.parse(fs.readFileSync(RELDATA_PATH)));
        var _length = _res.length;
        res.send({
            message: '56Top的物流信息已经抓取完成!',
            length: _length,
            res: _res
        });
    }).catch(function(err) {
        console.log(err);
    });
});

/* GET http://www.ic98.com page. */
router.get('/ic98/init', function(req, res, next) {
    // 构造promises数组
    var promises = [];
    for (var i = 1; i < 68; i++ ) {
        promises.push(i)
    }
    promises = promises.map(function(item) {
        return taskIC98.getIC98Init(item).then(function(source) {
            fs.writeFileSync(IC98_PATH, JSON.stringify(source));
        });
    });
    // 用all依次发出所有请求
    Promise.all(promises).then(function() {
        var _res = _.unique(JSON.parse(fs.readFileSync(IC98_PATH)));
        var ic98_length = _res.length;
        res.send({
            message: 'ic98的物流信息初步抓取完成!',
            length: ic98_length,
            res: _res
        });
    }).catch(function(err) {
        console.log(err);
    });
});
router.get('/ic98/deep', function(req, res, next) {
    // 通过all依次发出所有请求
    var promises = JSON.parse(fs.readFileSync(IC98_PATH)).map(function(item) {
        return taskIC98.getIC98Deep(item).then(function(source){
            fs.writeFileSync(RELDATA_PATH, JSON.stringify(source))
        })
    });
    Promise.all(promises).then(function(){
        var _res = _.unique(JSON.parse(fs.readFileSync(RELDATA_PATH)));
        var _length = _res.length;
        res.send({
            message: 'ic98的物流信息深度抓取完成!',
            length: _length,
            res: _res
        });
    }).catch(function(err){
        console.log(err);
    });
});

/* GET available data */
router.get('/data', function(req, res, next) {
    var source = _.unique(JSON.parse(fs.readFileSync(COPY_PATH)));
    var _length = source.length;
    res.send({
        message: '物流信息抓取完成！',
        length: _length,
        res: source
    });
});

router.get('/latest', function(req, res, next) {
    var _promises = [firstStep, nextStep].map(function(item) {
        return item();
    });
    var firstStep = function() {
        return new Promise(function(resolve, reject) {
            fs.writeFileSync(RELDATA_PATH, JSON.stringify([]));    // 清空
            var promises = JSON.parse(fs.readFileSync(IC98_PATH)).map(function(item) {
                return taskIC98.getIC98Deep(item).then(function(source) {
                    fs.writeFileSync(RELDATA_PATH, JSON.stringify(source));
                });
            });
            Promise.all(promises).then(function() {
                resolve();
            }).catch(function(err){
                reject(err)
            });
        });
    };
    var nextStep = function() {
        return new Promise(function(resolve, reject) {
            task56Top.get56Top().then(function(source) {
                fs.writeFileSync(RELDATA_PATH, JSON.stringify(source));
                resolve();
            }).catch(function(err) {
                reject(err);
            });
        });
    };
    Promise.all(_promises).then(function() {
        var _res = _.unique(JSON.parse(fs.readFileSync(RELDATA_PATH)));
        var _length = _res.length;
        res.send({
            message: 'ic98的物流信息深度抓取完成!',
            length: _length,
            res: _res
        });
    }).catch(function(err) {
        console.log(err);
    });
});

// 爬取58同城的数据
router.get('/58', function(req, res, next) {
    var { getBasicInfo, getCompeleteInfo, saveImg } = task58;
    getBasicInfo('http://hz.58.com/meirongjianshen/26805168042568x.shtml?adtype=1&entinfo=26805168042568_q&adact=3&psid=165205214192838976039119286&iuType=q_2&ClickID=3&PGTID=0d302639-0004-f03c-2731-3b0f6bca1f30&role=4', '美甲')
    .then(getCompeleteInfo)
    .then(saveImg)
    .then(function(source) {
        var _port = process.env.PORT || '8888';
        source.phone = 'http://' + req.hostname + ( _port!==80 ? ':' + _port : '' ) + source.img.replace('./public','');
        res.json({
            success: true,
            data: source
        })
    })
    .catch(function(err){
        console.log(err)
    });
})

module.exports = router;
