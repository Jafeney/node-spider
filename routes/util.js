/**
 * @desc 工具方法
 * @author Jafeney
 * @datetime 2016-08-16
 **/

module.exports = {
  // 去重
  unique: function (arr) {
    var result = []; var flag = []
    arr.forEach((item) => {
      if (!flag.includes(item.company)) {
        result.push(item)
        flag.push(item.company)
      }
    })
    return result
  },
  // 去空格和占位符
  trim: function (str) {
    return str.replace(/(^\s+)|(\s+$)/g, '')
  }
}
