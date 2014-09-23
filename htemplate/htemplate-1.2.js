/* 
@author:  Baidu denghailong01 www.zitk.net
@info：   htemplate.js 易用小型前端模板
@date:    2014-3-5
@edition: 1.2.beta
@params:  模板字符串，渲染数据，替换函数集(传入参数为当前数据，当前组数据，当前索引，此项可省略),最长的长度
@用法:    htemplate('序号:{}<div>{obj.a}</div>{obj.b,fn}', obj, {fn:function(d,data,eq){...} }, maxLength)
*/
var htemplate = htemplate || function(_temp, _data, _fns, _maxLength){
    //初始化参数
    var aq = typeof arguments[0] === 'object' ? 0 : 1;
    var temp = aq ? arguments[0] : '';
    var data = arguments[aq] || {};
    var fns = (typeof arguments[aq + 1] === 'object' && arguments[aq + 1]) ? arguments[aq + 1] : {};
    var maxLength = (typeof arguments[aq + 2] === 'number') ? arguments[aq + 2] : 0;
    //取值
	var getValue = function (jdata, keys, fn, eq){
        if(keys.length){
            var newData = jdata[keys.shift()];
            if(!newData || !keys.length){
                return typeof fn === 'function' ? fn(newData, data[eq] || data, eq) : newData;
            }else{
                return getValue(newData, keys, fn, eq);
            }
        }else{
            return jdata;
        }
    };
    //单个渲染
    var tpl = function(temp, data, eq){
        var reg = /\{([^}]*)\}/mg;  //查找正则，可修改
        return String(temp).replace(reg, function(value, name){
            if(name === ''){
                return eq + 1;
            }else if(typeof data === 'object'){
                var as = name.split(',');
                var re = value = getValue(data,as[0].split('.'), fns[as[1]] || false, eq);
                return re === 0 ? 0 : (re || '');
            }else{
                return value = data;
            }
        });
    };
    //整体渲染
    var tpls = function(temp, data, fns, maxLength){
        if(Object.prototype.toString.call(data) === '[object Array]'){
            var h = [];
            var length = data.length;
            for(var i = 0; i < length; i++){
                if(maxLength === 0 || maxLength > i){
                    h[h.length] = tpl(temp, data[i], i);
                }
            }
            return h.join('');
        }else{
            return tpl(temp, data, 0);
        }
    };
    //执行渲染
    if(aq){
        return tpls(temp, data, fns, maxLength);
    }else{
        return {
            render : function(clas){
                var oDoms = document.getElementsByClassName ? document.getElementsByClassName(arguments[0] || 'htemplate') : document.getElementsByTagName("*");
                var classReg = new RegExp("(^|\\b)" + (arguments[0] || 'htemplate') + "(\\b|$)");  //类查找正则
                for(var i = 0; i < oDoms.length; i++){
                    if(document.getElementsByClassName || classReg.test(oDoms[i].className)){
                        var da = oDoms[i].getAttribute("data");
                        oDoms[i].innerHTML = tpls( oDoms[i].innerHTML, (da ? getValue(data,da.split('.')) : data), fns, oDoms[i].getAttribute("maxLength") || maxLength );
                        oDoms[i].style.display = 'block';
                        da = null;
                    }
                }
                oDoms = classReg = null;
            }
        };
    }   
};