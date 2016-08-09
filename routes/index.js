var express = require('express'),
    request = require('request'),
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    fs = require('fs'),
    install = require('superagent-charset'),
    _request = require('superagent');

const IC98_PATH = './data/ic98.json';
const RELDATA_PATH = './data/relData.json';
const COPY_PATH = './data/copy.json';
var timeout_init = 0, ic98_length=JSON.parse(fs.readFileSync(IC98_PATH)).length;
var router = express.Router();

var pad = function (number, length, pos) {
	var str = "%" + number;
	while (str.length < length) {
		//向右边补0
		if ("r" == pos) {
			str = str + "0";
		} else {
			str = "0" + str;
		}
	}
	return str;
}

var toHex = function (chr, padLen) {
	if (null == padLen) {
		padLen = 2;
	}
	return pad(chr.toString(16), padLen);
}

function chinese2Gb2312(data) {
	var gb2312 = iconv.encode(data.toString('UCS2'), 'GB2312');
	var gb2312Hex = "";
	for (var i = 0; i < gb2312.length; ++i) {
		gb2312Hex += toHex(gb2312[i]);
	}
	return gb2312Hex.toUpperCase();
}

function unique(arr) {
    var result = [], flag = [];
    arr.forEach((item) => {
        if (!flag.includes(item.company)) {
            result.push(item);
            flag.push(item.company);
        }
    });
    return result;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '基于Node的爬虫工具' });
});

/* GET 56Top page. */
router.get('/56top', function(req, res, next) {
    request('http://www.56top.com/queryLogisticsCompanyInfoPage.jspx', function(err, response, body) {
        if(!err && response.statusCode === 200){
            var $ = cheerio.load(body); //当前$相当于整个body的选择器
            var contentList = $('.contentList');
            var dataList = [];

            for (var i = 0; i < contentList.length; i++) {
                var content = {};
                content.company = contentList.eq(i).find('h1').text();
                content.address = contentList.eq(i).find('.companyAdd').text();
                content.name = contentList.eq(i).find('h4').text().split('主营线路')[0];
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
                    email: '',
                };
                dataList.push(content);
            }
            var source = JSON.parse(fs.readFileSync(RELDATA_PATH));
            source = source.concat(dataList);
            fs.writeFileSync(RELDATA_PATH, JSON.stringify(source));

            var _res = unique(JSON.parse(fs.readFileSync(RELDATA_PATH)));
            var _length = _res.length;
            res.send({
                message: '56Top的物流信息已经抓取完成!',
                length: _length,
                res: _res
            });
        }
    })
});

/* GET http://www.ic98.com page. */
router.get('/ic98/init', function(req, res, next) {
    if (timeout_init<67) {
        for (var i = 1; i < 68; i++ ) {
            getIC98Init(i);
        }
        setTimeout(function () {
            if (timeout_init >= 67) {
                var _res = JSON.parse(fs.readFileSync(IC98_PATH));
                ic98_length = _res.length;
                res.send({
                    message: 'ic98的物流信息初步抓取完成!',
                    length: ic98_length,
                    res: _res
                });
            }
        }, 20000);
    } else {
        var _res = JSON.parse(fs.readFileSync(IC98_PATH));
        ic98_length = _res.length;
        res.send({
            message: 'ic98的物流信息初步抓取完成!',
            length: ic98_length,
            res: _res
        });
    }
});

router.get('/ic98/deep', function(req, res, next) {

    // 清空原有数据
    fs.writeFileSync(RELDATA_PATH, JSON.stringify([]));

    // 通过all依次发出所有请求
    var promises = JSON.parse(fs.readFileSync(IC98_PATH)).map(function(item) {
        return getIC98Deep(item).then(function(source){
            fs.writeFileSync(RELDATA_PATH, JSON.stringify(source));
        });
    });
    Promise.all(promises).then(function(){
        var _res = unique(JSON.parse(fs.readFileSync(RELDATA_PATH)));
        var _length = _res.length;
        res.send({
            message: 'ic98的物流信息深度抓取完成!',
            length: _length,
            res: _res
        });
    }).catch(function(err){
        console.log(err)
    });

});

router.get('/data', function(req, res, next) {
    var source = JSON.parse(fs.readFileSync(COPY_PATH));
    var _length = source.length;
    res.send({
        message: '物流信息抓取完成！',
        length: _length,
        res: source
    });
})

function getIC98Init(page) {
    var url = 'http://www.ic98.com/company/v4604/' + page + '/';

	var superagent = install(_request);
	superagent.get(url).charset('gb2312').end(function(err,response) {

		if (err) console.log(err);

		var $ = cheerio.load(response.text, {decodeEntities: false});
        var contentList = $('.products.f');
        var dataList = [];

        for (var i = 0; i < contentList.length; i++) {
            var content = {};
            var _node = contentList.eq(i).find('.tab_ss1_l').find('a');

            if (_node.text().indexOf('物流')>0 && _node.attr('href').indexOf('ic98')>0) {
                content.company = _node.text();
                content.link = _node.attr('href');
                dataList.push(content);
            }
        }

        // 写入到 json中
        var source = JSON.parse(fs.readFileSync(IC98_PATH));
        source = source.concat(dataList);
        fs.writeFileSync(IC98_PATH, JSON.stringify(source));
        timeout_init ++;
	});
}

function getIC98Deep(item) {

    return new Promise(function(resolve, reject) {

        var obj = {};
        obj.company = item.company;

        var superagent = install(_request);
        superagent.get(item.link).charset('gb2312').end(function(err,response) {

            // 一旦出现错误结束操作并对外抛出异常
            if (err) {
                reject(err)
            }
            else if(response) {
                var $ = cheerio.load(response.text, {decodeEntities: false});
                if (item.link.indexOf('http://www.ic98.com/') >= 0) {
                    var content = $('.m_xq_mid').find('ul').eq(0).find('li');
                    obj.address = content.eq(4).text().split('：')[1];
                    var _tel = content.eq(2).find('img').attr('src');
                    obj.info = {
                        telphone: '',
                        fax: '',
                        mobilephone: '',
                        email: content.eq(5).text().split('：')[1]
                    };
                    obj.name = content.eq(0).find('strong').text();
                } else {
                    var content = $('.mp7');
                    obj.address = content.eq(0).text();
                    obj.info = {
                        telphone: content.eq(1).text(),
                        fax: content.eq(2).text(),
                        mobilephone: content.eq(4).text(),
                        email: ''
                    }
                    obj.name = $('.mp4').find('.mtext').text();
                }
                // 在原有的基础上组合成新的json数据
                var source = JSON.parse(fs.readFileSync(RELDATA_PATH));
                source.push(obj);

                // 结束并对外传递
                resolve(source);
            } else {
                // .... 什么都不做
            }
        });
    });
}

module.exports = router;
