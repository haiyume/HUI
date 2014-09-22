/*
@author   DengHailong
@date:    2014-7-30
@edition: 2.0 beta
@info:    超轻量级AJAX表格 htable.js
@relay:   依赖 jquery
*/
(function($) {
    $.fn.htable = function(options) {
        var defaults = {
            url : "",               //调用ajax的url或者渲染表格的json数据
            method : "POST",        //通信方式
            pageNo : 1,             //当前页码
            pageSize : 20,          //每页的最大条数
            data : {},              //ajax发送参数
            model : [],             //表头参数(key-字段名，value-字段key，width-列宽度，repla-替换函数,cla-类，title-是否不加title(默认加),colspan-colspan数，order-是否排序,fixed-是否冻结此列)
            page : false,           //是否显示页码 jquery容器或者true false
            fakePage : false,       //是否前端假分页，默认否
            isJSONP : false,        //是否为JSONP
            mulSelect :false,       //是否有多选框，false或字段的key
            selected : false,       //是否激活点击行选择，1-单选，其它-多选，false-关闭
            horiAuto : false,       //是否加水平滚动条，冻结情况会自动加上
            fixHeight : false,      //是否激活表头冻结，值为表的最大高度值
            fixed : false,          //是否激活列冻结 left/right
            order : false,          //是否激活排序，默认否
            resultKey : '',         //读取数据的key,默认读result  
            nodata : '没有得到任何数据。',//没有数据时显示的文字
            nullRep : '',           //数据为空或undefined时显示的字符
            cb : ''                 //回调函数
        };
        var options = $.extend(defaults, options);
        this.each(function() {

            //对外接口
            var hdata = this.hdata = {
                result : '',                //ajax返回结果
                model : options.model,       //model参数
                url : options.url,          //ajax请求url
                postData : options.data,    //ajax发送参数
                thead : '',                 //thead节点
                tbody : '',                 //tbody节点
                //得到复选框或已选行的数据,参数：type(false-取复选框值<默认>,true-取已选行的数据)，va(false-取整行json格式数据<默认>，其它-取此行的自定义值)
                getChecked:function(type, va){
                    type = type || false;   //默认取checkbox
                    va = va || false;       //默认取整行数据
                    var arr = [];
                    ($slide.is(":visible") ? $slide.children() : $table).children("tbody").children("tr").each(function(i){
                        var $se = type ? $(this).hasClass("htable-select") : $(this).find("input.b-checkbox:checked,input.s-checkbox:checked");
                        if( (type && !$se) || (!type && !$se.length) ){return;}
                        if(va){
                            if(!type && va === true){
                                arr.push($se.val());
                            }else{
                                arr.push(conf.getData()[i][va]);
                            }
                        }else{
                            arr.push(conf.getData()[i]);
                        }
                    });
                    return arr;
                },
                //清除
                remove : function(){
                    $self.children(".htable-body").off();
                    $self.off().empty();
                    $header = $table = $slide = $page = null;
                }
            };
            //配置项
            var conf = {
                fixTdWd : 100,  //冻结列默认宽度
                //loading开始
                loading : function() {
                    //$self.addClass('loading');
                },
                //loading结束
                loaded : function() {
                    //$self.removeClass('loading');
                },
                //配置要处理的数据数组
                getData : function(){
                    var arr = (function(){
                        if(options.resultKey){
                            return hdata.result.data[options.resultKey];
                        }
                        return $.isArray(hdata.result) ? hdata.result : hdata.result.data.result;
                    })();
                    //配置假分页信息
                    if(options.fakePage){
                        hdata.result.data.pageNo = hdata.postData.pageNo || 1;
                        hdata.result.data.totalCount = arr.length;
                        hdata.result.data.totalPages = Math.ceil(arr.length/options.pageSize);
                        var start = (hdata.result.data.pageNo-1)*options.pageSize;
                        return arr.slice(start, start+options.pageSize );
                    }else{
                        return arr;
                    }
                },
                //总页数
                totalCount : function(){
                    //if(options.fakePage){return Math.ceil(this.getData().length/options.pageSize);}
                    return Number(hdata.result.data.totalCount);
                },
                //当前页
                pageNo : function(){
                    return Number(hdata.result.data.pageNo);
                },
                //总条数
                totalPages : function(){
                    return Number(hdata.result.data.totalPages);
                },
                //判定是否请求成功
                dataSuccess : function() {
                    if (hdata.result.code == 200 || $.isArray(hdata.result)) {
                        return true;
                    } else {
                        alert(data.result.message);
                        return false;
                    }
                },
                //ajax返回有误执行函数
                ajaxErr : function(){
                    alert('数据返回有误');
                }
            };
            //html编码
            var encodeHTML = function(text){
                text += '';
                return text.replace(/["<>& ]/g, function(all){
                    return "&" + {
                        '"': 'quot',
                        '<': 'lt',
                        '>': 'gt',
                        '&': 'amp',
                        ' ': 'nbsp'
                    }[all] + ";";
                });
             };
             //获取多级对象
             var getJsonValue = function(data, keys){
                if ($.isArray(keys) && keys.length){
                    var newData = data[keys.shift()];
                    if (!newData || !keys.length){return newData;}
                    return getJsonValue(newData, keys);
                }
            };
            //生成head
            var creatHead = function(fixed){
                fixed = fixed || false; //是否提取冻结数据，默认否
                var head = '';
                $.each(hdata.model, function(i, j) {
                    if(fixed && !j.fixed){return;}
                    if(j.__HTABLECOLSPANED === true){
                        delete j.__HTABLECOLSPANED;
                        return;
                    }
                    var colspan = (function(col){
                        var c = '';
                        if(typeof col === 'number' && col > 1){
                            c = ' colspan="'+col+'"';
                            for(var ii = 1; ii < col; ii++){
                                hdata.model[i + ii].__HTABLECOLSPANED = true;
                            }
                        }
                        return c;
                    })(j.colspan);
                    var w = j.width ? (' width="'+j.width+'"') : '';
                    var cla = j.cla || '';
                    var clas = j.cla ? (' class="'+j.cla+'"') : '';
                    var tdWidth = (options.fixed || options.fixHeight || options.horiAuto) ? (' style="width:'+(j.width||conf.fixTdWd)+'px;"'):'';
                    //if(colspan){tdWidth = '';}
                    if(!i && options.mulSelect && fixed !== 'right'){
                        head += '<td><input type="checkbox" class="h-checkbox" value="1" /></td>';  //checkbox表头
                    }
                    if(j.order){
                        var od = (j.order==='up' || j.order==='down') ? j.order : '';
                        head += '<td class="'+cla+' order '+od+'"' + w + colspan + ' eq="'+i+'" '+tdWidth+'><div class="htb-td htb-htd"'+tdWidth+'>' + j.value + ' <i></i></div></td>';
                    }else{
                        head += '<td' + w + colspan + clas +'><div class="htb-td htb-htd"'+tdWidth+'>' + j.value + '</div></td>';
                    }
                });
                return '<thead class="htable-thead">' + (head?('<tr>'+head+'</tr>'):'') + '</thead>';
            };
            //生成body
            var creatBody = function(fixed){
                fixed = fixed || false;
                var data_array = [],
                arrs = conf.getData(),
                len = arrs.length,
                mlen = hdata.model.length;
                if (len === 0) {
                    data_array = ['<tr class="odd nodata"><td colspan="' + (options.mulSelect ? (hdata.model.length+1) : hdata.model.length) + '">' + (fixed ? '' : options.nodata) + '</td></tr>'];
                }else{
                    var pageSize = hdata.postData.pageSize||options.pageSize;
                    for (var i = 0; i < len; i++) {
                        if (i >= pageSize){break;}
                        var tr_data = '';
                        for (var j = 0; j < mlen; j++){
                            var mObj = hdata.model[j];
                            if(fixed && !mObj.fixed){continue;}
                            var clas = mObj.cla ? (' class="'+mObj.cla+'"') : ''; //类
                            var eqs = pageSize * ( (conf.pageNo() || 1) - 1) + i + 1;   //序号
                            var val = (!mObj.key) ? eqs : getJsonValue(arrs[i], mObj.key.split("."));
                            if(!val && val !== 0 && val !== ''){val = options.nullRep;}
                            var vall = mObj.repla ? mObj.repla(val, arrs[i], i, mObj) : encodeHTML(val);
                            var tdWidth = (options.fixed || options.fixHeight || options.horiAuto) ? (' style="width:'+(mObj.width||conf.fixTdWd)+'px;"'):'';
                            if(!j && options.mulSelect && fixed !== 'right'){
                                tr_data += '<td><input type="checkbox" class="'+(fixed?'s-checkbox':'b-checkbox')+'" value="'+val+'" /></td>';  //checkbox列表
                            }
                            tr_data += '<td'+clas+'><div title="'+(mObj.title?'':encodeHTML(val))+'" class="htb-td htb-btd"'+tdWidth+'>' + vall + '</div></td>';
                                
                        }
                        var cla = i % 2 === 0 ? 'odd': 'even';
                        if(tr_data){data_array[data_array.length] = '<tr class="' + cla + '">' + tr_data + '</tr>';}
                    }  
                }             
                return '<tbody class="htb-tbody">' + data_array.join('') + '</tbody>';
            };
            //Ajax取得数据  请求地址，请求参数 ajax参数
            var getAjaxData = this.update = function(dd){
                conf.loading();
                //假分页不请求
                if(options.page && options.fakePage && !dd && hdata.result){
                    gridUpdate();
                    return;
                }
                if(dd){hdata.postData = $.extend(hdata.postData, dd);}
                if(dd && !dd.pageNo){hdata.postData.pageNo = 1;}    //默认第一页
                $self.children(":visible").css("opacity",0).stop().animate({}, 0, function(i){
                    if(!$(this).hasClass("htable-body")){return;}
                    if(typeof hdata.url === 'object'){
                        hdata.result = hdata.url;
                        gridUpdate();
                    }else if(options.isJSONP){
                        $.getJSON(hdata.url, hdata.postData, function(result) {
                            hdata.result = result;
                            gridUpdate();
                        });
                    }else{
                        //console.log(hdata.postData)
                        $.ajax({
                            url: hdata.url,
                            data: hdata.postData,
                            dataType: "json",
                            cache: false,
                            type: options.method,
                            error: function() {
                                if(typeof conf.ajaxErr === 'function'){conf.ajaxErr();}
                            },
                            success: function(result){
                                hdata.result = result;
                                gridUpdate();
                            }
                        });
                    }
                });
            };
            //表格更新
            var gridUpdate = function(){
                if (!conf.dataSuccess()){
                    if(typeof conf.ajaxErr === 'function'){conf.ajaxErr();}
                    return;
                }
                var headStr = creatHead();
                var bodyStr = creatBody();
                $table.html( headStr + bodyStr );
                //水平滚动
                if(options.horiAuto){
                    $table.parent().css({
                        overflow : 'auto'
                    });
                }
                //表头冻结
                if(options.fixHeight){
                    $table.children("thead").addClass("htb-hide").end().parent().css({
                        maxHeight : options.fixHeight,
                        overflow : 'auto'
                    });
                    if($table.height() > options.fixHeight){
                        $header.css("marginRight", 17);    //假设滚动条宽度是17
                    }
                    $header.show().html('<table class="htable">' + headStr + '</table>');
                }
                //列冻结(无水平滚动条不冻结列)
                if(options.fixed && $table.width() > $self.width()){
                    var headStr2 = creatHead(options.fixed);
                    var stop = $header.is(":visible") ? $header.height() : $table.children("thead").height();
                    stop++; //加1像素的底框
                    var sheight = options.fixHeight || 'inherit';
                    if(options.fixHeight && !document.all){
                        sheight -= 17;
                    }
                    if(sheight > $table.height()){
                        sheight = 'inherit';
                    }
                    $slide.css({
                        display : 'block',
                        top : stop,
                        height : sheight
                    }).html( '<table class="htable">' + headStr2 + creatBody(options.fixed) + '</table>' );
                    //打冻结表头补丁
                    $slide.next(".htable-slide-header").remove().end().after('<div class="htable-slide-header"><table class="htable">' + headStr2 + '</table></div>');
                    if(options.fixed === 'right'){
                        var sright = $table.height() > options.fixHeight ? 17 : 0;
                        $slide.css({
                            left : 'inherit',
                            right : sright
                        }).next(".htable-slide-header").css({
                            left : 'inherit',
                            right : sright
                        });
                    }
                }
                page();
                $self.children(":visible").stop().animate({opacity: 1}, 0,function(){
                    $(this).css("opacity",1);
                    return;
                });
                conf.loaded();
                if(typeof options.cb === 'function'){options.cb(hdata.result, $table);}
            };

            //分页功能,可根据需要配置
            var page = function (){
                if (!options.page){
                    return;
                }
                var pager = '';
                pager += '<a class="page page_s'+(conf.pageNo()===1?' page_dis':'')+'" page="1" href="javascript:;" title="首页">&nbsp;</a>';
                pager += '<a class="page page_p'+(conf.pageNo()===1?' page_dis':'')+'" page="' + (conf.pageNo() - 1 || 1) + '" href="javascript:;">上一页</a>';
                pager += '<span>第 <input type="text" class="sPageNo" value="' + conf.pageNo() + '" onkeyup="this.value=this.value.replace(/\\D/g,\'\')" /> 页</span>';
                pager += '<a class="page_total" href="javascript:;">共' + conf.totalCount() + '条记录</a><a class="page_total" href="javascript:;">共' + conf.totalPages() + '页</a>';
                /*pager += '<span>每页显示 <select class="sPageSize">'+(function(cur){
                    var arr = [9,20,30,50,100];
                    var arrStr = '';
                    for(var i = 0; i < arr.length; i++){
                        arrStr += '<option'+(arr[i]===cur?' selected="selected"':'')+' value="'+arr[i]+'">'+arr[i]+'</option>';
                    }
                    return arrStr;
                })(hdata.postData.pageSize||options.pageSize)+'</select> 条</span>';*/
                pager += '<a class="page page_p'+(conf.pageNo()===conf.totalPages()?' page_dis':'')+'" page="' + ((conf.pageNo() + 1) > conf.totalPages() ? conf.totalPages() : (conf.pageNo() + 1)) + '" href="javascript:;">下一页</a>';
                pager += '<a class="page page_w'+(conf.pageNo()===conf.totalPages()?' page_dis':'')+'" page="' + conf.totalPages() + '" href="javascript:;" title="尾页">&nbsp;</a>';
                $page.html(pager);
            };

            //行处理（悬浮/点击）
            var hHover = function($el, eq, cla){
                var $tr = $el.children("tbody").children("tr").eq(eq);
                if($tr.hasClass(cla)){
                    $tr.removeClass(cla);
                }else{
                    $tr.addClass(cla);
                    if(options.selected === 1 || cla === 'htable-hover'){
                        $tr.siblings().removeClass(cla);
                    }
                }
                $tr = null;
            };

            //初始化
            var $self = $(this);    //总容器
            if(options.fixed || options.fixHeight || options.horiAuto){$self.addClass("htable-fixed");}
            if(!options.fixHeight){$self.addClass("htable-zc");}
            var pos = $self.css("position");
            if(pos !== 'absolute' || pos !== 'relative' || pos !== 'fixed'){ $self.css("position","relative"); }
            $self.html('<div class="htable-header" style="display:none;"></div><div class="htable-body"><table class="htable"></table></div><div class="htable-slide" style="display:none;"></div>');
            var $header = $self.children(".htable-header"); //冻结表头容器
            var $table = $self.find("table");   //表格
            var $slide = $self.children(".htable-slide");   //冻结列容器
            var $page;  //分页容器
            if(options.page){
                if(options.page === true){
                    $self.append('<div class="htable-page"></div>');
                    $page = $self.children(".htable-page");
                }else if(typeof options.page === 'string'){
                    $page = $("#" + options.page);
                }else{
                    $page = options.page;
                }
            }
            hdata.postData.pageNo = Number(options.pageNo);
            hdata.postData.pageSize = Number(options.pageSize); //是否发送每页条数，可选
            getAjaxData();

            //事件
            //分页
            if (options.page){
                $self.on("click", ".page",function() {
                    if ($(this).hasClass("pageNo")){ return; }
                    var p = Number($(this).attr('page'));
                    if(p === hdata.postData.pageNo){return;}
                    if(p > 0){
                        hdata.postData.pageNo = p;
                        getAjaxData();
                    }
                                     
                }).on("change", ".sPageNo", function() {                    
                    var p = Number($.trim($(this).val()));
                    if(p > conf.totalPages() || p < 1 || isNaN(p)){
                        alert('输入的页码有误或超出范围。');
                        return;
                    }
                    hdata.postData.pageNo = p;
                    getAjaxData();
                }).on("change", ".sPageSize", function(){
                    hdata.postData.pageSize = options.pageSize = Number( $(this).val() );
                    hdata.postData.pageNo = hdata.result.data.pageNo = 1;
                    getAjaxData();
                });
            }
            //排序
            if(options.order){
                $self.on("click",".order",function(){
                    var eq = Number($(this).attr("eq"));
                    if(isNaN(eq)){return;}
                    var key = hdata.model[eq].key;
                    if(!key){return;}
                    var arr = (function(){
                        if(options.resultKey){
                            return hdata.result.data[options.resultKey];
                        }
                        return $.isArray(hdata.result) ? hdata.result : hdata.result.data.result;
                    })();
                    $(this).siblings(".order").removeClass("up").removeClass("down");
                    $.each(hdata.model, function(i, j){
                        if(j.order){j.order = true;}
                    });
                    var sortFn = function(x,y){
                        x = isNaN(x) ? x+'' : Number(x);
                        y = isNaN(y) ? y+'' : Number(y);
                        if(typeof x === 'number' && typeof y === 'number'){
                            return y - x;
                        }else if(typeof x === 'number'){
                            return 1;
                        }else if(typeof y === 'number'){
                            return -1;
                        }else{
                            var len = Math.min(x.length,y.length);
                            for(var i = 0; i < len; i++){
                                var xCode = x.charCodeAt(i);
                                var yCode = y.charCodeAt(i);
                                if(xCode !== yCode){
                                    return yCode - xCode;
                                    break;
                                }
                            }
                            return y.length - x.length;
                        }
                    };
                    if($(this).hasClass("down")){
                        $(this).removeClass("down").addClass("up");
                        hdata.model[eq].order = 'up';
                        arr.sort(function(a, b){
                            //return sortFn(b[key], a[key]);
                            return sortFn( getJsonValue(b, key.split(".")), getJsonValue(a, key.split(".")) );
                        });
                    }else{
                        $(this).removeClass("up").addClass("down");
                        hdata.model[eq].order = 'down';
                        arr.sort(function(a, b){
                            //return sortFn(a[key], b[key]);
                            return sortFn( getJsonValue(a, key.split(".")), getJsonValue(b, key.split(".")) );
                        });
                    }
                    //getAjaxData();
                    gridUpdate();
                });
            }
            //多选选择
            if(options.mulSelect){
                $self.on("change",".h-checkbox",function(){
                    var st = this.checked;
                    $table.children("tbody").children("tr").each(function(){
                        $(this).children("td:first").children(".b-checkbox").prop("checked", st);
                    });
                    if(options.fixed){
                        $slide.children("table").children("tbody").children("tr").each(function(){
                            $(this).children("td:first").children(".s-checkbox").prop("checked", st);
                        });
                    }
                });
            }
            //表头/列冻结滚动
            if(options.fixed || options.fixHeight){
                $self.children(".htable-body").scroll(function(){
                    var top = $(this).scrollTop();
                    var left = $(this).scrollLeft();                   
                    if(options.fixHeight){
                        $header.scrollTop(top);
                        $header.scrollLeft(left);
                    }
                    if(options.fixed){
                        $slide.scrollTop(top);
                        $slide.scrollLeft(left);
                    }
                });
                //鼠标悬浮
                if(options.fixed){
                    $self.on("mouseenter", "tbody>tr", function(){
                        var eq = $(this).index();
                        var cla = 'htable-hover';                
                        hHover($table, eq, cla);                  
                        if(options.fixed){hHover($slide.children("table"), eq, cla);}
                    }).on("mouseleave", "tbody>tr", function(){
                        var eq = $(this).index();
                        $table.children("tbody").children("tr").eq(eq).removeClass("htable-hover");
                        $slide.children("table").children("tbody").children("tr").eq(eq).removeClass("htable-hover");
                    });
                }              
            }
            //点击行选择
            if(options.selected){
                $self.on("click", "tbody>tr", function(e){
                    if(e.target.type === 'checkbox'){return;}
                    var eq = $(this).index();
                    var cla = 'htable-select';                
                    hHover($table, eq, cla);                  
                    if(options.fixed){hHover($slide.children("table"), eq, cla);}
                });
            }
            
        });
    };
})(jQuery);