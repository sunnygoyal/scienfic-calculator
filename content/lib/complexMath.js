if (!scicalc)
	var scicalc = {};

scicalc.Complex = function Complex(a,b) {
	if (b == undefined) b = 0;
	this.a = a;
	this.b = b;
};

scicalc.Complex.prototype.toString = function () {
	var x = Math.round(this.a*10000000)/10000000;
	var y = Math.round(this.b*10000000)/10000000;

	if (x == 0) {
		if (y == 1)
			return "i";
		else if (y == -1)
			return "-i";
		else if (y == 0)
			return "0";
		else
			return y + "i";
	} else {
		if (y == 1)
			return x + "+i";
		else if (y == -1)
			return x +"-i";
		else if (y == 0)
			return x;
		else if (y > 0)
			return x + "+" + y + "i";
		else
			return x + "" + y + "i";
	}

};
if (!scicalc.complexMath) scicalc.complexMath = {};

scicalc.complexMath = {
	ans : new scicalc.Complex(0),
	consts : [[" e ", " exp( 1 )"], [" pi ", "new scicalc.Complex(Math.PI)"], [" ans ", "scicalc.complexMath.ans"]],
	functions : ["exp", "ln", "re", "im", "conj", "sin", "cos", "tan", "mod"],
	variables : [],
	values : [],

	getVar : function(id) {
		id = id.replace(/\s/g, ""); //remove spaces
		if (id == 'i') return (new scicalc.Complex(0,1));
		if (id == 'e') return (new scicalc.Complex(Math.exp(1)));
		if (id == 'pi') return (new scicalc.Complex(Math.PI));
		if (id == 'ans') return (new scicalc.complexMath.ans);
		
		
		for (var i = 0; i < this.variables.length; i++)
			if (this.variables[i] == id) return this.values[i];
		throw {desc: scicalc.str("unknownVariable")+ " " + id};
	},
	
	setVar : function(id,val) {
		var i = 0;
		while (i < this.variables.length && this.variables[i] != id) i++;
		this.variables[i] = id;
		this.values[i] = val;		
	},
	
	exp : function(x) {
		var r = Math.exp(x.a);
		return new scicalc.Complex(r*Math.cos(x.b),r*Math.sin(x.b));
	},

	ln : function(x) {
		var r = 0.5*Math.log(x.a*x.a+x.b*x.b);

		if (x.a == 0) {
			if (x.b == 0)
				throw {desc: scicalc.str("logError") + "0"};
			if (x.b < 0)
				theta = 1.5*Math.PI;
			else
				theta = .5*Math.PI;
			return new scicalc.Complex(r,theta);
		}
		var theta = Math.atan(x.b/x.a);
		if (x.a < 0) theta += Math.PI;
		if (theta < 0) theta += 2*Math.PI;
		return new scicalc.Complex(r,theta);
	},

	add : function(x,y) {
		return new scicalc.Complex(x.a+y.a,x.b+y.b);
	},

	sub : function(x,y) {
		return new scicalc.Complex(x.a-y.a,x.b-y.b);
	},

	mul : function(x,y) {
		return new scicalc.Complex(x.a*y.a-x.b*y.b,x.a*y.b+x.b*y.a);
	},

	pow : function(x,y) {
		return this.exp(this.mul(this.ln(x),y));
	},

	div : function(x,y) {
		if ((y.a == 0) && (y.b == 0))
			throw {desc: scicalc.str("divZero")};
		else
			return this.mul(x,this.pow(y,new scicalc.Complex(-1,0)));
	},

	Re : function(x) {
		return new scicalc.Complex(x.a,0);
	},

	Im : function(x) {
		return new scicalc.Complex(x.b,0);
	},

	mod : function(x) {
		return new scicalc.Complex(Math.sqrt(x.a*x.a+x.b*x.b),0);
	},

	conj : function(x) {
		return new scicalc.Complex(x.a,-x.b);
	},

	sin : function(x,n1,n2) {
		if (n1 == undefined)
			n1 = this.exp(this.mul(new scicalc.Complex(0,1),x));
		if (n2 == undefined)
			n2 = this.exp(this.mul(new scicalc.Complex(0,-1),x));
		return this.mul(new scicalc.Complex(0,-.5),this.sub(n1, n2));
	},

	cos : function(x,n1,n2) {
		if (n1 == undefined)
			n1 = this.exp(this.mul(new scicalc.Complex(0,1),x));
		if (n2 == undefined)
			n2 = this.exp(this.mul(new scicalc.Complex(0,-1),x));
		return this.mul(new scicalc.Complex(0.5,0),this.add(n1, n2));
	},

	tan : function(x) {
		var n1 = this.exp(this.mul(new scicalc.Complex(0,1),x));
		var n2 = this.exp(this.mul(new scicalc.Complex(0,-1),x));
		return this.div(this.sin(x,n1,n2),this.cos(x,n1,n2));
		
	},
	
	checkmalicious : function(exp) {
	
		for (var i = 0; i < this.functions.length; i++)
			exp = exp.replace(new RegExp(" " + this.functions[i]+"\\(" , "g"), "");
			
		var re = /[0-9\.\+\-\*\/\^\(\)]*/g;
		exp = exp.replace(/\s[a-z][a-z\_0-9]*\s/g," ");
		exp = exp.replace(re, "");

		exp = exp.replace(/i/g, "");
		exp = exp.replace(/\s/g, "");
		
		return (exp != "");
	},

	reformNumbers : function(exp) {
	
		exp = exp.replace(/\s([0-9\.]+)\s/g, ' (new scicalc.Complex($1,0)) ' );

		var re = /\+\-/g;
		exp = exp.replace(re,"-");
		var re = /\-\+/g;
		exp = exp.replace(re,"-");
		var re = /\-\-/g;
		exp = exp.replace(re,"+");
		var re = /\*\-/g;
		exp = exp.replace(re,"*(new scicalc.Complex(0,-1)*");
		var re = /\/\-/g;
		exp = exp.replace(re,"/(new scicalc.Complex(0,-1)*");
		return exp;
	},
	
	compute : function(exp) {
		var str2add = exp;
		exp = exp.replace(/\s/g, ""); //remove spaces
		
		var assignMode = exp.match(/^[a-z][a-z\_0-9]*\=.*/);
		var v2assign;
		if (assignMode) {
			var tmp = exp.split("=",2);
			v2assign = tmp[0];
			exp = tmp[1];
		}
			
		exp = "(" + exp + ")";
		exp = exp.replace(/[\(]([\+\-])/g,"(0$1");

		exp = exp.replace(/([\+\-\*\/\^\)])/g, " $1 ");
		exp = exp.replace(/\(/g, "( ");
		
		exp = exp.replace(/\s([0-9\.]+)i\s/g, " ( $1 * i ) ");
		exp = exp.replace(/\si([0-9\.]+)\s/g, " ( $1 * i ) ");

		if (this.checkmalicious(exp)) throw scicalc.invalidExpError;
		
		exp = exp.replace(/\s([a-z][a-z\_0-9]*)\s/g, " (scicalc.complexMath.getVar('$1')) ");
		exp = this.reformNumbers(exp);

		
		exp = exp.replace(/\s([a-z]+)\(/g, " #$1("); //functions marker
		exp = exp.replace(/\s/g, ""); //remove spaces
		exp = exp.replace(/new/g, "new "); //addspaces around new

		exp = scicalc.Strings.addBaseToFunctions2(exp, this.functions, "scicalc.complexMath");	
		
		exp = scicalc.Strings.reformOperators(exp,
				["scicalc.complexMath.pow", "scicalc.complexMath.mul", "scicalc.complexMath.div", "scicalc.complexMath.sub", "scicalc.complexMath.add"],
				["^", "*", "/", "-", "+"],
				[true,false,false,false,false]);

		var tempans;
	
		tempans = scicalc.f.compute(exp);
		
		this.ans = tempans;
		scicalc.main.addHistory(str2add,tempans);
		if (assignMode) {
			this.setVar(v2assign,this.ans);
			return v2assign+"="+tempans.toString();
		}
		return tempans.toString();
		
	}
};