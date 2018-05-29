; + function(factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory)
  } else if (typeof exports === 'object') {
    module.exports = factory()
  } else {
    window.Picker = factory()
  }
}(function() {
  // 默认配置
  var defaults = {
    onClose: null,
    onCancel: null,
    onOk: null,
    okText: '确定',
    cancelText: '取消',
    // 数据
    data: [],
    // 初始值
    value: '',
    // 级联选择时的根id
    rootId: null,
    // 时间选择
    dateTime: '',
    // 最小日期
    minDate: '',
    // 最大日期
    maxDate: '',
  }
  var doc = document

  // 动画函数
  var Tween = {
    easeIn: function(t, b, c, d) {
      return (t == 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
    },
    easeOut: function(t, b, c, d) {
      return (t == d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    },
    easeOut2: function(t, b, c, d) {
      return c * ((t = t / d - 1) * t * t + 1) + b;
    },
  }

  // 弹性运动
  function moveFunc(start, end, delay, callback, ease) {
    delay = 300
    ease = ease || 'easeOut'
    var distance = end - start
    var startTime = Date.now()

    function play() {
      var durTime = Date.now() - startTime
      var curStart = Tween[ease](durTime, start, distance, delay)
      if (durTime >= delay) {
        curStart = end
      }
      typeof callback == 'function' && callback(curStart)
      durTime >= delay ? cancelAnimationFrame(play) : requestAnimationFrame(play)
    }
    requestAnimationFrame(play)
  }


  /* 对象 */
  function Picker(options) {
    options = options || {}
    this.options = Object.assign({}, defaults, options)
    this._initHtml()
    this._initDom()
    this.items = []
    this.options.data.length && this.setData(this.options.data)
    if (this.options.dateTime) {
      this.type = 4
      this.setValue(this.options.value || new Date)
    } else {
      this.options.value && this.setValue(this.options.value)
    }
    this._bindEvent()
    return this
  }

  /* 原型 */
  Picker.prototype = {
    // 初始化html
    _initHtml: function() {
      this.el = doc.createElement('div')
      this.el.className = 'ui-picker'
      var html = `
        <div class="picker-mask"></div>
        <div class="picker-wrap">
          <div class="picker-header">
            <span class="picker-btn">${this.options.cancelText}</span>
            <span class="picker-btn ok">${this.options.okText}</span>
          </div>
          <div class="picker-body"></div>
        </div>
      `
      this.el.innerHTML = html
      doc.body.appendChild(this.el)
    },
    // 获取子元素
    _initDom: function() {
      this._dom = {}
      this._dom.mask = this.el.querySelector('.picker-mask')
      this._dom.cancel = this.el.querySelector('.picker-btn')
      this._dom.ok = this.el.querySelector('.picker-btn.ok')
      this._dom.body = this.el.querySelector('.picker-body')
    },
    // 绑定事件
    _bindEvent: function() {

      this._dom.mask.addEventListener('click', () => {
        this.close()
        typeof this.options.onClose == 'function' && this.options.onClose()
      }, false)

      this._dom.cancel.addEventListener('click', () => {
        this.close()
        typeof this.options.onCancel == 'function' && this.options.onCancel()
      }, false)

      this._dom.ok.addEventListener('click', () => {
        if (typeof this.options.onOk == 'function') {
          this.options.onOk(this.getValue()) === false ? null : this.close()
          return
        }
        this.close()
      }, false)
    },
    // 设置数据
    setData: function(data) {
      this.data = data
      this.items = []
      this.type = 1
      // 多级选择
      if (data.length && Array.isArray(data[0])) {
        this.type = 2
      }
      // 多级联动
      if (this.options.rootId !== null) {
        this.type = 3
      }
      // 日期时间
      if (this.options.dateTime) {
        this.type = 4
      }
      switch (this.type) {
        case 1:
          this.items.push({
            data: data,
            index: 0,
          })
          break
        case 2:
          data.forEach((item, index) => {
            this.items.push({
              data: item,
              index: index,
            })
          })
          break
        case 3:
          this._getLoopItem()
          break
        case 4:
          // this._getTimeItem()
          break
      }
      this._renderItems()
    },
    // 多级联动获取数据
    _getLoopItem: function(pid, deep, value) {
      pid = pid === undefined ? this.options.rootId : pid
      deep = deep || 0
      var tempData = []
      var initIndex = 0

      this.data.forEach((item, index) => {
        if (item.pid === pid) {
          tempData.push(item)
          if (value && value.length > deep && value[deep] === item.value) {
            initIndex = tempData.length - 1
          }
        }
      })
      if (this.items[deep] && this.items[deep].el) {
        this._dom.body.removeChild(this.items[deep].el)
        this.items[deep].el = undefined
      }
      if (tempData.length) {
        this.items[deep] = {
          data: tempData,
          index: deep,
        }
        this._getLoopItem(tempData[initIndex].id, ++deep, value)
        return tempData
      } else {
        var len = this.items.length
        var start = deep + 0
        for (; start < len; start++) {
          var sitem = this.items[deep]
          if (sitem && sitem.el) {
            this._dom.body.removeChild(sitem.el)
          }
          this.items.splice(deep, 1)
        }
        return false
      }
    },
    // 时间选择数据
    _getTimeItem: function(dVal, newItem) {
      var fmt = this.options.dateTime
      var timeArr = fmt.match(/(yyyy|MM|dd|hh|mm|ss)/g)
      var now = dVal || new Date
      // 设置时间范围
      var minDate = this._minDate = new Date(this.options.minDate || '1970-01-01 00:00:00')
      var maxDate = this._maxDate = new Date(this.options.maxDate || (now.getFullYear() + 30) + '-12-31 23:59:59')
      // 年-yyyy
      if (timeArr.includes('yyyy') && !newItem) {
        var item = []
        for (var start = minDate.getFullYear(), end = maxDate.getFullYear(); start <= end; start++) {
          item.push({
            text: start + '年',
            value: start
          })
        }
        if (!newItem) {
          this.items.push({
            data: item,
            index: this.items.length,
            time: 'yyyy',
          })
        }
      }
      if (newItem && newItem.time === 'yyyy') {
        var nextItem = this.items[newItem.index + 1]
        if (nextItem && nextItem.time === 'MM')
          this._getTimeItem(dVal, nextItem)
      }

      // 月-yyyy
      if (timeArr.includes('MM')) {
        var item = []
        var start = 1,
          end = 12,
          active = 0
        if (now.getFullYear() === minDate.getFullYear()) {
          start = minDate.getMonth() + 1
        }
        if (now.getFullYear() === maxDate.getFullYear()) {
          end = maxDate.getMonth() + 1
        }
        for (var i = 0, len = end - start; i <= len; i++) {
          item.push({
            text: start + i + '月',
            value: start + i
          })
        }
        if (newItem && newItem.time === 'MM' && newItem.data.length != item.length) {
          this._dom.body.removeChild(newItem.el)
          active = newItem.active < start - 1 ? start - 1 : newItem.active
          active = newItem.active > end - 1 ? end - 1 : newItem.active
          active = active >= len ? len : active
          this.items[newItem.index] = {
            data: item,
            index: newItem.index,
            time: 'MM',
            active: active
          }
        } else if (!newItem) {
          this.items.push({
            data: item,
            index: this.items.length,
            time: 'MM',
          })
        }
        if (newItem && newItem.time === 'MM') {
          var nextItem = this.items[newItem.index + 1]
          if (nextItem && nextItem.time === 'dd')
            return this._getTimeItem(dVal, nextItem)
        }
      }

      // 日-dd
      if (timeArr.includes('dd')) {
        var item = []
        var start = 1,
          end = 31,
          active = 0
        if (now.getFullYear() === minDate.getFullYear() && now.getMonth() === minDate.getMonth()) {
          start = minDate.getDate()
        }
        if (now.getFullYear() === maxDate.getFullYear() && now.getMonth() === maxDate.getMonth()) {
          end = maxDate.getDate()
        } else {
          end = this._getMonthDays(now.getFullYear(), now.getMonth() + 1)
        }


        for (var i = 0, len = end - start; i <= len; i++) {
          item.push({
            text: start + i + '日',
            value: start + i
          })
        }
        if (newItem && newItem.time === 'dd' && newItem.data.length != item.length) {
          this._dom.body.removeChild(newItem.el)
          active = newItem.active < start - 1 ? start - 1 : newItem.active
          active = newItem.active > end - 1 ? end - 1 : newItem.active
          active = active >= len ? len : active
          this.items[newItem.index] = {
            data: item,
            index: newItem.index,
            time: 'dd',
            active: active
          }
        } else if (!newItem) {
          this.items.push({
            data: item,
            index: this.items.length,
            time: 'dd',
          })
        }
      }
      if(newItem) return
      // 时 - hh
      if (timeArr.includes('hh')) {
        var item = []
        for (var i = 0; i < 24; i++) {
          item.push({
            text: i + '时',
            value: i
          })
        }
        this.items.push({
            data: item,
            index: this.items.length,
            time: 'hh',
          })
      }
      // 分 - mm
      if (timeArr.includes('mm')) {
        var item = []
        for (var i = 0; i < 60; i++) {
          item.push({
            text: i + '分',
            value: i
          })
        }
        this.items.push({
            data: item,
            index: this.items.length,
            time: 'mm',
          })
      }
      // 秒 - ss
      if (timeArr.includes('ss')) {
        var item = []
        for (var i = 0; i < 60; i++) {
          item.push({
            text: i + '秒',
            value: i
          })
        }
        this.items.push({
            data: item,
            index: this.items.length,
            time: 'ss',
          })
      }

    },
    // 根据时间判断当前月有多少天
    _getMonthDays: function(y, m) {
      if ([4, 6, 9, 11].includes(m)) return 30
      if (m === 2) return (y % 4 === 0 && y % 100 !== 0) ? 29 : 28
      return 31
    },
    // 渲染每个项
    _renderItems: function(startIndex) {
      startIndex = startIndex || 0
      if (startIndex === 0) {
        this._dom.body.innerHTML = ''
      }
      this.items.forEach((item, index) => {
        if (index < startIndex) return
        if (item.el) {
          this._dom.body.removeChild(item.el)
          item.el = null
        }
        item.el = doc.createElement('div')
        item.el.className = 'picker-item'
        var html = []
        html.push('<ul class="picker-list"><li></li><li></li><li></li>')
        item.data.forEach((element, index) => {
          var text = typeof element == 'object' ? element.text : element
          html.push('<li' + (item.active == index ? ' class="active"' : '') + '>' + text + '</li>')
        })
        html.push('<li></li><li></li><li></li></ul>')
        item.el.innerHTML = html.join('')
        this._dom.body.appendChild(item.el)
        item.ul = item.el.querySelector('ul')
        if (!this.liH) {
          this.liH = parseInt(document.defaultView.getComputedStyle(item.ul.childNodes[0])['height'])
        }
        this._translateY(item, -item.active * this.liH)
        this._bindItemEvent(item)
      })
    },
    // 为每个项绑定事件
    _bindItemEvent: function(item) {
      var _this = this
      var box = item.el
      var items = box.querySelectorAll('li')
      var boxUl = box.querySelector('ul')
      var liH = this.liH
      var startY = 0
      var elY = _this._translateY(item)
      var curY = elY
      var moveData = {
        preTime: 0,
        preDis: 0,
        endTime: 0,
        endDis: 0
      }
      var lastSpead = 0
      var maxY = items.length <= 7 ? 0 : (items.length - 7) * liH
      _this._renderActive(items, elY, item)
      var oldActive = item.active

      box.removeEventListener('touchstart', touchStart)
      box.removeEventListener('touchend', touchEnd)

      // 滑动开始
      box.addEventListener('touchstart', touchStart, false)
      box.addEventListener('touchend', touchEnd, false)
      // 滑动开始
      function touchStart(e) {
        e.preventDefault()
        lastSpead = 0
        moveData = {
          preTime: 0,
          preDis: 0,
          endTime: 0,
          endDis: 0
        }
        elY = curY = _this._translateY(item)
        oldActive = item.active
        startY = e.touches[0].pageY
        cancelAnimationFrame(goBack)
        box.addEventListener('touchmove', touchMove, false)
      }
      // 滑动中
      function touchMove(e) {
        var delta = e.touches[0].pageY - startY
        curY = elY + delta
        // 到头了，阻尼
        if (curY > 0) {
          curY *= 0.3
        }
        // 到底了，阻尼
        else if (curY + maxY <= 0) {
          curY = curY - (curY + maxY) * (1 - 0.3)
        }
        // 正常情况记录时间和y轴位置
        else if (Date.now() - moveData.preTime > 10) {
          moveData.preTime = moveData.endTime
          moveData.preDis = moveData.endDis
          moveData.endTime = Date.now()
          moveData.endDis = e.touches[0].pageY
        }
        _this._renderActive(items, curY, item)
        _this._translateY(item, curY)
      }
      // 滑动结束
      function touchEnd(e) {
        box.removeEventListener('touchmove', touchMove, false)
        lastSpead = (moveData.endDis - moveData.preDis) / (moveData.endTime - moveData.preTime)
        lastSpead = lastSpead || 0
        goBack()
      }
      // touchend时列表的运动逻辑
      function goBack() {
        var toEndY = 0
        var actIndex = Math.round(-curY / liH)
        var keepTime = Date.now()
        var delay = 0
        var ease = 'easeOut'
        // 过了头部回弹
        if (curY > 0) toEndY = 0
        // 过了底部回弹
        else if (-curY > maxY) toEndY = -maxY
        // 惯性运动
        else if (Math.abs(lastSpead) >= 0.5) {
          ease = 'easeOut2'
          var a = 0.04;
          delay = Math.abs(lastSpead) / a
          var dist = lastSpead * delay - 0.5 * a * delay * delay
          toEndY = curY + dist
          if (toEndY > 0) {
            toEndY = 0
          } else if (-toEndY > maxY) {
            toEndY = -maxY
          } else {
            toEndY = Math.round(toEndY / liH) * liH
          }
        }
        // 正常位置回弹定位到最近的选项
        else {
          toEndY = -actIndex * liH
        }
        var moveRender = false
        moveFunc(curY, toEndY, delay, y => {
          _this._translateY(item, y)
          _this._renderActive(items, y, item)
          if (y == toEndY) {
            if (oldActive === item.active) return
            if (this._moveRender) return
            _this._updateItems(item)
            moveRender = true
          }
        }, ease)
      }
    },
    // 当选项改变时进行联动更新
    _updateItems: function(item) {
      if (this.type == 3) return this._getLoopItem(item.data[item.active].id, item.index + 1) && this._renderItems(item.index + 1)
      if (this.type === 4) {
        var dVal = new Date(this.getValue())
        this._getTimeItem(dVal, item)
        this._renderItems(item.index + 1)
      }
    },
    // 激活当前选中的class
    _renderActive: function(items, topY, boxItem) {
      var activeIndex = Math.round(-topY / this.liH)
      boxItem.active = parseInt(activeIndex)
      items.forEach(function(item, index) {
        if (activeIndex === index - 3) {
          item.classList.add('active')
        } else {
          item.classList.remove('active')
        }
      })
    },
    // 获取和设置元素y轴值
    _translateY: function(item, y) {
      var el = item.ul
      if (arguments.length === 1) {
        var tar = el.style.transform
        if (!tar) return 0
        var arr = tar.match(/translateY\((\-?\d+(\.\d+)?)px\)/)
        if (arr && arr.length) {
          return parseFloat(arr[1])
        }
        return 0;
      }
      el.style.transform = 'translateY(' + y + 'px)'
    },
    // 设置值
    setValue: function(val, key) {
      key = key || 'value'
      var _this = this
      if (this.type == 4) {
        var dVal = typeof val === 'object' ? val : new Date(val)
        this.items = []
        this._getTimeItem(dVal)
        this._renderItems()
        this.items.forEach((item, index) => {
          var active = 0
          var listData = item.data
          var actVal = null
          for (var i = 0, l = listData.length; i < l; i++) {
            var target = listData[i]['value']
            switch (item.time) {
              case 'yyyy':
                actVal = dVal.getFullYear()
                break;
              case 'MM':
                actVal = dVal.getMonth() + 1
                break;
              case 'dd':
                actVal = dVal.getDate()
                break;
              case 'hh':
                actVal = dVal.getHours()
                break;
              case 'mm':
                actVal = dVal.getMinutes()
                break;
              case 'ss':
                actVal = dVal.getSeconds()
                break;
            }
            if (actVal === target) {
              active = i
              break
            }
          }
          var topY = -active * this.liH
          moveFunc(_this._translateY(item), topY, 400, function(y) {
            _this._translateY(item, y)
            _this._renderActive(item.ul.querySelectorAll('li'), y, item)
          })
        })
        return
      }
      val = Array.isArray(val) ? val : [val]
      if (this.type === 3) {
        this._getLoopItem(this.options.rootId, 0, val)
        this._renderItems()
      }

      val.forEach((element, index) => {
        var item = this.items[index]
        var listData = item.data
        var active = 0
        for (let i = 0, l = listData.length; i < l; i++) {
          var target = typeof listData[i] == 'object' ? listData[i][key] : listData[i]
          if (element === target) {
            active = i
            break
          }
        }
        var topY = -active * this.liH
        moveFunc(_this._translateY(item), topY, 400, function(y) {
          _this._translateY(item, y)
          _this._renderActive(item.ul.querySelectorAll('li'), y, item)
        })
      })
    },
    // 显示
    show: function() {
      var _this = this
      this.el.style.display = 'block'
      setTimeout(function() {
        _this.el.classList.add('show')
      }, 10)
      return this
    },
    // 关闭
    close: function() {
      var _this = this
      this.el.classList.remove('show')

      function removeClass() {
        _this.el.style.display = 'none'
        _this._dom.mask.removeEventListener('transitionend', removeClass, false)
      }
      this._dom.mask.addEventListener('transitionend', removeClass, false)
    },
    // 获取值
    getValue: function(key) {
      if (this.type === 4) return this._getFmtDate()
      return this._getValue(key)
    },
    // 获取所有的值
    getAll: function() {
      return this._getValue(true)
    },
    // 获取选中的值
    _getValue: function(key) {
      var res = []
      this.items.forEach((item, index) => {
        var itemVal = item.data[item.active]
        if (key === undefined) {
          itemVal = typeof itemVal == 'object' ? (itemVal['value'] ? itemVal['value'] : itemVal['text']) : itemVal
        }
        if (key && typeof key === 'string') {
          itemVal = itemVal[key]
        }
        res.push(itemVal)
      })
      if (this.type === 1) {
        return res[0]
      }
      return res
    },
    // 获取时间值格式化输出
    _getFmtDate() {
      var fmt = this.options.dateTime + ''
      var now = new Date
      var nowTime = {
        'yyyy': now.getFullYear(),
        'MM': now.getMonth() + 1,
        'dd': now.getDay()
      }
      this.items.forEach((item, index) => {
        var itemVal = item.data[item.active].value
        nowTime[item.time] = itemVal
        switch (item.time) {
          case 'MM':
            if (nowTime['yyyy'] === this._minDate.getFullYear() && nowTime['MM'] < this._minDate.getMonth() + 1)
              nowTime['MM'] = this._minDate.getMonth() + 1
            if (nowTime['yyyy'] === this._maxDate.getFullYear() && nowTime['MM'] > this._maxDate.getMonth() + 1)
              nowTime['MM'] = this._maxDate.getMonth() + 1
            break
          case 'dd':
            if (nowTime['yyyy'] === this._minDate.getFullYear() && nowTime['MM'] === this._minDate.getMonth() + 1)
              nowTime['dd'] = nowTime['dd'] < this._minDate.getDate() ? this._minDate.getDate() : nowTime['dd']
            if (nowTime['yyyy'] === this._maxDate.getFullYear() && nowTime['MM'] === this._maxDate.getMonth() + 1)
              nowTime['dd'] = nowTime['dd'] > this._maxDate.getDate() ? this._maxDate.getDate() : nowTime['dd']
            var getDays = this._getMonthDays(nowTime['yyyy'], nowTime['MM'])
            nowTime['dd'] = nowTime['dd'] > getDays ? getDays : nowTime['dd']
            break
        }
        itemVal = nowTime[item.time] || itemVal
        fmt = fmt.replace(new RegExp(item.time, 'g'), res => {
          return itemVal < 10 ? ('0' + itemVal) : itemVal
        })
      })
      return fmt
    },
    // 销毁实例
    destroy: function() {
      doc.body.removeChild(this.el)
      delete this
    },
  }
  return Picker
});