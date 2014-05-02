if(!scicalc) var scicalc={};
scicalc.cf = {};
scicalc.co = {};

scicalc.realMath = {
	ans : 0,
	mode : 10,
	useModulo : false,
	trigoBase : "Math",
	variables : new Array(),
	values : new Array(),
	customFunctions : new Array(),
	customOperators : new Array(),
	cOAsstRight : new Array(),
	constants : null,
	ignoreComma : 0,
	
	ln : function(x){
		if(x>0)
			return Math.log(x);
		else 
			throw {desc: scicalc.str("logError") + x};
	},

	log : function(x){
		if(x>0)
			return Math.log(x)/Math.log(10);
		else 
			throw {desc: scicalc.str("logError") + x};
	},
	
	asin : function(x){
		return 180*Math.asin(x)/Math.PI;
	},

	acos : function(x){
		return 180*Math.acos(x)/Math.PI;
	},	

	atan : function(x){
		return 180*Math.atan(x)/Math.PI;
	},

	sin : function(x){
		return Math.sin(x*Math.PI/180);
	},

	cos : function(x){
		return Math.cos(x*Math.PI/180);
	},

	tan : function(x){
		return Math.tan(x*Math.PI/180);
	},

	percentAdd : function(x,y){
		return x*(1 + (y/100));
	},

	percentSub : function(x,y){
		return x*(1 - (y/100));
	},	

	percentMul : function(x,y){
		return x*y/100;
	},

	percentDiv : function(x,y){
		return 100/y;
	},

	fact : function(x,ignore){
		x++;
		var g= new Array(0.0,1.0, 0.57721566490153286060651209,
			-6.5587807152025388e-1,-4.200263503409524e-2,
			1.6653861138229149e-1,-4.219773455554434e-2,
			-9.62197152787697e-3,7.21894324666310e-3,
			-1.16516759185906e-3,-2.1524167411495e-4,
			1.2805028238812e-4,-2.013485478079e-5,
			-1.25049348214e-6,1.13302723198e-6,
			-2.0563384170e-7,6.11609510e-9,5.00200764e-9,
			-1.18127457e-9,1.0434267e-10,7.78226e-12,
			-3.69680e-12,5.1004e-13,-2.058e-14,
			-5.35e-15,1.23e-15,-1.2e-16);
		var gammap=1; while(x>1){x--; gammap*=x;};
		var gammaq=1; while(x<0){gammaq*=x; x++;};
		if(x<1){
			var r=0;
			for(var i=26; i>=0; i--){r*=x;r+=g[i];}
			gammaq*=r;}

		return gammap/gammaq;
	},			// factorial function from google codes
	
	getVar : function(id){
		for(var i=0;i<this.variables.length;i++)
			if(this.variables[i] == id) return this.values[i];
		throw {desc: scicalc.str("unknownVariable") + id};
	},
	
	setVar : function(id,val){
		var i=0;
		while(i<this.variables.length && this.variables[i]!=id) i++;
		this.variables[i] = id;
		this.values[i] = val;		
	},
	
	checkmalicious : function(exp){
		var functions = ["asin", "acos", "atan", "sin", "cos", "tan", "sqrt", "log", "ln", "exp"];

		var reg = "[" + scicalc.Strings.getRegxSeries(this.mode) +
				((this.mode==10)?"\\e":"") + 
				"\\`\\~\\@\\$\\&\\_\\\\\\|\\:\\;\\?\\<\\>\\.\\+\\-\\*\\/\\^\\!\\%\\(\\)\\s\\,]*";
		var re = new RegExp(reg,"g");
		for (var i=0;i<functions.length;i++)
			exp = exp.replace(" "+functions[i]+"(" , "", "g");

		for (var i=0;i<scicalc.realMath.customFunctions.length;i++)
			exp = exp.replace(new RegExp(" "+scicalc.realMath.customFunctions[i]+"\\(" , "g"), "");

		for (var i=0;i<scicalc.realMath.constants.length;i++)
			exp = exp.replace(new RegExp(" "+scicalc.realMath.constants[i][0]+" ", "g"), "");
	
		exp = exp.replace(/\s[a-z][a-z\_0-9]*\s/g," ");
		
		if(this.mode==10)
			exp = exp.replace(/\s0x[A-F0-9]+\s/g," ");
		
		exp = exp.replace(re, "");

		return (exp != "");
	},

	reformNumbers : function(exp){
		if (this.mode != 10) return exp;
		
		var re = /\s(0x[A-F0-9]+)\s/g;
		var re2 = /\s([0-9\.]+(e[\+\-]?[0-9\.]+)?)\s/g;
		var reS = " ($1) ";
		
		exp = exp.replace(re,reS);
		exp = exp.replace(re2,reS);

		return exp;
	},
	
	reformConstants : function(exp){
		var consts = scicalc.realMath.constants;
		for (var i=0;i<consts.length;i++)
			exp = exp.replace(new RegExp(" "+consts[i][0]+" ", "g") ," (" + consts[i][1] + ") ");

		exp=exp.replace(/\s([a-z][a-z\_0-9]*)\s/g, "(scicalc.realMath.getVar('$1'))");
		return exp;
	
	},
	
	loadCustomFunctions : function(){
		var entries = scicalc.fileIO.getXML("functions.xml").firstChild.childNodes;
		scicalc.realMath.customFunctions.length = 0;

		delete scicalc.cf;
		scicalc.cf = {};
		
		for(var i=0;i<entries.length;i++){
			var name=entries[i].getAttribute("name");
			var arglength=parseInt(entries[i].getAttribute("args"));
			var code;
			if(entries[i].textContent!=null && entries[i].textContent!="")
			  code = entries[i].textContent;
			else
			  code = entries[i].getAttribute("code");
			
			try{
				scicalc.cf[name] = scicalc.f.create(code, arglength);
				scicalc.realMath.customFunctions[scicalc.realMath.customFunctions.length] = name;
			} catch (e) {
			}
		}
	},
	
	loadCustomOperators : function(){
		var entries = scicalc.fileIO.getXML("operators.xml").firstChild.childNodes;
		scicalc.realMath.customOperators.length = 0;
		scicalc.realMath.cOAsstRight.length = 0;

		delete scicalc.co;
		scicalc.co = {};
		
		for(var i=0;i<entries.length;i++){
			var name=entries[i].getAttribute("name");

			var code;
			if(entries[i].textContent!=null && entries[i].textContent!="")
			  code = entries[i].textContent;
			else
			  code = entries[i].getAttribute("code");
				
			var asst=entries[i].getAttribute("asst");

			try{
			  scicalc.co["func" + scicalc.realMath.customOperators.length] = scicalc.f.create(code, 2, 23);
			  scicalc.realMath.customOperators[scicalc.realMath.customOperators.length] = name;
			  scicalc.realMath.cOAsstRight[scicalc.realMath.cOAsstRight.length] = (asst=="rt");
			} catch (e) {
			}
		}
	},
	
	loadConstants : function(){
		scicalc.realMath.constants = [["e", " exp(1)"], ["pi", "Math.PI"], ["ans", "scicalc.realMath.ans"]];
			
		var entries = scicalc.fileIO.getXML("constants.xml").firstChild.childNodes;
		
		for(var i=0;i<entries.length;i++){
			var id=entries[i].getAttribute("name");
			var val=entries[i].getAttribute("value");
			scicalc.realMath.constants.push(new Array(id , val));
		}
	},
	
	setUserData : function(){
		scicalc.realMath.loadConstants();
		scicalc.realMath.loadCustomFunctions();
		scicalc.realMath.loadCustomOperators();
	},
	
	eval : function(exp) {
	
		var str2add = exp;
		
		if(scicalc.realMath.ignoreComma>0){
			var reg = "([" + scicalc.Strings.getRegxSeries(this.mode) + "])";
			reg = reg + "\\," + reg;
			var re = new RegExp(reg,"g");
			if(scicalc.realMath.ignoreComma==1)
				exp=exp.replace(re,"$1.$2");
			else
				exp=exp.replace(re,"$1$2");
		}
		exp = exp.replace(/\s/g, "");

		var assignMode = exp.match(/^[a-z][a-z\_0-9]*\=.*/);
		var v2assign;
		if(assignMode){
			var tmp =exp.split("=",2);
			v2assign = tmp[0];
			exp = tmp[1];
		}
		
		exp="(" + exp + ")";
		exp = exp.replace(/[\(]([\+\-])/g,"(0$1");

		exp = exp.replace(/([\`\~\@\$\^\&\_\\\|\:\;\?\<\>\-\+\*\/\%\!\)\,])/g, " $1 ");
		exp = exp.replace(/\(/g, "( ");
		if(this.checkmalicious(exp)) throw scicalc.invalidExpError;

		exp = this.bringtobase10(exp);
		
		
		exp = this.reformConstants(exp);
		exp = this.reformNumbers(exp);
		
		exp = exp.replace(/\s([a-z]+)\(/g, " #$1(");   //functions marker
		exp = exp.replace(/\s/g, "");
		
		exp = exp.replace(/([0-9.]+e[\+\-]?)\(/g, "($1");

		exp = scicalc.Strings.addBaseToFunctions(exp,["sqrt", "exp"], "Math");
		exp = scicalc.Strings.addBaseToFunctions(exp,["asin", "acos", "atan", "sin", "cos", "tan"], this.trigoBase);
		exp = scicalc.Strings.addBaseToFunctions(exp,["log", "ln"], "scicalc.realMath");
		
		exp = scicalc.Strings.addBaseToFunctions(exp,scicalc.realMath.customFunctions, "scicalc.cf");

		exp = exp.replace(/\!/g,"!(0)");  // for factorial operator

		exp = scicalc.Strings.reformOperators(exp,["scicalc.realMath.fact","Math.pow"],["!","^"],[false,true]);
		
		var opf = new Array();
		for(var i=0;i<scicalc.realMath.customOperators.length;i++)
			opf[i] = "scicalc.co.func"+i;

		exp = scicalc.Strings.reformOperators(exp,opf,scicalc.realMath.customOperators,scicalc.realMath.cOAsstRight);

		if (!this.useModulo) exp = this.moduloToPercent(exp);
		if (exp.match(/[\`\~\@\$\^\&\_\\\|\:\;\?\<\>]/g)!=null) throw scicalc.invalidExpError;
		var tempans;
		
		
			tempans =  scicalc.f.eval(exp);
			if (!isNaN(tempans)){
				this.ans = this.remove99(tempans);
				var ret= this.mode==10?this.ans:this.ans.toString(this.mode).toUpperCase();
				scicalc.main.addHistory(str2add,ret);
				if (assignMode) {
					this.setVar(v2assign,this.ans);
					return v2assign+"="+ret;
				}
				return ret;
			}
			throw scicalc.invalidExpError;
		
	},
	
	remove99 : function(val){
		if (val==0) return 0;
		var prec = scicalc.main.prefManager.getIntPref("decimal");
		if (prec <= 0) return val;
		var sign = val>0?1:-1;
		val = val*sign;
		var pf = Math.pow(10,prec-Math.round(this.log(val)));
		var ret = Math.round(val*pf);
			//mozilla bug
		if(pf>1e20 && ret%10==1) ret--;
		var ret2 = (ret / pf);
		return ((isNaN(ret2) || ret2== Infinity)?val:ret2)*sign;
	},
	
	moduloToPercent : function(exp){
		var str2find = ")%";
		var i = exp.indexOf(str2find);
		while (i > -1) {		
			var x_index = scicalc.Strings.find_index_left(exp.substr(0,i+1));
		
			exp = exp.substr(0,i + 1 - x_index) + "%" + exp.substr(i +1- x_index, x_index) + exp.substr(i+2);
			i = exp.indexOf(str2find);
		}

		exp = scicalc.Strings.reformOperators(exp,
			["scicalc.realMath.percentAdd","scicalc.realMath.percentSub","scicalc.realMath.percentMul","scicalc.realMath.percentDiv"],
			["+%","-%","*%","/%"], [false, false, false, false]);
		
		if (exp.indexOf("%")>-1)
			throw scicalc.invalidExpError;
		else
			return exp;	
	},
	
	bringtobase10 : function(exp){
		if (this.mode == 10) return exp;
		
		var re = new RegExp(" ([" + scicalc.Strings.getRegxSeries(this.mode) + "\\.]+) ","g");
		var str = exp.replace(re," (scicalc.realMath.converttodec(\"$1\")) ");
		return str;
	},
	
	converttodec : function(num){
		num = num.toString();
		var dotpos = num.indexOf(".");
		if(dotpos != num.lastIndexOf("."))
			throw scicalc.invalidExpError;
		var powerorder = (dotpos > -1)?(dotpos-1):(num.length-1);

		var result=0;
		while(num != ""){
			var numpart = num.charAt(0);
			if(numpart != '.'){
				result +=parseInt(numpart,this.mode) * Math.pow(this.mode,powerorder);
				powerorder--;
			}
			num = num.substr(1);
		}
		return result;
	}
}