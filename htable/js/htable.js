/*
@author   Baidu BPIT DengHailong01(baidu HI:haiyume)
@date:    2014-6-11
@edition: 1.3.beta
@info:    AJAX表格 htable.js
@relay:   依赖 jquery
@说明：需要使用AJAX数据：表格数据、总页数、当前页
使用：$("#htable").htable({
        url:"data.json",
        model:[{key:"id",value:"ID",width:100,repla:xxx,order:"order的字段名，多个逗号隔开",cla:'xxx',colspan:2},{key:"name.xx.xx",value:"姓名",width:100},{key:"class",value:"班级",width:200},{key:"date",value:"日期",width:300}]
        //xxx为定义好的替换函数，如：var xxx=function(str,data,eq){return str.replace(/1/g,'yy');};
        //不传key显示索引
    });
    公共接口：更新表格update({url:'',data:{key:value}})
*/
(function($) {
    $.fn.htable = function(options) {
        var defaults = {
            url: "",            //通信URL
            method: "POST",     //通信方式
            pageNo: 1,          //当前页码
            pageSize: 20,       //每页的最大条数
            data: {},           //AJAX要传送的数据
            model: [],          //表格要显示的参数(key-字段名，value-字段key，width-列宽度，repla-替换函数,cla-类，colspan-colspan数，order-是否排序)
            page: "",           //页码容器的ID，为空不显示页码
            isJSONP: false,     //是否为JSONP
            mulSelect:false,    //是否有多选框，false或字段的key
            order:'',           //初始排序方式asc/desc
            orderBy:'',         //排序字段，多个以逗号隔开
            cb: function() {}   //回调函数
        };
        var options = $.extend(defaults, options);
        this.each(function() {
            var et = $(this);
            //////////////////////////////存放结果，配置变量///////////////////////////////////
            var data = this.data = {
                //AJAX存放结果
                result: {},
                //是否请求成功
                dataSuccess: function() {
                    if (data.result.code == 200) {
                        return true;
                    } else {
                        alert(data.result.message);
                        return false;
                    }
                },
                //请求地址
                url: options.url,
                //当前页数
                pageNo: options.pageNo,
                //配置POST/GET要传递的数据
                getPostData: (function(){
                    var pd = options.data;
                    if(options.order && options.orderBy){
                        pd.order = options.order;
                        pd.orderBy = options.orderBy;
                    }
                    return pd;
                })(),
                //排序
                order: {
                    up   : ['▲', 'asc'],    //升序
                    down : ['▼', 'desc'],   //降序
                    eq:'up' //默认排序
                },
                //配置总页数
                getTotalPages: function() {
                    return data.result.data.totalPages;
                },
                //配置记录总条数
                getNums: function() {
                    return data.result.data.totalCount;
                },
                //配置表格数据
                getGridData: function() {
                    return data.result.data.result;
                },
                //得到复选框的value值列表
                getMulSelect:function(){
                    var arr = [];
                    et.find(".b-checkbox:checked").each(function(){
                        arr.push($(this).val());
                    });
                    return arr;
                },
                //loading开始
                loading: function() {
                    //et.closest(".mod").addClass("hd_loading");
                },
                //loading结束
                loaded: function() {
                    //et.closest(".bd").removeClass("hd_loading");
                }
            };

            //html编码
            var encodeHTML = function(text){
                return String(text).replace(/["<>& ]/g, function(all){
                    return "&" + {
                        '"': 'quot',
                        '<': 'lt',
                        '>': 'gt',
                        '&': 'amp',
                        ' ': 'nbsp'
                    }[all] + ";";
                });
             },
             //获取多级对象
             getJsonValue = function(data, keys){
                if ($.isArray(keys) && keys.length){
                    var newData = data[keys.shift()];
                    if (!newData || !keys.length){return newData;}
                    return getJsonValue(newData, keys);
                }
            };

            //生成head
            var creatHead = function() {
                var head = '';
                $.each(options.model,function(i, j) {
                    if(j.htableColSpanEd === true){return;}
                    var w = j.width ? ' width="'+j.width+'"' : '';  //初始化宽度
                    //初始化colspan
                    var colspan = (function(col){
                        var c = '';
                        if(typeof col == 'number' && col > 1){
                            c = ' colspan="'+col+'"';
                            for(var ii = 1; ii<col; ii++){
                                options.model[i + ii].htableColSpanEd = true;
                            }
                        }
                        return c;
                    })(j.colspan);
                    var cla = j.cla || '',  
                    clas = j.cla ? (' class="'+j.cla+'"') : ''; //初始化类
                    if(!i && options.mulSelect){
                        head += '<td' + w + colspan + '><input type="checkbox" class="h-checkbox" value="1" /></td>';
                        return;
                    }
                    if (j.order) {
                        head += '<td orderBy="'+j.order+'" class="'+cla+' order '+data.order.eq+'"' + w + colspan + ' order="' + j.key + '"><i>'+data.order[data.order.eq][0]+'</i>' + j.value + '</td>';
                    } else {
                        head += '<td' + w + colspan + clas +'>' + j.value + '</td>';
                    }
                });
                return '<thead class="htable-thead"><tr>' + head + '</tr></thead>';
            };
            //生成body
            var creatBody = function(data) {
                var ie = document.all ? true :false;    //判断浏览器是否是IE
                var data_array = ie ? [] : '',          //IE下使用数组拼接，其它使用字符串拼接
                len = data.length;
                if (len === 0) {
                    return ['<tr class="odd nodata"><td colspan="' + options.model.length + '">没有得到任何数据。</td></tr>'];
                }
                for (var i = 0; i < len; i++) {
                    if (i >= options.pageSize) {
                        return data_array;
                    }
                    var tr_data = '';
                    for (var j = 0; j < options.model.length; j++) {
                        var clas = options.model[j].cla ? (' class="'+options.model[j].cla+'"') : ''; //类
                        var val = (!options.model[j].key) ? i + 1 : getJsonValue(data[i], options.model[j].key.split("."));
                        var vall = (!val && val != 0) ? "" : encodeHTML(val);
                        vall = options.model[j].repla ? options.model[j].repla(val||vall, data[i], i, options.model[j]) : vall;
                        tr_data += '<td'+clas+'>' + vall + '</td>';
                    }
                    var cla = i % 2 === 0 ? 'odd': 'even';
                    if (ie) {
                        data_array[data_array.length] = '<tr class="' + cla + '">' + tr_data + '</tr>';
                    } else {
                        data_array += '<tr class="' + cla + '">' + tr_data + '</tr>';
                    }
                }
                return data_array;
            };
            //Ajax取得数据  请求地址，请求参数[{url:'',data:{key:value}}]
            var getAjaxData = this.update = function(dd) {
                //如果url传入JSON，则不请求AJAX直接使用此数据
                if(typeof data.url === 'object'){
                    data.result = data.url;
                    gridUpdate();
                    return;
                }
                data.getPostData.pageNo = data.pageNo;
                if (dd && dd.url) {
                    data.url = dd.url;
                }
                if (dd && typeof dd.data == 'object') {
                    dd.data.pageNo = dd.data.pageNo || 1;
                    data.getPostData = $.extend(data.getPostData, dd.data);
                    data.pageNo = dd.data.pageNo;
                }
                var url = data.url;
                //data.getPostData.pageSize=options.pageSize;   //发送每页显示数打开此项
                et.animate({opacity: 0},200,function() {
                    if (!options.isJSONP) {
                        $.ajax({
                            url: url,
                            data: data.getPostData,
                            dataType: "json",
                            cache: false,
                            type: options.method,
                            error: function() {
                                alert('表格数据获取失败。');
                            },
                            success: function(result) {
                                data.result = result;
                                gridUpdate();
                            }
                        });
                    } else {
                        $.getJSON(url, data.getPostData,
                        function(result) {
                            data.result = result;
                            gridUpdate();
                        });
                    }
                });
            };

            //表格更新
            var gridUpdate = function() {
                data.loading();
                if (!data.dataSuccess()) {
                    return;
                }
                et.html(creatHead() + '<tbody class="htable-tbody"></tbody>');
                var body = creatBody(data.getGridData());
                et.find(".htable-tbody").html(typeof(body) == 'object' ? body.join('') : body);
                page();
                et.animate({opacity: 1},200);
                data.loaded();
                if(typeof options.cb === 'function'){options.cb(data.result);}
            };

            //分页功能
            var page = function (n) {
                if (!options.page) {
                    return;
                }
                n = n || 2;
                var pager = '';
                data.pageNo = Number(data.pageNo);
                pager += '<a class="page page_s" page="1" href="javascript:;" title="首页">&nbsp;</a>';
                pager += '<a class="page page_p" page="' + (data.pageNo - 1 || 1) + '" href="javascript:;">上一页</a>';
                pager += '<span>第 <input type="text" class="sPageNo" value="' + data.pageNo + '" onkeyup="this.value=this.value.replace(/\\D/g,\'\')" /> 页</span>';
                pager += '<a class="page_total" href="javascript:;">共' + data.getNums() + '条记录</a><a class="page_total" href="javascript:;">共' + data.getTotalPages() + '页</a>';
                pager += '<a class="page page_p" page="' + ((data.pageNo + 1) > data.getTotalPages() ? data.getTotalPages() : (data.pageNo + 1)) + '" href="javascript:;">下一页</a>';
                pager += '<a class="page page_w" page="' + data.getTotalPages() + '" href="javascript:;" title="尾页">&nbsp;</a>';
                //pager += '<span>每页 <select class="sNum"><option value="5">5</option><option value="10">10</option><option selected="" value="20">20</option><option value="50">50</option><option value="100">100</option></select> 条</span>';    //显示每页多少条
                options.page.html(pager);
            };

            //排序功能
            var order = function(){
                et.on("click",".order",function(){
                    if($(this).hasClass("up")){
                        data.order.eq = 'down';
                    }else{
                        data.order.eq = 'up';
                    }
                    var orderBy = $(this).attr("orderBy");
                    getAjaxData({data:{
                        order:data.order[data.order.eq][1],
                        orderBy:orderBy
                    }});
                });
            };

            //复选功能
            var mulSelect = function(){
                et.on("change",".h-checkbox",function(){
                    var st = this.checked;
                    et.find(".b-checkbox").each(function(){
                        this.checked = st;
                    });
                });
            };

            //初始化
            var girdInit = function() {
                if(options.page === true){
                    et.after('<div class="pager"></div>');
                    options.page = et.next(".pager");
                }else if(typeof options.page === 'string'){
                    options.page = $("#" + options.page);
                }
                if(options.mulSelect){
                    options.model.unshift({key:options.mulSelect,value:'',width:30,repla:function(str){return '<input type="checkbox" class="b-checkbox" value="'+str+'" />';}});
                    mulSelect();
                }
                getAjaxData();
                order();
                if (options.page) {
                    options.page.on("click", ".page",function() {
                        if ($(this).hasClass("pageNo") || Number($(this).attr('page')) < 1) { return; }
                        var p = Number($(this).attr('page'));
                        if(p == data.pageNo){return;}
                        data.pageNo = p;
                        getAjaxData();
                    }).on("blur", ".sPageNo", function() {                    
                        var eq = $.trim($(this).val());
                        if (!eq || eq == data.pageNo) {
                            return;
                        }
                         if(eq > data.getTotalPages() || eq < 1){
                            alert('输入的页码超出范围。');
                            return;
                        }
                        getAjaxData({
                            data: {
                                pageNo: Number(eq)
                            }
                        });
                    });
                }
            };
            //执行初始化
            girdInit();

        });
    };
})(jQuery);