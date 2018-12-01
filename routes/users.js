var express = require('express')
var router = express.Router()

var taskGs = require('./tasks/gs')

/* GET users listing. */
router.get('/gs', function (req, res, next) {
  taskGs.getData().then((res) => {
    res.send({
      data: [],
      success: true
    })
  }).catch((e) => {
    res.send({
      success: false
    })
  })
})

module.exports = router
