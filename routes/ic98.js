const cheerio = require('cheerio');
const iconv  = require('iconv-lite');
const install = require('superagent-charset');
const request = require('superagent');

let pad = function (number, length, pos) {
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

let toHex = function (chr, padLen) {
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

let ic98 = function(keyword) {

	let url = 'http://www.ic98.com/company/v4604/1/' + chinese2Gb2312(keyword);

	let promise = new Promise((resolve, reject) => {
		superagent = install(request);
		superagent.get(url).charset('gb2312').end(function(err,res) {

			if (err) reject(err);

			let $ = cheerio.load(res.text, {decodeEntities: false});
            let contentList = $('.products.f');
            let dataList = [];

            for (let i = 0; i < contentList.length; i++) {
                let content = {};
                let _node = contentList.eq(i).find('.tab_ss1_l').find('a');

                if (_node.text().indexOf('物流')>0) {
                    content.company = _node.text();
                    content.link = _node.attr('href');
                    dataList.push(content);
                }
            }

			resolve(dataList);
		});
	});
	return promise;
}

module.exports = ic98;
