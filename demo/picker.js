; + function(win, doc) {

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
    // 选项的高度
    liH: 60,
  }

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
    this.liH = this.options.liH
    this._initHtml()
    this._initDom()
    this.items = []
    this.options.data.length && this.setData(this.options.data)
    this.options.value && this.setValue(this.options.value)
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
    _bindEvent() {

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
      }
      this._renderItems()
    },
    // 多级联动获取数据
    _getLoopItem(pid, deep, value) {
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
        this.items[deep].el = null
      }
      if (tempData.length) {

        this.items[deep] = {
          data: tempData,
          index: deep,
        }
        this._getLoopItem(tempData[initIndex].id, ++deep, value)
        return tempData
      }
    },
    // 渲染每个项
    _renderItems: function(startIndex) {
      startIndex = startIndex || 0
      if (startIndex === 0) {
        this._dom.body.innerHTML = ''
      }
      this.items.forEach((item, index) => {
        if (index < startIndex) return
        item.el = doc.createElement('div')
        item.el.className = 'picker-item'
        var html = []
        html.push('<ul class="picker-list"><li></li><li></li><li></li>')
        item.data.forEach((element, index) => {
          var text = typeof element == 'object' ? element.text : element
          html.push('<li>' + text + '</li>')
        })
        html.push('<li></li><li></li><li></li></ul>')
        item.el.innerHTML = html.join('')
        this._dom.body.appendChild(item.el)
        item.ul = item.el.querySelector('ul')
        this._bindItemEvent(item)
      })
    },
    // 为每个项绑定事件
    _bindItemEvent(item) {
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
          if (y == toEndY && _this.type === 3) {

            if (moveRender) return
            if (oldActive === item.active) return
            if (item.index >= _this.items.length - 1) return
            _this._getLoopItem(item.data[item.active].id, item.index + 1)
            _this._renderItems(item.index + 1)
            moveRender = true
            console.log('active:' + item.active)
            console.log('oldActive:' + oldActive)
          }
        }, ease)
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
    setValue(val, key) {
      key = key || 'value'
      var _this = this
      val = Array.isArray(val) ? val : [val]
      if(this.type === 3){
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
    getValue() {
      return this._getValue('value')
    },
    // 获取文本
    getText() {
      return this._getValue('text')
    },
    // 获取所有的值
    getAll() {
      return this._getValue()
    },
    // 获取选中的值
    _getValue(key) {
      var res = []
      this.items.forEach((item, index) => {
        var itemVal = item.data[item.active]
        if (key) {
          itemVal = typeof itemVal == 'object' ? itemVal[key] : itemVal
        }
        res.push(itemVal)
      })
      if (this.type === 1) {
        return res[0]
      }
      return res
    },
  }
  win.Picker = Picker
}(window, document)