/* E-REPORT/SAGS V3.25 QUICK TIME CLEAR - consolidated runtime. */
(function(){
'use strict';
var phase=(document.currentScript&&document.currentScript.dataset&&document.currentScript.dataset.phase)||'';
if(phase==='qr'){

/* ===== BEGIN qr-local.js ===== */
/* Local QR encoder for SAGS handover.
   Based on QRCode for JavaScript by Kazuhiko Arase (MIT license),
   as bundled by qrcode-terminal. */
(function(global){
"use strict";
const __mods={};
const __cache={};
function __norm(base,req){
  if(req[0]!==".")return req;
  const a=base.split("/");a.pop();
  for(const part of req.split("/")){
    if(part==="."||!part)continue;
    if(part==="..")a.pop(); else a.push(part);
  }
  let x=a.join("/");
  if(!/\.js$/.test(x))x+=".js";
  return x;
}
function __req(id,from){
  let key=id;
  if(id[0]===".")key=__norm(from||"/QRCode/index.js",id);
  if(!/\.js$/.test(key))key+=".js";
  if(__cache[key])return __cache[key].exports;
  const fn=__mods[key];
  if(!fn)throw new Error("QR module not found: "+key);
  const module={exports:{}};__cache[key]=module;
  fn((r)=>__req(r,key),module,module.exports);
  return module.exports;
}
__mods["/QRCode/index.js"]=function(require,module,exports){
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

};
__mods["/QRCode/QR8bitByte.js"]=function(require,module,exports){
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

};
__mods["/QRCode/QRBitBuffer.js"]=function(require,module,exports){
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

};
__mods["/QRCode/QRErrorCorrectLevel.js"]=function(require,module,exports){
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


};
__mods["/QRCode/QRMaskPattern.js"]=function(require,module,exports){
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

};
__mods["/QRCode/QRMath.js"]=function(require,module,exports){
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

};
__mods["/QRCode/QRMode.js"]=function(require,module,exports){
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

};
__mods["/QRCode/QRPolynomial.js"]=function(require,module,exports){
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

};
__mods["/QRCode/QRRSBlock.js"]=function(require,module,exports){
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

};
__mods["/QRCode/QRUtil.js"]=function(require,module,exports){
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

};

const QRCode=__req("/QRCode/index.js");
const EC=__req("/QRCode/QRErrorCorrectLevel.js");

function renderCanvas(text,canvas,size){
  if(!canvas)return;
  const qr=new QRCode(-1,EC.M);
  qr.addData(String(text||""));
  qr.make();
  const n=qr.getModuleCount();
  const quiet=4;
  const px=Math.max(180,Number(size)||240);
  const total=n+quiet*2;
  canvas.width=px;canvas.height=px;
  const ctx=canvas.getContext("2d");
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle="#fff";ctx.fillRect(0,0,px,px);
  const cell=px/total;
  ctx.fillStyle="#000";
  for(let r=0;r<n;r++){
    for(let c=0;c<n;c++){
      if(qr.isDark(r,c)){
        const x=Math.floor((c+quiet)*cell);
        const y=Math.floor((r+quiet)*cell);
        const x2=Math.ceil((c+quiet+1)*cell);
        const y2=Math.ceil((r+quiet+1)*cell);
        ctx.fillRect(x,y,x2-x,y2-y);
      }
    }
  }
}
global.SagsQRCode={renderCanvas};
})(window);

/* ===== END qr-local.js ===== */
}
if(phase==='config'){

/* ===== BEGIN firebase-config.js ===== */
// E-REPORT SAGS · Firebase Web App config for GitHub Pages
// Project: e-report-sags
// GitHub Pages hosts the web app; Firebase is used only as backend services.
// Firebase Web config is client-side configuration. Do not place service-account/private keys here.
window.SAGS_FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyCImOnRxvqbL-sRGbiS2eFE_Wmvktgc8oI",
  authDomain: "e-report-sags.firebaseapp.com",
  databaseURL: "https://e-report-sags-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "e-report-sags",
  storageBucket: "e-report-sags.firebasestorage.app",
  messagingSenderId: "670672018280",
  appId: "1:670672018280:web:46c336986ecdbbc6a954dd",
  measurementId: "G-JFTKH5BHPX"
});

/* ===== END firebase-config.js ===== */
}
if(phase==='archive'){

/* ===== BEGIN v488-archive.js ===== */
/* E-Report V4.88
   - Ramp Presence: RTDB primary + sparse Firestore compatibility bridge.
   - Flight archive: one canonical snapshot per matched turnaround/flight group.
   - AD daily .ereport export/import viewer; R&S intentionally excluded.
*/
(function(){
"use strict";
const V488_VERSION="V4.88";
const V488_ARCHIVE_KIND="sags_flight_archive_v488";
const V488_ARCHIVE_CHUNK_KIND="sags_flight_archive_chunk_v488";
const V488_ARCHIVE_SCHEMA=1;
const V488_CHUNK_CHARS=250000;
const V488_SNAPSHOT_LOCAL_KEY="sagsArchiveSnapshotMapV488";
const V488_DOOR_SYNC_LOCAL_KEY="sagsArchiveDoorSyncMapV488";
const V488_PRESENCE_LOCAL_KEY="sagsRampPresenceMapV488";
const V488_CLOSEOUT_SEEN_KEY="sagsCloseoutSignalSeenV488";
const V488_BRIDGE_REFRESH_MS=12*60*60*1000;
const V488_ARCHIVE_TTL_LABEL="Lưu đến khi AD tải hồ sơ và chủ động dọn dữ liệu";
let v488ArchiveData=null;
let v488PresencePublishing=false;
let v488PresenceTimer=null;
let v488ArchiveTimer=null;
let v488CloseoutRef=null,v488CloseoutAddedCb=null,v488CloseoutChangedCb=null;

function v488Esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function v488Clone(x){try{return JSON.parse(JSON.stringify(x));}catch(e){return null;}}
function v488LocalRead(key){try{const x=JSON.parse(localStorage.getItem(sagsOwnedKey(key))||"{}");return x&&typeof x==="object"?x:{};}catch(e){return {};}}
function v488LocalWrite(key,x){try{localStorage.setItem(sagsOwnedKey(key),JSON.stringify(x||{}));}catch(e){}}
function v488DayFromToken(t){const s=String(t||"").replace(/\D/g,"");return /^\d{8}$/.test(s)?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:"";}
function v488TokenFromDay(d){return String(d||"").replace(/\D/g,"").slice(0,8);}
function v488CxrDay(ms){try{return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(Number(ms)||Date.now()));}catch(e){return new Date(Number(ms)||Date.now()).toISOString().slice(0,10);}}
function v488Time(ms){if(!ms)return "";try{return new Intl.DateTimeFormat("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(Number(ms)));}catch(e){return new Date(Number(ms)).toLocaleString("vi-VN");}}
function v488HashFast(text){return typeof fs09Hash==="function"?fs09Hash(String(text||"")):String(Math.abs(String(text||"").split("").reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0)|0,0)));}
async function v488Sha256(text){try{const b=new TextEncoder().encode(String(text));const h=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");}catch(e){return "fnv-"+v488HashFast(text);}}
function v488BytesToBase64(bytes){let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+0x8000)));return btoa(s);}
function v488Base64ToBytes(s){const b=atob(String(s||"")),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
async function v488PackJson(obj){const raw=JSON.stringify(obj);if(typeof CompressionStream!=="undefined"){try{const cs=new CompressionStream("gzip"),w=cs.writable.getWriter();await w.write(new TextEncoder().encode(raw));await w.close();const ab=await new Response(cs.readable).arrayBuffer();return {encoding:"gzip-base64",data:v488BytesToBase64(new Uint8Array(ab)),rawChars:raw.length};}catch(e){}}
return {encoding:"json",data:raw,rawChars:raw.length};}
async function v488UnpackJson(encoding,data){if(encoding==="gzip-base64"&&typeof DecompressionStream!=="undefined"){const ds=new DecompressionStream("gzip"),w=ds.writable.getWriter();await w.write(v488Base64ToBytes(data));await w.close();return JSON.parse(await new Response(ds.readable).text());}return JSON.parse(String(data||"{}"));}
function v488Intersect(a,b){const s=new Set(Array.isArray(a)?a:[]);return (Array.isArray(b)?b:[]).some(x=>s.has(x));}
function v488DocKeys(d){const out=new Set();const add=x=>{if(Array.isArray(x))x.forEach(k=>k&&out.add(String(k)));};add(d?.matchKeys);add(d?.rampMatchKeys);add(d?.identity?.matchKeys);add(d?.identity?.rampMatchKeys);add(d?.finalSnapshot?.matchKeys);add(d?.finalSnapshot?.rampMatchKeys);add(d?.finalSnapshot?.identity?.matchKeys);add(d?.finalSnapshot?.identity?.rampMatchKeys);if(!out.size&&d?.identity?.dateToken&&d?.identity?.acRegToken){const fs=[...(Array.isArray(d.identity.flights)?d.identity.flights:[]),d.identity.flightToken].filter(Boolean);fs.forEach(f=>{const k=fs09MakeMatchKey?.(d.identity.dateToken,f,d.identity.acRegToken,"CXR");if(k)out.add(k);});}return [...out];}
function v488IdentityLabel(i,meta){const fs=(i?.flights||[]).filter(Boolean).join(" / ")||String(meta?.name||"").trim()||"CHUYẾN";return `${fs}${i?.acRegToken?" · "+i.acRegToken:""}`;}

/* ---------- UI ---------- */
function v488InstallUi(){
  if(document.getElementById("v488ArchiveModal"))return;
  const style=document.createElement("style");style.id="v488ArchiveStyle";style.textContent=`
  #v488ArchiveModal{position:fixed;inset:0;z-index:16000;background:rgba(0,0,0,.58);display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:Arial,sans-serif}
  .v488Box{width:min(97vw,1120px);max-height:94vh;overflow:auto;background:#f5f8fb;border-radius:16px;padding:15px;box-shadow:0 15px 44px rgba(0,0,0,.35);color:#17324d}.v488Top{display:flex;justify-content:space-between;gap:8px;align-items:center;position:sticky;top:-15px;background:#f5f8fb;z-index:3;padding:10px 0 8px}.v488Top h2{font-size:20px;margin:0;color:#064f9e}.v488Actions{display:flex;gap:7px;flex-wrap:wrap}.v488Btn{border:0;border-radius:9px;padding:10px 12px;font-weight:800;background:#0b6aa9;color:#fff}.v488Btn.gray{background:#e5e9ef;color:#243746}.v488Btn.green{background:#167947}.v488Btn.red{background:#b42318}.v488Card{background:#fff;border:1px solid #d6e0ea;border-radius:12px;padding:11px;margin:9px 0}.v488Grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:9px}.v488Flight{border:1px solid #ccd9e6;background:#fff;border-radius:12px;padding:12px}.v488Flight h3{margin:0 0 5px;color:#064f9e;font-size:17px}.v488Pills{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.v488Pill{font-size:11px;font-weight:800;padding:4px 7px;border-radius:999px;background:#eef3f8;color:#52677b}.v488Pill.ok{background:#e8f6ee;color:#137333}.v488Pill.warn{background:#fff4dd;color:#8a5700}.v488Status{font-size:13px;line-height:1.45;min-height:20px;margin:7px 0;color:#344054}.v488Status.err{color:#b42318;font-weight:800}.v488Status.ok{color:#137333;font-weight:800}.v488Section{margin:12px 0}.v488Section h3{font-size:15px;margin:0 0 6px;color:#344054}.v488Table{width:100%;border-collapse:collapse;font-size:12px;background:#fff}.v488Table td,.v488Table th{border:1px solid #dce4ec;padding:5px 7px;vertical-align:top;word-break:break-word}.v488Table th{background:#eef4f9;text-align:left}.v488Preview img{display:block;width:min(100%,760px);height:auto;margin:10px auto;border:1px solid #b9c7d5;background:#fff;box-shadow:0 3px 10px rgba(0,0,0,.12)}.v488Thumbs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.v488Thumbs img{width:100%;max-height:240px;object-fit:contain;background:#fff;border:1px solid #ccd6e0;border-radius:8px}.v488Small{font-size:12px;color:#65758b;line-height:1.4}.v488Input{border:1px solid #b9c6d4;border-radius:8px;padding:9px;background:#fff;font:14px Arial}.v488Details{background:#fff;border:1px solid #d6e0ea;border-radius:10px;padding:10px;margin-top:8px}.v488Details summary{cursor:pointer;font-weight:800;color:#344054}
  @media(max-width:600px){.v488Box{padding:10px}.v488Top{top:-10px}.v488Top{align-items:flex-start}.v488Actions{justify-content:flex-end}.v488Btn{padding:8px 9px;font-size:12px}}
  `;document.head.appendChild(style);
  const modal=document.createElement("div");modal.id="v488ArchiveModal";modal.innerHTML=`<div class="v488Box"><div class="v488Top"><div><h2>HỒ SƠ LƯU TRỮ · E-REPORT</h2><div class="v488Small">1 file/ngày · tự gom theo đúng chuyến · R&amp;S không nằm trong file ngày</div></div><div class="v488Actions"><button class="v488Btn gray" onclick="v488CloseArchive()">ĐÓNG</button></div></div><div class="v488Card"><div class="v488Actions"><input id="v488ArchiveDay" class="v488Input" type="date"><button class="v488Btn green" onclick="v488ExportDailyArchive()">XUẤT HỒ SƠ NGÀY</button><button class="v488Btn" onclick="v488SyncClosedLocalFlights()">ĐỒNG BỘ HỒ SƠ ĐÃ ĐÓNG TRÊN MÁY NÀY</button><button class="v488Btn gray" onclick="document.getElementById('v488ArchiveFile').click()">MỞ FILE .EREPORT</button><input id="v488ArchiveFile" type="file" accept=".ereport,application/json,application/octet-stream" style="display:none" onchange="v488ImportArchiveFile(this.files?.[0])"></div><div id="v488ArchiveStatus" class="v488Status"></div><div class="v488Small"><b>Lưu ý:</b> file nhập lại chỉ được đọc cục bộ trên máy. Chế độ xem hồ sơ không ghi Firestore/RTDB và không kích hoạt FINAL/CROSSCHECK.</div></div><div id="v488ArchiveList"></div><div id="v488ArchiveDetail"></div></div>`;document.body.appendChild(modal);
  const tb=document.querySelector(".toolbar-row.main-actions");if(tb&&!document.getElementById("roleBtnArchive")){const b=document.createElement("button");b.id="roleBtnArchive";b.textContent="Hồ sơ";b.style.display="none";b.onclick=()=>v488OpenArchive();const anchor=document.getElementById("roleBtnAudit");if(anchor)tb.insertBefore(b,anchor);else tb.appendChild(b);}
  const inp=document.getElementById("v488ArchiveDay");if(inp&&!inp.value)inp.value=v488CxrDay(Date.now());
}
function v488SetStatus(t,kind=""){const e=document.getElementById("v488ArchiveStatus");if(e){e.textContent=t||"";e.className="v488Status"+(kind?" "+kind:"");}}
function v488OpenArchive(){if(String(currentRole||"")!=="AD")return roleDenied?.("Chỉ AD được xuất/mở kho hồ sơ.");v488InstallUi();document.getElementById("v488ArchiveModal").style.display="flex";v488SetStatus("Chọn ngày để xuất, hoặc mở file .ereport đã lưu trên ổ cứng.");}
function v488CloseArchive(){const m=document.getElementById("v488ArchiveModal");if(m)m.style.display="none";}
window.v488OpenArchive=v488OpenArchive;window.v488CloseArchive=v488CloseArchive;

/* ---------- RTDB Ramp Presence ---------- */
function v488PresenceNodeKey(matchKey){return sagsV470Safe?.(v488HashFast(matchKey))||v488HashFast(matchKey);}
function v488PresenceDeviceKey(){return sagsV470Safe?.(ffDeviceId?.()||fs09DeviceId?.()||"DEVICE")||"DEVICE";}
function v488PresencePayload(meta,x,now){return {kind:"sags_ramp_presence_v488",matchKey:String(x.keys[0]||""),dateToken:String(x.id.dateToken||""),flights:Array.isArray(x.id.flights)?x.id.flights:[],acRegToken:String(x.id.acRegToken||""),station:String(x.id.station||"CXR"),flightName:typeof flightSessionDisplayName==="function"?flightSessionDisplayName(meta):String(meta?.name||""),sourceDeviceId:String(ffDeviceId?.()||fs09DeviceId?.()||""),sourceSessionId:String(meta.id||""),ownerAccountKey:String(sagsStorageOwnerKey?.()||""),ownerUsername:String(currentUserProfile?.username||""),ownerRole:String(currentRole||""),doorClosed:!!x.doorClosed,doorCloseTime:String(x.doorCloseTime||""),updatedAtMs:now,expiresAtMs:now+FF_RAMP_PRESENCE_TTL_MS,appVersion:V488_VERSION};}
function v488PresenceFingerprint(p){return JSON.stringify([p.dateToken,p.flights,p.acRegToken,p.station,p.sourceSessionId,p.ownerUsername,p.ownerRole,p.doorClosed,p.doorCloseTime]);}
async function v488PublishPresence(force=false){
  if(v488PresencePublishing||typeof sagsV470Ref!=="function")return;v488PresencePublishing=true;
  try{
    const now=Date.now(),device=v488PresenceDeviceKey(),old=v488LocalRead(V488_PRESENCE_LOCAL_KEY),next={},updates={},bridges=[],deletes=[];
    for(const meta of readFlightSessionList()){
      const x=ffRampPresenceIdentity(meta);if(!x)continue;
      for(const key of x.keys){const base=v488PresencePayload(meta,x,now);base.matchKey=key;const fp=v488PresenceFingerprint(base),slot=meta.id+"|"+key,node=v488PresenceNodeKey(key),exact=`ramp_presence/${node}/${device}`,flightToken=(Array.isArray(x.id.flights)?x.id.flights:[]).find(f=>fs09MakeMatchKey(x.id.dateToken,f,x.id.acRegToken,x.id.station)===key)||String(base.flights[0]||""),lookup=`ramp_presence_lookup/${sagsV470Safe(x.id.dateToken)}/${sagsV470Safe(flightToken)}/${device}_${node}`;const prev=old[slot]||{},changed=prev.fp!==fp,refresh=force||changed||now-Number(prev.rtdbAtMs||0)>6*60*60*1000;if(refresh){updates[exact]=base;updates[lookup]=base;}const needBridge=changed||now-Number(prev.bridgeAtMs||0)>V488_BRIDGE_REFRESH_MS;if(needBridge){bridges.push({key,payload:base});}next[slot]={fp,exact,lookup,matchKey:key,sourceSessionId:meta.id,rtdbAtMs:refresh?now:Number(prev.rtdbAtMs||0),bridgeAtMs:needBridge?now:Number(prev.bridgeAtMs||0)};}
    }
    for(const [slot,prev] of Object.entries(old)){if(next[slot])continue;if(prev.exact)updates[prev.exact]=null;if(prev.lookup)updates[prev.lookup]=null;if(prev.matchKey)deletes.push(prev.matchKey);}
    if(Object.keys(updates).length)await sagsV470Ref("").update(updates);
    // Compatibility bridge for V4.87/older devices: only on identity/Door Close change, or max once/12h.
    if(bridges.length||deletes.length){const db=initHandoverFirebase(),dev=ffDeviceId();for(const b of bridges){await db.collection(HANDOVER_COLLECTION).doc(ffRampPresenceDocId(dev,b.key)).set({...b.payload,kind:FF_RAMP_PRESENCE_KIND,compatBridgeV488:true},{merge:false});}for(const key of deletes){await db.collection(HANDOVER_COLLECTION).doc(ffRampPresenceDocId(dev,key)).delete().catch(()=>{});}}
    v488LocalWrite(V488_PRESENCE_LOCAL_KEY,next);
  }catch(e){console.info("V4.88 Ramp Presence",e?.message||e);}finally{v488PresencePublishing=false;}
}
function v488SchedulePresence(delay=500,force=false){if(v488PresenceTimer)clearTimeout(v488PresenceTimer);v488PresenceTimer=setTimeout(()=>{v488PresenceTimer=null;v488PublishPresence(force);},Math.max(0,delay));}
async function v488RtdbPresenceByKey(key){try{const s=await sagsV470Ref(`ramp_presence/${v488PresenceNodeKey(key)}`).once("value"),now=Date.now(),arr=[];s.forEach(c=>{const d=c.val()||{};if(d.matchKey!==key)return;if(Number(d.expiresAtMs||0)&&Number(d.expiresAtMs)<now)return;arr.push(d);});arr.sort((a,b)=>Number(b.updatedAtMs||0)-Number(a.updatedAtMs||0));return arr;}catch(e){return [];}}
async function v488FirestorePresenceFallback(keys){try{const db=initHandoverFirebase(),now=Date.now();for(const key of keys){const snap=await db.collection(HANDOVER_COLLECTION).where("matchKey","==",key).get();for(const doc of snap.docs){const d=doc.data()||{};if(d.kind!==FF_RAMP_PRESENCE_KIND)continue;if(Number(d.expiresAtMs||0)&&Number(d.expiresAtMs)<now)continue;return d;}}}catch(e){}return null;}
function v488OverridePresence(){
  if(typeof ffPublishAllLocalRampPresence==="function")ffPublishAllLocalRampPresence=function(){return v488PublishPresence(false);};
  if(typeof ffScheduleRampPresencePublish==="function")ffScheduleRampPresencePublish=function(delay=350){return v488SchedulePresence(delay,false);};
  if(typeof ffCheckCloudRampPresence==="function")ffCheckCloudRampPresence=async function(finalId){const keys=Array.isArray(finalId?.rampMatchKeys)?finalId.rampMatchKeys.filter(Boolean):[];if(!keys.length)return {checked:true,ok:false,message:"FINAL THIẾU DỮ LIỆU ĐỂ ĐỐI CHIẾU",detail:"Cần đủ DATE + FLIGHT + A/C REG."};let foundClosed=false,closedInfo="";for(const key of keys){const arr=await v488RtdbPresenceByKey(key);for(const d of arr){if(d.doorClosed){foundClosed=true;closedInfo=d.doorCloseTime||"";continue;}return {checked:true,ok:true,remote:true,presence:d,message:"",detail:""};}}const legacy=await v488FirestorePresenceFallback(keys);if(legacy){if(legacy.doorClosed){foundClosed=true;closedInfo=legacy.doorCloseTime||closedInfo;}else return {checked:true,ok:true,remote:true,presence:legacy,compat:true,message:"",detail:""};}if(foundClosed)return {checked:true,ok:false,message:"TỜ RAMP KHỚP ĐÃ DOOR CLOSE",detail:"Có tờ Ramp khớp nhưng chuyến đã đóng"+(closedInfo?" lúc "+closedInfo:"")+"."};return {checked:true,ok:false,message:"CHƯA THẤY TỜ RAMP KHỚP TRÊN MÁY CHỦ",detail:"V4.88 đối chiếu RTDB theo DATE + FLIGHT + A/C REG + CXR; Firestore chỉ dùng fallback tương thích bản cũ."};};
  if(typeof kh208FindMatchingRampPresence==="function")kh208FindMatchingRampPresence=async function(identity){if(!identity?.flightToken||!identity?.dateToken)return {valid:false,matched:false,message:"Cần đủ Số hiệu chuyến bay + Ngày."};try{const path=`ramp_presence_lookup/${sagsV470Safe(identity.dateToken)}/${sagsV470Safe(identity.flightToken)}`,s=await sagsV470Ref(path).once("value"),now=Date.now(),matches=[];s.forEach(c=>{const d=c.val()||{};if(Number(d.expiresAtMs||0)&&Number(d.expiresAtMs)<now)return;if(identity.acRegToken&&String(d.acRegToken||"")!==identity.acRegToken)return;matches.push(d);});matches.sort((a,b)=>Number(b.updatedAtMs||0)-Number(a.updatedAtMs||0));if(matches.length)return {valid:true,matched:true,presence:matches[0],count:matches.length};return {valid:true,matched:false,presence:null,count:0,message:"Không có tờ Ramp khớp. Phiếu vẫn được phép gửi broadcast cho ĐH + CBTT + AD."};}catch(e){return {valid:true,matched:false,presence:null,count:0,lookupError:true,message:"Không kiểm tra được tờ Ramp. Phiếu vẫn gửi broadcast."};}};
  setTimeout(()=>v488SchedulePresence(100,true),500);window.addEventListener("focus",()=>v488SchedulePresence(120,true));window.addEventListener("online",()=>v488SchedulePresence(120,true));document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")v488SchedulePresence(120,true);});
}

/* ---------- canonical Ramp/BBBT snapshot ---------- */
function v488ArchiveParentId(keys){return "EARCH_"+v488HashFast((Array.isArray(keys)?keys:[]).slice().sort().join("__"));}
function v488SnapshotMap(){return v488LocalRead(V488_SNAPSHOT_LOCAL_KEY);}
function v488DoorMap(){return v488LocalRead(V488_DOOR_SYNC_LOCAL_KEY);}
async function v488SnapshotSession(meta,trigger="MANUAL"){
  try{if(!meta?.id)return false;const env=readFlightSessionEnvelope(meta.id)||{},main=String(meta.initialGroup||env.mainForm||"");if(!["fsags","fsags421","fsags551"].includes(main))return false;const x=ffRampPresenceIdentity(meta)||(()=>{const id=fs09RampIdentityFromState(env.state||{},meta);return id?.matchKeys?.length?{id,keys:id.matchKeys,doorClosed:ffRampSessionHasDoorClose?.(meta)||false,doorCloseTime:String(env.state?.h21Start||env.state?.f421_h21Start||"")}:null;})();if(!x?.keys?.length||!x.id?.dateToken||!x.id?.acRegToken)return false;const payload={format:"E-REPORT-FLIGHT-SNAPSHOT",schemaVersion:V488_ARCHIVE_SCHEMA,appVersion:V488_VERSION,station:"CXR",archiveDayKey:v488DayFromToken(x.id.dateToken),identity:v488Clone(x.id),matchKeys:x.keys.slice(),flightName:typeof flightSessionDisplayName==="function"?flightSessionDisplayName(meta):String(meta.name||""),sessionMeta:v488Clone(meta),envelope:v488Clone(env),source:{deviceId:String(ffDeviceId?.()||fs09DeviceId?.()||""),sessionId:String(meta.id),username:String(currentUserProfile?.username||""),name:String(currentUserProfile?.name||""),role:String(currentRole||"")},trigger:String(trigger||""),capturedAtMs:Date.now()};const contentHashSource=JSON.stringify({identity:payload.identity,matchKeys:payload.matchKeys,flightName:payload.flightName,sessionMeta:payload.sessionMeta,envelope:payload.envelope}),raw=JSON.stringify(payload),hash=await v488Sha256(contentHashSource),parentId=v488ArchiveParentId(x.keys),local=v488SnapshotMap();if(local[parentId]?.hash===hash)return true;const packed={encoding:"json",data:raw,rawChars:raw.length},chunks=[];for(let i=0;i<packed.data.length;i+=V488_CHUNK_CHARS)chunks.push(packed.data.slice(i,i+V488_CHUNK_CHARS));const db=initHandoverFirebase(),parent=db.collection(HANDOVER_COLLECTION).doc(parentId),batch=db.batch(),now=Date.now();batch.set(parent,{kind:V488_ARCHIVE_KIND,schemaVersion:V488_ARCHIVE_SCHEMA,appVersion:V488_VERSION,archiveDayKey:payload.archiveDayKey,dateToken:String(x.id.dateToken||""),flights:Array.isArray(x.id.flights)?x.id.flights:[],acRegToken:String(x.id.acRegToken||""),station:"CXR",matchKeys:x.keys.slice(),flightName:payload.flightName,source:payload.source,trigger:payload.trigger,payloadHash:hash,encoding:packed.encoding,chunkCount:chunks.length,rawChars:packed.rawChars,updatedAtMs:now,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),retention:V488_ARCHIVE_TTL_LABEL},{merge:false});chunks.forEach((data,i)=>batch.set(db.collection(HANDOVER_COLLECTION).doc(`${parentId}__${String(i+1).padStart(3,"0")}`),{kind:V488_ARCHIVE_CHUNK_KIND,parentId,index:i+1,data,updatedAtMs:now},{merge:false}));await batch.commit();const prevCount=Number(local[parentId]?.chunkCount||0);if(prevCount>chunks.length){for(let i=chunks.length+1;i<=prevCount;i++)await db.collection(HANDOVER_COLLECTION).doc(`${parentId}__${String(i).padStart(3,"0")}`).delete().catch(()=>{});}local[parentId]={hash,chunkCount:chunks.length,at:now,day:payload.archiveDayKey};v488LocalWrite(V488_SNAPSHOT_LOCAL_KEY,local);return true;}catch(e){console.warn("V4.88 archive snapshot",e);return false;}}
function v488ScheduleDoorArchive(delay=1800){if(v488ArchiveTimer)clearTimeout(v488ArchiveTimer);v488ArchiveTimer=setTimeout(async()=>{v488ArchiveTimer=null;const map=v488DoorMap();let changed=false;for(const meta of readFlightSessionList()){if(!ffRampSessionHasDoorClose?.(meta))continue;const x=ffRampPresenceIdentity(meta);if(!x?.keys?.length)continue;const fp=x.keys.slice().sort().join("|")+"|"+String(x.doorCloseTime||"");if(map[meta.id]===fp)continue;if(await v488SnapshotSession(meta,"DOOR_CLOSE")){map[meta.id]=fp;changed=true;}}if(changed)v488LocalWrite(V488_DOOR_SYNC_LOCAL_KEY,map);},delay);}
async function v488SyncClosedLocalFlights(){if(String(currentRole||"")!=="AD")return;v488SetStatus("Đang đồng bộ các hồ sơ đã Door Close/Kết sổ trên máy này...");let ok=0,skip=0;for(const meta of readFlightSessionList()){const env=readFlightSessionEnvelope(meta.id)||{},closed=ffRampSessionHasDoorClose?.(meta)||!!env.fs09Cloud;if(!closed){skip++;continue;}if(await v488SnapshotSession(meta,"AD_MANUAL_SYNC"))ok++;}v488SetStatus(`Đã rà ${ok+skip} chuyến trên máy này · đồng bộ/đã có ${ok} · chưa đóng ${skip}.`,"ok");}
window.v488SyncClosedLocalFlights=v488SyncClosedLocalFlights;
function v488HookArchiveLifecycle(){
  // Existing persist already schedules presence. Add only a cheap local Door Close detector.
  const basePersist=persist;persist=function(){const out=basePersist.apply(this,arguments);v488ScheduleDoorArchive(2000);return out;};window.persist=persist;
  if(typeof attachIncomingFS09==="function"){const baseAttach=attachIncomingFS09;attachIncomingFS09=function(payload){const m=baseAttach.apply(this,arguments);if(m)setTimeout(()=>v488SnapshotSession(m,"CLOSEOUT"),80);return m;};window.attachIncomingFS09=attachIncomingFS09;}
  setTimeout(()=>v488ScheduleDoorArchive(300),1200);
}

/* ---------- KẾT SỔ RTDB event signal ---------- */
async function v488PublishCurrentCloseoutSignal(ctx){try{const i=ctx?.identity;if(!i?.matchKeys?.length)return false;const docId="KS09_"+fs09Hash(i.matchKeys.join("__")),snap=await initHandoverFirebase().collection(HANDOVER_COLLECTION).doc(docId).get();if(!snap.exists)return false;const d=snap.data()||{};if(Number(d.submittedAtMs||0)<Number(ctx.startedAtMs||0)-1000)return false;await sagsV470Ref("closeouts/"+sagsV470Safe(docId)).set({docId,eventAtMs:Date.now(),submittedAtMs:Number(d.submittedAtMs||Date.now()),closeoutNo:Number(d.closeoutNo||d.revisionNo||1),matchKeys:fs09PayloadMatchKeys(d),dateToken:String(d.identity?.dateToken||""),flights:Array.isArray(d.identity?.flights)?d.identity.flights:[],acRegToken:String(d.identity?.acRegToken||""),sourceDeviceId:String(d.sourceDeviceId||""),sourceSessionId:String(d.sourceSessionId||""),appVersion:V488_VERSION});return true;}catch(e){console.info("V4.88 closeout signal",e?.message||e);return false;}}
function v488HookCloseoutSend(){if(typeof sendFSAGS09CloseoutAuthorized!=="function")return;const base=sendFSAGS09CloseoutAuthorized;sendFSAGS09CloseoutAuthorized=async function(){let identity=null;try{identity=fs09IdentityFromState(state,currentFlightSessionMeta?.());}catch(e){}const ctx={identity:v488Clone(identity),startedAtMs:Date.now()};const out=await base.apply(this,arguments);setTimeout(()=>v488PublishCurrentCloseoutSignal(ctx),120);return out;};window.sendFSAGS09CloseoutAuthorized=sendFSAGS09CloseoutAuthorized;}
function v488CloseoutSeen(){return v488LocalRead(V488_CLOSEOUT_SEEN_KEY);}
async function v488HandleCloseoutSignal(s){const sig=s.val()||{};if(!sig.docId||Date.now()-Number(sig.eventAtMs||0)>72*60*60*1000)return;const localKeys=typeof fs09CollectRampMatchKeys==="function"?fs09CollectRampMatchKeys():[];if(!v488Intersect(localKeys,sig.matchKeys||[]))return;const seen=v488CloseoutSeen();if(Number(seen[sig.docId]||0)>=Number(sig.submittedAtMs||0))return;try{const doc=await initHandoverFirebase().collection(HANDOVER_COLLECTION).doc(sig.docId).get();if(!doc.exists)return;const d=doc.data()||{},m=attachIncomingFS09(d);if(m){seen[sig.docId]=Number(sig.submittedAtMs||Date.now());v488LocalWrite(V488_CLOSEOUT_SEEN_KEY,seen);setTimeout(()=>v488SnapshotSession(m,"CLOSEOUT_SIGNAL"),80);}}catch(e){console.info("V4.88 closeout receive",e?.message||e);}}
function v488StartCloseoutSignals(){try{if(v488CloseoutRef){if(v488CloseoutAddedCb)v488CloseoutRef.off("child_added",v488CloseoutAddedCb);if(v488CloseoutChangedCb)v488CloseoutRef.off("child_changed",v488CloseoutChangedCb);}v488CloseoutRef=sagsV470Ref("closeouts").orderByChild("eventAtMs").limitToLast(80);v488CloseoutAddedCb=v488HandleCloseoutSignal;v488CloseoutChangedCb=v488HandleCloseoutSignal;v488CloseoutRef.on("child_added",v488CloseoutAddedCb);v488CloseoutRef.on("child_changed",v488CloseoutChangedCb);}catch(e){console.info("V4.88 closeout listener",e?.message||e);}}

/* ---------- daily archive export ---------- */
async function v488FetchKind(kind){try{const q=await initHandoverFirebase().collection(HANDOVER_COLLECTION).where("kind","==",kind).get(),a=[];q.forEach(d=>a.push({__docId:d.id,...(d.data()||{})}));return a;}catch(e){console.warn("V4.88 query",kind,e);return [];}}
async function v488LoadSnapshot(parent){let data="";for(let i=1;i<=Number(parent.chunkCount||0);i++){const id=`${parent.__docId}__${String(i).padStart(3,"0")}`,s=await initHandoverFirebase().collection(HANDOVER_COLLECTION).doc(id).get();if(!s.exists)throw new Error("Thiếu chunk "+i+" của "+parent.flightName);data+=String(s.data()?.data||"");}const payload=await v488UnpackJson(parent.encoding,data);return {...payload,__parent:parent};}
function v488DocDateToken(d){return String(d?.dateToken||d?.identity?.dateToken||d?.finalSnapshot?.identity?.dateToken||"");}
function v488OpsEventsFromBroadcast(docs){const a=[];for(const d of docs){if(Array.isArray(d.events))d.events.forEach(x=>a.push(x));else if(d.eventType)a.push(d);}return a;}
function v488MatchAuditToFlight(a,f,day){if(v488CxrDay(a.createdAtMs||0)!==day)return false;const txt=JSON.stringify(a.meta||{}).toUpperCase(),fl=(f.identity?.flights||[]).map(x=>String(x).toUpperCase()),reg=String(f.identity?.acRegToken||"").toUpperCase();return fl.some(x=>x&&txt.includes(x))&&(!reg||txt.includes(reg));}
async function v488ExportDailyArchive(){
  if(String(currentRole||"")!=="AD")return;const day=document.getElementById("v488ArchiveDay")?.value||v488CxrDay(Date.now()),token=v488TokenFromDay(day);if(token.length!==8)return v488SetStatus("Ngày không hợp lệ.","err");v488SetStatus("Đang tải snapshot Ramp/BBBT và hồ sơ FINAL/CROSSCHECK của "+day+"...");
  try{
    const [parents,finals,cross,closeouts,kh208,audits,opsDocs]=await Promise.all([v488FetchKind(V488_ARCHIVE_KIND),v488FetchKind(FF_CLOUD_KIND),v488FetchKind(CX_CLEAN_KIND),v488FetchKind(FS09_CLOSEOUT_KIND),typeof KH208_KIND!=="undefined"?v488FetchKind(KH208_KIND):Promise.resolve([]),v488FetchKind(PERSONAL_AUDIT_KIND),typeof OPS_BROADCAST_KIND!=="undefined"?v488FetchKind(OPS_BROADCAST_KIND):Promise.resolve([])]);
    const dayParents=parents.filter(p=>String(p.archiveDayKey||"")===day||String(p.dateToken||"")===token),flights=[];for(let n=0;n<dayParents.length;n++){v488SetStatus(`Đang giải nén hồ sơ chuyến ${n+1}/${dayParents.length}...`);try{const snap=await v488LoadSnapshot(dayParents[n]);flights.push(snap);}catch(e){throw e;}}
    if(!flights.length)return v488SetStatus("Chưa có snapshot Ramp/BBBT nào của ngày này trên Firebase. Hãy bảo đảm các chuyến đã Door Close/Kết sổ trên V4.88.","err");
    const ops=v488OpsEventsFromBroadcast(opsDocs);
    for(const f of flights){const keys=f.matchKeys||[];f.finalDocs=finals.filter(d=>v488DocDateToken(d)===token&&v488Intersect(keys,v488DocKeys(d)));f.crosschecks=cross.filter(d=>(!v488DocDateToken(d)||v488DocDateToken(d)===token)&&v488Intersect(keys,v488DocKeys(d)));f.closeouts=closeouts.filter(d=>v488DocDateToken(d)===token&&v488Intersect(keys,v488DocKeys(d)));f.kh208=kh208.filter(d=>(!v488DocDateToken(d)||v488DocDateToken(d)===token)&&v488Intersect(keys,v488DocKeys(d)));f.audits=audits.filter(a=>v488MatchAuditToFlight(a,f,day));f.ops=ops.filter(o=>v488CxrDay(o.eventAtMs||o.createdAtMs||0)===day&&(v488Intersect(keys,v488DocKeys(o))||JSON.stringify(o).toUpperCase().includes(String(f.identity?.acRegToken||"").toUpperCase())));}
    const archive={format:"E-REPORT-DAILY-ARCHIVE",schemaVersion:V488_ARCHIVE_SCHEMA,appVersion:V488_VERSION,station:"CXR",operationalDate:day,exportedAtMs:Date.now(),exportedBy:{username:String(currentUserProfile?.username||""),name:String(currentUserProfile?.name||""),role:String(currentRole||"")},note:"R&S excluded: R&S is exported separately at deadline/completion.",manifest:{flightCount:flights.length,finalCount:flights.reduce((n,x)=>n+x.finalDocs.reduce((m,d)=>m+v488FinalRevisionRows(d).length,0),0),crosscheckCount:flights.reduce((n,x)=>n+x.crosschecks.length,0),closeoutCount:flights.reduce((n,x)=>n+x.closeouts.length,0),bbbtWithImages:flights.filter(x=>Array.isArray(x.envelope?.state?.bbbtAttachments)&&x.envelope.state.bbbtAttachments.length).length},flights};const unsigned=JSON.stringify(archive),checksum=await v488Sha256(unsigned);archive.checksum={algorithm:"SHA-256",value:checksum};const blob=new Blob([JSON.stringify(archive)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`EREPORT_CXR_${day}.ereport`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2500);v488ArchiveData=archive;v488RenderArchiveList(archive);v488SetStatus(`✓ Đã tạo ${a.download} · ${archive.manifest.flightCount} hồ sơ chuyến · ${archive.manifest.finalCount} FINAL · ${archive.manifest.crosscheckCount} CROSSCHECK.`,"ok");
  }catch(e){console.error(e);v488SetStatus("Không xuất được hồ sơ: "+String(e?.message||e),"err");}
}
window.v488ExportDailyArchive=v488ExportDailyArchive;

/* ---------- import + offline viewer ---------- */
async function v488ReadArchiveBlob(file){const ab=await file.arrayBuffer(),u=new Uint8Array(ab);if(u[0]===0x1f&&u[1]===0x8b){if(typeof DecompressionStream==="undefined")throw new Error("Trình duyệt chưa hỗ trợ giải nén GZIP.");const ds=new DecompressionStream("gzip"),w=ds.writable.getWriter();await w.write(u);await w.close();return JSON.parse(await new Response(ds.readable).text());}return JSON.parse(new TextDecoder().decode(u));}
async function v488ValidateArchive(a){if(a?.format!=="E-REPORT-DAILY-ARCHIVE")throw new Error("Không phải file E-Report Archive hợp lệ.");if(!Array.isArray(a.flights))throw new Error("File thiếu danh sách hồ sơ chuyến.");if(a.checksum?.value){const c=v488Clone(a),expected=String(c.checksum.value||"");delete c.checksum;const actual=await v488Sha256(JSON.stringify(c));if(actual!==expected)throw new Error("Checksum không khớp: file có thể bị thay đổi hoặc hỏng.");}return true;}
async function v488ImportArchiveFile(file){if(!file)return;v488SetStatus("Đang kiểm tra file "+file.name+"...");try{const a=await v488ReadArchiveBlob(file);await v488ValidateArchive(a);v488ArchiveData=a;v488RenderArchiveList(a);v488SetStatus(`✓ File toàn vẹn · ${a.operationalDate} · ${a.flights.length} hồ sơ chuyến. Đang xem OFFLINE, không ghi Firebase.`,"ok");}catch(e){v488ArchiveData=null;document.getElementById("v488ArchiveList").innerHTML="";document.getElementById("v488ArchiveDetail").innerHTML="";v488SetStatus("Không mở được file: "+String(e?.message||e),"err");}}
window.v488ImportArchiveFile=v488ImportArchiveFile;
window.v488GetArchiveData=()=>v488ArchiveData;
function v488Completeness(f){const st=f.envelope?.state||{},bbbt=Object.keys(st).some(k=>k.startsWith("bbbt")&&st[k]&&k!=="bbbtAttachments"),imgs=Array.isArray(st.bbbtAttachments)&&st.bbbtAttachments.length,final=Array.isArray(f.finalDocs)&&f.finalDocs.length,cross=Array.isArray(f.crosschecks)&&f.crosschecks.length,ks=Array.isArray(f.closeouts)&&f.closeouts.length;return {ramp:!!Object.keys(st).length,bbbt:bbbt||imgs,final,cross,ks};}
function v488RenderArchiveList(a){const host=document.getElementById("v488ArchiveList"),detail=document.getElementById("v488ArchiveDetail");if(detail)detail.innerHTML="";if(!host)return;host.innerHTML=`<div class="v488Card"><b>HỒ SƠ NGÀY ${v488Esc(a.operationalDate||"")}</b> · ${Number(a.manifest?.flightCount||a.flights.length)} chuyến <span class="v488Small">· xuất ${v488Esc(v488Time(a.exportedAtMs))}</span></div><div class="v488Grid">`+a.flights.map((f,i)=>{const c=v488Completeness(f),label=v488IdentityLabel(f.identity,f.sessionMeta);return `<div class="v488Flight"><h3>${v488Esc(label)}</h3><div class="v488Small">${v488Esc(v488DayFromToken(f.identity?.dateToken)||a.operationalDate||"")} · ${v488Esc(f.sessionMeta?.initialGroup||f.envelope?.mainForm||"")}</div><div class="v488Pills"><span class="v488Pill ${c.ramp?'ok':'warn'}">${c.ramp?'✓':'!'} RAMP</span><span class="v488Pill ${c.bbbt?'ok':'warn'}">${c.bbbt?'✓':'!'} BBBT</span><span class="v488Pill ${c.final?'ok':'warn'}">${c.final?'✓':'!'} FINAL ${c.final||''}</span><span class="v488Pill ${c.cross?'ok':'warn'}">${c.cross?'✓':'!'} CROSS ${c.cross||''}</span><span class="v488Pill ${c.ks?'ok':'warn'}">${c.ks?'✓':'!'} KẾT SỔ</span></div><div class="v488Actions" style="margin-top:9px"><button class="v488Btn" onclick="v488OpenArchiveFlight(${i})">MỞ HỒ SƠ</button><button class="v488Btn gray" onclick="v488PreviewArchivedForms(${i})">XEM BIỂU MẪU</button></div></div>`;}).join("")+`</div>`;}
function v488Val(v){if(v===true)return "✓";if(v===false)return "";if(typeof v==="string"&&v.startsWith("data:image/"))return "[Ảnh/Chữ ký]";if(Array.isArray(v))return `[${v.length} mục]`;if(v&&typeof v==="object")return JSON.stringify(v);return String(v??"");}
function v488FieldName(k){try{const f=fields.find(x=>x.key===k);if(f?.label)return f.label;}catch(e){}return k;}
function v488StateTable(st,pred){const rows=Object.entries(st||{}).filter(([k,v])=>pred(k,v)&&v!==""&&v!=null&&v!==false&&!(Array.isArray(v)&&!v.length));if(!rows.length)return '<div class="v488Small">Không có dữ liệu.</div>';return `<table class="v488Table"><thead><tr><th style="width:34%">Trường</th><th>Dữ liệu</th></tr></thead><tbody>${rows.map(([k,v])=>`<tr><td>${v488Esc(v488FieldName(k))}</td><td>${v488Esc(v488Val(v))}</td></tr>`).join("")}</tbody></table>`;}
function v488Actor(d){return d?.actor?.name||d?.actor?.username||d?.submittedBy?.name||d?.submittedBy?.username||d?.dhActor?.name||d?.dhActor?.username||d?.cbttActor?.name||d?.cbttActor?.username||"";}
function v488FinalRevisionRows(d){const revs=(d?.revisionFinals&&typeof d.revisionFinals==="object")?d.revisionFinals:null;if(revs&&Object.keys(revs).length){return Object.keys(revs).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).map(n=>{const r=revs[String(n)]||{},actor=d?.revisionActors?.[String(n)]||r.submittedBy||d.submittedBy||{},ts=Number(r.submittedAtMs||r.sentAtMs||d.submittedAtMs||0);return {flight:d.flightName||d.identity?.flightToken||"",revisionNo:n,submittedAtMs:ts,actor};});}return [{flight:d?.flightName||d?.identity?.flightToken||"",revisionNo:Number(d?.revisionNo||d?.versionNo||1),submittedAtMs:Number(d?.submittedAtMs||0),actor:d?.submittedBy||{}}];}
function v488OpenArchiveFlight(i){const f=v488ArchiveData?.flights?.[Number(i)],h=document.getElementById("v488ArchiveDetail");if(!f||!h)return;const st=f.envelope?.state||{},att=[...(Array.isArray(st.attachments)?st.attachments:[]),...(Array.isArray(st.bbbtAttachments)?st.bbbtAttachments:[])];const finalRows=(f.finalDocs||[]).flatMap(v488FinalRevisionRows).map(r=>`<tr><td>${v488Esc(r.flight||"")}</td><td>${Number(r.revisionNo||1)}</td><td>${v488Esc(v488Time(r.submittedAtMs))}</td><td>${v488Esc(r.actor?.name||r.actor?.username||"")}</td></tr>`).join("");const crossRows=(f.crosschecks||[]).map(d=>`<tr><td>${Number(d.revisionNo||1)}</td><td>${v488Esc(d.status||"")}</td><td>${v488Esc(v488Time(d.updatedAtMs||d.cbttConfirmedAtMs||d.dhSentAtMs))}</td><td>${v488Esc(v488Actor(d))}</td></tr>`).join("");h.innerHTML=`<div class="v488Card"><div class="v488Actions"><button class="v488Btn gray" onclick="document.getElementById('v488ArchiveDetail').innerHTML=''">← DANH SÁCH</button><button class="v488Btn" onclick="v488PreviewArchivedForms(${Number(i)})">XEM BIỂU MẪU TRỰC QUAN</button></div><h2 style="color:#064f9e">${v488Esc(v488IdentityLabel(f.identity,f.sessionMeta))}</h2><div class="v488Small">MatchKey: ${v488Esc((f.matchKeys||[]).join(" · "))}</div><div class="v488Section"><h3>FSAGS / RAMP</h3>${v488StateTable(st,(k)=>!k.startsWith("bbbt")&&!k.startsWith("f09_")&&k!=="attachments")}</div><div class="v488Section"><h3>BBBT</h3>${v488StateTable(st,(k)=>k.startsWith("bbbt")&&k!=="bbbtAttachments")}</div>${att.length?`<div class="v488Section"><h3>ẢNH ĐÍNH KÈM (${att.length})</h3><div class="v488Thumbs">${att.filter(x=>typeof x==="string"&&x.startsWith("data:image/")).map(x=>`<img src="${x}" alt="Ảnh hồ sơ">`).join("")}</div></div>`:""}<div class="v488Section"><h3>FINAL</h3>${finalRows?`<table class="v488Table"><tr><th>Chuyến</th><th>Revision</th><th>Gửi lúc</th><th>Người gửi</th></tr>${finalRows}</table>`:'<div class="v488Small">Không có FINAL khớp.</div>'}</div><div class="v488Section"><h3>CROSSCHECK</h3>${crossRows?`<table class="v488Table"><tr><th>Revision</th><th>Trạng thái</th><th>Thời gian</th><th>Actor</th></tr>${crossRows}</table>`:'<div class="v488Small">Không có CROSSCHECK khớp.</div>'}${(f.crosschecks||[]).filter(d=>typeof d.dhPhoto==="string"&&d.dhPhoto.startsWith("data:image/")).length?`<div class="v488Thumbs" style="margin-top:8px">${f.crosschecks.filter(d=>typeof d.dhPhoto==="string"&&d.dhPhoto.startsWith("data:image/")).map(d=>`<img src="${d.dhPhoto}" alt="Ảnh crosscheck">`).join("")}</div>`:""}</div><div class="v488Section"><h3>KẾT SỔ / AUDIT / OPS</h3><div class="v488Small">Kết sổ: <b>${(f.closeouts||[]).length}</b> · Audit: <b>${(f.audits||[]).length}</b> · Sự kiện OPS: <b>${(f.ops||[]).length}</b></div></div><details class="v488Details"><summary>DỮ LIỆU KỸ THUẬT HỒ SƠ</summary><pre style="white-space:pre-wrap;word-break:break-word;font-size:11px">${v488Esc(JSON.stringify({finalDocs:f.finalDocs,crosschecks:f.crosschecks,closeouts:f.closeouts,audits:f.audits,ops:f.ops},null,2))}</pre></details></div>`;h.scrollIntoView({behavior:"smooth",block:"start"});}
window.v488OpenArchiveFlight=v488OpenArchiveFlight;
async function v488PreviewArchivedForms(i){const f=v488ArchiveData?.flights?.[Number(i)],h=document.getElementById("v488ArchiveDetail");if(!f||!h)return;const saved=v488Clone(state),arch=v488Clone(f.envelope?.state||{}),main=String(f.sessionMeta?.initialGroup||f.envelope?.mainForm||"fsags");h.innerHTML='<div class="v488Card"><b>Đang dựng biểu mẫu từ dữ liệu lưu trữ...</b><div class="v488Small">Chế độ này chỉ render cục bộ, không ghi Firebase.</div></div>';try{Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,arch);const pages=main==="fsags421"?[6,7,4]:main==="fsags551"?[9,10,4]:[1,2,4],imgs=[];for(const p of pages){const c=await renderReportPage(p);imgs.push(c.toDataURL("image/jpeg",.9));}const att=[...(Array.isArray(arch.attachments)?arch.attachments:[]),...(Array.isArray(arch.bbbtAttachments)?arch.bbbtAttachments:[])].filter(x=>typeof x==="string"&&x.startsWith("data:image/"));h.innerHTML=`<div class="v488Card"><div class="v488Actions"><button class="v488Btn gray" onclick="v488OpenArchiveFlight(${Number(i)})">← CHI TIẾT HỒ SƠ</button></div><h3>BIỂU MẪU · ${v488Esc(v488IdentityLabel(f.identity,f.sessionMeta))}</h3><div class="v488Preview">${imgs.map(x=>`<img src="${x}" alt="Biểu mẫu lưu trữ">`).join("")}</div>${att.length?`<h3>ẢNH ĐÍNH KÈM</h3><div class="v488Thumbs">${att.map(x=>`<img src="${x}" alt="Ảnh đính kèm">`).join("")}</div>`:""}</div>`;}catch(e){h.innerHTML=`<div class="v488Card"><b>Không dựng được biểu mẫu:</b> ${v488Esc(e?.message||e)}</div>`;}finally{Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,saved||{});try{draw();}catch(e){}}}
window.v488PreviewArchivedForms=v488PreviewArchivedForms;

/* ---------- role UI + boot ---------- */
function v488WrapRoleUi(){if(typeof applyRoleUI!=="function")return;const base=applyRoleUI;applyRoleUI=function(){const out=base.apply(this,arguments);const b=document.getElementById("roleBtnArchive");if(b)b.style.display=String(currentRole||"")==="AD"?"":"none";return out;};window.applyRoleUI=applyRoleUI;}
function v488Boot(){v488InstallUi();v488WrapRoleUi();try{applyRoleUI();}catch(e){}v488OverridePresence();v488HookArchiveLifecycle();v488HookCloseoutSend();v488StartCloseoutSignals();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(v488Boot,40),{once:true});else setTimeout(v488Boot,40);
})();

/* ===== END v488-archive.js ===== */

/* ===== BEGIN archive-export-v34.js ===== */
/* E-REPORT/SAGS V3.4 · AD ARCHIVE EXPORT
   - AD only: export selected archived flight sections as PDF.
   - AD only: export/import a working file to continue editing.
   - Imported working files restore editable form data into a NEW local flight session.
     FINAL/CROSSCHECK/KET SO/AUDIT/OPS are reference-only and are never written back as sent revisions.
*/
(function(){
"use strict";
const V34_WORK_FORMAT="E-REPORT-WORKING-FILE";
const V34_WORK_SCHEMA=1;
const V34_REF_PREFIX="sagsWorkingReferenceV34:";
const V34_KINDS=[
  ["ramp","FSAGS / RAMP"],
  ["bbbt","BBBT"],
  ["attachments","ẢNH ĐÍNH KÈM"],
  ["final","FINAL"],
  ["check","ẢNH / LỊCH SỬ CHECK"],
  ["closeout","KẾT SỔ"],
  ["audit","AUDIT / OPS"]
];
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function clone(x){try{return JSON.parse(JSON.stringify(x));}catch(e){return null;}}
function isAD(){try{return String(currentRole||currentUserProfile?.role||"").toUpperCase()==="AD";}catch(e){return false;}}
function deny(){try{roleDenied?.("Chỉ AD được xuất/nhập hồ sơ.");}catch(e){alert("Chỉ AD được xuất/nhập hồ sơ.");}return false;}
function archive(){try{return window.v488GetArchiveData?.()||null;}catch(e){return null;}}
function flightAt(i){return archive()?.flights?.[Number(i)]||null;}
function safeName(v){return String(v||"HOSO").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9._-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,80)||"HOSO";}
function flightLabel(f){const fs=(f?.identity?.flights||[]).filter(Boolean).join("-")||f?.identity?.flightToken||f?.flightName||f?.sessionMeta?.name||"CHUYEN";const reg=f?.identity?.acRegToken?"_"+f.identity.acRegToken:"";return safeName(fs+reg);}
function dayLabel(f){const s=String(f?.identity?.dateToken||"").replace(/\D/g,"");return /^\d{8}$/.test(s)?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:(archive()?.operationalDate||new Date().toISOString().slice(0,10));}
function selectedKinds(i){const root=document.getElementById(`v34ExportPanel_${Number(i)}`);if(!root)return [];return [...root.querySelectorAll('input[data-v34-kind]:checked')].map(x=>x.dataset.v34Kind).filter(Boolean);}
function setPanelStatus(i,text,kind=""){const e=document.getElementById(`v34ExportStatus_${Number(i)}`);if(e){e.textContent=text||"";e.style.color=kind==="err"?"#b42318":kind==="ok"?"#137333":"#52677b";}}
function selectAll(i,on){const root=document.getElementById(`v34ExportPanel_${Number(i)}`);root?.querySelectorAll('input[data-v34-kind]').forEach(x=>x.checked=!!on);}
window.v34SelectAll=selectAll;
function panelHtml(i){
  const checks=V34_KINDS.map(([k,l])=>`<label style="display:flex;gap:7px;align-items:center;border:1px solid #d6e0ea;border-radius:8px;padding:8px;background:#fff"><input type="checkbox" data-v34-kind="${k}" ${k==="audit"?"":"checked"}><span style="font-weight:800">${esc(l)}</span></label>`).join("");
  return `<div class="v488Section" id="v34ExportPanel_${Number(i)}" style="border:2px solid #0b6aa9;border-radius:12px;padding:11px;background:#f6fbff">
    <h3 style="color:#064f9e;margin:0 0 5px">⬇ AD · XUẤT / KHÔI PHỤC HỒ SƠ</h3>
    <div class="v488Small" style="margin-bottom:8px">Tích đúng loại tài liệu cần lấy. <b>PDF</b> chỉ chứa mục đã chọn. <b>Bản làm việc</b> giữ dữ liệu biểu mẫu để AD nhập lại và điền tiếp; FINAL/CHECK/KẾT SỔ/AUDIT chỉ là tham chiếu, không ghi đè bản đã SEND.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:7px">${checks}</div>
    <div class="v488Actions" style="margin-top:9px">
      <button class="v488Btn gray" onclick="v34SelectAll(${Number(i)},true)">CHỌN TẤT CẢ</button>
      <button class="v488Btn gray" onclick="v34SelectAll(${Number(i)},false)">BỎ TẤT CẢ</button>
      <button class="v488Btn green" onclick="v34ExportSelectedPdf(${Number(i)})">📄 XUẤT PDF ĐÃ CHỌN</button>
      <button class="v488Btn" onclick="v34ExportWorking(${Number(i)})">📝 XUẤT BẢN LÀM VIỆC</button>
    </div>
    <div id="v34ExportStatus_${Number(i)}" class="v488Small" style="margin-top:7px"></div>
  </div>`;
}
function appendPanel(i){if(!isAD())return;const h=document.getElementById("v488ArchiveDetail");if(!h||document.getElementById(`v34ExportPanel_${Number(i)}`))return;const host=h.querySelector(".v488Card")||h;host.insertAdjacentHTML("afterbegin",panelHtml(i));}
function installArchiveToolbar(){
  const modal=document.getElementById("v488ArchiveModal");if(!modal||document.getElementById("v34WorkingFile"))return;
  const actions=modal.querySelector(".v488Card .v488Actions");if(!actions)return;
  const btn=document.createElement("button");btn.className="v488Btn";btn.textContent="📝 NHẬP BẢN LÀM VIỆC";btn.onclick=()=>{if(!isAD())return deny();document.getElementById("v34WorkingFile")?.click();};
  const inp=document.createElement("input");inp.id="v34WorkingFile";inp.type="file";inp.accept=".sagswork,.json,application/json";inp.style.display="none";inp.onchange=()=>{const f=inp.files?.[0];if(f)void importWorking(f);inp.value="";};
  actions.append(btn,inp);
}
const baseOpen=window.v488OpenArchiveFlight;
if(typeof baseOpen==="function")window.v488OpenArchiveFlight=function(i){const out=baseOpen.apply(this,arguments);setTimeout(()=>appendPanel(i),0);return out;};

async function sha256(text){try{const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(text||"")));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");}catch(e){let n=2166136261;for(const c of String(text||"")){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return "fnv-"+(n>>>0).toString(16);}}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2500);}
function workingReferences(f,kinds){return {
  selectedKinds:kinds.slice(),
  finalDocs:kinds.includes("final")?clone(f.finalDocs||[]):[],
  crosschecks:kinds.includes("check")?clone(f.crosschecks||[]):[],
  closeouts:kinds.includes("closeout")?clone(f.closeouts||[]):[],
  audits:kinds.includes("audit")?clone(f.audits||[]):[],
  ops:kinds.includes("audit")?clone(f.ops||[]):[]
};}
function workingEnvelope(f,kinds){
  const env=clone(f?.envelope||{})||{};const src=(env.state&&typeof env.state==="object")?env.state:{};const dst={};
  const attachmentKeys=new Set(["attachments","fsags421Attachments","fsags551Attachments","bbbtAttachments"]);
  for(const [k,v] of Object.entries(src)){
    if(attachmentKeys.has(k)){if(kinds.includes("attachments"))dst[k]=clone(v);continue;}
    const isBbbt=String(k).startsWith("bbbt");
    if(isBbbt&&kinds.includes("bbbt"))dst[k]=clone(v);
    else if(!isBbbt&&kinds.includes("ramp"))dst[k]=clone(v);
  }
  env.state=dst;return env;
}
async function exportWorking(i){
  if(!isAD())return deny();const f=flightAt(i);if(!f)return alert("Không tìm thấy hồ sơ chuyến.");const kinds=selectedKinds(i);if(!kinds.length)return alert("Hãy chọn ít nhất 1 loại hồ sơ.");if(!kinds.includes("ramp")&&!kinds.includes("bbbt"))return alert("Bản làm việc cần chọn FSAGS / RAMP hoặc BBBT để có dữ liệu biểu mẫu điền tiếp.");
  setPanelStatus(i,"Đang tạo bản làm việc...");
  try{
    const pkg={format:V34_WORK_FORMAT,schemaVersion:V34_WORK_SCHEMA,appVersion:"V3.4",exportedAtMs:Date.now(),exportedBy:{username:String(currentUserProfile?.username||""),name:String(currentUserProfile?.name||""),role:"AD"},operationalDate:dayLabel(f),flight:{identity:clone(f.identity||{}),matchKeys:clone(f.matchKeys||[]),flightName:String(f.flightName||""),sessionMeta:clone(f.sessionMeta||{}),envelope:workingEnvelope(f,kinds)},references:workingReferences(f,kinds),note:"Editable form state may be restored by AD. FINAL/CROSSCHECK/KET SO/AUDIT/OPS are reference-only and must not overwrite sent revisions."};
    const unsigned=JSON.stringify(pkg);pkg.checksum={algorithm:"SHA-256",value:await sha256(unsigned)};
    const blob=new Blob([JSON.stringify(pkg)],{type:"application/json"});const name=`EREPORT_WORK_${flightLabel(f)}_${dayLabel(f)}.sagswork`;downloadBlob(blob,name);setPanelStatus(i,`✓ Đã xuất ${name}. File này AD có thể nhập lại để điền tiếp.`,"ok");
  }catch(e){console.error("V3.4 working export",e);setPanelStatus(i,"Không xuất được bản làm việc: "+(e?.message||e),"err");}
}
window.v34ExportWorking=exportWorking;

function stripImages(v){
  if(typeof v==="string"&&v.startsWith("data:image/"))return "[IMAGE_DATA]";
  if(Array.isArray(v))return v.map(stripImages);
  if(v&&typeof v==="object"){const o={};for(const [k,x] of Object.entries(v))o[k]=stripImages(x);return o;}
  return v;
}
function wrapText(ctx,text,maxWidth){const out=[];for(const raw of String(text??"").split(/\r?\n/)){if(!raw){out.push("");continue;}let line="";for(const word of raw.split(/\s+/)){const t=line?line+" "+word:word;if(ctx.measureText(t).width<=maxWidth){line=t;continue;}if(line)out.push(line);if(ctx.measureText(word).width<=maxWidth){line=word;continue;}let part="";for(const ch of word){const p=part+ch;if(ctx.measureText(p).width>maxWidth&&part){out.push(part);part=ch;}else part=p;}line=part;}if(line)out.push(line);}return out;}
function makeTextPages(title,obj){
  const W=1240,H=1754,M=70,header=105,footer=50,lineH=28;const raw=JSON.stringify(stripImages(obj),null,2);const base=document.createElement("canvas");base.width=W;base.height=H;const bctx=base.getContext("2d");bctx.font="22px monospace";const lines=wrapText(bctx,raw,W-2*M);const per=Math.max(1,Math.floor((H-header-footer-M)/lineH));const pages=[];
  for(let p=0;p<Math.max(1,Math.ceil(lines.length/per));p++){
    const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,W,H);x.fillStyle="#064f9e";x.font="bold 34px Arial";x.fillText(title,M,62);x.fillStyle="#667085";x.font="18px Arial";x.fillText(`E-REPORT/SAGS · Trang ${p+1}/${Math.max(1,Math.ceil(lines.length/per))}`,M,92);x.strokeStyle="#ccd6e0";x.beginPath();x.moveTo(M,108);x.lineTo(W-M,108);x.stroke();x.fillStyle="#111827";x.font="22px monospace";let y=145;for(const line of lines.slice(p*per,(p+1)*per)){x.fillText(line,M,y);y+=lineH;}pages.push(c);
  }return pages;
}
function dataSrc(item){if(typeof item==="string")return item.startsWith("data:image/")?item:"";if(item&&typeof item==="object")return String(item.data||item.dataUrl||item.url||"").startsWith("data:image/")?String(item.data||item.dataUrl||item.url):"";return "";}
async function imagePage(src,title){return await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const W=1240,H=1754,M=60,top=120;const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,W,H);x.fillStyle="#064f9e";x.font="bold 30px Arial";x.fillText(title,M,55);const maxW=W-2*M,maxH=H-top-M,scale=Math.min(maxW/im.naturalWidth,maxH/im.naturalHeight,1),w=im.naturalWidth*scale,h=im.naturalHeight*scale;x.drawImage(im,(W-w)/2,top+(maxH-h)/2,w,h);resolve(c);};im.onerror=()=>reject(new Error("Không đọc được ảnh hồ sơ."));im.src=src;});}
function allAttachmentSources(st){const keys=["attachments","fsags421Attachments","fsags551Attachments","bbbtAttachments"],out=[];for(const k of keys){for(const it of (Array.isArray(st?.[k])?st[k]:[])){const s=dataSrc(it);if(s)out.push({src:s,label:k});}}return out;}
function checkImageSources(f){const out=[];for(const d of (Array.isArray(f?.crosschecks)?f.crosschecks:[])){for(const key of ["dhPhoto","paperPhoto","checkPhoto","image"]){const s=dataSrc(d?.[key]);if(s)out.push({src:s,label:`CHECK · REV ${Number(d?.revisionNo||d?.versionNo||1)}`});}}return out;}
async function exportSelectedPdf(i){
  if(!isAD())return deny();const f=flightAt(i);if(!f)return alert("Không tìm thấy hồ sơ chuyến.");const kinds=selectedKinds(i);if(!kinds.length)return alert("Hãy chọn ít nhất 1 loại hồ sơ.");setPanelStatus(i,"Đang dựng PDF từ các mục đã chọn...");
  const savedState=clone(state),savedGroup=typeof activeFormGroup!=="undefined"?activeFormGroup:null,savedPage=typeof currentPage!=="undefined"?currentPage:null;const pages=[];
  try{
    const st=clone(f.envelope?.state||{});Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,st||{});const main=String(f.sessionMeta?.initialGroup||f.envelope?.mainForm||"fsags");if(typeof activeFormGroup!=="undefined")activeFormGroup=main;if(typeof currentPage!=="undefined")currentPage=main==="fsags421"?6:main==="fsags551"?9:main==="fsags09"?11:1;
    if(kinds.includes("ramp")){
      const nums=main==="fsags421"?[6,7]:main==="fsags551"?[9,10]:main==="fsags09"?[11,12]:[1,2];for(const n of nums)pages.push(await renderReportPage(n));
    }
    if(kinds.includes("bbbt"))pages.push(await renderReportPage(4));
    if(kinds.includes("attachments")){let n=0;for(const it of allAttachmentSources(st)){n++;try{pages.push(await imagePage(it.src,`ẢNH ĐÍNH KÈM ${n}`));}catch(e){console.warn("V3.4 attachment PDF",e);}}}
    if(kinds.includes("final"))pages.push(...makeTextPages("FINAL · DỮ LIỆU HỒ SƠ",f.finalDocs||[]));
    if(kinds.includes("check")){pages.push(...makeTextPages("CROSSCHECK · LỊCH SỬ",f.crosschecks||[]));let n=0;for(const it of checkImageSources(f)){n++;try{pages.push(await imagePage(it.src,it.label+` · ẢNH ${n}`));}catch(e){console.warn("V3.4 check image PDF",e);}}}
    if(kinds.includes("closeout"))pages.push(...makeTextPages("KẾT SỔ",f.closeouts||[]));
    if(kinds.includes("audit"))pages.push(...makeTextPages("AUDIT / OPS",{audits:f.audits||[],ops:f.ops||[]}));
    if(!pages.length)throw new Error("Các mục đã chọn chưa có dữ liệu để xuất PDF.");
    const name=`EREPORT_${flightLabel(f)}_${dayLabel(f)}_SELECTED.pdf`;const pdf=await canvasesToPdfFile(pages,name);downloadBlob(pdf,name);setPanelStatus(i,`✓ Đã xuất ${name} · ${pages.length} trang.`,"ok");
  }catch(e){console.error("V3.4 archive PDF",e);setPanelStatus(i,"Không xuất được PDF: "+(e?.message||e),"err");}
  finally{Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,savedState||{});try{if(savedGroup!=null)activeFormGroup=savedGroup;if(savedPage!=null)currentPage=savedPage;draw?.();}catch(e){}}
}
window.v34ExportSelectedPdf=exportSelectedPdf;

async function validateWorking(pkg){if(!pkg||pkg.format!==V34_WORK_FORMAT)throw new Error("Không đúng định dạng BẢN LÀM VIỆC E-Report.");if(Number(pkg.schemaVersion||0)!==V34_WORK_SCHEMA)throw new Error("Phiên bản file làm việc chưa được hỗ trợ.");if(!pkg.flight?.envelope||typeof pkg.flight.envelope!=="object")throw new Error("File thiếu dữ liệu biểu mẫu.");if(pkg.checksum?.value){const c=clone(pkg);const expected=String(c.checksum.value||"");delete c.checksum;const actual=await sha256(JSON.stringify(c));if(actual!==expected)throw new Error("Checksum không khớp: file có thể đã bị sửa hoặc hỏng.");}return true;}
async function importWorking(file){
  if(!isAD())return deny();try{const text=await file.text();const pkg=JSON.parse(text);await validateWorking(pkg);const env=clone(pkg.flight.envelope||{}),oldMeta=clone(pkg.flight.sessionMeta||{}),now=Date.now(),id=makeFlightSessionId();let list=readFlightSessionList();const main=String(oldMeta.initialGroup||env.mainForm||"fsags");const base=String(pkg.flight.flightName||oldMeta.name||"HỒ SƠ").trim();const meta={...oldMeta,id,name:`${base} · KHÔI PHỤC`,customName:true,initialGroup:["fsags","fsags421","fsags551","fsags09"].includes(main)?main:"fsags",createdAt:now,updatedAt:now,restoredFromWorkingV34:true,restoredAtMs:now,restoredSourceDate:String(pkg.operationalDate||""),restoredMatchKeys:clone(pkg.flight.matchKeys||[])};env.mainForm=meta.initialGroup;env.activeFormGroup=meta.initialGroup;env.currentPage=meta.initialGroup==="fsags421"?6:meta.initialGroup==="fsags551"?9:meta.initialGroup==="fsags09"?11:1;env.scrollY=0;list.push(meta);writeFlightSessionList(list);localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));try{localStorage.setItem(sagsOwnedPrefix(V34_REF_PREFIX)+id,JSON.stringify({format:V34_WORK_FORMAT,references:pkg.references||{},identity:pkg.flight.identity||{},matchKeys:pkg.flight.matchKeys||[],importedAtMs:now}));}catch(e){}
    const modal=document.getElementById("v488ArchiveModal");if(modal)modal.style.display="none";switchFlightSession(id);alert(`Đã khôi phục bản làm việc: ${base}.\n\nDữ liệu biểu mẫu đã mở để AD điền tiếp. FINAL/CROSSCHECK/KẾT SỔ cũ chỉ lưu tham chiếu, không ghi đè revision đã SEND.`);
  }catch(e){console.error("V3.4 working import",e);alert("Không nhập được bản làm việc: "+(e?.message||e));}
}
window.v34ImportWorking=importWorking;

function boot(){installArchiveToolbar();setInterval(()=>{if(isAD())installArchiveToolbar();},2500);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,120),{once:true});else setTimeout(boot,120);
})();

/* ===== END archive-export-v34.js ===== */

/* ===== BEGIN contextual-back-v314.js ===== */
/* E-REPORT/SAGS V3.15 · SIGNATURE RESTORE + CONTEXTUAL BACK
   QUAY LẠI nằm trong chính màn/popup đang mở, không còn nút nổi đè giao diện.
   Ưu tiên nút back nội bộ của màn. Nếu màn hiện tại không có back riêng thì đóng đúng
   lớp hiện tại để lộ lại màn ngay trước đó. Không xóa draft/flight data.
*/
(function(){
  "use strict";
  const ROW_ID="sagsContextBackRow";
  const BTN_ID="sagsContextBackBtn";
  const BUILD="V3.15-20260821-01";

  function visible(el){
    if(!el || !el.isConnected)return false;
    const st=getComputedStyle(el);
    if(st.display==="none" || st.visibility==="hidden" || Number(st.opacity||1)===0)return false;
    const r=el.getBoundingClientRect();
    return r.width>4 && r.height>4;
  }
  function zOf(el){const z=parseInt(getComputedStyle(el).zIndex,10);return Number.isFinite(z)?z:0;}
  function logged(){return !!String(window.currentRole||window.__sagsGetSession?.()?.role||'');}
  function isLoginVisible(){return visible(document.getElementById('roleLoginModal'));}

  function layers(){
    const q=[
      '[role="dialog"]','[aria-modal="true"]','.sagsAdminModal',
      '[id$="Modal"]','[id$="Overlay"]','[id$="Scanner"]',
      '#flightSessionsModal','#flightSessionModal','#handoverMenu','#handoverQrScanner',
      '#quickTimeModal','#fs09QuickModal','#rsOverlay','#finalFormsModal'
    ].join(',');
    const out=[],seen=new Set();
    document.querySelectorAll(q).forEach(el=>{
      if(seen.has(el) || !visible(el))return;seen.add(el);
      if(el.id==='roleLoginModal' || el.id==='roleHomeIdle')return;
      if(el.id===ROW_ID || el.id===BTN_ID)return;
      const r=el.getBoundingClientRect(), area=Math.max(1,r.width*r.height), screen=Math.max(1,innerWidth*innerHeight);
      const modalLike=el.getAttribute('aria-modal')==='true'||el.getAttribute('role')==='dialog'||/modal|overlay|scanner|manager|panel/i.test((el.id||'')+' '+(el.className||''));
      if(!modalLike)return;
      if(area/screen<0.12 && zOf(el)<10000)return;
      out.push(el);
    });
    out.sort((a,b)=>zOf(a)-zOf(b));
    return out;
  }
  function topLayer(){const a=layers();return a.length?a[a.length-1]:null;}
  function txt(b){return String(b?.textContent||b?.getAttribute?.('aria-label')||'').replace(/\s+/g,' ').trim().toUpperCase();}

  function controls(layer){
    return [...layer.querySelectorAll('button,[role="button"],a')].filter(b=>visible(b)&&b.id!==BTN_ID&&!b.closest('#'+ROW_ID));
  }
  function findNativeBack(layer){
    const arr=controls(layer).map((b,i)=>{
      const t=txt(b), oc=String(b.getAttribute?.('onclick')||''), meta=String(b.id||'')+' '+String(b.className||'');
      let score=0;
      if(/QUAY LẠI|TRỞ LẠI/.test(t))score+=120;
      if(/^←|^‹/.test(t))score+=100;
      if(/DANH SÁCH CHUYẾN|DANH SÁCH/.test(t))score+=90;
      if(/back/i.test(oc)||/back/i.test(meta))score+=70;
      // Không coi nút đóng là back native; nó chỉ là fallback khi màn không có back riêng.
      if(/ĐÓNG|CLOSE|HỦY|HUỶ/.test(t)||/close/i.test(oc)||/close/i.test(meta))score-=100;
      return {b,score,i};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.i-b.i);
    return arr[0]?.b||null;
  }
  function findClose(layer){
    const arr=controls(layer).map((b,i)=>{
      const t=txt(b), oc=String(b.getAttribute?.('onclick')||''), meta=String(b.id||'')+' '+String(b.className||'');
      let score=0;
      if(/ĐÓNG|CLOSE/.test(t))score+=100;
      if(/^[×✕X]$/.test(t))score+=95;
      if(/HỦY|HUỶ|ĐỂ SAU/.test(t))score+=75;
      if(/close/i.test(oc)||/close/i.test(meta))score+=85;
      const r=b.getBoundingClientRect(), lr=layer.getBoundingClientRect();
      if(r.top<lr.top+Math.min(120,lr.height*.22))score+=10;
      return {b,score,i};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.i-b.i);
    return arr[0]?.b||null;
  }

  function panelFor(layer){
    if(!layer)return null;
    const preferred=layer.querySelector('.ahPanel,.fwcPanel,.rsPanel,.finalPanel,.modal-content,.modalContent,[class*="ModalPanel"],[class*="modalPanel"],[class*="Panel"]');
    if(preferred && visible(preferred))return preferred;
    const kids=[...layer.children].filter(visible).sort((a,b)=>{
      const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect();
      return (br.width*br.height)-(ar.width*ar.height);
    });
    return kids[0]||layer;
  }

  function goBack(ev){
    try{ev?.preventDefault?.();ev?.stopPropagation?.();ev?.stopImmediatePropagation?.();}catch(_){ }
    const layer=topLayer();
    if(!layer)return;
    const native=findNativeBack(layer);
    if(native){native.click();setTimeout(sync,40);setTimeout(sync,180);return;}
    const close=findClose(layer);
    if(close){close.click();setTimeout(sync,40);setTimeout(sync,180);return;}
    const id=String(layer.id||''),stem=id.replace(/(Modal|Overlay|Scanner)$/i,'');
    for(const name of [`close${stem}`,`close${id}`,`stop${stem}`]){
      if(typeof window[name]==='function'){
        try{window[name]();setTimeout(sync,50);return;}catch(_){ }
      }
    }
    // Không ẩn cưỡng bức DOM chưa biết vì có thể bỏ cleanup camera/listener.
  }

  function removeInjected(){document.getElementById(ROW_ID)?.remove();}
  function sync(){
    // Dọn nút nổi legacy nếu DOM cache cũ còn sót.
    document.getElementById('sagsGlobalBackBtn')?.remove();
    document.getElementById('sags-global-back-v35-style')?.remove();
    const layer=topLayer();
    if(!logged() || isLoginVisible() || !layer){removeInjected();return;}
    // Nếu màn đã có nút quay lại đúng ngữ cảnh thì không chèn thêm.
    if(findNativeBack(layer)){removeInjected();return;}
    const panel=panelFor(layer);
    if(!panel){removeInjected();return;}
    let row=document.getElementById(ROW_ID);
    if(row && !panel.contains(row)){row.remove();row=null;}
    if(!row){
      row=document.createElement('div');row.id=ROW_ID;row.className='sagsContextBackRow';
      const b=document.createElement('button');b.id=BTN_ID;b.type='button';b.className='sagsContextBackBtn';
      b.setAttribute('aria-label','Quay lại trang trước');b.innerHTML='<span aria-hidden="true">←</span> QUAY LẠI';
      b.addEventListener('click',goBack,true);row.appendChild(b);
      // Nằm trong trang/panel, ngay đầu nội dung; không fixed/overlay.
      panel.insertBefore(row,panel.firstChild||null);
    }
  }

  const css=document.createElement('style');css.id='sags-context-back-v314-style';css.textContent=`
#${ROW_ID}{display:flex;align-items:center;justify-content:flex-start;gap:8px;margin:0 0 10px 0;padding:0;position:relative;z-index:2}
#${BTN_ID}{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:9px 14px;border:1px solid #d2dde8;border-radius:12px;background:#eef3f8;color:#27384b;font:900 14px/1.1 Arial;cursor:pointer;box-shadow:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#${BTN_ID} span{font-size:20px;line-height:1}
#${BTN_ID}:active{transform:translateY(1px)}
@media(max-width:480px){#${BTN_ID}{min-height:40px;padding:8px 12px;font-size:13px;border-radius:11px}}
@media print{#${ROW_ID}{display:none!important}}
`;
  document.head.appendChild(css);

  let raf=0;const requestSync=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;sync();});};
  new MutationObserver(requestSync).observe(document.documentElement,{subtree:true,attributes:true,childList:true,attributeFilter:['style','class','aria-hidden']});
  document.addEventListener('click',()=>setTimeout(sync,0),true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById(BTN_ID))goBack(e);},true);
  window.addEventListener('pageshow',sync);window.addEventListener('resize',requestSync);
  window.sagsContextGoBack=goBack;window.sagsGlobalGoBack=goBack;window.__SAGS_CONTEXT_BACK_BUILD=BUILD;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,100),{once:true});else setTimeout(sync,100);
})();

/* ===== END contextual-back-v314.js ===== */
}
if(phase==='tools'){

/* ===== BEGIN document-scanner.js ===== */
/* E-REPORT/SAGS · In-app Document Scanner · V1.20 · MANUAL CROP + PDF SHARE */
(() => {
  'use strict';

  const BUILD = 'V1.20-20260818-02';
  if (window.SAGSDocumentScanner && window.SAGSDocumentScanner.build === BUILD) return;

  const MAX_PAGES = 20;
  const MAX_CAPTURE_DIM = 2600;
  const MAX_SCAN_DIM = 2200;
  const PREVIEW_DIM = 1200;
  const THUMB_DIM = 180;
  const DEFAULT_FILTER = 'clear';
  const MAX_PDF_DIM = 1800;
  const PDF_SOFT_TARGET_BYTES = 12 * 1024 * 1024;

  const state = {
    root: null,
    stream: null,
    track: null,
    devices: [],
    deviceIndex: 0,
    torch: false,
    mode: 'idle',
    pages: [],
    selected: 0,
    captureCanvas: null,
    corners: null,
    activeCorner: -1,
    opening: false,
    busy: false,
    qualityText: '',
    pdfFile: null,
    pdfBuiltForRevision: -1,
    documentRevision: 0,
  };

  const CSS = `
  #sagsDocScanner{position:fixed;inset:0;z-index:30050;background:#07111c;color:#fff;font-family:Arial,sans-serif;display:none;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}
  #sagsDocScanner.sds-open{display:flex;flex-direction:column}
  #sagsDocScanner *{box-sizing:border-box}
  .sds-top{flex:0 0 auto;display:grid;grid-template-columns:76px 1fr 76px;align-items:center;gap:6px;padding:max(8px,env(safe-area-inset-top)) 10px 8px;background:rgba(4,16,28,.96);border-bottom:1px solid rgba(255,255,255,.12)}
  .sds-title{text-align:center;font-weight:900;font-size:16px;line-height:1.1}.sds-sub{display:block;font-weight:500;font-size:11px;opacity:.75;margin-top:3px}
  .sds-btn{border:0;border-radius:10px;min-height:42px;padding:8px 10px;font-weight:800;font-size:13px;background:#e8eef5;color:#10233a;touch-action:manipulation}
  .sds-btn.primary{background:#1287ff;color:#fff}.sds-btn.good{background:#16a36a;color:#fff}.sds-btn.warn{background:#ffb020;color:#1b1b1b}.sds-btn.danger{background:#c93535;color:#fff}.sds-btn.ghost{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.18)}
  .sds-btn:disabled{opacity:.42}.sds-stage{position:relative;flex:1;min-height:0;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center}
  .sds-view{position:absolute;inset:0;display:none;align-items:center;justify-content:center}.sds-view.active{display:flex}
  #sdsVideo{width:100%;height:100%;object-fit:contain;background:#000}
  .sds-guide{position:absolute;inset:7% 5%;border:2px solid rgba(94,219,255,.75);border-radius:10px;box-shadow:0 0 0 999px rgba(0,0,0,.10);pointer-events:none}
  .sds-guide:before,.sds-guide:after{content:"";position:absolute;inset:20% 0;border-top:1px dashed rgba(255,255,255,.2);border-bottom:1px dashed rgba(255,255,255,.2)}
  .sds-camera-tip{position:absolute;top:12px;left:50%;transform:translateX(-50%);max-width:90%;padding:7px 10px;border-radius:18px;background:rgba(0,0,0,.58);font-size:12px;text-align:center;pointer-events:none}
  .sds-bottom{flex:0 0 auto;background:#07111c;padding:9px 10px max(10px,env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.12)}
  .sds-camera-actions{display:grid;grid-template-columns:1fr 84px 1fr;align-items:center;gap:10px}.sds-side-actions{display:flex;gap:7px;justify-content:center;flex-wrap:wrap}
  .sds-shutter{width:72px;height:72px;border-radius:50%;border:5px solid #fff;background:#1689ff;box-shadow:0 0 0 3px rgba(22,137,255,.35);justify-self:center;touch-action:manipulation}
  .sds-count{text-align:center;font-size:12px;opacity:.8;margin-top:6px}
  #sdsCropCanvas,#sdsReviewCanvas{display:block;max-width:100%;max-height:100%;width:auto;height:auto;background:#111;touch-action:none}
  .sds-crop-wrap,.sds-review-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px}
  .sds-crop-help{position:absolute;top:10px;left:10px;right:10px;text-align:center;font-size:12px;background:rgba(0,0,0,.58);padding:7px;border-radius:10px;pointer-events:none}
  .sds-row{display:flex;gap:7px;overflow-x:auto;padding-bottom:2px}.sds-row .sds-btn{flex:0 0 auto}
  .sds-crop-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.sds-crop-actions .sds-btn{padding:7px 4px;font-size:12px}
  .sds-review-bottom{display:grid;gap:8px}.sds-thumbs{display:flex;gap:7px;overflow-x:auto;min-height:82px;padding:2px}.sds-thumb{position:relative;flex:0 0 66px;height:78px;border-radius:8px;border:2px solid transparent;background:#1b2837;overflow:hidden;padding:0}.sds-thumb.active{border-color:#44a5ff}.sds-thumb canvas{width:100%;height:100%;object-fit:contain;display:block}.sds-thumb span{position:absolute;left:3px;top:3px;background:rgba(0,0,0,.7);border-radius:9px;padding:2px 5px;font-size:10px;color:#fff}
  .sds-tools{display:flex;gap:6px;overflow-x:auto}.sds-tools .sds-btn{min-height:37px;padding:6px 9px;font-size:12px;flex:0 0 auto}.sds-tools .sds-btn.active{outline:2px solid #65b7ff;background:#155b8f;color:#fff}
  .sds-final{display:grid;grid-template-columns:1fr 1.25fr;gap:8px}.sds-final .sds-btn{min-height:46px}
  .sds-busy{position:absolute;inset:0;z-index:10;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.68);text-align:center;padding:24px}.sds-busy.show{display:flex}.sds-busy-box{background:#13263a;border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:18px;max-width:300px;font-weight:800}.sds-spinner{width:34px;height:34px;border:4px solid rgba(255,255,255,.28);border-top-color:#fff;border-radius:50%;animation:sdsSpin .8s linear infinite;margin:0 auto 10px}@keyframes sdsSpin{to{transform:rotate(360deg)}}
  .sds-msg{font-size:12px;line-height:1.35;opacity:.85;text-align:center;min-height:17px;margin-top:5px}.sds-toast{position:absolute;z-index:20;left:50%;bottom:110px;transform:translateX(-50%);background:rgba(10,24,38,.94);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:9px 12px;font-size:12px;max-width:88%;text-align:center;display:none}.sds-toast.show{display:block}
  .sds-help{position:fixed;inset:0;z-index:30080;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);padding:14px;touch-action:manipulation}.sds-help.show{display:flex}.sds-help-box{width:min(94vw,520px);max-height:86vh;overflow:auto;background:#fff;color:#13263a;border-radius:14px;padding:16px;box-shadow:0 16px 44px rgba(0,0,0,.4)}.sds-help-box h3{margin:0 0 10px;color:#0b5cab}.sds-help-box ol{padding-left:22px;margin:8px 0}.sds-help-box li{margin:7px 0;line-height:1.38}.sds-help-note{padding:9px 10px;border-radius:9px;background:#eef7ff;font-size:12px;line-height:1.4;margin:10px 0}
  @media(max-width:430px){.sds-top{grid-template-columns:64px 1fr 64px}.sds-btn{font-size:12px;padding:7px 7px}.sds-camera-actions{grid-template-columns:1fr 76px 1fr}.sds-shutter{width:66px;height:66px}.sds-crop-actions{grid-template-columns:repeat(3,minmax(0,1fr))}}
  @media(orientation:landscape) and (max-height:560px){.sds-top{padding-top:max(5px,env(safe-area-inset-top));padding-bottom:5px}.sds-bottom{padding-top:5px}.sds-shutter{width:56px;height:56px}.sds-camera-actions{grid-template-columns:1fr 66px 1fr}.sds-thumbs{min-height:62px}.sds-thumb{height:58px;width:52px;flex-basis:52px}}
  `;

  function escapeHtml(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function makeCanvas(w,h){
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(w)); c.height=Math.max(1,Math.round(h));
    return c;
  }

  function canvasToBlob(canvas,type='image/jpeg',quality=.88){
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không tạo được ảnh scan.')),type,quality));
  }

  function installStyle(){
    if(document.getElementById('sagsDocScannerStyle')) return;
    const s=document.createElement('style');s.id='sagsDocScannerStyle';s.textContent=CSS;document.head.appendChild(s);
  }

  function buildUI(){
    if(state.root) return state.root;
    installStyle();
    const root=document.createElement('div');
    root.id='sagsDocScanner';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.innerHTML=`
      <div class="sds-top">
        <button class="sds-btn ghost" id="sdsClose">ĐÓNG</button>
        <div class="sds-title"><span id="sdsTitle">QUÉT TÀI LIỆU</span><span class="sds-sub" id="sdsSubtitle">Camera tài liệu · ${BUILD}</span></div>
        <button class="sds-btn ghost" id="sdsHelp">HDSD</button>
      </div>
      <div class="sds-stage">
        <div class="sds-view active" id="sdsCameraView">
          <video id="sdsVideo" autoplay muted playsinline></video>
          <div class="sds-guide"></div>
          <div class="sds-camera-tip" id="sdsCameraTip">Đặt trọn tờ giấy trong khung · bấm chụp · chỉnh 4 góc bằng tay sau khi chụp</div>
        </div>
        <div class="sds-view" id="sdsCropView"><div class="sds-crop-wrap"><canvas id="sdsCropCanvas"></canvas><div class="sds-crop-help">Kéo 4 chấm xanh vào đúng 4 góc tờ giấy</div></div></div>
        <div class="sds-view" id="sdsReviewView"><div class="sds-review-wrap"><canvas id="sdsReviewCanvas"></canvas></div></div>
        <div class="sds-busy" id="sdsBusy"><div class="sds-busy-box"><div class="sds-spinner"></div><div id="sdsBusyText">Đang xử lý…</div></div></div>
        <div class="sds-toast" id="sdsToast"></div>
        <div class="sds-help" id="sdsHelpPanel" role="dialog" aria-modal="true" aria-label="Hướng dẫn CAMSCANER">
          <div class="sds-help-box">
            <h3>HDSD · CAMSCANER</h3>
            <ol>
              <li>Bấm <b>📄 CAMSCANER</b> trên thanh chức năng của đơn vị hoặc mở từ vùng Đính kèm.</li>
              <li>Đặt trọn tờ giấy trong khung rồi bấm nút tròn. Camera <b>không chạy tự nhận diện mép</b> để ưu tiên hình live mượt.</li>
              <li>Sau khi chụp, kéo <b>4 chấm xanh</b> bằng tay vào đúng 4 góc tờ giấy; có thể XOAY 90° nếu cần.</li>
              <li>Bấm <b>LƯU TRANG</b>. Hệ thống cắt phối cảnh theo đúng 4 góc đã chỉnh.</li>
              <li>Ở màn kiểm tra, có thể <b>XOAY</b>, đổi thứ tự bằng <b>← TRANG / TRANG →</b>, <b>XÓA</b> và chọn <b>GỐC / RÕ / XÁM / ĐEN TRẮNG</b>.</li>
              <li>Bấm <b>GHÉP PDF &amp; CHIA SẺ</b> để tạo 01 file PDF nhiều trang. Khi điện thoại hỗ trợ Share Sheet, có thể chọn Zalo hoặc ứng dụng chia sẻ khác.</li>
              <li>Nút <b>ĐÍNH KÈM</b> vẫn giữ để đưa các trang scan vào vùng ảnh của biểu mẫu E‑Report/SAGS khi cần.</li>
            </ol>
            <div class="sds-help-note"><b>Lưu ý:</b> cho phép Camera khi trình duyệt hỏi quyền. Không còn xử lý nhận góc tự động; 4 góc được chỉnh hoàn toàn thủ công sau khi chụp để giảm lag tối đa.</div>
            <button class="sds-btn primary" id="sdsHelpClose" style="width:100%">ĐÃ HIỂU</button>
          </div>
        </div>
      </div>
      <div class="sds-bottom" id="sdsCameraBottom">
        <div class="sds-camera-actions">
          <div class="sds-side-actions"><button class="sds-btn ghost" id="sdsTorch">ĐÈN</button><button class="sds-btn ghost" id="sdsSwitch">ĐỔI CAM</button></div>
          <button class="sds-shutter" id="sdsShutter" aria-label="Chụp"></button>
          <div class="sds-side-actions"><button class="sds-btn good" id="sdsDone">XONG <span id="sdsDoneCount">0</span></button></div>
        </div>
        <div class="sds-count" id="sdsPageCount">0/${MAX_PAGES} trang</div>
        <div class="sds-msg" id="sdsCameraMsg"></div>
      </div>
      <div class="sds-bottom" id="sdsCropBottom" style="display:none">
        <div class="sds-crop-actions">
          <button class="sds-btn ghost" id="sdsRetake">CHỤP LẠI</button>
          <button class="sds-btn ghost" id="sdsRotateCapture">XOAY 90°</button>
          <button class="sds-btn good" id="sdsSavePage">LƯU TRANG</button>
        </div>
        <div class="sds-msg" id="sdsCropMsg"></div>
      </div>
      <div class="sds-bottom sds-review-bottom" id="sdsReviewBottom" style="display:none">
        <div class="sds-thumbs" id="sdsThumbs"></div>
        <div class="sds-tools" id="sdsFilterTools">
          <button class="sds-btn" data-filter="original">GỐC</button>
          <button class="sds-btn" data-filter="clear">RÕ</button>
          <button class="sds-btn" data-filter="gray">XÁM</button>
          <button class="sds-btn" data-filter="bw">ĐEN TRẮNG</button>
          <button class="sds-btn ghost" id="sdsRotatePage">XOAY</button>
          <button class="sds-btn ghost" id="sdsMoveLeft">← TRANG</button>
          <button class="sds-btn ghost" id="sdsMoveRight">TRANG →</button>
          <button class="sds-btn danger" id="sdsDeletePage">XÓA</button>
        </div>
        <div class="sds-final"><button class="sds-btn ghost" id="sdsAddPage">+ QUÉT THÊM</button><button class="sds-btn good" id="sdsAttach">ĐÍNH KÈM <span id="sdsAttachCount">0</span> TRANG</button><button class="sds-btn primary" id="sdsSharePdf" style="grid-column:1/-1">📤 GHÉP PDF &amp; CHIA SẺ</button></div>
        <div class="sds-msg" id="sdsReviewMsg">Chỉnh trang xong có thể ghép thành 01 PDF để chia sẻ nhanh qua Share Sheet (ví dụ Zalo).</div>
      </div>`;
    document.body.appendChild(root);
    state.root=root;
    bindUI();
    return root;
  }

  function $(id){ return document.getElementById(id); }

  function setBusy(on,text){
    state.busy=!!on;
    const el=$('sdsBusy'); if(!el)return;
    $('sdsBusyText').textContent=text||'Đang xử lý…';
    el.classList.toggle('show',!!on);
  }

  let toastTimer=0;
  function toast(text,ms=2300){
    const el=$('sdsToast'); if(!el)return;
    clearTimeout(toastTimer); el.textContent=text; el.classList.add('show');
    toastTimer=setTimeout(()=>el.classList.remove('show'),ms);
  }

  function setMode(mode){
    state.mode=mode;
    const map={camera:'sdsCameraView',crop:'sdsCropView',review:'sdsReviewView'};
    Object.values(map).forEach(id=>$(id)?.classList.remove('active'));
    $(map[mode])?.classList.add('active');
    $('sdsCameraBottom').style.display=mode==='camera'?'block':'none';
    $('sdsCropBottom').style.display=mode==='crop'?'block':'none';
    $('sdsReviewBottom').style.display=mode==='review'?'grid':'none';
    $('sdsTitle').textContent=mode==='crop'?'CẮT TÀI LIỆU':mode==='review'?'KIỂM TRA TÀI LIỆU':'QUÉT TÀI LIỆU';
    $('sdsSubtitle').textContent=mode==='review'?`${state.pages.length} trang đã quét`:mode==='crop'?'Chỉnh 4 góc trước khi lưu':`Camera tài liệu · ${BUILD}`;
    updateCounts();
  }

  function updateCounts(){
    const n=state.pages.length;
    if($('sdsDoneCount')) $('sdsDoneCount').textContent=String(n);
    if($('sdsAttachCount')) $('sdsAttachCount').textContent=String(n);
    if($('sdsPageCount')) $('sdsPageCount').textContent=`${n}/${MAX_PAGES} trang`;
    if($('sdsDone')) $('sdsDone').disabled=n===0;
    if($('sdsAttach')) $('sdsAttach').disabled=n===0;
    if($('sdsSharePdf')) $('sdsSharePdf').disabled=n===0;
  }

  async function open(){
    if(state.opening || state.root?.classList.contains('sds-open')) return;
    state.opening=true;
    try{
      buildUI();
      state.root.classList.add('sds-open');
      state.root.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow='hidden';
      document.body.style.overflow='hidden';
      setMode('camera');
      await startCamera();
    }catch(e){
      console.error('[Scanner]',e);
      toast('Không mở được camera: '+(e?.message||e),4500);
      if($('sdsCameraMsg')) $('sdsCameraMsg').textContent='Hãy cấp quyền Camera cho E‑Report/SAGS rồi thử lại.';
    }finally{state.opening=false;}
  }

  async function close(force=false){
    if(state.busy && !force) return;
    if(!force && state.pages.length){
      const ok=confirm(`Đóng máy quét? ${state.pages.length} trang chưa đính kèm sẽ bị hủy.`);
      if(!ok)return;
    }
    stopCamera();
    state.pages.length=0;state.captureCanvas=null;state.corners=null;state.selected=0;state.pdfFile=null;state.pdfBuiltForRevision=-1;
    state.root?.classList.remove('sds-open');state.root?.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow='';document.body.style.overflow='';
    setMode('camera');
  }

  async function startCamera(deviceId=null){
    stopCamera();
    if(!navigator.mediaDevices?.getUserMedia) throw new Error('Thiết bị/trình duyệt không hỗ trợ camera web.');
    const video=$('sdsVideo');
    const videoConstraints=deviceId?{deviceId:{exact:deviceId},width:{ideal:1280,max:1600},height:{ideal:960,max:1200},frameRate:{ideal:30,max:30}}:{facingMode:{ideal:'environment'},width:{ideal:1280,max:1600},height:{ideal:960,max:1200},frameRate:{ideal:30,max:30}};
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:videoConstraints});
    state.stream=stream; state.track=stream.getVideoTracks()[0]||null; state.torch=false;
    video.srcObject=stream; await video.play();
    try{
      state.devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
      const current=state.track?.getSettings?.().deviceId;
      const idx=state.devices.findIndex(d=>d.deviceId===current);if(idx>=0)state.deviceIndex=idx;
    }catch(_){ state.devices=[]; }
    updateCameraButtons();
    if($('sdsCameraMsg')) $('sdsCameraMsg').textContent='Camera chỉ dùng để chụp, không chạy nhận diện góc. Sau khi chụp hãy kéo 4 góc bằng tay.';
  }

  function stopCamera(){
    try{state.stream?.getTracks?.().forEach(t=>t.stop());}catch(_){ }
    state.stream=null;state.track=null;state.torch=false;
    const v=$('sdsVideo');if(v)v.srcObject=null;
    updateCameraButtons();
  }

  function updateCameraButtons(){
    const torch=$('sdsTorch'),sw=$('sdsSwitch');
    const caps=state.track?.getCapabilities?.()||{};
    if(torch){torch.disabled=!caps.torch;torch.textContent=state.torch?'TẮT ĐÈN':'ĐÈN';}
    if(sw)sw.disabled=(state.devices?.length||0)<2;
  }

  async function toggleTorch(){
    if(!state.track)return;
    const caps=state.track.getCapabilities?.()||{};if(!caps.torch)return;
    try{state.torch=!state.torch;await state.track.applyConstraints({advanced:[{torch:state.torch}]});updateCameraButtons();}
    catch(e){state.torch=false;updateCameraButtons();toast('Thiết bị không bật được đèn camera.');}
  }

  async function switchCamera(){
    if(!state.devices?.length || state.devices.length<2)return;
    state.deviceIndex=(state.deviceIndex+1)%state.devices.length;
    setBusy(true,'Đang đổi camera…');
    try{await startCamera(state.devices[state.deviceIndex].deviceId);}catch(e){toast('Không đổi được camera.');}
    finally{setBusy(false);}
  }

  async function capture(){
    if(state.busy || state.pages.length>=MAX_PAGES)return;
    const v=$('sdsVideo');
    if(!v || !v.videoWidth || !v.videoHeight){toast('Camera chưa sẵn sàng.');return;}
    setBusy(true,'Đang chụp ảnh…');
    await sleep(20);
    try{
      const scale=Math.min(1,MAX_CAPTURE_DIM/Math.max(v.videoWidth,v.videoHeight));
      const c=makeCanvas(v.videoWidth*scale,v.videoHeight*scale);
      const ctx=c.getContext('2d',{alpha:false});
      ctx.drawImage(v,0,0,c.width,c.height);
      state.captureCanvas=c;
      state.corners=defaultCorners(c.width,c.height);
      state.qualityText=qualityMessage(c);
      $('sdsCropMsg').textContent=state.qualityText;
      try{v.pause();}catch(_){ }
      setMode('crop');
      drawCropEditor();
    }catch(e){console.error('[Scanner capture]',e);toast('Không xử lý được ảnh vừa chụp.');}
    finally{setBusy(false);}
  }


  function qualityMessage(canvas){
    try{
      const max=220,scale=Math.min(1,max/Math.max(canvas.width,canvas.height)),c=makeCanvas(canvas.width*scale,canvas.height*scale),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(canvas,0,0,c.width,c.height);
      const d=x.getImageData(0,0,c.width,c.height).data;let white=0,dark=0,grad=0,count=0;
      let prev=0;
      for(let i=0;i<d.length;i+=16){const y=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(y>246)white++;if(y<38)dark++;if(count)grad+=Math.abs(y-prev);prev=y;count++;}
      const w=white/Math.max(1,count),dk=dark/Math.max(1,count),g=grad/Math.max(1,count-1);
      if(g<5.0)return '⚠ Ảnh có thể hơi mờ. Nếu chữ khó đọc, hãy CHỤP LẠI.';
      if(w>.48)return '⚠ Ảnh khá chói/sáng. Tránh phản chiếu đèn lên giấy.';
      if(dk>.52)return '⚠ Ảnh khá tối. Có thể bật ĐÈN và chụp lại.';
      return 'Kéo 4 chấm xanh vào đúng 4 góc tờ giấy rồi bấm LƯU TRANG.';
    }catch(_){return 'Kiểm tra 4 góc rồi LƯU TRANG.';}
  }

  function otsuThreshold(gray){
    const hist=new Uint32Array(256);for(let i=0;i<gray.length;i++)hist[gray[i]]++;
    const total=gray.length;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
    let sumB=0,wB=0,maxVar=-1,thr=160;
    for(let t=0;t<256;t++){
      wB+=hist[t];if(!wB)continue;const wF=total-wB;if(!wF)break;sumB+=t*hist[t];
      const mB=sumB/wB,mF=(sum-sumB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>maxVar){maxVar=v;thr=t;}
    }
    return thr;
  }

  function defaultCorners(w,h){
    const mx=w*.055,my=h*.055;return [{x:mx,y:my},{x:w-mx,y:my},{x:w-mx,y:h-my},{x:mx,y:h-my}];
  }

  function drawCropEditor(){
    const src=state.captureCanvas,c=$('sdsCropCanvas');if(!src||!c)return;
    const max=1400,scale=Math.min(1,max/Math.max(src.width,src.height));c.width=Math.max(1,Math.round(src.width*scale));c.height=Math.max(1,Math.round(src.height*scale));
    const ctx=c.getContext('2d',{alpha:false});ctx.drawImage(src,0,0,c.width,c.height);
    const pts=state.corners.map(p=>({x:p.x*scale,y:p.y*scale}));
    ctx.save();ctx.lineWidth=Math.max(3,c.width/350);ctx.strokeStyle='#42d7ff';ctx.fillStyle='rgba(20,167,235,.14)';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<4;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fill();ctx.stroke();
    const r=Math.max(11,c.width/55);for(const p of pts){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle='#21c7ff';ctx.fill();ctx.lineWidth=Math.max(3,r*.22);ctx.strokeStyle='#fff';ctx.stroke();}
    ctx.restore();
  }

  function cropPointer(e){
    const c=$('sdsCropCanvas');if(!c||!state.captureCanvas||!state.corners)return null;
    const rect=c.getBoundingClientRect();if(!rect.width||!rect.height)return null;
    return {x:(e.clientX-rect.left)*c.width/rect.width,y:(e.clientY-rect.top)*c.height/rect.height,displayScale:c.width/state.captureCanvas.width};
  }

  function onCropDown(e){
    if(state.mode!=='crop'||state.busy)return;const q=cropPointer(e);if(!q)return;
    const pts=state.corners.map(p=>({x:p.x*q.displayScale,y:p.y*q.displayScale}));let best=-1,bd=Infinity;pts.forEach((p,i)=>{const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<bd){bd=d;best=i;}});
    const cssRadius=52*window.devicePixelRatio; if(bd>Math.max(42,q.displayScale*cssRadius))return;
    state.activeCorner=best;try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){ }e.preventDefault();
  }
  function onCropMove(e){
    if(state.activeCorner<0||state.mode!=='crop')return;const q=cropPointer(e);if(!q)return;
    state.corners[state.activeCorner]={x:clamp(q.x/q.displayScale,0,state.captureCanvas.width-1),y:clamp(q.y/q.displayScale,0,state.captureCanvas.height-1)};drawCropEditor();e.preventDefault();
  }
  function onCropUp(e){state.activeCorner=-1;try{e.currentTarget.releasePointerCapture(e.pointerId);}catch(_){ }}

  function rotateCapture(){
    const src=state.captureCanvas;if(!src)return;
    const dst=makeCanvas(src.height,src.width),ctx=dst.getContext('2d',{alpha:false});ctx.translate(dst.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(src,0,0);
    const oldH=src.height;state.corners=state.corners.map(p=>({x:oldH-p.y,y:p.x}));state.captureCanvas=dst;drawCropEditor();
  }

  function solveLinear(A,b){
    const n=b.length;for(let i=0;i<n;i++){
      let max=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[max][i]))max=r;
      if(Math.abs(A[max][i])<1e-10)throw new Error('Không tính được phối cảnh.');
      [A[i],A[max]]=[A[max],A[i]];[b[i],b[max]]=[b[max],b[i]];
      const d=A[i][i];for(let j=i;j<n;j++)A[i][j]/=d;b[i]/=d;
      for(let r=0;r<n;r++){if(r===i)continue;const f=A[r][i];if(!f)continue;for(let j=i;j<n;j++)A[r][j]-=f*A[i][j];b[r]-=f*b[i];}
    }return b;
  }

  function homography(from,to){
    const A=[],b=[];for(let i=0;i<4;i++){
      const x=from[i].x,y=from[i].y,u=to[i].x,v=to[i].y;
      A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);
      A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);
    }return solveLinear(A,b);
  }

  function perspectiveCrop(src,pts){
    const top=dist(pts[0],pts[1]),bottom=dist(pts[3],pts[2]),left=dist(pts[0],pts[3]),right=dist(pts[1],pts[2]);
    let w=Math.max(top,bottom),h=Math.max(left,right);const cap=Math.min(1,MAX_SCAN_DIM/Math.max(w,h));w=Math.max(360,Math.round(w*cap));h=Math.max(480,Math.round(h*cap));
    if(w>h*1.8 || h>w*3.2){const ratio=w/h;if(ratio>1.8)h=Math.round(w/1.414);else if(1/ratio>3.2)w=Math.round(h/1.414);}
    const dst=makeCanvas(w,h),sctx=src.getContext('2d',{willReadFrequently:true}),dctx=dst.getContext('2d',{alpha:false});
    const s=sctx.getImageData(0,0,src.width,src.height),out=dctx.createImageData(w,h),sd=s.data,od=out.data;
    const from=[{x:0,y:0},{x:w-1,y:0},{x:w-1,y:h-1},{x:0,y:h-1}],H=homography(from,pts);
    let p=0;for(let y=0;y<h;y++){
      for(let x=0;x<w;x++,p+=4){const den=H[6]*x+H[7]*y+1;let sx=(H[0]*x+H[1]*y+H[2])/den,sy=(H[3]*x+H[4]*y+H[5])/den;sx=clamp(sx,0,src.width-1);sy=clamp(sy,0,src.height-1);
        const x0=sx|0,y0=sy|0,x1=Math.min(x0+1,src.width-1),y1=Math.min(y0+1,src.height-1),fx=sx-x0,fy=sy-y0;
        const i00=(y0*src.width+x0)*4,i10=(y0*src.width+x1)*4,i01=(y1*src.width+x0)*4,i11=(y1*src.width+x1)*4;
        for(let c=0;c<3;c++){const a=sd[i00+c]*(1-fx)+sd[i10+c]*fx,bv=sd[i01+c]*(1-fx)+sd[i11+c]*fx;od[p+c]=a*(1-fy)+bv*fy;}od[p+3]=255;
      }
    }dctx.putImageData(out,0,0);return dst;
  }

  function invalidatePdf(){
    state.documentRevision=(state.documentRevision+1)>>>0;
    state.pdfFile=null;state.pdfBuiltForRevision=-1;
    const b=$('sdsSharePdf');if(b)b.innerHTML='📤 GHÉP PDF &amp; CHIA SẺ';
  }

  async function savePage(){
    if(state.busy||!state.captureCanvas||!state.corners)return;
    if(state.pages.length>=MAX_PAGES){toast(`Tối đa ${MAX_PAGES} trang.`);return;}
    setBusy(true,'Đang cắt và chỉnh phối cảnh…');await sleep(35);
    try{
      const cropped=perspectiveCrop(state.captureCanvas,state.corners);
      state.pages.push({base:cropped,filter:DEFAULT_FILTER,rotation:0});state.captureCanvas=null;state.corners=null;invalidatePdf();updateCounts();
      if(state.pages.length>=MAX_PAGES){setMode('review');state.selected=state.pages.length-1;renderReview();}
      else{setMode('camera');try{await $('sdsVideo').play();}catch(_){ }toast(`Đã lưu trang ${state.pages.length}. Chụp trang tiếp theo.`);}
    }catch(e){console.error('[Scanner perspective]',e);toast('Không cắt được trang này. Hãy chỉnh lại 4 góc.');}
    finally{setBusy(false);}
  }

  function retake(){state.captureCanvas=null;state.corners=null;setMode('camera');try{$('sdsVideo').play();}catch(_){ }}

  function rotateBaseCanvas(src,rotation){
    const r=((rotation%360)+360)%360;if(!r)return src;
    const swap=r===90||r===270,dst=makeCanvas(swap?src.height:src.width,swap?src.width:src.height),ctx=dst.getContext('2d',{alpha:false});ctx.translate(dst.width/2,dst.height/2);ctx.rotate(r*Math.PI/180);ctx.drawImage(src,-src.width/2,-src.height/2);return dst;
  }

  function filteredCanvas(page,maxDim=Infinity){
    let src=rotateBaseCanvas(page.base,page.rotation||0);let scale=Math.min(1,maxDim/Math.max(src.width,src.height)),dst=makeCanvas(src.width*scale,src.height*scale),ctx=dst.getContext('2d',{alpha:false,willReadFrequently:true});ctx.drawImage(src,0,0,dst.width,dst.height);
    const mode=page.filter||'original';if(mode==='original')return dst;
    const im=ctx.getImageData(0,0,dst.width,dst.height),d=im.data;
    let bwThr=165;
    if(mode==='bw'){
      const sample=new Uint8Array(Math.ceil(d.length/16));let k=0;for(let i=0;i<d.length;i+=16)sample[k++]=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);bwThr=clamp(otsuThreshold(sample)-5,120,205);
    }
    for(let i=0;i<d.length;i+=4){let r=d[i],g=d[i+1],b=d[i+2];
      if(mode==='clear'){
        const lift=v=>clamp((v-128)*1.19+136,0,255);r=lift(r);g=lift(g);b=lift(b);
      }else{
        let y=.299*r+.587*g+.114*b;y=clamp((y-128)*1.16+136,0,255);if(mode==='bw')y=y>=bwThr?255:0;r=g=b=y;
      }
      d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
    }ctx.putImageData(im,0,0);return dst;
  }

  function renderReview(){
    if(!state.pages.length){setMode('camera');return;}
    state.selected=clamp(state.selected,0,state.pages.length-1);setMode('review');
    const page=state.pages[state.selected],preview=filteredCanvas(page,PREVIEW_DIM),c=$('sdsReviewCanvas');c.width=preview.width;c.height=preview.height;c.getContext('2d',{alpha:false}).drawImage(preview,0,0);
    document.querySelectorAll('#sdsFilterTools [data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===page.filter));
    const box=$('sdsThumbs');box.innerHTML='';state.pages.forEach((p,i)=>{const btn=document.createElement('button');btn.className='sds-thumb'+(i===state.selected?' active':'');btn.type='button';const tc=document.createElement('canvas'),th=filteredCanvas(p,THUMB_DIM);tc.width=th.width;tc.height=th.height;tc.getContext('2d',{alpha:false}).drawImage(th,0,0);const n=document.createElement('span');n.textContent=String(i+1);btn.append(tc,n);btn.addEventListener('click',()=>{state.selected=i;renderReview();});box.appendChild(btn);});
    updateCounts();
  }

  function setFilter(mode){if(!state.pages.length)return;state.pages[state.selected].filter=mode;invalidatePdf();renderReview();}
  function rotatePage(){if(!state.pages.length)return;state.pages[state.selected].rotation=((state.pages[state.selected].rotation||0)+90)%360;invalidatePdf();renderReview();}
  function movePage(dir){const i=state.selected,j=i+dir;if(j<0||j>=state.pages.length)return;[state.pages[i],state.pages[j]]=[state.pages[j],state.pages[i]];state.selected=j;invalidatePdf();renderReview();}
  function deletePage(){if(!state.pages.length)return;state.pages.splice(state.selected,1);state.selected=Math.min(state.selected,state.pages.length-1);invalidatePdf();if(!state.pages.length){setMode('camera');$('sdsVideo').play().catch(()=>{});}else renderReview();updateCounts();}
  function addPage(){if(state.pages.length>=MAX_PAGES){toast(`Đã đủ ${MAX_PAGES} trang.`);return;}setMode('camera');$('sdsVideo').play().catch(()=>{});}

  function formatBytes(n){
    n=Number(n)||0;if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(1)} MB`;
  }

  function asciiBytes(s){return new TextEncoder().encode(String(s));}
  function concatBytes(parts){const total=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(total);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
  function pdfNum(v){return Number(v).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');}

  async function preparePdfImages(maxDim=MAX_PDF_DIM,quality=.80){
    const out=[];
    for(let i=0;i<state.pages.length;i++){
      $('sdsBusyText').textContent=`Đang nén trang ${i+1}/${state.pages.length} cho PDF…`;
      await sleep(8);
      const c=filteredCanvas(state.pages[i],maxDim),blob=await canvasToBlob(c,'image/jpeg',quality);
      out.push({width:c.width,height:c.height,bytes:new Uint8Array(await blob.arrayBuffer())});
    }
    return out;
  }

  function buildPdfBytes(images){
    const enc=asciiBytes,parts=[],offsets=[0];let offset=0;
    const push=(b)=>{parts.push(b);offset+=b.length;};
    push(enc('%PDF-1.4\n% SAGS E-REPORT SCAN\n'));
    const pageCount=images.length,objCount=2+pageCount*3;
    const kids=[];for(let i=0;i<pageCount;i++)kids.push(`${3+i*3} 0 R`);
    const objects=new Array(objCount+1);
    objects[1]=()=>enc('<< /Type /Catalog /Pages 2 0 R >>');
    objects[2]=()=>enc(`<< /Type /Pages /Count ${pageCount} /Kids [${kids.join(' ')}] >>`);
    for(let i=0;i<pageCount;i++){
      const img=images[i],pageObj=3+i*3,imgObj=pageObj+1,contentObj=pageObj+2;
      const portrait=img.height>=img.width,pageW=portrait?595.28:841.89,pageH=portrait?841.89:595.28,margin=18;
      const scale=Math.min((pageW-margin*2)/img.width,(pageH-margin*2)/img.height),dw=img.width*scale,dh=img.height*scale,x=(pageW-dw)/2,y=(pageH-dh)/2;
      const content=`q\n${pdfNum(dw)} 0 0 ${pdfNum(dh)} ${pdfNum(x)} ${pdfNum(y)} cm\n/Im0 Do\nQ\n`;
      const contentBytes=enc(content);
      objects[pageObj]=()=>enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfNum(pageW)} ${pdfNum(pageH)}] /Resources << /XObject << /Im0 ${imgObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
      objects[imgObj]=()=>concatBytes([enc(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`),img.bytes,enc('\nendstream')]);
      objects[contentObj]=()=>concatBytes([enc(`<< /Length ${contentBytes.length} >>\nstream\n`),contentBytes,enc('endstream')]);
    }
    for(let i=1;i<=objCount;i++){
      offsets[i]=offset;push(enc(`${i} 0 obj\n`));push(objects[i]());push(enc('\nendobj\n'));
    }
    const xrefOffset=offset;let xref=`xref\n0 ${objCount+1}\n0000000000 65535 f \n`;
    for(let i=1;i<=objCount;i++)xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    push(enc(xref));push(enc(`trailer\n<< /Size ${objCount+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`));
    return concatBytes(parts);
  }

  async function createPdfFile(){
    if(!state.pages.length)throw new Error('Chưa có trang nào để tạo PDF.');
    let images=await preparePdfImages(MAX_PDF_DIM,.80);
    let total=images.reduce((a,x)=>a+x.bytes.length,0);
    if(total>PDF_SOFT_TARGET_BYTES){
      $('sdsBusyText').textContent='PDF khá lớn · đang nén thêm để chia sẻ nhanh…';await sleep(20);
      images=await preparePdfImages(1500,.68);
    }
    const bytes=buildPdfBytes(images),stamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
    return new File([bytes],`SAGS_SCAN_${stamp}.pdf`,{type:'application/pdf',lastModified:Date.now()});
  }

  function downloadPdfFile(file){
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }

  async function sharePdf(){
    if(state.busy||!state.pages.length)return;
    let file=state.pdfFile;
    if(!file || state.pdfBuiltForRevision!==state.documentRevision){
      setBusy(true,`Đang ghép ${state.pages.length} trang thành PDF…`);await sleep(25);
      try{
        file=await createPdfFile();state.pdfFile=file;state.pdfBuiltForRevision=state.documentRevision;
        const b=$('sdsSharePdf');if(b)b.innerHTML=`📤 CHIA SẺ PDF · ${formatBytes(file.size)}`;
      }catch(e){console.error('[Scanner PDF]',e);toast('Không tạo được PDF: '+(e?.message||e),5000);setBusy(false);return;}
      setBusy(false);
    }
    const shareData={files:[file],title:'Tài liệu SAGS',text:'Tài liệu scan từ E‑Report/SAGS'};
    const canFileShare=!!navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}));
    if(canFileShare){
      try{await navigator.share(shareData);return;}
      catch(e){
        if(e?.name==='AbortError')return;
        if(e?.name==='NotAllowedError'){toast('PDF đã sẵn sàng. Bấm lại CHIA SẺ PDF để mở Share Sheet.',3500);return;}
        console.warn('[Scanner share]',e);
      }
    }
    downloadPdfFile(file);
    toast('Thiết bị không mở được Share Sheet cho file. PDF đã được tải xuống; mở file rồi chọn Chia sẻ → Zalo.',5000);
  }

  async function exportFiles(){
    if(state.busy||!state.pages.length)return;
    setBusy(true,`Đang chuẩn bị ${state.pages.length} trang…`);await sleep(35);
    try{
      const stamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14),files=[];
      for(let i=0;i<state.pages.length;i++){
        $('sdsBusyText').textContent=`Đang tạo trang ${i+1}/${state.pages.length}…`;await sleep(10);
        let c=filteredCanvas(state.pages[i],MAX_SCAN_DIM),blob=await canvasToBlob(c,'image/jpeg',.88);
        if(blob.size>2_400_000){blob=await canvasToBlob(c,'image/jpeg',.76);}
        if(blob.size>3_400_000 && Math.max(c.width,c.height)>1800){const sc=1800/Math.max(c.width,c.height),small=makeCanvas(c.width*sc,c.height*sc);small.getContext('2d',{alpha:false}).drawImage(c,0,0,small.width,small.height);c=small;blob=await canvasToBlob(c,'image/jpeg',.76);}
        files.push(new File([blob],`SCAN_${stamp}_${String(i+1).padStart(2,'0')}.jpg`,{type:'image/jpeg',lastModified:Date.now()}));
      }
      $('sdsBusyText').textContent='Đang đưa tài liệu vào biểu mẫu…';
      if(typeof ingestAttachmentFiles==='function'){
        await ingestAttachmentFiles(files);
      }else{
        const input=document.getElementById('attachmentInput');if(!input)throw new Error('Không tìm thấy vùng đính kèm của E‑Report/SAGS.');
        const dt=new DataTransfer();files.forEach(f=>dt.items.add(f));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
      }
      const n=files.length;stopCamera();state.pages.length=0;state.captureCanvas=null;state.corners=null;state.selected=0;state.pdfFile=null;state.pdfBuiltForRevision=-1;state.root.classList.remove('sds-open');state.root.setAttribute('aria-hidden','true');document.documentElement.style.overflow='';document.body.style.overflow='';
      setMode('camera');
      setTimeout(()=>{try{alert(`Đã quét và đính kèm ${n} trang.`);}catch(_){ }},80);
    }catch(e){console.error('[Scanner export]',e);toast('Không đính kèm được tài liệu: '+(e?.message||e),5000);}
    finally{setBusy(false);}
  }

  function bindUI(){
    $('sdsClose').addEventListener('click',()=>close(false));$('sdsTorch').addEventListener('click',toggleTorch);$('sdsSwitch').addEventListener('click',switchCamera);$('sdsShutter').addEventListener('click',capture);$('sdsDone').addEventListener('click',()=>renderReview());
    $('sdsHelp').addEventListener('click',()=>$('sdsHelpPanel').classList.add('show'));$('sdsHelpClose').addEventListener('click',()=>$('sdsHelpPanel').classList.remove('show'));$('sdsHelpPanel').addEventListener('click',e=>{if(e.target===$('sdsHelpPanel'))$('sdsHelpPanel').classList.remove('show');});
    $('sdsRetake').addEventListener('click',retake);$('sdsRotateCapture').addEventListener('click',rotateCapture);$('sdsSavePage').addEventListener('click',savePage);
    const cc=$('sdsCropCanvas');cc.addEventListener('pointerdown',onCropDown);cc.addEventListener('pointermove',onCropMove);cc.addEventListener('pointerup',onCropUp);cc.addEventListener('pointercancel',onCropUp);
    $('sdsFilterTools').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b)setFilter(b.dataset.filter);});$('sdsRotatePage').addEventListener('click',rotatePage);$('sdsMoveLeft').addEventListener('click',()=>movePage(-1));$('sdsMoveRight').addEventListener('click',()=>movePage(1));$('sdsDeletePage').addEventListener('click',deletePage);$('sdsAddPage').addEventListener('click',addPage);$('sdsAttach').addEventListener('click',exportFiles);$('sdsSharePdf').addEventListener('click',sharePdf);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.root?.classList.contains('sds-open')&&state.mode==='camera'){try{$('sdsVideo').pause();}catch(_){ }}else if(!document.hidden&&state.mode==='camera'&&state.stream){$('sdsVideo').play().catch(()=>{});}});
  }

  function installSourceButton(){
    const modal=document.getElementById('attachmentSourceModal'),box=modal?.querySelector('.attachmentSourceBox');if(!box||document.getElementById('sagsScannerSourceBtn'))return false;
    const btn=document.createElement('button');btn.id='sagsScannerSourceBtn';btn.type='button';btn.textContent='📄 QUÉT TÀI LIỆU (NHIỀU TRANG)';btn.style.cssText='background:#0b5cab;color:#fff;font-weight:900';
    btn.addEventListener('click',()=>{try{if(typeof closeAttachmentSourceModal==='function')closeAttachmentSourceModal();else modal.style.display='none';}catch(_){modal.style.display='none';}open();});
    const cancel=box.querySelector('.cancel');box.insertBefore(btn,cancel||null);return true;
  }

  function boot(){
    buildUI();installSourceButton();
    const observer=new MutationObserver(()=>{installSourceButton();});observer.observe(document.documentElement,{childList:true,subtree:true});
    window.dispatchEvent(new CustomEvent('sags:document-scanner-ready',{detail:{build:BUILD}}));
  }

  window.SAGSDocumentScanner={build:BUILD,open,close:()=>close(false),get pageCount(){return state.pages.length;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* ===== END document-scanner.js ===== */

/* ===== BEGIN admin-builder.js ===== */
/* E-Report SAGS · V1.29 ADMIN BUILDER
   No-code dynamic module/form/rule/workflow engine.
   Safety: no eval/new Function/custom HTML/custom JS from config.
*/
(()=>{
'use strict';

const AB_VERSION='1.0.0';
const AB_MODULE_KIND='sags_admin_builder_module_v1';
const AB_HISTORY_KIND='sags_admin_builder_history_v1';
const AB_RECORD_KIND='sags_dynamic_form_record_v1';
const AB_CATALOG_KIND='sags_admin_builder_catalog_v1';
const AB_CATALOG_DOC='ADMIN_BUILDER_CATALOG_V1';
const AB_SIGNAL_PATH='admin_builder/catalog_signal';
const AB_RECORD_SIGNAL_PATH='admin_builder/record_signal';
const AB_CACHE_KEY='sags_admin_builder_catalog_cache_v1';
const AB_CACHE_MAX_AGE=6*60*60*1000;
const AB_ALL_ROLES=['AD','DH','CBTT','PVHK','KTTB','VHTTB','PVHLNG','LOSTFOUND','VIEWER','FPL','KH'];
const AB_FIELD_TYPES=[
  ['text','Chữ'],['number','Số'],['time','Giờ'],['date','Ngày'],['datetime','Ngày + giờ'],
  ['textarea','Ghi chú dài'],['select','Danh sách chọn'],['radio','Chọn 1'],['checkbox','Có / Không'],
  ['yesno','CÓ / KHÔNG'],['readonly','Chỉ đọc'],['formula','Tự tính'],['attachment','Link tài liệu / MediaFire'],['section','Tiêu đề nhóm']
];
const AB_OPS=[['==','='],['!=','≠'],['>','>'],['>=','≥'],['<','<'],['<=','≤'],['empty','ĐỂ TRỐNG'],['not_empty','CÓ DỮ LIỆU'],['between','TRONG KHOẢNG']];

let abCatalog={version:0,modules:[]};
let abCatalogSignalRef=null, abCatalogSignalCb=null;
let abEditingId='';
let abEditor={fields:[],rules:[],workflow:[]};
let abCurrentModule=null;
let abCurrentRecord=null;
let abBuilderList=[];
let abDismissedRuleKeys=new Set();
let abInitialized=false;
let abRecordSignalRef=null,abRecordSignalCb=null;
let abPendingByModule={};

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const safeId=v=>String(v||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/\s+/g,'_').replace(/[^A-Z0-9._-]/g,'_').replace(/_+/g,'_').slice(0,70);
const keyId=v=>safeId(v).replace(/[^A-Z0-9_]/g,'_').replace(/^([0-9])/,'F_$1').slice(0,40);
const clone=v=>JSON.parse(JSON.stringify(v??null));
const now=()=>Date.now();

function abDb(){
  if(typeof initHandoverFirebase!=='function')throw new Error('Firebase chưa sẵn sàng.');
  return initHandoverFirebase();
}
function abActor(){
  try{ if(typeof currentActor==='function')return currentActor(); }catch(_){ }
  const p=(typeof currentUserProfile!=='undefined'&&currentUserProfile)||{};
  return {username:String(p.username||''),name:String(p.name||p.fullName||p.username||''),role:String((typeof currentRole!=='undefined'?currentRole:p.role)||'').toUpperCase()};
}
function abIdentity(){
  const p=(typeof currentUserProfile!=='undefined'&&currentUserProfile)||{};
  const role=String((typeof currentRole!=='undefined'?currentRole:p.role)||'').toUpperCase();
  let group=String(p.groupCode||'').toUpperCase();
  let dep=String(p.departmentCode||p.systemDepartment||'').toUpperCase();
  try{ if(!group&&typeof v18InferGroup==='function')group=String(v18InferGroup(p,role)||'').toUpperCase(); }catch(_){ }
  try{ if(!dep&&typeof v18LegacyDept==='function')dep=String(v18LegacyDept(p,role)||'').toUpperCase(); }catch(_){ }
  return {role,group,department:dep,username:String(p.username||'').toLowerCase(),name:String(p.name||p.fullName||p.username||'')};
}
function abIsAdmin(){return abIdentity().role==='AD';}
function abUnique(arr){return [...new Set((arr||[]).map(x=>String(x||'').trim().toUpperCase()).filter(Boolean))];}
function abCsv(v){return abUnique(String(v||'').split(/[,;\n]+/));}
function abArrayText(arr){return (arr||[]).join(', ');}

function abDefaultModule(){return {
  id:'',code:'',name:'',icon:'🧩',description:'',category:'NGHIỆP VỤ',order:500,
  status:'DRAFT',active:true,requireFlight:false,submitLabel:'GỬI / LƯU',
  visibility:{roles:['AD'],groups:[],departments:[]},submitRoles:['AD'],
  fields:[],rules:[],workflow:[],revision:0,publishVersion:0,updatedAtMs:0
};}
function abNormalizeModule(raw){
  const d={...abDefaultModule(),...(raw||{})};
  d.id=String(d.id||''); d.code=safeId(d.code||d.id); d.name=String(d.name||d.code||'CHỨC NĂNG');
  d.icon=String(d.icon||'🧩').slice(0,8); d.category=String(d.category||'NGHIỆP VỤ').slice(0,50);
  d.order=Number.isFinite(Number(d.order))?Number(d.order):500; d.status=String(d.status||'DRAFT').toUpperCase(); d.active=d.active!==false;
  d.visibility=d.visibility&&typeof d.visibility==='object'?d.visibility:{};
  d.visibility.roles=abUnique(d.visibility.roles||[]); d.visibility.groups=abUnique(d.visibility.groups||[]); d.visibility.departments=abUnique(d.visibility.departments||[]);
  d.submitRoles=abUnique(d.submitRoles||d.visibility.roles||[]);
  d.fields=Array.isArray(d.fields)?d.fields.map((f,i)=>abNormalizeField(f,i)):[];
  d.rules=Array.isArray(d.rules)?d.rules.map((r,i)=>abNormalizeRule(r,i)):[];
  d.workflow=Array.isArray(d.workflow)?d.workflow.map((s,i)=>abNormalizeStep(s,i)):[];
  return d;
}
function abNormalizeField(f,i=0){
  const type=AB_FIELD_TYPES.some(x=>x[0]===f?.type)?f.type:'text';
  return {
    id:String(f?.id||('FIELD_'+(i+1))),key:keyId(f?.key||f?.label||('F'+(i+1))),label:String(f?.label||('Trường '+(i+1))),type,
    required:!!f?.required,placeholder:String(f?.placeholder||''),defaultValue:String(f?.defaultValue??''),unit:String(f?.unit||''),
    options:Array.isArray(f?.options)?f.options.map(String).filter(Boolean):String(f?.options||'').split(',').map(x=>x.trim()).filter(Boolean),
    min:f?.min===''||f?.min==null?'':Number(f.min),max:f?.max===''||f?.max==null?'':Number(f.max),
    formula:String(f?.formula||''),showWhen:f?.showWhen&&typeof f.showWhen==='object'?{field:keyId(f.showWhen.field||''),op:String(f.showWhen.op||'=='),value:String(f.showWhen.value??'')}:{field:'',op:'==',value:''}
  };
}
function abNormalizeCondition(c){return {field:keyId(c?.field||''),op:String(c?.op||'=='),value:String(c?.value??'')};}
function abNormalizeRule(r,i=0){return {
  id:String(r?.id||('RULE_'+(i+1))),name:String(r?.name||('Cảnh báo '+(i+1))),
  c1:abNormalizeCondition(r?.c1||{}),join:['AND','OR'].includes(String(r?.join||'').toUpperCase())?String(r.join).toUpperCase():'',
  c2:abNormalizeCondition(r?.c2||{}),message:String(r?.message||'CẦN KIỂM TRA LẠI DỮ LIỆU'),blocking:!!r?.blocking,active:r?.active!==false
};}
function abNormalizeStep(s,i=0){return {id:String(s?.id||('STEP_'+(i+1))),label:String(s?.label||('Bước '+(i+1))),role:String(s?.role||'AD').toUpperCase(),action:String(s?.action||'XÁC NHẬN')};}

function abInjectCss(){
  if($('abStyle'))return;
  const st=document.createElement('style');st.id='abStyle';st.textContent=`
  #adminBuilderModal,#abRuntimeModal{position:fixed;inset:0;z-index:13680;display:none;align-items:flex-start;justify-content:center;background:rgba(0,0,0,.58);padding:max(10px,env(safe-area-inset-top)) 8px max(10px,env(safe-area-inset-bottom));box-sizing:border-box;overflow:auto}
  .abPanel{width:min(98vw,1040px);max-height:96vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 18px 52px rgba(0,0,0,.35);padding:14px;box-sizing:border-box;font:13px/1.42 Arial;color:#203040}
  .abTop{position:sticky;top:-14px;z-index:5;background:#fff;display:flex;gap:8px;align-items:center;justify-content:space-between;padding:5px 0 10px;border-bottom:1px solid #e0e6ec}.abTop h3{margin:0;color:#003B8E;font:900 20px Arial}.abClose{border:0;background:#e9edf2;border-radius:9px;padding:9px 13px;font-weight:900}
  .abHint{background:#eef6ff;border-left:4px solid #0b67b2;border-radius:9px;padding:9px 10px;margin:9px 0;color:#274862;font-weight:700}.abWarn{background:#fff0ef;border:2px solid #d92d20;color:#9d1c14;border-radius:10px;padding:10px;margin:8px 0;font-weight:900}.abWarn button{float:right;border:0;background:#9d1c14;color:#fff;border-radius:7px;padding:5px 8px;font-weight:900}
  .abTabs{display:flex;gap:6px;overflow:auto;padding:8px 0;position:sticky;top:44px;background:#fff;z-index:4}.abTab{white-space:nowrap;border:1px solid #afbcc8;border-radius:9px;padding:8px 10px;background:#f7f9fb;color:#234;font-weight:900}.abTab.active{background:#003B8E;color:#fff;border-color:#003B8E}.abPane{display:none}.abPane.active{display:block}
  .abCard{border:1px solid #d7dfe7;background:#fbfcfe;border-radius:12px;padding:11px;margin:9px 0}.abCardTitle{font:900 15px Arial;color:#17324d;margin-bottom:7px}.abGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.abGrid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.abLabel{display:block;font:900 11px Arial;color:#4c5d6c;margin:4px 0}.abInput,.abSelect,.abTextarea{width:100%;box-sizing:border-box;border:1px solid #aeb9c4;background:#fff;color:#172735;border-radius:8px;padding:9px;font:700 13px Arial}.abTextarea{min-height:72px;resize:vertical}.abCheckGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.abCheck{display:flex;align-items:center;gap:6px;border:1px solid #d8e0e7;border-radius:8px;padding:7px;background:#fff;font-weight:800}
  .abActions{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0}.abBtn{border:0;border-radius:8px;min-height:36px;padding:7px 11px;font-weight:900;background:#003B8E;color:#fff}.abBtn.secondary{background:#e8eef5;color:#234;border:1px solid #c3ced8}.abBtn.good{background:#167947}.abBtn.warn{background:#ad6800}.abBtn.danger{background:#b42318}.abBtn:disabled{opacity:.45}.abStatus{min-height:20px;font-weight:800;color:#516170}.abStatus.err{color:#b42318}
  .abFieldRow,.abRuleRow,.abStepRow{border:1px solid #d5dee7;border-radius:10px;background:#fff;padding:9px;margin:7px 0}.abRowHead{display:flex;align-items:center;gap:7px;justify-content:space-between}.abRowHead b{color:#17324d}.abMiniActions{display:flex;gap:4px}.abMiniActions button{border:0;border-radius:7px;padding:5px 7px;font-weight:900;background:#edf2f7;color:#234}.abMiniActions .danger{background:#fff0ef;color:#b42318}.abRuleJoin{font-weight:900;color:#003B8E;text-align:center;padding-top:23px}
  .abList{display:flex;flex-direction:column;gap:7px}.abItem{border:1px solid #d3dde6;border-radius:10px;background:#fff;padding:10px}.abItemTitle{font:900 14px Arial;color:#17324d}.abMeta{font:700 11px Arial;color:#667788;margin-top:3px}.abPill{display:inline-block;border-radius:20px;padding:3px 7px;font:900 10px Arial;background:#eaf2fb;color:#174d80;margin:2px}.abPill.pub{background:#e8f6ed;color:#167947}.abPill.draft{background:#fff5df;color:#8a5a00}.abPill.off{background:#f2f2f2;color:#666}
  .abRuntimeFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.abRuntimeField{min-width:0}.abRuntimeField.full,.abRuntimeSection{grid-column:1/-1}.abRuntimeSection{font:900 15px Arial;color:#003B8E;border-bottom:2px solid #d7e5f4;padding:9px 2px 5px;margin-top:4px}.abRadioGroup{display:flex;gap:8px;flex-wrap:wrap;border:1px solid #c9d3dc;border-radius:8px;padding:8px;background:#fff}.abRadioGroup label{font-weight:800}.abFormula{background:#f3f7fb!important;color:#123d66!important}.abUnitWrap{display:flex;align-items:center;gap:6px}.abUnit{font-weight:900;color:#607080;white-space:nowrap}.abRecords{margin-top:12px;border-top:1px solid #d9e1e8;padding-top:10px}.abRecordItem{border:1px solid #d6dfe7;border-radius:9px;padding:9px;margin:6px 0;background:#fff}.abRecordValues{font-size:11px;color:#556575;margin-top:4px}.abWorkflow{font-weight:900;color:#003B8E;margin-top:5px}
  .abHelp h4{color:#003B8E;margin:14px 0 5px}.abHelp ol,.abHelp ul{padding-left:20px}.abHelp code{background:#eef2f6;border-radius:4px;padding:1px 4px}.abExample{border-left:4px solid #167947;background:#effaf3;border-radius:8px;padding:9px 10px;margin:8px 0}
  .abDynamicBtn{position:relative}.abDynamicBadge{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;border-radius:10px;background:#c8241b;color:#fff;font:900 10px Arial;display:none;align-items:center;justify-content:center;padding:0 3px;box-sizing:border-box}
  @media(max-width:700px){.abGrid,.abGrid3,.abRuntimeFields{grid-template-columns:1fr}.abCheckGrid{grid-template-columns:repeat(2,1fr)}.abTabs{top:42px}.abPanel{padding:11px}.abGrid .wide,.abGrid3 .wide{grid-column:1/-1}}
  `;document.head.appendChild(st);
}

function abEnsureModals(){
  if(!$('adminBuilderModal')){
    const d=document.createElement('div');d.id='adminBuilderModal';d.innerHTML=`<div class="abPanel">
      <div class="abTop"><h3>ADMIN BUILDER · AD</h3><button class="abClose" onclick="abCloseBuilder()">ĐÓNG</button></div>
      <div class="abHint"><b>TỰ TẠO CHỨC NĂNG KHÔNG CẦN UPDATE CODE.</b> Tạo nút → tạo biểu mẫu → thêm rule/cảnh báo → chọn tài khoản/đơn vị được dùng → XEM THỬ → XUẤT BẢN. Cấu hình được lưu Firebase và tải động trên các máy khác.</div>
      <div class="abTabs">
        <button class="abTab active" data-abtab="basic" onclick="abSwitchTab('basic')">1 · CHỨC NĂNG</button>
        <button class="abTab" data-abtab="fields" onclick="abSwitchTab('fields')">2 · BIỂU MẪU</button>
        <button class="abTab" data-abtab="rules" onclick="abSwitchTab('rules')">3 · CẢNH BÁO</button>
        <button class="abTab" data-abtab="workflow" onclick="abSwitchTab('workflow')">4 · WORKFLOW</button>
        <button class="abTab" data-abtab="permissions" onclick="abSwitchTab('permissions')">5 · PHÂN QUYỀN</button>
        <button class="abTab" data-abtab="preview" onclick="abSwitchTab('preview')">6 · XEM THỬ</button>
        <button class="abTab" data-abtab="list" onclick="abSwitchTab('list')">ĐÃ TẠO</button>
        <button class="abTab" data-abtab="help" onclick="abSwitchTab('help')">HDSD</button>
      </div>
      <div id="abPaneBasic" class="abPane active"></div><div id="abPaneFields" class="abPane"></div><div id="abPaneRules" class="abPane"></div><div id="abPaneWorkflow" class="abPane"></div><div id="abPanePermissions" class="abPane"></div><div id="abPanePreview" class="abPane"></div><div id="abPaneList" class="abPane"></div><div id="abPaneHelp" class="abPane abHelp"></div>
    </div>`;document.body.appendChild(d);
  }
  if(!$('abRuntimeModal')){
    const d=document.createElement('div');d.id='abRuntimeModal';d.innerHTML=`<div class="abPanel" style="width:min(98vw,860px)"><div class="abTop"><h3 id="abRuntimeTitle">BIỂU MẪU</h3><button class="abClose" onclick="abCloseRuntime()">ĐÓNG</button></div><div id="abRuntimeBody"></div></div>`;document.body.appendChild(d);
  }
}

function abEnsureAdminButton(){
  if($('roleBtnAdminBuilder'))return;
  const anchor=$('roleBtnManual'), row=document.querySelector('.toolbar-row.main-actions');if(!row)return;
  const b=document.createElement('button');b.id='roleBtnAdminBuilder';b.textContent='ADMIN BUILDER';b.style.display='none';b.onclick=()=>abOpenBuilder();
  if(anchor?.nextSibling)row.insertBefore(b,anchor.nextSibling);else row.appendChild(b);
}
function abRoleOptionsHtml(selected=[]){const s=new Set(abUnique(selected));return AB_ALL_ROLES.map(r=>`<label class="abCheck"><input type="checkbox" data-abrole="${r}" ${s.has(r)?'checked':''}> ${r}</label>`).join('');}

function abSwitchTab(tab){
  const t=String(tab||'basic');document.querySelectorAll('.abTab').forEach(b=>b.classList.toggle('active',b.dataset.abtab===t));document.querySelectorAll('#adminBuilderModal .abPane').forEach(p=>p.classList.remove('active'));
  const pane=$('abPane'+t.charAt(0).toUpperCase()+t.slice(1));if(pane)pane.classList.add('active');
  if(t==='preview')abRenderPreview();if(t==='list')abRefreshBuilderList();
}

function abRenderEditor(){
  const m=abEditor.module||abDefaultModule();
  $('abPaneBasic').innerHTML=`<div class="abCard"><div class="abCardTitle">THÔNG TIN NÚT / CHỨC NĂNG</div><div class="abGrid3">
    <div><label class="abLabel">Mã chức năng *</label><input id="abCode" class="abInput" value="${esc(m.code)}" placeholder="VD: CHECK_GPU"></div>
    <div><label class="abLabel">Tên nút / chức năng *</label><input id="abName" class="abInput" value="${esc(m.name)}" placeholder="VD: KIỂM TRA GPU"></div>
    <div><label class="abLabel">Icon / ký hiệu</label><input id="abIcon" class="abInput" value="${esc(m.icon||'🧩')}" placeholder="🧩"></div>
    <div><label class="abLabel">Nhóm</label><input id="abCategory" class="abInput" value="${esc(m.category||'NGHIỆP VỤ')}"></div>
    <div><label class="abLabel">Thứ tự nút</label><input id="abOrder" class="abInput" type="number" value="${Number(m.order||500)}"></div>
    <div><label class="abLabel">Chữ trên nút GỬI/LƯU</label><input id="abSubmitLabel" class="abInput" value="${esc(m.submitLabel||'GỬI / LƯU')}"></div>
    <div class="wide" style="grid-column:1/-1"><label class="abLabel">Mô tả / mục đích</label><textarea id="abDescription" class="abTextarea">${esc(m.description||'')}</textarea></div>
  </div><label class="abCheck" style="margin-top:8px"><input id="abRequireFlight" type="checkbox" ${m.requireFlight?'checked':''}> Chỉ cho nhập khi đang có chuyến đang chọn</label></div>
  <div class="abActions"><button class="abBtn good" onclick="abSaveDraft()">LƯU NHÁP</button><button class="abBtn" onclick="abPublish()">XUẤT BẢN</button><button class="abBtn secondary" onclick="abResetEditor()">TẠO MỚI</button></div><div id="abBuilderStatus" class="abStatus"></div>`;
  abRenderFields();abRenderRules();abRenderWorkflow();abRenderPermissions();abRenderHelp();
}
function abRenderFields(){
  const host=$('abPaneFields');if(!host)return;
  host.innerHTML=`<div class="abCard"><div class="abRowHead"><div><div class="abCardTitle">CÁC TRƯỜNG TRÊN BIỂU MẪU</div><div class="abMeta">Key dùng cho công thức/rule. Không nhập JavaScript.</div></div><button class="abBtn good" onclick="abAddField()">+ THÊM TRƯỜNG</button></div><div id="abFieldList"></div></div>`;
  const list=$('abFieldList');abEditor.fields.forEach((f,i)=>{const n=abNormalizeField(f,i),row=document.createElement('div');row.className='abFieldRow';row.innerHTML=`
    <div class="abRowHead"><b>${i+1}. ${esc(n.label)} <span class="abPill">${esc(n.key)}</span></b><div class="abMiniActions"><button onclick="abMoveField(${i},-1)">↑</button><button onclick="abMoveField(${i},1)">↓</button><button class="danger" onclick="abDeleteField(${i})">XÓA</button></div></div>
    <div class="abGrid3" style="margin-top:7px">
      <div><label class="abLabel">Tên trường</label><input class="abInput" data-fprop="label" data-i="${i}" value="${esc(n.label)}" oninput="abFieldChanged(this)"></div>
      <div><label class="abLabel">Key</label><input class="abInput" data-fprop="key" data-i="${i}" value="${esc(n.key)}" oninput="abFieldChanged(this)"></div>
      <div><label class="abLabel">Loại</label><select class="abSelect" data-fprop="type" data-i="${i}" onchange="abFieldChanged(this)">${AB_FIELD_TYPES.map(x=>`<option value="${x[0]}" ${n.type===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div>
      <div><label class="abLabel">Placeholder</label><input class="abInput" data-fprop="placeholder" data-i="${i}" value="${esc(n.placeholder)}" oninput="abFieldChanged(this)"></div>
      <div><label class="abLabel">Giá trị mặc định</label><input class="abInput" data-fprop="defaultValue" data-i="${i}" value="${esc(n.defaultValue)}" oninput="abFieldChanged(this)"></div>
      <div><label class="abLabel">Đơn vị</label><input class="abInput" data-fprop="unit" data-i="${i}" value="${esc(n.unit)}" oninput="abFieldChanged(this)"></div>
      <div><label class="abLabel">Min</label><input class="abInput" type="number" data-fprop="min" data-i="${i}" value="${n.min===''?'':esc(n.min)}" oninput="abFieldChanged(this)"></div>
      <div><label class="abLabel">Max</label><input class="abInput" type="number" data-fprop="max" data-i="${i}" value="${n.max===''?'':esc(n.max)}" oninput="abFieldChanged(this)"></div>
      <div><label class="abLabel">Danh sách lựa chọn (cách nhau dấu phẩy)</label><input class="abInput" data-fprop="options" data-i="${i}" value="${esc(n.options.join(', '))}" oninput="abFieldChanged(this)"></div>
      <div class="wide" style="grid-column:1/-1"><label class="abLabel">Công thức (chỉ loại Tự tính) · VD: BAG_KG / BAG_PCS</label><input class="abInput" data-fprop="formula" data-i="${i}" value="${esc(n.formula)}" oninput="abFieldChanged(this)"></div>
      <div><label class="abLabel">Hiện khi FIELD</label><input class="abInput" data-fprop="showField" data-i="${i}" value="${esc(n.showWhen.field)}" oninput="abFieldChanged(this)"></div>
      <div><label class="abLabel">Điều kiện</label><select class="abSelect" data-fprop="showOp" data-i="${i}" onchange="abFieldChanged(this)">${AB_OPS.map(x=>`<option value="${x[0]}" ${n.showWhen.op===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div>
      <div><label class="abLabel">Giá trị điều kiện</label><input class="abInput" data-fprop="showValue" data-i="${i}" value="${esc(n.showWhen.value)}" oninput="abFieldChanged(this)"></div>
    </div><label class="abCheck" style="margin-top:7px"><input type="checkbox" data-fprop="required" data-i="${i}" ${n.required?'checked':''} onchange="abFieldChanged(this)"> Bắt buộc nhập</label>`;list.appendChild(row);});
  if(!abEditor.fields.length)list.innerHTML='<div class="abHint">Chưa có trường. Bấm <b>+ THÊM TRƯỜNG</b>.</div>';
}
function abFieldChanged(el){
  const i=Number(el.dataset.i),p=el.dataset.fprop;if(!abEditor.fields[i])return;let v=el.type==='checkbox'?!!el.checked:el.value;
  if(p==='key')v=keyId(v); if(p==='options')v=String(v).split(',').map(x=>x.trim()).filter(Boolean); if(p==='min'||p==='max')v=v===''?'':Number(v);
  if(p==='showField')abEditor.fields[i].showWhen={...(abEditor.fields[i].showWhen||{}),field:keyId(v)};
  else if(p==='showOp')abEditor.fields[i].showWhen={...(abEditor.fields[i].showWhen||{}),op:String(v)};
  else if(p==='showValue')abEditor.fields[i].showWhen={...(abEditor.fields[i].showWhen||{}),value:String(v)};
  else abEditor.fields[i][p]=v;
}
function abAddField(){abEditor.fields.push(abNormalizeField({label:'Trường mới',key:'F'+(abEditor.fields.length+1)},abEditor.fields.length));abRenderFields();}
function abDeleteField(i){abEditor.fields.splice(i,1);abRenderFields();}
function abMoveField(i,d){const j=i+d;if(j<0||j>=abEditor.fields.length)return;[abEditor.fields[i],abEditor.fields[j]]=[abEditor.fields[j],abEditor.fields[i]];abRenderFields();}

function abFieldKeyOptions(selected=''){return '<option value="">— chọn field —</option>'+abEditor.fields.filter(f=>f.type!=='section').map(f=>`<option value="${esc(f.key)}" ${String(f.key)===String(selected)?'selected':''}>${esc(f.key)} · ${esc(f.label)}</option>`).join('');}
function abRenderRules(){
  const host=$('abPaneRules');if(!host)return;host.innerHTML=`<div class="abCard"><div class="abRowHead"><div><div class="abCardTitle">RULE / CẢNH BÁO</div><div class="abMeta">Mỗi rule có tối đa 2 điều kiện ghép AND/OR. Mặc định chỉ cảnh báo; bật CHẶN nếu thực sự bắt buộc.</div></div><button class="abBtn good" onclick="abAddRule()">+ THÊM RULE</button></div><div id="abRuleList"></div></div>`;
  const list=$('abRuleList');abEditor.rules.forEach((r,i)=>{const n=abNormalizeRule(r,i),row=document.createElement('div');row.className='abRuleRow';row.innerHTML=`
    <div class="abRowHead"><b>${esc(n.name)}</b><div class="abMiniActions"><button class="danger" onclick="abDeleteRule(${i})">XÓA</button></div></div>
    <div class="abGrid3" style="margin-top:7px"><div><label class="abLabel">Tên rule</label><input class="abInput" data-rprop="name" data-i="${i}" value="${esc(n.name)}" oninput="abRuleChanged(this)"></div><div><label class="abLabel">FIELD 1</label><select class="abSelect" data-rprop="c1field" data-i="${i}" onchange="abRuleChanged(this)">${abFieldKeyOptions(n.c1.field)}</select></div><div><label class="abLabel">Điều kiện 1</label><select class="abSelect" data-rprop="c1op" data-i="${i}" onchange="abRuleChanged(this)">${AB_OPS.map(x=>`<option value="${x[0]}" ${n.c1.op===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div>
    <div><label class="abLabel">Giá trị 1 · BETWEEN dùng: 10,20</label><input class="abInput" data-rprop="c1value" data-i="${i}" value="${esc(n.c1.value)}" oninput="abRuleChanged(this)"></div><div><label class="abLabel">Ghép điều kiện</label><select class="abSelect" data-rprop="join" data-i="${i}" onchange="abRuleChanged(this)"><option value="" ${!n.join?'selected':''}>KHÔNG</option><option value="AND" ${n.join==='AND'?'selected':''}>AND</option><option value="OR" ${n.join==='OR'?'selected':''}>OR</option></select></div><div><label class="abLabel">FIELD 2</label><select class="abSelect" data-rprop="c2field" data-i="${i}" onchange="abRuleChanged(this)">${abFieldKeyOptions(n.c2.field)}</select></div>
    <div><label class="abLabel">Điều kiện 2</label><select class="abSelect" data-rprop="c2op" data-i="${i}" onchange="abRuleChanged(this)">${AB_OPS.map(x=>`<option value="${x[0]}" ${n.c2.op===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div><div><label class="abLabel">Giá trị 2</label><input class="abInput" data-rprop="c2value" data-i="${i}" value="${esc(n.c2.value)}" oninput="abRuleChanged(this)"></div><div></div>
    <div class="wide" style="grid-column:1/-1"><label class="abLabel">Nội dung cảnh báo</label><input class="abInput" data-rprop="message" data-i="${i}" value="${esc(n.message)}" oninput="abRuleChanged(this)"></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:7px"><label class="abCheck"><input type="checkbox" data-rprop="active" data-i="${i}" ${n.active?'checked':''} onchange="abRuleChanged(this)"> Bật rule</label><label class="abCheck"><input type="checkbox" data-rprop="blocking" data-i="${i}" ${n.blocking?'checked':''} onchange="abRuleChanged(this)"> CHẶN GỬI khi vi phạm</label></div>`;list.appendChild(row);});
  if(!abEditor.rules.length)list.innerHTML='<div class="abHint">Không có rule thì biểu mẫu vẫn hoạt động bình thường.</div>';
}
function abRuleChanged(el){const i=Number(el.dataset.i),p=el.dataset.rprop;if(!abEditor.rules[i])return;const r=abEditor.rules[i],v=el.type==='checkbox'?!!el.checked:el.value;if(p==='c1field')r.c1.field=keyId(v);else if(p==='c1op')r.c1.op=v;else if(p==='c1value')r.c1.value=v;else if(p==='c2field')r.c2.field=keyId(v);else if(p==='c2op')r.c2.op=v;else if(p==='c2value')r.c2.value=v;else r[p]=v;}
function abAddRule(){abEditor.rules.push(abNormalizeRule({name:'Cảnh báo '+(abEditor.rules.length+1)},abEditor.rules.length));abRenderRules();}
function abDeleteRule(i){abEditor.rules.splice(i,1);abRenderRules();}

function abRenderWorkflow(){
  const host=$('abPaneWorkflow');if(!host)return;host.innerHTML=`<div class="abCard"><div class="abRowHead"><div><div class="abCardTitle">WORKFLOW XÁC NHẬN SAU KHI GỬI</div><div class="abMeta">Không bắt buộc. Ví dụ: CBTT CHECK → ĐH XÁC NHẬN. Mỗi bước chỉ vai trò được chọn mới bấm được nút xác nhận.</div></div><button class="abBtn good" onclick="abAddStep()">+ THÊM BƯỚC</button></div><div id="abStepList"></div></div>`;
  const list=$('abStepList');abEditor.workflow.forEach((s,i)=>{const n=abNormalizeStep(s,i),row=document.createElement('div');row.className='abStepRow';row.innerHTML=`<div class="abRowHead"><b>BƯỚC ${i+1}</b><div class="abMiniActions"><button onclick="abMoveStep(${i},-1)">↑</button><button onclick="abMoveStep(${i},1)">↓</button><button class="danger" onclick="abDeleteStep(${i})">XÓA</button></div></div><div class="abGrid3" style="margin-top:7px"><div><label class="abLabel">Tên bước</label><input class="abInput" data-sprop="label" data-i="${i}" value="${esc(n.label)}" oninput="abStepChanged(this)"></div><div><label class="abLabel">Vai trò xử lý</label><select class="abSelect" data-sprop="role" data-i="${i}" onchange="abStepChanged(this)">${AB_ALL_ROLES.map(r=>`<option ${n.role===r?'selected':''}>${r}</option>`).join('')}</select></div><div><label class="abLabel">Tên nút hành động</label><input class="abInput" data-sprop="action" data-i="${i}" value="${esc(n.action)}" oninput="abStepChanged(this)"></div></div>`;list.appendChild(row);});
  if(!abEditor.workflow.length)list.innerHTML='<div class="abHint">Không có workflow: người dùng nhập và lưu xong là hoàn tất.</div>';
}
function abStepChanged(el){const i=Number(el.dataset.i),p=el.dataset.sprop;if(abEditor.workflow[i])abEditor.workflow[i][p]=el.value;}
function abAddStep(){abEditor.workflow.push(abNormalizeStep({label:'Bước '+(abEditor.workflow.length+1),role:'AD',action:'XÁC NHẬN'},abEditor.workflow.length));abRenderWorkflow();}
function abDeleteStep(i){abEditor.workflow.splice(i,1);abRenderWorkflow();}
function abMoveStep(i,d){const j=i+d;if(j<0||j>=abEditor.workflow.length)return;[abEditor.workflow[i],abEditor.workflow[j]]=[abEditor.workflow[j],abEditor.workflow[i]];abRenderWorkflow();}

function abRenderPermissions(){
  const m=abEditor.module||abDefaultModule(),host=$('abPanePermissions');if(!host)return;host.innerHTML=`<div class="abCard"><div class="abCardTitle">AI ĐƯỢC THẤY NÚT NÀY?</div><div class="abCheckGrid" id="abRoleChecks">${abRoleOptionsHtml(m.visibility?.roles||['AD'])}</div><div class="abGrid" style="margin-top:8px"><div><label class="abLabel">GroupCode bổ sung · cách nhau dấu phẩy</label><input id="abGroups" class="abInput" value="${esc(abArrayText(m.visibility?.groups||[]))}" placeholder="VD: VHTTB, PVHK"></div><div><label class="abLabel">DepartmentCode bổ sung</label><input id="abDepartments" class="abInput" value="${esc(abArrayText(m.visibility?.departments||[]))}" placeholder="VD: DH, CBTT"></div></div></div>
  <div class="abCard"><div class="abCardTitle">AI ĐƯỢC NHẬP / GỬI?</div><div class="abMeta">Để trống = dùng cùng danh sách được thấy. Có thể nhập: PVHK, CBTT...</div><input id="abSubmitRoles" class="abInput" value="${esc(abArrayText(m.submitRoles||[]))}"></div>
  <div class="abHint">AD luôn có thể mở module để kiểm tra. Người dùng chỉ thấy module khi khớp ít nhất một tiêu chí Role / Group / Department đã cấu hình.</div>`;
}

function abReadEditorIntoModule(){
  const old=abEditor.module||abDefaultModule(),m=abNormalizeModule({...old});
  m.code=safeId($('abCode')?.value||m.code);m.name=String($('abName')?.value||m.name).trim();m.icon=String($('abIcon')?.value||'🧩').trim().slice(0,8)||'🧩';m.category=String($('abCategory')?.value||'NGHIỆP VỤ').trim();m.order=Number($('abOrder')?.value||500);m.submitLabel=String($('abSubmitLabel')?.value||'GỬI / LƯU').trim()||'GỬI / LƯU';m.description=String($('abDescription')?.value||'').trim();m.requireFlight=!!$('abRequireFlight')?.checked;
  const roles=[...document.querySelectorAll('#abRoleChecks [data-abrole]:checked')].map(x=>x.dataset.abrole);m.visibility={roles:abUnique(roles),groups:abCsv($('abGroups')?.value),departments:abCsv($('abDepartments')?.value)};m.submitRoles=abCsv($('abSubmitRoles')?.value);if(!m.submitRoles.length)m.submitRoles=[...m.visibility.roles];m.fields=abEditor.fields.map(abNormalizeField);m.rules=abEditor.rules.map(abNormalizeRule);m.workflow=abEditor.workflow.map(abNormalizeStep);m.id=old.id||abEditingId||('AB_MODULE__'+m.code);return m;
}
function abValidateModule(m){
  if(!m.code||!m.name)return 'Cần nhập Mã chức năng và Tên chức năng.';
  if(!m.fields.length)return 'Cần ít nhất 1 trường dữ liệu hoặc tiêu đề nhóm.';
  const keys=m.fields.filter(f=>f.type!=='section').map(f=>f.key);if(keys.some((k,i)=>keys.indexOf(k)!==i))return 'Key của các trường không được trùng nhau.';
  if(keys.some(k=>!k))return 'Có trường chưa có Key.';
  for(const f of m.fields){if(f.type==='formula'&&!f.formula.trim())return `Trường ${f.label} là Tự tính nhưng chưa có công thức.`;}
  if(!m.visibility.roles.length&&!m.visibility.groups.length&&!m.visibility.departments.length)return 'Cần chọn ít nhất Role / Group / Department được thấy.';
  return '';
}
function abStatus(msg,err=false){const e=$('abBuilderStatus');if(e){e.textContent=msg;e.classList.toggle('err',!!err);}}

async function abWriteHistory(module,action){
  try{const stamp=now(),id=`AB_HISTORY__${safeId(module.id)}__${stamp}`;await abDb().collection(HANDOVER_COLLECTION).doc(id).set({kind:AB_HISTORY_KIND,moduleId:module.id,moduleCode:module.code,action:String(action||'SAVE'),revision:Number(module.revision||0),publishVersion:Number(module.publishVersion||0),snapshot:clone(module),createdAtMs:stamp,createdBy:abActor()});}catch(e){console.info('Admin Builder history',e?.message||e);}
}
async function abSaveDraft(){
  if(!abIsAdmin())return roleDenied?.('Chỉ AD được dùng ADMIN BUILDER.');
  try{let m=abReadEditorIntoModule(),err=abValidateModule(m);if(err)return abStatus(err,true);abStatus('Đang lưu nháp...');const stamp=now();m.status='DRAFT';m.active=true;m.revision=Number(m.revision||0)+1;m.updatedAtMs=stamp;m.updatedBy=abActor();m.createdAtMs=Number(m.createdAtMs||stamp);await abDb().collection(HANDOVER_COLLECTION).doc(m.id).set({kind:AB_MODULE_KIND,...clone(m)},{merge:true});await abWriteHistory(m,'SAVE_DRAFT');abEditingId=m.id;abEditor.module=m;abStatus(`Đã lưu NHÁP · revision ${m.revision}. Chưa xuất hiện ở tài khoản người dùng.`);abRefreshBuilderList();}catch(e){abStatus('Không lưu được: '+(e?.message||e),true);}
}
async function abRebuildCatalog(changedId='',action='PUBLISH'){
  const snap=await abDb().collection(HANDOVER_COLLECTION).where('kind','==',AB_MODULE_KIND).get(),mods=[];snap.forEach(doc=>{const d=abNormalizeModule({id:doc.id,...(doc.data()||{})});if(d.status==='PUBLISHED'&&d.active!==false)mods.push(d);});mods.sort((a,b)=>Number(a.order||500)-Number(b.order||500)||String(a.name).localeCompare(String(b.name),'vi'));const version=now();const catalog={kind:AB_CATALOG_KIND,version,modules:mods,updatedAtMs:version,updatedBy:abActor()};await abDb().collection(HANDOVER_COLLECTION).doc(AB_CATALOG_DOC).set(catalog);abCatalog={version,modules:mods};abSaveCatalogCache(abCatalog);abRenderDynamicButtons();try{if(typeof sagsV470Ref==='function')await sagsV470Ref(AB_SIGNAL_PATH).set({version,moduleId:changedId,action,updatedAtMs:version,updatedBy:abActor()});}catch(e){console.info('Admin Builder RTDB signal',e?.message||e);}return catalog;
}
async function abPublish(){
  if(!abIsAdmin())return;
  try{let m=abReadEditorIntoModule(),err=abValidateModule(m);if(err)return abStatus(err,true);abStatus('Đang XUẤT BẢN...');const stamp=now();m.status='PUBLISHED';m.active=true;m.revision=Number(m.revision||0)+1;m.publishVersion=Number(m.publishVersion||0)+1;m.updatedAtMs=stamp;m.updatedBy=abActor();m.createdAtMs=Number(m.createdAtMs||stamp);await abDb().collection(HANDOVER_COLLECTION).doc(m.id).set({kind:AB_MODULE_KIND,...clone(m)},{merge:true});await abWriteHistory(m,'PUBLISH');await abRebuildCatalog(m.id,'PUBLISH');abEditingId=m.id;abEditor.module=m;abStatus(`ĐÃ XUẤT BẢN · Config V${m.publishVersion}. Tài khoản phù hợp sẽ tự nhận nút mới, không cần update ZIP.`);abRefreshBuilderList();}catch(e){abStatus('Xuất bản thất bại: '+(e?.message||e),true);}
}
async function abSetModuleActive(id,active){
  if(!abIsAdmin())return;try{const ref=abDb().collection(HANDOVER_COLLECTION).doc(id),s=await ref.get();if(!s.exists)return;let m=abNormalizeModule({id,...s.data()});if(active){const err=abValidateModule(m);if(err)return alert('Chưa thể bật/xuất bản: '+err);m.publishVersion=Number(m.publishVersion||0)+1;}m.active=!!active;m.status=active?'PUBLISHED':'INACTIVE';m.revision=Number(m.revision||0)+1;m.updatedAtMs=now();m.updatedBy=abActor();await ref.set({kind:AB_MODULE_KIND,...clone(m)},{merge:true});await abWriteHistory(m,active?'REACTIVATE_PUBLISH':'DEACTIVATE');await abRebuildCatalog(id,active?'PUBLISH':'DEACTIVATE');abRefreshBuilderList();}catch(e){alert('Không thay đổi được trạng thái: '+(e?.message||e));}
}
async function abDeleteModule(id){
  if(!abIsAdmin()||!confirm('XÓA MỀM chức năng này? Bản ghi đã tạo vẫn được giữ để truy vết.'))return;try{const ref=abDb().collection(HANDOVER_COLLECTION).doc(id),s=await ref.get();if(!s.exists)return;let m=abNormalizeModule({id,...s.data()});m.active=false;m.status='DELETED';m.deletedAtMs=now();m.deletedBy=abActor();m.revision=Number(m.revision||0)+1;await ref.set({kind:AB_MODULE_KIND,...clone(m)},{merge:true});await abWriteHistory(m,'DELETE_SOFT');await abRebuildCatalog(id,'DELETE');abRefreshBuilderList();}catch(e){alert('Không xóa được: '+(e?.message||e));}
}

async function abRefreshBuilderList(){
  const host=$('abPaneList');if(!host)return;host.innerHTML='<div class="abHint">Đang tải danh sách...</div>';try{const snap=await abDb().collection(HANDOVER_COLLECTION).where('kind','==',AB_MODULE_KIND).get(),arr=[];snap.forEach(doc=>arr.push(abNormalizeModule({id:doc.id,...(doc.data()||{})})));arr.sort((a,b)=>Number(b.updatedAtMs||0)-Number(a.updatedAtMs||0));abBuilderList=arr;host.innerHTML=`<div class="abCard"><div class="abRowHead"><div class="abCardTitle">CHỨC NĂNG ĐÃ TẠO</div><button class="abBtn good" onclick="abResetEditor();abSwitchTab('basic')">+ TẠO MỚI</button></div><div class="abList">${arr.length?arr.map(m=>abModuleItemHtml(m)).join(''):'<div class="abHint">Chưa có chức năng động.</div>'}</div></div>`;}catch(e){host.innerHTML='<div class="abWarn">Không tải được danh sách: '+esc(e?.message||e)+'</div>';}
}
function abModuleItemHtml(m){const cl=m.status==='PUBLISHED'&&m.active?'pub':m.status==='DRAFT'?'draft':'off',lab=m.status==='PUBLISHED'&&m.active?'ĐANG HOẠT ĐỘNG':m.status==='DRAFT'?'NHÁP':m.status;return `<div class="abItem"><div class="abItemTitle">${esc(m.icon)} ${esc(m.code)} · ${esc(m.name)} <span class="abPill ${cl}">${esc(lab)}</span></div><div class="abMeta">${m.fields.length} trường · ${m.rules.length} rule · ${m.workflow.length} bước workflow · Config V${Number(m.publishVersion||0)} · sửa ${m.updatedAtMs?new Date(m.updatedAtMs).toLocaleString('vi-VN'):''}</div><div class="abActions"><button class="abBtn secondary" onclick='abEditModule(${JSON.stringify(m.id)})'>SỬA</button><button class="abBtn secondary" onclick='abLoadHistory(${JSON.stringify(m.id)})'>LỊCH SỬ</button>${m.status==='PUBLISHED'&&m.active?`<button class="abBtn warn" onclick='abSetModuleActive(${JSON.stringify(m.id)},false)'>TẮT</button>`:`<button class="abBtn good" onclick='abSetModuleActive(${JSON.stringify(m.id)},true)'>BẬT/XUẤT BẢN</button>`}<button class="abBtn danger" onclick='abDeleteModule(${JSON.stringify(m.id)})'>XÓA MỀM</button></div></div>`;}
async function abEditModule(id){try{const s=await abDb().collection(HANDOVER_COLLECTION).doc(id).get();if(!s.exists)return;const m=abNormalizeModule({id,...s.data()});abEditingId=id;abEditor={module:m,fields:clone(m.fields),rules:clone(m.rules),workflow:clone(m.workflow)};abRenderEditor();abSwitchTab('basic');}catch(e){alert('Không mở được cấu hình: '+(e?.message||e));}}
async function abLoadHistory(id){
  try{const snap=await abDb().collection(HANDOVER_COLLECTION).where('kind','==',AB_HISTORY_KIND).where('moduleId','==',id).get(),arr=[];snap.forEach(doc=>arr.push({id:doc.id,...(doc.data()||{})}));arr.sort((a,b)=>Number(b.createdAtMs||0)-Number(a.createdAtMs||0));const host=$('abPaneList');host.innerHTML=`<div class="abCard"><div class="abRowHead"><div class="abCardTitle">LỊCH SỬ CẤU HÌNH</div><button class="abBtn secondary" onclick="abRefreshBuilderList()">← QUAY LẠI</button></div><div class="abHint">KHÔI PHỤC chỉ nạp cấu hình cũ vào trình sửa. Anh phải bấm XUẤT BẢN nếu muốn áp dụng lại.</div><div class="abList">${arr.length?arr.slice(0,50).map(h=>`<div class="abItem"><div class="abItemTitle">${esc(h.action)} · revision ${Number(h.revision||0)} · Config V${Number(h.publishVersion||0)}</div><div class="abMeta">${new Date(Number(h.createdAtMs||0)).toLocaleString('vi-VN')} · ${esc(h.createdBy?.name||h.createdBy?.username||'')}</div><div class="abActions"><button class="abBtn secondary" onclick='abRestoreHistory(${JSON.stringify(h.id)})'>NẠP BẢN NÀY</button></div></div>`).join(''):'<div class="abHint">Chưa có lịch sử.</div>'}</div></div>`;}catch(e){alert('Không tải được lịch sử: '+(e?.message||e));}
}
async function abRestoreHistory(historyId){try{const s=await abDb().collection(HANDOVER_COLLECTION).doc(historyId).get();if(!s.exists||!s.data()?.snapshot)return;const m=abNormalizeModule(s.data().snapshot);abEditingId=m.id;abEditor={module:m,fields:clone(m.fields),rules:clone(m.rules),workflow:clone(m.workflow)};abRenderEditor();abSwitchTab('basic');abStatus('Đã NẠP bản lịch sử vào trình sửa. Chưa áp dụng cho người dùng cho đến khi bấm XUẤT BẢN.');}catch(e){alert('Không khôi phục được: '+(e?.message||e));}}

function abResetEditor(){const m=abDefaultModule();abEditingId='';abEditor={module:m,fields:[],rules:[],workflow:[]};abRenderEditor();}
function abOpenBuilder(){if(!abIsAdmin())return typeof roleDenied==='function'?roleDenied('Chỉ AD được dùng ADMIN BUILDER.'):null;abEnsureModals();$('adminBuilderModal').style.display='flex';if(!abEditor.module)abResetEditor();else abRenderEditor();abSwitchTab('basic');abRefreshBuilderList();}
function abCloseBuilder(){$('adminBuilderModal').style.display='none';}

function abHelpHtml(){return `<div class="abCard"><div class="abCardTitle">HDSD · ADMIN BUILDER</div>
  <h4>A. TẠO MỘT BIỂU MẪU MỚI</h4><ol><li>AD → <b>ADMIN BUILDER</b>.</li><li>Tab <b>1 · CHỨC NĂNG</b>: nhập Mã, Tên nút, Icon, mô tả.</li><li>Tab <b>2 · BIỂU MẪU</b>: bấm <b>+ THÊM TRƯỜNG</b>. Mỗi trường có Tên, Key, Loại, Required, Min/Max, lựa chọn, công thức, điều kiện hiển thị.</li><li>Tab <b>3 · CẢNH BÁO</b>: thêm rule nếu cần.</li><li>Tab <b>4 · WORKFLOW</b>: thêm các bước xác nhận sau khi người dùng gửi; không cần thì để trống.</li><li>Tab <b>5 · PHÂN QUYỀN</b>: chọn Role/Group/Department được thấy và được nhập.</li><li>Tab <b>6 · XEM THỬ</b>: test trước khi phát hành.</li><li>Bấm <b>LƯU NHÁP</b> để giữ riêng cho AD; bấm <b>XUẤT BẢN</b> để các tài khoản phù hợp nhận nút mới.</li></ol>
  <h4>B. VÍ DỤ: KIỂM TRA GPU TRƯỚC CHUYẾN</h4><div class="abExample"><b>Tên:</b> KIỂM TRA GPU<br><b>Role:</b> VHTTB<br><b>Field:</b> GPU_READY loại CÓ/KHÔNG<br><b>Rule:</b> GPU_READY = KHÔNG → “GPU CHƯA SẴN SÀNG · KIỂM TRA NGAY”.<br><b>Publish:</b> VHTTB tự thấy nút mới, không cần update ZIP.</div>
  <h4>C. CÔNG THỨC AN TOÀN</h4><p>Dùng Key trường. Ví dụ <code>BAG_KG / BAG_PCS</code>, <code>ADL + CHD + INF</code>, <code>ROUND(BAG_KG / BAG_PCS, 1)</code>. Hỗ trợ <code>SUM()</code>, <code>AVG()</code>, <code>MIN()</code>, <code>MAX()</code>, <code>ROUND()</code>. Không hỗ trợ JavaScript, HTML hoặc lệnh Firebase tự do.</p>
  <h4>C2. GIÁ TRỊ MẶC ĐỊNH TỰ ĐIỀN</h4><p>Có thể dùng <code>{USERNAME}</code>, <code>{NAME}</code>, <code>{ROLE}</code>, <code>{TODAY}</code>, <code>{NOW}</code>, <code>{FLIGHT}</code> trong Giá trị mặc định để tự lấy tài khoản/ngày/giờ/chuyến hiện tại.</p>
  <h4>D. ĐIỀU KIỆN / RULE</h4><p>Hỗ trợ =, ≠, &gt;, ≥, &lt;, ≤, ĐỂ TRỐNG, CÓ DỮ LIỆU, BETWEEN; có thể ghép 2 điều kiện bằng AND/OR. Mặc định là cảnh báo đỏ có nút <b>ĐÃ BIẾT</b>. Chỉ bật <b>CHẶN GỬI</b> khi quy định nghiệp vụ thật sự bắt buộc.</p>
  <h4>E. TRƯỜNG ĐIỀU KIỆN HIỂN THỊ</h4><p>Ví dụ chỉ hiện “LÝ DO” khi <code>GPU_READY = KHÔNG</code>: ở field LÝ DO, nhập <b>Hiện khi FIELD = GPU_READY</b>, điều kiện <b>=</b>, giá trị <b>KHÔNG</b>.</p>
  <h4>F. WORKFLOW</h4><p>Ví dụ thêm Bước 1: <b>CBTT · KIỂM TRA</b>, Bước 2: <b>DH · XÁC NHẬN</b>. Sau khi bản ghi được gửi, hệ thống hiển thị trạng thái bước và chỉ tài khoản đúng Role mới được bấm hành động bước hiện tại.</p>
  <h4>G. SỬA / TẮT / KHÔI PHỤC</h4><ul><li><b>SỬA</b>: thay cấu hình rồi Publish lại.</li><li><b>TẮT</b>: nút biến mất khỏi người dùng nhưng dữ liệu cũ giữ nguyên.</li><li><b>XÓA MỀM</b>: không hiển thị module, không xóa các bản ghi nghiệp vụ.</li><li><b>LỊCH SỬ → NẠP BẢN NÀY</b>: nạp snapshot cũ rồi Publish nếu muốn rollback.</li></ul>
  <h4>H. TÀI LIỆU ĐÍNH KÈM</h4><p>Field <b>Link tài liệu / MediaFire</b> lưu URL + tên mô tả, không lưu nội dung file trong Firestore. Nếu MediaFire FileDrop đã được cấu hình, người dùng có nút mở FileDrop để upload rồi dán link file.</p>
  <h4>I. KHI NÀO VẪN PHẢI UPDATE CODE?</h4><p>Camera/scan mới, thuật toán AI mới, API hãng bên ngoài, thay Firebase Authentication, logic phần cứng hoặc chức năng đặc thù chưa có component trong Builder vẫn cần phát hành bản mới. Các form/rule/workflow thông thường thì không.</p>
  </div>`;}
function abRenderHelp(){if($('abPaneHelp'))$('abPaneHelp').innerHTML=abHelpHtml();}

function abRenderPreview(){
  try{const m=abReadEditorIntoModule(),host=$('abPanePreview');host.innerHTML=`<div class="abCard"><div class="abRowHead"><div><div class="abCardTitle">XEM THỬ · ${esc(m.icon)} ${esc(m.name||'CHỨC NĂNG')}</div><div class="abMeta">Preview không ghi dữ liệu Firebase.</div></div><button class="abBtn" onclick="abOpenRuntimePreview()">MỞ FORM XEM THỬ</button></div><div style="margin-top:8px">${m.fields.map(f=>`<span class="abPill">${esc(f.key)} · ${esc(f.label)}</span>`).join('')}</div></div>`;}catch(e){$('abPanePreview').innerHTML='<div class="abWarn">'+esc(e?.message||e)+'</div>';}
}
function abOpenRuntimePreview(){try{const m=abReadEditorIntoModule();abOpenRuntime(m,{preview:true});}catch(e){alert(e?.message||e);}}

/* ---------------- Safe formula parser ---------------- */
function abTokenize(expr){
  const s=String(expr||''),out=[];let i=0;while(i<s.length){const c=s[i];if(/\s/.test(c)){i++;continue;}if(/[0-9.]/.test(c)){let j=i+1;while(j<s.length&&/[0-9.]/.test(s[j]))j++;const n=Number(s.slice(i,j));if(!Number.isFinite(n))throw new Error('Số không hợp lệ');out.push({t:'num',v:n});i=j;continue;}if(/[A-Za-z_]/.test(c)){let j=i+1;while(j<s.length&&/[A-Za-z0-9_]/.test(s[j]))j++;out.push({t:'id',v:s.slice(i,j).toUpperCase()});i=j;continue;}if('+-*/(),'.includes(c)){out.push({t:c,v:c});i++;continue;}throw new Error('Ký tự không được phép: '+c);}return out;}
function abFormula(expr,values){
  if(!String(expr||'').trim())return '';
  const ts=abTokenize(expr);let p=0;const peek=()=>ts[p],eat=t=>{if(peek()?.t===t)return ts[p++];throw new Error('Sai công thức');};
  const valueOf=id=>{const v=values[id];const n=Number(v);return Number.isFinite(n)?n:0;};
  function primary(){const x=peek();if(!x)throw new Error('Thiếu dữ liệu');if(x.t==='num'){p++;return x.v;}if(x.t==='-'){p++;return -primary();}if(x.t==='+'){p++;return primary();}if(x.t==='('){p++;const v=add();eat(')');return v;}if(x.t==='id'){p++;const id=x.v;if(peek()?.t==='('){p++;const args=[];if(peek()?.t!==')'){args.push(add());while(peek()?.t===','){p++;args.push(add());}}eat(')');if(id==='SUM')return args.reduce((a,b)=>a+b,0);if(id==='AVG')return args.length?args.reduce((a,b)=>a+b,0)/args.length:0;if(id==='MIN')return args.length?Math.min(...args):0;if(id==='MAX')return args.length?Math.max(...args):0;if(id==='ROUND'){const d=Math.max(0,Math.min(6,Math.trunc(args[1]||0))),k=10**d;return Math.round((args[0]||0)*k)/k;}throw new Error('Hàm không hỗ trợ: '+id);}return valueOf(id);}throw new Error('Sai công thức');}
  function mul(){let v=primary();while(peek()&&['*','/'].includes(peek().t)){const op=ts[p++].t,b=primary();v=op==='*'?v*b:(b===0?0:v/b);}return v;}function add(){let v=mul();while(peek()&&['+','-'].includes(peek().t)){const op=ts[p++].t,b=mul();v=op==='+'?v+b:v-b;}return v;}
  const r=add();if(p!==ts.length)throw new Error('Dư ký tự trong công thức');return Number.isFinite(r)?r:'';
}
function abCompare(actual,op,expected){
  const a=actual,empty=a===''||a==null||a===false;if(op==='empty')return empty;if(op==='not_empty')return !empty;
  if(op==='between'){const [x,y]=String(expected||'').split(',').map(Number);const n=Number(a);return Number.isFinite(n)&&Number.isFinite(x)&&Number.isFinite(y)&&n>=Math.min(x,y)&&n<=Math.max(x,y);}
  const an=Number(a),en=Number(expected),numeric=String(a).trim()!==''&&String(expected).trim()!==''&&Number.isFinite(an)&&Number.isFinite(en);const A=numeric?an:String(a??'').trim().toUpperCase(),B=numeric?en:String(expected??'').trim().toUpperCase();
  if(op==='==')return A===B;if(op==='!=')return A!==B;if(op==='>')return A>B;if(op==='>=')return A>=B;if(op==='<')return A<B;if(op==='<=')return A<=B;return false;
}
function abRuleTriggered(rule,vals){const c1=abCompare(vals[rule.c1.field],rule.c1.op,rule.c1.value);if(!rule.join||!rule.c2.field)return c1;const c2=abCompare(vals[rule.c2.field],rule.c2.op,rule.c2.value);return rule.join==='AND'?(c1&&c2):(c1||c2);}

function abResolveDefault(v){
  let s=String(v??'');const actor=abActor();let meta={};try{if(typeof currentFlightSessionMeta==='function')meta=currentFlightSessionMeta()||{};}catch(_){ }
  const map={USERNAME:actor.username||'',NAME:actor.name||'',ROLE:actor.role||'',TODAY:new Date().toISOString().slice(0,10),NOW:new Date().toTimeString().slice(0,5),FLIGHT:String(meta.name||'')};
  Object.entries(map).forEach(([k,val])=>s=s.replaceAll('{'+k+'}',String(val)));return s;
}
function abModuleVisible(m,id=abIdentity()){
  if(!m||m.status!=='PUBLISHED'||m.active===false)return false;if(id.role==='AD')return true;
  // Vai trò nằm trong workflow luôn được thấy module để xử lý bản ghi, dù không phải vai trò nhập biểu mẫu.
  if((m.workflow||[]).some(s=>String(s.role||'').toUpperCase()===id.role))return true;
  const v=m.visibility||{},tests=[];if(v.roles?.length)tests.push(v.roles.includes(id.role)||v.roles.includes('ALL')||v.roles.includes('*'));if(v.groups?.length)tests.push(v.groups.includes(id.group));if(v.departments?.length)tests.push(v.departments.includes(id.department));return tests.length?tests.some(Boolean):false;
}
function abCanSubmit(m,id=abIdentity()){if(id.role==='AD')return true;const r=abUnique(m.submitRoles||[]);return !r.length||r.includes(id.role)||r.includes('ALL')||r.includes('*');}
function abHasFlight(){try{return !!((typeof activeFlightSessionId!=='undefined'&&activeFlightSessionId)&&typeof currentFlightSessionMeta==='function'&&currentFlightSessionMeta());}catch(_){return false;}}

function abRenderDynamicButtons(){
  const row=document.querySelector('.toolbar-row.main-actions');if(!row)return;row.querySelectorAll('.abDynamicBtn').forEach(x=>x.remove());const id=abIdentity();if(!id.role)return;const mods=(abCatalog.modules||[]).filter(m=>abModuleVisible(m,id)).sort((a,b)=>Number(a.order||500)-Number(b.order||500));const before=$('roleBtnNA');mods.forEach(m=>{const b=document.createElement('button');b.className='abDynamicBtn';b.dataset.abmodule=m.id;b.innerHTML=`${esc(m.icon||'🧩')} ${esc(m.name)}<span class="abDynamicBadge" id="abBadge_${safeId(m.id)}"></span>`;b.onclick=()=>abOpenModule(m.id);if(before)row.insertBefore(b,before);else row.appendChild(b);const n=Number(abPendingByModule[m.id]||0),badge=b.querySelector('.abDynamicBadge');if(n>0){badge.textContent=n>99?'99+':String(n);badge.style.display='flex';}});
}
function abRefreshRoleUi(){abEnsureAdminButton();const b=$('roleBtnAdminBuilder');if(b)b.style.display=abIsAdmin()?'inline-flex':'none';abRenderDynamicButtons();abStartCatalogSignal();abStartRecordSignal();}

function abSaveCatalogCache(cat){try{localStorage.setItem(AB_CACHE_KEY,JSON.stringify({savedAtMs:now(),catalog:cat}));}catch(_){ }}
function abReadCatalogCache(){try{const o=JSON.parse(localStorage.getItem(AB_CACHE_KEY)||'null');if(o?.catalog&&now()-Number(o.savedAtMs||0)<AB_CACHE_MAX_AGE)return o.catalog;}catch(_){ }return null;}
async function abLoadCatalog(force=false){
  if(!force){const c=abReadCatalogCache();if(c){abCatalog={version:Number(c.version||0),modules:(c.modules||[]).map(abNormalizeModule)};abRenderDynamicButtons();}}
  if(force||!abCatalog.version){try{const s=await abDb().collection(HANDOVER_COLLECTION).doc(AB_CATALOG_DOC).get();if(s.exists){const d=s.data()||{};abCatalog={version:Number(d.version||0),modules:(d.modules||[]).map(abNormalizeModule)};abSaveCatalogCache(abCatalog);abRenderDynamicButtons();}}catch(e){console.info('Admin Builder catalog',e?.message||e);}}
}
function abStartCatalogSignal(){
  if(abCatalogSignalRef||typeof sagsV470Ref!=='function')return;try{abCatalogSignalRef=sagsV470Ref(AB_SIGNAL_PATH);abCatalogSignalCb=s=>{const v=Number(s.val()?.version||0);if(v>Number(abCatalog.version||0))abLoadCatalog(true);};abCatalogSignalRef.on('value',abCatalogSignalCb);}catch(e){console.info('Admin Builder signal',e?.message||e);}
}
function abStartRecordSignal(){
  if(abRecordSignalRef||typeof sagsV470Ref!=='function'||!abIdentity().role)return;try{abRecordSignalRef=sagsV470Ref(AB_RECORD_SIGNAL_PATH);abRecordSignalCb=s=>{const d=s.val()||{},m=(abCatalog.modules||[]).find(x=>x.id===d.moduleId);if(!m||!abModuleVisible(m))return;const targetRole=String(d.targetRole||'').toUpperCase();if(targetRole&&targetRole!==abIdentity().role&&abIdentity().role!=='AD')return;const eventId=String(d.eventId||'');if(!eventId)return;const lk='ab_last_record_signal_'+safeId(m.id),prev=localStorage.getItem(lk)||'';if(prev===eventId)return;localStorage.setItem(lk,eventId);abPendingByModule[m.id]=Math.min(99,Number(abPendingByModule[m.id]||0)+1);abRenderDynamicButtons();};abRecordSignalRef.on('value',abRecordSignalCb);}catch(e){console.info('Admin Builder record signal',e?.message||e);}
}

async function abOpenModule(moduleId){let m=(abCatalog.modules||[]).find(x=>x.id===moduleId);if(!m&&abIsAdmin()){try{const s=await abDb().collection(HANDOVER_COLLECTION).doc(moduleId).get();if(s.exists)m=abNormalizeModule({id:moduleId,...s.data()});}catch(_){ }}if(!m)return alert('Không tìm thấy cấu hình chức năng. Hãy làm mới ứng dụng.');if(!abModuleVisible(m)&&!abIsAdmin())return;abPendingByModule[m.id]=0;abRenderDynamicButtons();abOpenRuntime(m,{preview:false});}
function abOpenRuntime(module,opts={}){
  abEnsureModals();abCurrentModule=abNormalizeModule(module);abCurrentRecord=null;abDismissedRuleKeys=new Set();const m=abCurrentModule;$('abRuntimeTitle').textContent=`${m.icon||'🧩'} ${m.name}${opts.preview?' · XEM THỬ':''}`;const body=$('abRuntimeBody');body.innerHTML=`<div class="abHint">${esc(m.description||'Biểu mẫu động do AD tạo.')}${m.requireFlight?' · <b>YÊU CẦU ĐANG CHỌN CHUYẾN</b>':''}</div><div id="abRuntimeWarnings"></div><div id="abRuntimeFields" class="abRuntimeFields"></div><div class="abActions"><button id="abRuntimeSubmit" class="abBtn good" ${opts.preview?'disabled':''}>${esc(m.submitLabel||'GỬI / LƯU')}</button><button class="abBtn secondary" onclick="abRuntimeReset()">LÀM MỚI</button>${opts.preview?'<span class="abMeta">Preview: không lưu dữ liệu.</span>':''}</div><div id="abRuntimeStatus" class="abStatus"></div>${opts.preview?'':'<div id="abRecords" class="abRecords"></div>'}`;
  abRenderRuntimeFields(m);body.dataset.preview=opts.preview?'1':'0';$('abRuntimeSubmit').onclick=()=>abSubmitRuntime();$('abRuntimeModal').style.display='flex';abRuntimeRecalc();if(!opts.preview)abLoadRecords(m.id);
}
function abCloseRuntime(){$('abRuntimeModal').style.display='none';abCurrentModule=null;abCurrentRecord=null;}
function abRuntimeReset(){if(!abCurrentModule)return;abDismissedRuleKeys=new Set();abRenderRuntimeFields(abCurrentModule);abRuntimeRecalc();}
function abRenderRuntimeFields(m){
  const host=$('abRuntimeFields');host.innerHTML='';m.fields.forEach((f,i)=>{f=abNormalizeField(f,i);if(f.type==='section'){const sec=document.createElement('div');sec.className='abRuntimeSection';sec.dataset.abwrap=f.key;sec.textContent=f.label;host.appendChild(sec);return;}const wrap=document.createElement('div');wrap.className='abRuntimeField'+(['textarea','radio','attachment'].includes(f.type)?' full':'');wrap.dataset.abwrap=f.key;const lab=document.createElement('label');lab.className='abLabel';lab.textContent=f.label+(f.required?' *':'');let input;
    if(f.type==='textarea'){input=document.createElement('textarea');input.className='abTextarea';}
    else if(f.type==='select'){input=document.createElement('select');input.className='abSelect';input.innerHTML='<option value="">— chọn —</option>'+f.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('');}
    else if(f.type==='radio'){input=document.createElement('div');input.className='abRadioGroup';input.dataset.abkey=f.key;input.innerHTML=f.options.map(o=>`<label><input type="radio" name="abr_${esc(f.key)}" value="${esc(o)}"> ${esc(o)}</label>`).join('');}
    else if(f.type==='checkbox'){input=document.createElement('input');input.type='checkbox';input.className='abCheck';}
    else if(f.type==='yesno'){input=document.createElement('select');input.className='abSelect';input.innerHTML='<option value="">— chọn —</option><option value="CÓ">CÓ</option><option value="KHÔNG">KHÔNG</option>';}
    else if(f.type==='attachment'){input=document.createElement('div');input.innerHTML=`<div class="abGrid"><input class="abInput" data-abattachment-url placeholder="Dán link https://www.mediafire.com/..."><input class="abInput" data-abattachment-name placeholder="Tên tài liệu / file"></div><div class="abActions"><button type="button" class="abBtn secondary" data-abmedia>📎 MỞ MEDIAFIRE FILEDROP</button></div>`;input.querySelector('[data-abmedia]').onclick=()=>{try{if(typeof rsOpenMediaFireFileDrop==='function')rsOpenMediaFireFileDrop();else alert('MediaFire FileDrop chưa có trong bản này.');}catch(e){alert(e?.message||e);}};}
    else{input=document.createElement('input');input.className='abInput';input.type=f.type==='number'?'number':f.type==='date'?'date':f.type==='time'?'time':f.type==='datetime'?'datetime-local':'text';if(f.type==='readonly'||f.type==='formula'){input.readOnly=true;input.classList.add('abFormula');}}
    if(f.type!=='radio'&&f.type!=='attachment'){input.dataset.abkey=f.key;input.dataset.abtype=f.type;if(f.placeholder)input.placeholder=f.placeholder;if(f.type==='number'){if(f.min!=='')input.min=f.min;if(f.max!=='')input.max=f.max;}if(f.type==='checkbox')input.checked=['1','TRUE','YES','CÓ'].includes(String(abResolveDefault(f.defaultValue)).toUpperCase());else input.value=abResolveDefault(f.defaultValue);input.addEventListener('input',abRuntimeRecalc);input.addEventListener('change',abRuntimeRecalc);}else if(f.type==='radio'){input.querySelectorAll('input').forEach(x=>{x.addEventListener('change',abRuntimeRecalc);if(x.value===abResolveDefault(f.defaultValue))x.checked=true;});}else{input.querySelectorAll('input').forEach(x=>{x.addEventListener('input',abRuntimeRecalc);x.addEventListener('change',abRuntimeRecalc);});}
    wrap.appendChild(lab);if(f.unit&&f.type!=='checkbox'){const uw=document.createElement('div');uw.className='abUnitWrap';uw.appendChild(input);const u=document.createElement('span');u.className='abUnit';u.textContent=f.unit;uw.appendChild(u);wrap.appendChild(uw);}else wrap.appendChild(input);host.appendChild(wrap);});
}
function abRuntimeValues(){const vals={};if(!abCurrentModule)return vals;abCurrentModule.fields.forEach(f=>{if(f.type==='section')return;const wrap=document.querySelector(`[data-abwrap="${CSS.escape(f.key)}"]`);if(!wrap)return;if(f.type==='radio'){vals[f.key]=wrap.querySelector('input[type="radio"]:checked')?.value||'';}else if(f.type==='attachment'){vals[f.key]={url:String(wrap.querySelector('[data-abattachment-url]')?.value||'').trim(),name:String(wrap.querySelector('[data-abattachment-name]')?.value||'').trim()};}else{const inp=wrap.querySelector('[data-abkey]');vals[f.key]=f.type==='checkbox'?!!inp?.checked:String(inp?.value??'').trim();}});return vals;}
function abSetRuntimeValue(key,val){const f=abCurrentModule?.fields.find(x=>x.key===key),wrap=document.querySelector(`[data-abwrap="${CSS.escape(key)}"]`);if(!f||!wrap)return;if(f.type==='radio'){wrap.querySelectorAll('input[type="radio"]').forEach(x=>x.checked=String(x.value)===String(val));}else if(f.type==='attachment'){wrap.querySelector('[data-abattachment-url]').value=val?.url||'';wrap.querySelector('[data-abattachment-name]').value=val?.name||'';}else{const inp=wrap.querySelector('[data-abkey]');if(!inp)return;if(f.type==='checkbox')inp.checked=!!val;else inp.value=val??'';}}
function abRuntimeRecalc(){
  if(!abCurrentModule)return;let vals=abRuntimeValues();for(const f of abCurrentModule.fields){if(f.type==='formula'){try{const v=abFormula(f.formula,vals);abSetRuntimeValue(f.key,v);vals[f.key]=v;}catch(_){abSetRuntimeValue(f.key,'');vals[f.key]='';}}}
  vals=abRuntimeValues();for(const f of abCurrentModule.fields){if(!f.showWhen?.field)continue;const wrap=document.querySelector(`[data-abwrap="${CSS.escape(f.key)}"]`);if(wrap)wrap.style.display=abCompare(vals[f.showWhen.field],f.showWhen.op,f.showWhen.value)?'':'none';}
  const warnings=[];let blocking=false;abCurrentModule.rules.filter(r=>r.active!==false).forEach(r=>{if(abRuleTriggered(r,vals)){const sig=r.id+'|'+r.message+'|'+JSON.stringify(vals);if(!abDismissedRuleKeys.has(sig))warnings.push({r,sig});if(r.blocking)blocking=true;}});const wh=$('abRuntimeWarnings');wh.innerHTML=warnings.map(x=>{const token=encodeURIComponent(x.sig);return `<div class="abWarn"><button onclick="abDismissRule(decodeURIComponent('${token}'))">ĐÃ BIẾT</button>⚠ ${esc(x.r.name)}<div style="margin-top:4px;font-weight:800">${esc(x.r.message)}</div></div>`;}).join('');const btn=$('abRuntimeSubmit');if(btn&&$('abRuntimeBody')?.dataset.preview!=='1')btn.disabled=blocking||!abCanSubmit(abCurrentModule)||(abCurrentModule.requireFlight&&!abHasFlight());
}
function abDismissRule(sig){abDismissedRuleKeys.add(sig);abRuntimeRecalc();}
function abRuntimeStatus(msg,err=false){const e=$('abRuntimeStatus');if(e){e.textContent=msg;e.classList.toggle('err',!!err);}}
function abValidateRuntime(m,vals){for(const f of m.fields){if(f.type==='section')continue;const wrap=document.querySelector(`[data-abwrap="${CSS.escape(f.key)}"]`);if(wrap&&wrap.style.display==='none')continue;const v=vals[f.key],missing=f.type==='attachment'?!String(v?.url||'').trim():f.type==='checkbox'?!v:String(v??'').trim()==='';if(f.required&&missing)return `Còn thiếu trường bắt buộc: ${f.label}.`;if(f.type==='number'&&String(v).trim()!==''){const n=Number(v);if(f.min!==''&&n<Number(f.min))return `${f.label} phải ≥ ${f.min}.`;if(f.max!==''&&n>Number(f.max))return `${f.label} phải ≤ ${f.max}.`;}}for(const r of m.rules.filter(x=>x.active!==false&&x.blocking)){if(abRuleTriggered(r,vals))return `Đang có cảnh báo CHẶN GỬI: ${r.message}`;}return '';}
async function abSubmitRuntime(){
  if(!abCurrentModule||$('abRuntimeBody')?.dataset.preview==='1')return;const m=abCurrentModule;if(m.requireFlight&&!abHasFlight())return abRuntimeStatus('Chức năng này yêu cầu đang chọn chuyến.',true);if(!abCanSubmit(m))return abRuntimeStatus('Tài khoản này chỉ được xem, không được nhập/gửi.',true);const vals=abRuntimeValues(),err=abValidateRuntime(m,vals);if(err)return abRuntimeStatus(err,true);
  try{abRuntimeStatus('Đang lưu...');const stamp=now(),labels={};m.fields.forEach(f=>labels[f.key]=f.label);let flight={};try{const meta=typeof currentFlightSessionMeta==='function'?currentFlightSessionMeta():null;flight={sessionId:typeof activeFlightSessionId!=='undefined'?String(activeFlightSessionId||''):'',name:String(meta?.name||''),createdAt:Number(meta?.createdAt||0)};}catch(_){ }
    const workflow=(m.workflow||[]).map(abNormalizeStep),wf=workflow.length?{currentIndex:0,status:'PENDING',steps:workflow.map((s,i)=>({...s,done:false,doneAtMs:0,doneBy:null}))}:{currentIndex:-1,status:'COMPLETED',steps:[]};const payload={kind:AB_RECORD_KIND,moduleId:m.id,moduleCode:m.code,moduleName:m.name,configVersion:Number(m.publishVersion||0),values:clone(vals),labels,flight,workflow:wf,createdBy:abActor(),createdAtMs:stamp,updatedAtMs:stamp};const ref=await abDb().collection(HANDOVER_COLLECTION).add(payload);abCurrentRecord={id:ref.id,...payload};abRuntimeStatus(`Đã lưu lúc ${new Date(stamp).toLocaleString('vi-VN')}${workflow.length?' · chờ '+workflow[0].role+' · '+workflow[0].label:''}.`);await abSignalRecord(abCurrentRecord,m);abLoadRecords(m.id);
  }catch(e){abRuntimeStatus('Không lưu được: '+(e?.message||e),true);}
}
async function abSignalRecord(rec,m){try{if(typeof sagsV470Ref!=='function')return;const wf=rec.workflow||{},step=wf.steps?.[wf.currentIndex]||null,eventAtMs=now();await sagsV470Ref(AB_RECORD_SIGNAL_PATH).set({eventId:rec.id+'|'+wf.currentIndex+'|'+eventAtMs,moduleId:m.id,moduleName:m.name,recordId:rec.id,targetRole:step?.role||'',status:wf.status,eventAtMs,sourceRole:abIdentity().role,sourceUser:abIdentity().username});}catch(e){console.info('Admin Builder record signal',e?.message||e);}}
async function abLoadRecords(moduleId){
  const host=$('abRecords');if(!host)return;host.innerHTML='<div class="abMeta">Đang tải bản ghi...</div>';try{const snap=await abDb().collection(HANDOVER_COLLECTION).where('kind','==',AB_RECORD_KIND).where('moduleId','==',moduleId).get(),arr=[];snap.forEach(doc=>arr.push({id:doc.id,...(doc.data()||{})}));arr.sort((a,b)=>Number(b.updatedAtMs||b.createdAtMs||0)-Number(a.updatedAtMs||a.createdAtMs||0));host.innerHTML=`<div class="abRowHead"><div class="abCardTitle">BẢN GHI GẦN ĐÂY</div><button class="abBtn secondary" onclick="abLoadRecords('${esc(moduleId)}')">LÀM MỚI</button></div>${arr.length?arr.slice(0,30).map(r=>abRecordHtml(r)).join(''):'<div class="abHint">Chưa có bản ghi.</div>'}`;}catch(e){host.innerHTML='<div class="abWarn">Không tải được bản ghi: '+esc(e?.message||e)+'</div>';}
}
function abRecordHtml(r){const wf=r.workflow||{},step=wf.steps?.[wf.currentIndex],id=abIdentity(),can=step&&(id.role==='AD'||String(step.role).toUpperCase()===id.role),summary=Object.entries(r.values||{}).slice(0,6).map(([k,v])=>`${esc(r.labels?.[k]||k)}: <b>${esc(typeof v==='object'?(v?.name||v?.url||''):v)}</b>`).join(' · ');return `<div class="abRecordItem"><div class="abRowHead"><b>${esc(r.flight?.name||r.moduleName||'BẢN GHI')} · ${new Date(Number(r.createdAtMs||0)).toLocaleString('vi-VN')}</b><button class="abBtn secondary" onclick='abViewRecord(${JSON.stringify(r.id)})'>XEM</button></div><div class="abRecordValues">${summary}</div><div class="abWorkflow">${wf.status==='COMPLETED'?'✓ HOÀN TẤT':step?`Đang chờ ${esc(step.role)} · ${esc(step.label)}`:'ĐÃ LƯU'}</div>${can&&wf.status!=='COMPLETED'?`<div class="abActions"><button class="abBtn good" onclick='abAdvanceRecord(${JSON.stringify(r.id)})'>${esc(step.action||'XÁC NHẬN')}</button></div>`:''}</div>`;}
async function abViewRecord(id){try{const s=await abDb().collection(HANDOVER_COLLECTION).doc(id).get();if(!s.exists)return;const r={id,...s.data()};abCurrentRecord=r;const vals=r.values||{};Object.entries(vals).forEach(([k,v])=>abSetRuntimeValue(k,v));abRuntimeRecalc();abRuntimeStatus(`Đang xem bản ghi ${new Date(Number(r.createdAtMs||0)).toLocaleString('vi-VN')} · dữ liệu chỉ đọc để đối chiếu.`);document.querySelectorAll('#abRuntimeFields input,#abRuntimeFields textarea,#abRuntimeFields select').forEach(x=>x.disabled=true);if($('abRuntimeSubmit'))$('abRuntimeSubmit').disabled=true;}catch(e){alert(e?.message||e);}}
async function abAdvanceRecord(id){
  try{const ref=abDb().collection(HANDOVER_COLLECTION).doc(id),s=await ref.get();if(!s.exists)return;const r={id,...s.data()},wf=clone(r.workflow||{}),idx=Number(wf.currentIndex||0),step=wf.steps?.[idx],identity=abIdentity();if(!step)return;if(identity.role!=='AD'&&String(step.role).toUpperCase()!==identity.role)return alert('Bước này dành cho '+step.role+'.');wf.steps[idx].done=true;wf.steps[idx].doneAtMs=now();wf.steps[idx].doneBy=abActor();if(idx>=wf.steps.length-1){wf.status='COMPLETED';wf.currentIndex=idx;}else{wf.currentIndex=idx+1;wf.status='PENDING';}await ref.set({workflow:wf,updatedAtMs:now()},{merge:true});r.workflow=wf;const m=(abCatalog.modules||[]).find(x=>x.id===r.moduleId)||abCurrentModule;if(m)await abSignalRecord(r,m);if(abCurrentModule)abLoadRecords(abCurrentModule.id);}catch(e){alert('Không xác nhận được: '+(e?.message||e));}
}

function abPatchRoleUi(){
  try{const base=window.applyRoleUI;if(typeof base==='function'&&!base.__abWrapped){const wrapped=function(...args){const r=base.apply(this,args);setTimeout(()=>abRefreshRoleUi(),0);return r;};wrapped.__abWrapped=true;window.applyRoleUI=wrapped;}}
  catch(e){console.info('Admin Builder patch role UI',e?.message||e);}
}

function abInit(){
  if(abInitialized)return;abInitialized=true;abInjectCss();abEnsureModals();abEnsureAdminButton();abResetEditor();abPatchRoleUi();abRefreshRoleUi();setTimeout(()=>{abLoadCatalog(false);abStartCatalogSignal();},350);
}

Object.assign(window,{abOpenBuilder,abCloseBuilder,abSwitchTab,abAddField,abDeleteField,abMoveField,abFieldChanged,abAddRule,abDeleteRule,abRuleChanged,abAddStep,abDeleteStep,abMoveStep,abStepChanged,abSaveDraft,abPublish,abResetEditor,abSetModuleActive,abDeleteModule,abRefreshBuilderList,abEditModule,abLoadHistory,abRestoreHistory,abOpenRuntimePreview,abOpenModule,abCloseRuntime,abRuntimeReset,abDismissRule,abLoadRecords,abViewRecord,abAdvanceRecord});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(abInit,0));else setTimeout(abInit,0);
})();

/* ===== END admin-builder.js ===== */

/* ===== BEGIN ac-limits.js ===== */
/* E-Report SAGS · V1.37 A/C LIMITS / AIRCRAFT RESTRICTIONS
   Admin: manual entry + quick paste only. No image/AI import.
   Runtime: match active flight/A-C REG; general limits alert at STA-10, ASU-related limits alert at ETD-10 (fallback STD-10).
*/
(()=>{
'use strict';
const ACL_VERSION='1.4.1';
const ACL_DOC='AC_LIMITS_CATALOG_V1';
const ACL_HISTORY_PREFIX='AC_LIMITS_HISTORY_';
const ACL_KIND='sags_ac_limits_catalog_v1';
const ACL_SIGNAL='ac_limits/catalog_signal';
const ACL_PUBLIC='ac_limits/catalog_public';
const ACL_CACHE='sags_ac_limits_catalog_cache_v1';
const ACL_ACK='sags_ac_limits_ack_v1';
const ACL_DEFAULT_ROLES=['DH','CBTT','VHTTB','PVHK','PVHLNG'];
const ACL_CATEGORIES=['APU INOP','HOLD INOP/ISSUES','SEAT INOP','OTHERS'];
let aclCatalog={version:0,items:[],dailyDate:'',dailyVersion:''};
let aclSignalRef=null,aclSignalCb=null,aclPollTimer=null;
let aclCurrentAlert=null,aclAlertQueue=[];
let aclEditingManualId='';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').trim().toUpperCase();
const normFlight=v=>norm(v).replace(/[^A-Z0-9]/g,'');
const normReg=v=>norm(v).replace(/[^A-Z0-9]/g,'');
const uid=()=>`ACL_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`.toUpperCase();
const clone=v=>JSON.parse(JSON.stringify(v??null));
function aclDb(){if(typeof initHandoverFirebase!=='function')throw new Error('Firebase chưa sẵn sàng.');return initHandoverFirebase();}
function aclActor(){try{return currentActor?.()||{role:String(currentRole||''),username:String(currentUserProfile?.username||'')}}catch(_){return {role:''}}}
function aclNormRole(v){let s=String(v||'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');s=s.replace(/Đ/g,'D').replace(/[^A-Z0-9]/g,'');if(s==='DH'||s==='DIEUHANH')return 'DH';if(s==='LNF'||s==='LOSTANDFOUND'||s==='LOSTFOUND')return 'LOSTFOUND';return s}
function aclRole(){try{return aclNormRole(currentRole||currentUserProfile?.role||currentUserProfile?.roleCode||'')}catch(_){return ''}}
function aclIsAdmin(){return aclRole()==='AD'}
function aclCanManage(){return aclIsAdmin()||(typeof window.v485Can==='function'&&window.v485Can('AC_LIMITS'))}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function aclRolesFromHost(host){return [...host.querySelectorAll('input[type=checkbox][data-acl-role]:checked')].map(x=>aclNormRole(x.dataset.aclRole||'')).filter(Boolean)}
function aclRolesHtml(prefix,selected=ACL_DEFAULT_ROLES){const set=new Set((selected||[]).map(x=>String(x).toUpperCase()));const roles=['DH','CBTT','PVHK','VHTTB','KTTB','PVHLNG','LOSTFOUND','AD'];return `<div class="aclRoleGrid">${roles.map(r=>`<label><input type="checkbox" data-acl-role="${r}" id="${prefix}_${r}" ${set.has(r)?'checked':''}> ${r}</label>`).join('')}</div>`}
function aclNormalizeItem(x={}){return {
 id:String(x.id||uid()),source:String(x.source||'MANUAL').toUpperCase(),active:x.active!==false,
 airline:norm(x.airline||''),flightNo:normFlight(x.flightNo||''),acReg:normReg(x.acReg||''),displayReg:norm(x.displayReg||x.acReg||''),
 matchMode:String(x.matchMode||((x.flightNo&&x.acReg)?'BOTH':x.flightNo?'FLIGHT':'REG')).toUpperCase(),
 category:ACL_CATEGORIES.includes(norm(x.category))?norm(x.category):'OTHERS',restriction:String(x.restriction||'').trim(),
 effectiveFrom:String(x.effectiveFrom||''),effectiveTo:String(x.effectiveTo||''),batchDate:String(x.batchDate||''),batchVersion:String(x.batchVersion||''),
 recipientRoles:[...new Set((x.recipientRoles||ACL_DEFAULT_ROLES).map(aclNormRole).filter(Boolean))],
 createdAtMs:Number(x.createdAtMs||Date.now()),updatedAtMs:Number(x.updatedAtMs||Date.now()),createdBy:x.createdBy||null,updatedBy:x.updatedBy||null
}}
function aclSaveCache(){try{localStorage.setItem(ACL_CACHE,JSON.stringify({at:Date.now(),catalog:aclCatalog}))}catch(_){}}
function aclLoadCache(){try{const x=JSON.parse(localStorage.getItem(ACL_CACHE)||'null');if(x?.catalog){aclCatalog={version:Number(x.catalog.version||0),items:(x.catalog.items||[]).map(aclNormalizeItem),dailyDate:String(x.catalog.dailyDate||''),dailyVersion:String(x.catalog.dailyVersion||'')};return true}}catch(_){}return false}
function aclSetStatus(text,err=false){const e=$('aclAdminStatus');if(e){e.textContent=text||'';e.style.color=err?'#b42318':'#40566b'}}
function aclInjectCss(){if($('aclStyle'))return;const s=document.createElement('style');s.id='aclStyle';s.textContent=`
#aclAdminModal,#aclAlertModal{position:fixed;inset:0;z-index:13950;display:none;background:rgba(0,0,0,.6);padding:max(8px,env(safe-area-inset-top)) 7px max(8px,env(safe-area-inset-bottom));box-sizing:border-box;overflow:auto;align-items:flex-start;justify-content:center}
.aclPanel{width:min(98vw,1050px);max-height:96dvh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-sizing:border-box;font:13px/1.4 Arial;color:#203040;box-shadow:0 18px 52px rgba(0,0,0,.36)}
.aclTop{position:sticky;top:-14px;z-index:5;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0 10px;border-bottom:1px solid #dde5ec}.aclTop h3{margin:0;color:#003B8E;font:900 19px Arial}.aclClose{border:0;background:#e9eef3;border-radius:9px;padding:9px 13px;font-weight:900}
.aclTabs{display:flex;gap:6px;overflow:auto;position:sticky;top:43px;background:#fff;z-index:4;padding:8px 0}.aclTab{white-space:nowrap;border:1px solid #bac6d1;background:#f7f9fb;border-radius:9px;padding:8px 10px;font-weight:900}.aclTab.active{background:#003B8E;color:#fff;border-color:#003B8E}.aclPane{display:none}.aclPane.active{display:block}
.aclCard{border:1px solid #d6dfe7;background:#fbfcfe;border-radius:12px;padding:11px;margin:9px 0}.aclTitle{font:900 15px Arial;color:#17324d;margin-bottom:7px}.aclHint{background:#eef6ff;border-left:4px solid #0b67b2;border-radius:9px;padding:9px;margin:8px 0;font-weight:700;color:#274862}.aclWarn{background:#fff0ef;border:2px solid #d92d20;border-radius:10px;padding:10px;color:#9d1c14;font-weight:900}
.aclGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.aclGrid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.aclLabel{display:block;font:900 11px Arial;color:#4c5d6c;margin:4px 0}.aclInput,.aclSelect,.aclText{width:100%;box-sizing:border-box;border:1px solid #aeb9c4;border-radius:8px;padding:9px;background:#fff;font:700 13px Arial}.aclText{min-height:70px;resize:vertical}.aclBtn{border:0;border-radius:8px;min-height:36px;padding:8px 11px;font-weight:900;background:#003B8E;color:#fff}.aclBtn.secondary{background:#e8eef5;color:#234;border:1px solid #c3ced8}.aclBtn.good{background:#167947}.aclBtn.danger{background:#b42318}.aclActions{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0}.aclRoleGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.aclRoleGrid label{border:1px solid #d7e0e8;border-radius:8px;padding:7px;background:#fff;font-weight:800}.aclItem{border:1px solid #d8e0e7;border-radius:10px;padding:9px;margin:7px 0;background:#fff}.aclItem b{color:#123b63}.aclMeta{font-size:11px;color:#607080;margin-top:4px}.aclDraftRow{display:grid;grid-template-columns:150px 180px 1fr auto;gap:6px;align-items:start;margin:6px 0}.aclDraftRow input,.aclDraftRow select{width:100%;box-sizing:border-box;border:1px solid #b8c3cc;border-radius:7px;padding:7px;font:700 12px Arial}.aclDraftRow textarea{width:100%;min-height:48px;box-sizing:border-box;border:1px solid #b8c3cc;border-radius:7px;padding:7px;font:700 12px Arial}
#aclAlertModal{z-index:14980;align-items:center;padding:12px}.aclAlertBox{width:min(94vw,520px);background:#fff;border:4px solid #d92d20;border-radius:16px;padding:16px;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.45)}.aclAlertTitle{color:#b42318;font:900 21px Arial;margin:0 0 7px}.aclAlertFlight{font:900 17px Arial;color:#172b4d;margin:5px 0}.aclAlertLine{background:#fff0ef;border-left:5px solid #d92d20;border-radius:7px;padding:9px;margin:7px 0;font-weight:900;white-space:pre-wrap}.aclAck{width:100%;border:0;border-radius:10px;padding:12px;background:#b42318;color:#fff;font:900 16px Arial;margin-top:10px}
@media(max-width:650px){.aclGrid,.aclGrid3{grid-template-columns:1fr}.aclRoleGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.aclDraftRow{grid-template-columns:1fr 1fr}.aclDraftRow textarea{grid-column:1/-1}.aclDraftRow .aclDraftDel{grid-column:1/-1}}
`;document.head.appendChild(s)}
function aclEnsureButton(){if($('roleBtnAcLimits'))return;const row=document.querySelector('.toolbar-row.main-actions');if(!row)return;const b=document.createElement('button');b.id='roleBtnAcLimits';b.textContent='A/C LIMITS';b.style.display='none';b.onclick=()=>aclOpenAdmin();const anchor=$('roleBtnAdminBuilder')||$('roleBtnManual');if(anchor)row.insertBefore(b,anchor);else row.appendChild(b)}
function aclRefreshRoleUI(){aclEnsureButton();const b=$('roleBtnAcLimits');if(b)b.style.display=(aclCanManage()&&!window.SAGS_ADMIN_HUB_V137)?'inline-flex':'none'}
function aclEnsureUi(){aclInjectCss();aclEnsureButton();if(!$('aclAdminModal')){const d=document.createElement('div');d.id='aclAdminModal';d.innerHTML=`<div class="aclPanel"><div class="aclTop"><h3>A/C LIMITS · AIRCRAFT RESTRICTIONS</h3><button class="aclClose" onclick="aclCloseAdmin()">ĐÓNG</button></div><div class="aclTabs">
<button class="aclTab active" data-acltab="manual" onclick="aclTab('manual')">1 · THÊM CẢNH BÁO</button><button class="aclTab" data-acltab="quick" onclick="aclTab('quick')">2 · DÁN NHANH</button><button class="aclTab" data-acltab="list" onclick="aclTab('list')">3 · ĐANG HIỆU LỰC</button><button class="aclTab" data-acltab="help" onclick="aclTab('help')">HDSD</button></div>
<div id="aclAdminStatus" style="min-height:20px;font-weight:800"></div>
<div id="aclPaneManual" class="aclPane active"></div><div id="aclPaneQuick" class="aclPane"></div><div id="aclPaneList" class="aclPane"></div><div id="aclPaneHelp" class="aclPane"></div></div>`;document.body.appendChild(d)}
if(!$('aclAlertModal')){const a=document.createElement('div');a.id='aclAlertModal';a.innerHTML=`<div class="aclAlertBox"><div class="aclAlertTitle">⚠ A/C LIMITS</div><div id="aclAlertFlight" class="aclAlertFlight"></div><div id="aclAlertBody"></div><button class="aclAck" onclick="aclAckAlert()">ĐÃ BIẾT</button></div>`;document.body.appendChild(a)}
aclRenderAll()}
function aclTab(name){document.querySelectorAll('#aclAdminModal .aclTab').forEach(x=>x.classList.toggle('active',x.dataset.acltab===name));document.querySelectorAll('#aclAdminModal .aclPane').forEach(x=>x.classList.remove('active'));const p=$('aclPane'+name.charAt(0).toUpperCase()+name.slice(1));if(p)p.classList.add('active');if(name==='list')aclRenderList()}
function aclOpenAdmin(){if(!aclCanManage())return alert('Tài khoản chưa được cấp quyền A/C LIMITS.');aclEnsureUi();$('aclAdminModal').style.display='flex';aclLoadCatalog(true).then(()=>aclRenderAll()).catch(e=>aclSetStatus(String(e?.message||e),true))}
function aclCloseAdmin(){const m=$('aclAdminModal');if(m)m.style.display='none'}
function aclRenderAll(){aclRenderManualPane();aclRenderQuickPane();aclRenderList();aclRenderHelp()}
function aclRenderManualPane(){const h=$('aclPaneManual');if(!h)return;h.innerHTML=`<div class="aclCard"><div class="aclTitle">THÊM CẢNH BÁO A/C LIMITS</div><div class="aclHint">Nhập trực tiếp Flight No / A/C Reg và nội dung cần cảnh báo. Dùng được cho mọi hãng. Ví dụ <b>BX782 · HL7269 · NEED GPU ASU</b>.</div><div class="aclGrid3">
<div><label class="aclLabel">Hãng</label><input id="aclManAirline" class="aclInput" placeholder="BX"></div><div><label class="aclLabel">Flight No</label><input id="aclManFlight" class="aclInput" placeholder="BX782"></div><div><label class="aclLabel">A/C Reg</label><input id="aclManReg" class="aclInput" placeholder="HL7269"></div>
<div><label class="aclLabel">Khớp theo</label><select id="aclManMode" class="aclSelect"><option value="BOTH">FLIGHT + REG</option><option value="REG">A/C REG</option><option value="FLIGHT">FLIGHT NO</option></select></div><div><label class="aclLabel">Nhóm</label><select id="aclManCat" class="aclSelect">${ACL_CATEGORIES.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div><label class="aclLabel">Từ ngày</label><input id="aclManFrom" class="aclInput" type="date" value="${todayISO()}"></div><div><label class="aclLabel">Đến ngày</label><input id="aclManTo" class="aclInput" type="date" value="${todayISO()}"></div></div><label class="aclLabel">Nội dung hạn chế</label><textarea id="aclManText" class="aclText" placeholder="NEED GPU ASU"></textarea><label class="aclLabel">Đối tượng nhận</label>${aclRolesHtml('aclManRole',ACL_DEFAULT_ROLES)}<div class="aclActions"><button class="aclBtn good" onclick="aclSaveManual()">${aclEditingManualId?'LƯU THAY ĐỔI':'LƯU & ÁP DỤNG'}</button><button class="aclBtn secondary" onclick="aclClearManual()">XÓA Ô</button></div></div>`}
function aclClearManual(){aclEditingManualId='';['aclManAirline','aclManFlight','aclManReg','aclManText'].forEach(id=>{if($(id))$(id).value=''});if($('aclManFrom'))$('aclManFrom').value=todayISO();if($('aclManTo'))$('aclManTo').value=todayISO()}
async function aclSaveManual(){if(!aclCanManage())return;const flight=normFlight($('aclManFlight')?.value),reg=normReg($('aclManReg')?.value),mode=String($('aclManMode')?.value||'BOTH'),text=String($('aclManText')?.value||'').trim(),roles=aclRolesFromHost($('aclPaneManual'));if(!text)return alert('Nhập nội dung hạn chế.');if(mode==='BOTH'&&(!flight||!reg))return alert('Khớp FLIGHT + REG cần nhập đủ Flight No và A/C Reg.');if(mode==='REG'&&!reg)return alert('Cần nhập A/C Reg.');if(mode==='FLIGHT'&&!flight)return alert('Cần nhập Flight No.');if(!roles.length)return alert('Chọn ít nhất 1 đối tượng nhận.');const stamp=Date.now(),oldItem=aclEditingManualId?(aclCatalog.items||[]).find(x=>x.id===aclEditingManualId):null,item=aclNormalizeItem({id:oldItem?.id||uid(),source:oldItem?.source||'MANUAL',airline:$('aclManAirline')?.value,flightNo:flight,acReg:reg,displayReg:$('aclManReg')?.value,matchMode:mode,category:$('aclManCat')?.value,restriction:text,effectiveFrom:$('aclManFrom')?.value,effectiveTo:$('aclManTo')?.value,recipientRoles:roles,createdAtMs:oldItem?.createdAtMs||stamp,createdBy:oldItem?.createdBy||aclActor(),updatedAtMs:stamp,updatedBy:aclActor()});try{const arr=oldItem?(aclCatalog.items||[]).map(x=>x.id===oldItem.id?item:x):[...(aclCatalog.items||[]),item];await aclWriteCatalog(arr,{action:oldItem?'MANUAL_EDIT':'MANUAL_ADD'});aclSetStatus(`${oldItem?'Đã sửa':'Đã thêm'} ${flight||''} ${item.displayReg||reg} · ${text}`);aclEditingManualId='';aclRenderManualPane();aclRenderList()}catch(e){aclSetStatus('Không lưu được: '+String(e?.message||e),true)}}
function aclRenderQuickPane(){const h=$('aclPaneQuick');if(!h)return;h.innerHTML=`<div class="aclCard"><div class="aclTitle">DÁN NHANH THÔNG BÁO HÃNG</div><div class="aclHint">Ví dụ: <b>BX782 HL7269 NEED GPU ASU</b>. Hệ thống tách Flight / Reg / nội dung rồi đưa sang mục THÊM TAY để anh kiểm tra trước khi lưu.</div><textarea id="aclQuickText" class="aclText" placeholder="BX782 HL7269 NEED GPU ASU"></textarea><div class="aclActions"><button class="aclBtn" onclick="aclQuickParse()">TÁCH THÔNG TIN</button></div><div id="aclQuickResult"></div></div>`}
function aclQuickParse(){const raw=norm($('aclQuickText')?.value);if(!raw)return;const tokens=raw.split(/\s+/),reg=tokens.find(t=>/^(?:HL\d{4}|VN-?A[A-Z0-9]+|B-?[A-Z0-9]{3,6}|HS-?[A-Z0-9]{3,6}|RP-C\d+|9M-?[A-Z0-9]+)$/.test(t))||'',flight=tokens.find(t=>t!==reg&&/^[A-Z0-9]{2,3}\d{2,5}[A-Z]?$/.test(t))||'';const idxs=[flight?tokens.indexOf(flight):-1,reg?tokens.indexOf(reg):-1].filter(x=>x>=0);const after=idxs.length?Math.max(...idxs)+1:0,text=tokens.slice(after).join(' ').trim();aclTab('manual');$('aclManFlight').value=flight;$('aclManReg').value=reg;$('aclManAirline').value=(flight.match(/^([A-Z0-9]{2,3}?)(?=\d)/)||['',''])[1];$('aclManText').value=text;if(flight&&reg)$('aclManMode').value='BOTH';else if(reg)$('aclManMode').value='REG';else $('aclManMode').value='FLIGHT';if(/APU|GPU|ASU|ACU/.test(text))$('aclManCat').value='APU INOP';aclSetStatus(`Đã tách: ${flight||'(chưa thấy Flight)'} · ${reg||'(chưa thấy Reg)'} · ${text||'(chưa thấy nội dung)'}. Kiểm tra rồi bấm LƯU & ÁP DỤNG.`)}
function aclRuntimeDiagnostic(){const cs=aclContexts(),role=aclRole(),now=Date.now();return cs.map(c=>{const matches=(aclCatalog.items||[]).filter(x=>aclMatch(x,c)&&(x.recipientRoles||[]).map(aclNormRole).includes(role));const general=matches.filter(x=>!aclIsAsuItem(x)),asu=matches.filter(aclIsAsuItem);const g=general[0]?aclTimingForItem(general[0],c):{event:'STA',clock:c.sta,due:c.sta?aclStaMs(c.date,c.sta)-10*60000:null};const a=asu[0]?aclTimingForItem(asu[0],c):{event:c.etd?'ETD':'STD',clock:c.etd||c.std,due:(c.etd||c.std)?(aclDepartureMs(c)-10*60000):null};return {...c,now,matches:matches.length,generalCount:general.length,asuCount:asu.length,generalTiming:g,asuTiming:a}})}
function aclShowDiagnostic(){const rows=aclRuntimeDiagnostic();if(!rows.length)return alert('Máy này chưa có chuyến nào để kiểm tra A/C LIMITS.');const fmt=x=>x?new Date(x).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'(không tính được)';alert(rows.map(x=>`${x.flightLabel} · REG ${x.reg||'(trống)'} · ROLE ${aclRole()||'(trống)'}\nSTA ${x.sta||'(trống)'} → LIMIT chung T-10 ${fmt(x.generalTiming?.due)} · MATCH ${x.generalCount}\n${x.asuTiming?.event||'STD'} ${x.asuTiming?.clock||'(trống)'} → ASU T-10 ${fmt(x.asuTiming?.due)} · MATCH ${x.asuCount}`).join('\n\n'))}
function aclRenderList(){const h=$('aclPaneList');if(!h)return;const arr=(aclCatalog.items||[]).slice().sort((a,b)=>Number(b.active)-Number(a.active)||Number(b.updatedAtMs)-Number(a.updatedAtMs));h.innerHTML=`<div class="aclCard"><div class="aclTitle">DANH SÁCH A/C LIMITS</div><div class="aclHint">Toàn bộ cảnh báo được AD nhập thủ công hoặc tạo từ DÁN NHANH. Có thể SỬA / TẮT / BẬT / XÓA từng cảnh báo.</div><div class="aclActions"><button class="aclBtn secondary" onclick="aclLoadCatalog(true).then(aclRenderList)">LÀM MỚI</button><button class="aclBtn secondary" onclick="aclShowDiagnostic()">KIỂM TRA T-10 TRÊN MÁY NÀY</button></div>${arr.length?arr.map(aclItemHtml).join(''):'<div class="aclHint">Chưa có hạn chế.</div>'}</div>`}
function aclItemHtml(x){const key=esc(x.id);const who=(x.recipientRoles||[]).join(', '),srcLabel=String(x.source||'MANUAL').startsWith('IMAGE')?'LEGACY':String(x.source||'MANUAL');return `<div class="aclItem"><b>${esc(x.category)} · ${esc(x.displayReg||x.acReg||'')}</b>${x.flightNo?` · <b>${esc(x.flightNo)}</b>`:''}<div>${esc(x.restriction)}</div><div class="aclMeta">${esc(srcLabel)} · ${esc(x.matchMode)} · ${esc(x.effectiveFrom||'')} → ${esc(x.effectiveTo||'')} · Nhận: ${esc(who)} · ${x.active?'ĐANG BẬT':'ĐÃ TẮT'}</div><div class="aclActions"><button class="aclBtn secondary" onclick="aclToggleItem('${key}',${x.active?'false':'true'})">${x.active?'TẮT':'BẬT'}</button><button class="aclBtn secondary" onclick="aclEditItem('${key}')">SỬA</button><button class="aclBtn danger" onclick="aclDeleteItem('${key}')">XÓA</button></div></div>`}
async function aclToggleItem(id,on){const arr=(aclCatalog.items||[]).map(x=>x.id===id?aclNormalizeItem({...x,active:!!on,updatedAtMs:Date.now(),updatedBy:aclActor()}):x);await aclWriteCatalog(arr,{action:on?'REACTIVATE':'DEACTIVATE'});aclRenderList()}
async function aclDeleteItem(id){if(!confirm('Xóa hạn chế này khỏi danh sách?'))return;await aclWriteCatalog((aclCatalog.items||[]).filter(x=>x.id!==id),{action:'DELETE'});aclRenderList()}
function aclEditItem(id){const x=(aclCatalog.items||[]).find(v=>v.id===id);if(!x)return;aclEditingManualId=id;aclRenderManualPane();aclTab('manual');$('aclManAirline').value=x.airline||'';$('aclManFlight').value=x.flightNo||'';$('aclManReg').value=x.displayReg||x.acReg||'';$('aclManMode').value=x.matchMode||'REG';$('aclManCat').value=x.category||'OTHERS';$('aclManFrom').value=x.effectiveFrom||todayISO();$('aclManTo').value=x.effectiveTo||todayISO();$('aclManText').value=x.restriction||'';document.querySelectorAll('#aclPaneManual input[data-acl-role]').forEach(c=>c.checked=(x.recipientRoles||[]).includes(c.dataset.aclRole));aclSetStatus('Đang sửa hạn chế. Bấm LƯU THAY ĐỔI khi xong.')}
function aclRenderHelp(){const h=$('aclPaneHelp');if(!h)return;h.innerHTML=`<div class="aclCard"><div class="aclTitle">HDSD · A/C LIMITS</div><ol>
<li><b>Thêm cảnh báo:</b> AD → A/C LIMITS → <b>THÊM CẢNH BÁO</b>. Nhập Hãng (nếu cần), Flight No, A/C Reg, nội dung hạn chế/cảnh báo, ngày hiệu lực và đối tượng nhận.</li>
<li><b>Chọn kiểu khớp:</b> REG = cảnh báo theo đăng bạ; FLIGHT = theo số chuyến; FLIGHT + REG = chỉ cảnh báo khi cả hai cùng khớp.</li>
<li><b>Dán nhanh:</b> dùng cho tin nhắn ngắn như <code>BX782 HL7269 NEED GPU ASU</code> → bấm <b>TÁCH THÔNG TIN</b> → hệ thống điền Flight/Reg/nội dung vào form → kiểm tra → <b>LƯU & ÁP DỤNG</b>.</li>
<li><b>Nhiều hạn chế cùng một tàu:</b> nhập thành nhiều cảnh báo riêng. Khi tới mốc, hệ thống gom các hạn chế đang khớp để người làm chuyến thấy đầy đủ.</li>
<li><b>Thời điểm cảnh báo:</b> hạn chế chung cảnh báo từ <b>STA - 10 phút</b>. Riêng nội dung có chữ <b>ASU</b>: ưu tiên <b>ETD - 10 phút</b>; nếu chưa có ETD thì dùng <b>STD - 10 phút</b>. Nếu đã qua mốc mà chưa PUSHBACK, cảnh báo vẫn xuất hiện.</li>
<li><b>Đối tượng nhận:</b> chỉ các Role được AD chọn mới nhận popup. Cùng chuyến + cùng bản hạn chế chỉ cảnh báo một lần sau khi bấm <b>ĐÃ BIẾT</b>; nếu AD sửa nội dung thành bản mới thì có thể cảnh báo lại.</li>
<li><b>Kiểm tra trước khi khai thác:</b> vào <b>ĐANG HIỆU LỰC → KIỂM TRA T-10 TRÊN MÁY NÀY</b> để xem Flight / Reg / Role / mốc thời gian / số LIMIT đang match.</li>
</ol><div class="aclWarn">A/C LIMITS không còn dùng UP ẢNH hoặc AI. Mọi cảnh báo do AD chủ động nhập/chỉnh sửa trực tiếp để dữ liệu gọn và dễ kiểm soát.</div></div>`}
function aclApplyCatalog(d){d=d||{};aclCatalog={version:Number(d.version||0),items:(d.items||[]).map(aclNormalizeItem),dailyDate:String(d.dailyDate||''),dailyVersion:String(d.dailyVersion||'')};const activeById=new Map((aclCatalog.items||[]).filter(x=>x.active!==false).map(x=>[String(x.id),x]));aclAlertQueue=(aclAlertQueue||[]).map(a=>({...a,items:(a.items||[]).map(x=>activeById.get(String(x.id))).filter(Boolean)})).filter(a=>a.items.length);if(aclCurrentAlert){const live=(aclCurrentAlert.items||[]).map(x=>activeById.get(String(x.id))).filter(Boolean);if(!live.length){try{const m=$('aclAlertModal');if(m)m.style.display='none'}catch(_){}aclCurrentAlert=null;setTimeout(aclTryShowNext,120)}else aclCurrentAlert={...aclCurrentAlert,items:live};}aclSaveCache();return aclCatalog}
async function aclWriteCatalog(items,meta={}){if(!aclCanManage())throw new Error('Tài khoản chưa được cấp quyền cập nhật A/C LIMITS.');const now=Date.now(),catalog={kind:ACL_KIND,version:now,dailyDate:meta.dailyDate??aclCatalog.dailyDate??'',dailyVersion:meta.dailyVersion??aclCatalog.dailyVersion??'',items:(items||[]).map(aclNormalizeItem),updatedAtMs:now,updatedBy:aclActor()};const db=aclDb(),old=clone(aclCatalog);await db.collection(HANDOVER_COLLECTION).doc(ACL_DOC).set(catalog,{merge:false});try{await db.collection(HANDOVER_COLLECTION).doc(ACL_HISTORY_PREFIX+now).set({kind:'sags_ac_limits_history_v1',action:String(meta.action||'UPDATE'),oldVersion:Number(old?.version||0),newVersion:now,oldCount:Array.isArray(old?.items)?old.items.length:0,newCount:catalog.items.length,dailyDate:catalog.dailyDate,dailyVersion:catalog.dailyVersion,createdAtMs:now,createdBy:aclActor()},{merge:false})}catch(_){}aclApplyCatalog(catalog);try{if(typeof sagsV470Ref==='function'){await sagsV470Ref(ACL_PUBLIC).set(catalog);await sagsV470Ref(ACL_SIGNAL).set({version:now,action:String(meta.action||'UPDATE'),updatedAtMs:now,updatedBy:aclActor()})}}catch(e){console.info('A/C LIMITS RTDB publish',e?.message||e)}aclEvaluateSoon();return catalog}
async function aclLoadCatalog(force=false){if(!force&&aclCatalog.version)return aclCatalog;let loaded=false;try{if(typeof sagsV470Ref==='function'){const snap=await sagsV470Ref(ACL_PUBLIC).once('value'),d=snap?.val?.();if(d?.version){aclApplyCatalog(d);loaded=true}}}catch(e){console.info('A/C LIMITS RTDB read fallback',e?.message||e)}if(!loaded){try{const s=await aclDb().collection(HANDOVER_COLLECTION).doc(ACL_DOC).get();if(s.exists){const d=s.data()||{};aclApplyCatalog(d);loaded=true;if(aclCanManage()&&typeof sagsV470Ref==='function'){try{await sagsV470Ref(ACL_PUBLIC).set({...d,items:(d.items||[]).map(aclNormalizeItem)})}catch(_){}}}}catch(e){if(!aclCatalog.version)aclLoadCache();if(force&&!aclCatalog.version)throw e}}aclEvaluateSoon();return aclCatalog}
function aclStartSignal(){try{if(aclSignalRef||typeof sagsV470Ref!=='function')return;aclSignalRef=sagsV470Ref(ACL_SIGNAL);aclSignalCb=async snap=>{const v=Number(snap?.val?.()?.version||0);if(v&&v!==Number(aclCatalog.version||0)){try{await aclLoadCatalog(true);aclRenderList()}catch(_){}}};aclSignalRef.on('value',aclSignalCb)}catch(e){console.info('A/C LIMITS signal',e?.message||e)}}
function aclIdentityFor(sessionId,st,meta){st=(st&&typeof st==='object')?st:{};meta=meta||null;let identity={};try{identity=fs09IdentityFromState?.(st,meta)||{}}catch(_){try{identity=opsRampIdentity?.(st,meta)||{}}catch(__){identity={}}}const pick=(...keys)=>{for(const k of keys){const v=String(st?.[k]??'').trim();if(v&&v.toUpperCase()!=='N/A')return v}return ''};let flights=Array.isArray(identity.flights)?identity.flights.map(normFlight).filter(Boolean):[];if(!flights.length){flights=[pick('fltBefore','f421_fltBefore','f551_fltBefore','f09_fltBefore'),pick('fltAfter','f421_fltAfter','f551_fltAfter','f09_fltAfter')].map(normFlight).filter(Boolean)}const reg=normReg(identity.acRegToken||identity.regn||pick('regn','f421_regn','f551_regn','f09_regn','acReg','acreg','f421_acReg','f421_acreg','f551_acReg','f09_acReg'));const date=aclIdentityDate(identity,pick('date','f421_date','f551_date','f09_date'));const sta=pick('sta','f421_sta','f551_sta','f09_sta');const std=pick('std','f421_std','f551_std','f09_std');const etd=pick('etd','f421_etd','f551_etd','f09_etd');const pushback=pick('pushback','f421_pushback','f551_pushback','f09_pushback','h24Start','f421_h24Start','f551_h24Start','f09_h24Start');const sid=String(sessionId||'').trim()||`AUTO_${date}_${flights.join('_')}_${reg}`;return {sessionId:sid,flightLabel:flights.join('/')||String(meta?.name||'CHUYẾN'),flights,reg,date,sta,std,etd,pushback}}
function aclIdentity(){let st={},meta=null,sid='';try{sid=String(typeof activeFlightSessionId!=='undefined'?activeFlightSessionId:'');meta=currentFlightSessionMeta?.()||null;const env=readFlightSessionEnvelope?.(sid)||{};st=(typeof state==='object'&&state)||env?.state||{}}catch(_){st={}}return aclIdentityFor(sid,st,meta)}
function aclContexts(){const out=[],seen=new Set();const add=(sid,st,meta)=>{const c=aclIdentityFor(sid,st,meta);const k=c.sessionId;if(!k||seen.has(k))return;seen.add(k);out.push(c)};try{const active=aclIdentity();add(active.sessionId,(typeof state==='object'&&state)||{},currentFlightSessionMeta?.()||null)}catch(_){}try{const list=typeof readFlightSessionList==='function'?readFlightSessionList():[];(list||[]).forEach(meta=>{const sid=String(meta?.id||'');if(!sid||seen.has(sid))return;const env=readFlightSessionEnvelope?.(sid)||{};add(sid,env?.state||{},meta)})}catch(_){}return out}
function aclIdentityDate(identity,raw){let v=String(identity?.dateToken||raw||'').trim();if(/^\d{8}$/.test(v)){if(Number(v.slice(0,4))>1900)return `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;return `${v.slice(4,8)}-${v.slice(2,4)}-${v.slice(0,2)}`}return aclDateToISO(v)||todayISO()}
function aclClockMinutes(v){const d=String(v||'').replace(/[^0-9]/g,'');if(d.length<3||d.length>4)return null;const s=d.padStart(4,'0'),h=Number(s.slice(0,2)),m=Number(s.slice(2));return h<=23&&m<=59?h*60+m:null}
function aclClockMs(date,clock){const m=aclClockMinutes(clock);if(m===null)return null;const a=String(date||todayISO()).split('-').map(Number);if(a.length!==3||!a[0]||!a[1]||!a[2])return null;return new Date(a[0],a[1]-1,a[2],Math.floor(m/60),m%60,0,0).getTime()}
function aclStaMs(date,sta){return aclClockMs(date,sta)}
function aclIsAsuItem(item){return /(^|[^A-Z])ASU([^A-Z]|$)/i.test(String(item?.restriction||''))}
function aclDepartureMs(ctx){const clock=ctx.etd||ctx.std;if(!clock)return null;let ms=aclClockMs(ctx.date,clock);if(!ms)return null;const staMs=aclStaMs(ctx.date,ctx.sta);if(staMs&&ms+12*60*60*1000<staMs)ms+=24*60*60*1000;return ms}
function aclTimingForItem(item,ctx){if(aclIsAsuItem(item)){const clock=ctx.etd||ctx.std;const ms=aclDepartureMs(ctx);return {kind:'ASU',event:ctx.etd?'ETD':'STD',clock,ms,due:ms?ms-10*60*1000:null}}const ms=aclStaMs(ctx.date,ctx.sta);return {kind:'GENERAL',event:'STA',clock:ctx.sta,ms,due:ms?ms-10*60*1000:null}}
function aclDateWithin(item,date){const f=item.effectiveFrom||'',t=item.effectiveTo||'';if(f&&date<f)return false;if(t&&date>t)return false;return true}
function aclMatch(item,ctx){if(!item.active||!item.restriction||!aclDateWithin(item,ctx.date))return false;const mode=item.matchMode||'REG',fm=item.flightNo?ctx.flights.includes(normFlight(item.flightNo)):false,rm=item.acReg?normReg(item.acReg)===ctx.reg:false;if(mode==='BOTH')return !!item.flightNo&&!!item.acReg&&fm&&rm;if(mode==='FLIGHT')return !!item.flightNo&&fm;return !!item.acReg&&rm}
function aclAckStore(){try{return JSON.parse(localStorage.getItem(ACL_ACK)||'{}')||{}}catch(_){return {}}}
function aclAckKey(ctx,items){const sig=items.map(x=>`${x.id}:${Number(x.updatedAtMs||0)}:${String(x.restriction||'')}`).sort().join(',');return `${ctx.sessionId}|${ctx.date}|${ctx.flightLabel}|${ctx.reg}|${sig}`}
function aclEvaluateSoon(){setTimeout(()=>{try{aclEvaluate()}catch(_){}},80)}
function aclEvaluate(){if(!aclCatalog.version||!aclRole())return;const role=aclRole(),acks=aclAckStore(),now=Date.now();for(const ctx of aclContexts()){if((!ctx.flights.length&&!ctx.reg)||ctx.pushback)continue;const matches=(aclCatalog.items||[]).filter(x=>aclMatch(x,ctx)&&(x.recipientRoles||[]).map(aclNormRole).includes(role));if(!matches.length)continue;for(const kind of ['GENERAL','ASU']){const items=matches.filter(x=>(aclIsAsuItem(x)?'ASU':'GENERAL')===kind);if(!items.length)continue;const timing=aclTimingForItem(items[0],ctx);if(!timing.due||now<timing.due)continue;const key=aclAckKey(ctx,items)+'|'+kind+'|'+String(timing.event||'');if(Number(acks[key]||0)>0)continue;if(aclCurrentAlert?.key===key||aclAlertQueue.some(x=>x.key===key))continue;aclEnqueueAlert({key,ctx,items,dueAtMs:timing.due,catalogVersion:aclCatalog.version,timing})}}}
function aclEnqueueAlert(a){aclAlertQueue.push(a);aclTryShowNext()}
function aclTryShowNext(){if(aclCurrentAlert||!aclAlertQueue.length)return;try{if(typeof opsVisibleAlerts!=='undefined'&&opsVisibleAlerts.size){setTimeout(aclTryShowNext,1200);return}}catch(_){}aclCurrentAlert=aclAlertQueue.shift();aclShowAlert(aclCurrentAlert)}
function aclShowAlert(a){aclEnsureUi();const f=$('aclAlertFlight'),b=$('aclAlertBody'),t=a.timing||{event:'STA',clock:a.ctx.sta,kind:'GENERAL'};if(f)f.textContent=`${a.ctx.flightLabel}${a.ctx.reg?' · A/C '+a.ctx.reg:''} · ${t.event} ${t.clock||'—'} · ${t.kind==='ASU'?'CẢNH BÁO ASU T-10':'CẢNH BÁO A/C LIMITS T-10'}`;if(b)b.innerHTML=a.items.map(x=>`<div class="aclAlertLine"><b>${esc(x.category)}</b>${x.displayReg||x.acReg?` · ${esc(x.displayReg||x.acReg)}`:''}${x.flightNo?` · ${esc(x.flightNo)}`:''}<br>${esc(x.restriction)}</div>`).join('');$('aclAlertModal').style.display='flex';try{navigator.vibrate?.([450,180,450])}catch(_){}try{writeUserActivity?.(t.kind==='ASU'?'A/C LIMITS · ASU T-10':'A/C LIMITS · STA T-10',`${a.ctx.flightLabel} · ${a.ctx.reg} · ${a.items.length} cảnh báo`,{acLimitCount:a.items.length,sta:a.ctx.sta,std:a.ctx.std,etd:a.ctx.etd,triggerEvent:t.event,triggerClock:t.clock})}catch(_){}}
function aclAckAlert(){if(!aclCurrentAlert)return;const acks=aclAckStore();acks[aclCurrentAlert.key]=Date.now();try{localStorage.setItem(ACL_ACK,JSON.stringify(acks))}catch(_){}$('aclAlertModal').style.display='none';aclCurrentAlert=null;setTimeout(aclTryShowNext,180)}
function aclInit(){aclEnsureUi();aclLoadCache();aclRefreshRoleUI();aclLoadCatalog(false).catch(()=>{});aclStartSignal();if(aclPollTimer)clearInterval(aclPollTimer);aclPollTimer=setInterval(()=>{aclRefreshRoleUI();aclEvaluate()},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)aclEvaluateSoon()});window.addEventListener('pageshow',aclEvaluateSoon)}
window.aclOpenAdmin=aclOpenAdmin;window.aclCloseAdmin=aclCloseAdmin;window.aclTab=aclTab;window.aclSaveManual=aclSaveManual;window.aclClearManual=aclClearManual;window.aclQuickParse=aclQuickParse;window.aclLoadCatalog=aclLoadCatalog;window.aclRenderList=aclRenderList;window.aclToggleItem=aclToggleItem;window.aclDeleteItem=aclDeleteItem;window.aclEditItem=aclEditItem;window.aclAckAlert=aclAckAlert;window.aclEvaluate=aclEvaluate;window.aclShowDiagnostic=aclShowDiagnostic;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',aclInit,{once:true});else setTimeout(aclInit,0);
})();

/* ===== END ac-limits.js ===== */

/* ===== BEGIN ac-limits-simple.js ===== */
/* E-REPORT SAGS · A/C LIMITS SIMPLE ENTRY · V1.88
 * Admin UI only. Existing ac-limits.js remains the runtime alert engine.
 * Workflow: A/C REG first -> tick APU INOP / HOLD INOP / OTHER.
 */
(()=>{
'use strict';

const BUILD='V1.103-20260820-01';
const DOC='AC_LIMITS_CATALOG_V1';
const HISTORY_PREFIX='AC_LIMITS_HISTORY_';
const KIND='sags_ac_limits_catalog_v1';
const PUBLIC_PATH='ac_limits/catalog_public';
const SIGNAL_PATH='ac_limits/catalog_signal';
const DEFAULT_ROLES=['DH','CBTT','VHTTB','PVHK','PVHLNG'];
const ALL_ROLES=['DH','CBTT','PVHK','VHTTB','KTTB','PVHLNG','LOSTFOUND','AD'];
let catalog={version:0,items:[],dailyDate:'',dailyVersion:''};
let editingId='';
let lastReg='';

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normReg=v=>String(v??'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
const displayReg=v=>String(v??'').trim().toUpperCase();
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const uid=()=>`ACL_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`.toUpperCase();
const clone=v=>JSON.parse(JSON.stringify(v??null));
function role(){try{return String(currentRole||currentUserProfile?.role||'').trim().toUpperCase()}catch(_){return ''}}
function isAdmin(){return role()==='AD'||(typeof window.v485Can==='function'&&window.v485Can('AC_LIMITS'))}
function actor(){try{return currentActor?.()||{role:role(),username:String(currentUserProfile?.username||'')}}catch(_){return {role:role()}}}
function collectionName(){try{if(typeof HANDOVER_COLLECTION!=='undefined'&&HANDOVER_COLLECTION)return HANDOVER_COLLECTION}catch(_){}throw new Error('Không xác định được HANDOVER_COLLECTION.')}
function db(){if(typeof initHandoverFirebase!=='function')throw new Error('Firebase chưa sẵn sàng.');return initHandoverFirebase()}
function normalizeItem(x={}){
  return {
    ...x,
    id:String(x.id||uid()),
    source:String(x.source||'MANUAL').toUpperCase(),
    active:x.active!==false,
    airline:String(x.airline||'').trim().toUpperCase(),
    flightNo:String(x.flightNo||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,''),
    acReg:normReg(x.acReg||x.displayReg||''),
    displayReg:displayReg(x.displayReg||x.acReg||''),
    matchMode:String(x.matchMode||'REG').toUpperCase(),
    category:String(x.category||'OTHERS').toUpperCase(),
    restriction:String(x.restriction||'').trim(),
    effectiveFrom:String(x.effectiveFrom||''),
    effectiveTo:String(x.effectiveTo||''),
    batchDate:String(x.batchDate||''),
    batchVersion:String(x.batchVersion||''),
    recipientRoles:[...new Set((x.recipientRoles||DEFAULT_ROLES).map(v=>String(v||'').trim().toUpperCase()).filter(Boolean))],
    createdAtMs:Number(x.createdAtMs||Date.now()),
    updatedAtMs:Number(x.updatedAtMs||Date.now()),
    createdBy:x.createdBy||null,
    updatedBy:x.updatedBy||null
  };
}
function friendlyCategory(c){c=String(c||'').toUpperCase();if(c==='APU INOP')return 'APU INOP';if(c==='HOLD INOP/ISSUES')return 'HOLD INOP';if(c==='OTHERS')return 'OTHER';return c||'OTHER'}
function fleetMap(){try{return sagsDynamicFleetCache?.()?.byReg||{}}catch(_){return {}}}
async function refreshFleet(){try{if(typeof refreshDynamicFleetCache==='function')await refreshDynamicFleetCache(false)}catch(_){}renderRegOptions()}
function fleetInfo(reg){const key=normReg(reg),map=fleetMap();return map[key]||Object.values(map).find(x=>normReg(x?.reg)===key)||null}
function renderRegOptions(){
  const list=$('aclSRegList');if(!list)return;
  const rows=Object.values(fleetMap()).filter(Boolean).sort((a,b)=>String(a.reg||'').localeCompare(String(b.reg||'')));
  list.innerHTML=rows.map(x=>`<option value="${esc(x.reg||'')}">${esc([x.airline,x.acType].filter(Boolean).join(' · '))}</option>`).join('');
  updateFleetHint();
}
function updateFleetHint(){
  const reg=$('aclSReg')?.value||'',info=fleetInfo(reg),h=$('aclSFleetHint');if(!h)return;
  h.textContent=info?`✓ ${info.airline||''}${info.acType?' · '+info.acType:''}`:(reg?'REG chưa có trong Fleet — vẫn có thể lưu LIMIT theo REG này.':'Chọn A/C REG trước để mở phần loại LIMIT.');
  h.classList.toggle('warn',!!reg&&!info);
  const types=$('aclSTypes');if(types)types.classList.toggle('disabled',!normReg(reg));
}
async function loadCatalog(force=false){
  if(!force&&catalog.version)return catalog;
  let loaded=null;
  try{if(typeof sagsV470Ref==='function'){const s=await sagsV470Ref(PUBLIC_PATH).once('value');const d=s?.val?.();if(d?.version)loaded=d}}catch(_){}
  if(!loaded){try{const s=await db().collection(collectionName()).doc(DOC).get();if(s.exists)loaded=s.data()||{}}catch(e){if(force)throw e}}
  if(loaded)catalog={version:Number(loaded.version||0),items:(loaded.items||[]).map(normalizeItem),dailyDate:String(loaded.dailyDate||''),dailyVersion:String(loaded.dailyVersion||'')};
  return catalog;
}
async function writeCatalog(items,action='SIMPLE_UPDATE'){
  if(!isAdmin())throw new Error('Tài khoản chưa được AD cấp quyền A/C LIMITS.');
  const now=Date.now(),old=clone(catalog),next={kind:KIND,version:now,dailyDate:catalog.dailyDate||'',dailyVersion:catalog.dailyVersion||'',items:(items||[]).map(normalizeItem),updatedAtMs:now,updatedBy:actor()};
  const dbase=db(),col=collectionName();
  await dbase.collection(col).doc(DOC).set(next,{merge:false});
  try{await dbase.collection(col).doc(HISTORY_PREFIX+now).set({kind:'sags_ac_limits_history_v1',action,oldVersion:Number(old?.version||0),newVersion:now,oldCount:Array.isArray(old?.items)?old.items.length:0,newCount:next.items.length,dailyDate:next.dailyDate,dailyVersion:next.dailyVersion,createdAtMs:now,createdBy:actor()},{merge:false})}catch(_){}
  catalog={...next,items:next.items.map(normalizeItem)};
  try{if(typeof sagsV470Ref==='function'){await sagsV470Ref(PUBLIC_PATH).set(next);await sagsV470Ref(SIGNAL_PATH).set({version:now,action,updatedAtMs:now,updatedBy:actor()})}}catch(e){console.info('A/C LIMITS simple RTDB publish',e?.message||e)}
  try{await window.aclLoadCatalog?.(true);window.aclEvaluate?.()}catch(_){}
  return catalog;
}
function selectedRoles(){return [...document.querySelectorAll('#aclSimpleModal input[data-acls-role]:checked')].map(x=>x.dataset.aclsRole).filter(Boolean)}
function selectedEquipment(){return ['GPU','ACU','ASU'].filter(x=>$('aclSEq'+x)?.checked)}
function checked(id){return !!$(id)?.checked}
function setChecked(id,on){const e=$(id);if(e)e.checked=!!on}
function toggleSections(){
  const enabled=!!normReg($('aclSReg')?.value);
  ['aclSApuBox','aclSHoldBox','aclSOtherBox'].forEach(id=>{const e=$(id);if(e)e.style.opacity=enabled?'1':'.48'});
  const apu=$('aclSApuDetail'),hold=$('aclSHoldDetail'),other=$('aclSOtherDetail');
  if(apu)apu.style.display=enabled&&checked('aclSApu')?'block':'none';
  if(hold)hold.style.display=enabled&&checked('aclSHold')?'block':'none';
  if(other)other.style.display=enabled&&checked('aclSOther')?'block':'none';
}
function status(text,err=false){const e=$('aclSStatus');if(!e)return;e.textContent=text||'';e.classList.toggle('err',!!err);e.classList.toggle('ok',!!text&&!err)}
function clearForm(keepReg=false){
  editingId='';
  if(!keepReg&&$('aclSReg'))$('aclSReg').value='';
  ['aclSApu','aclSEqGPU','aclSEqACU','aclSEqASU','aclSHold','aclSOther'].forEach(id=>setChecked(id,false));
  if($('aclSHoldText'))$('aclSHoldText').value='';if($('aclSOtherText'))$('aclSOtherText').value='';
  if($('aclSFrom'))$('aclSFrom').value=todayISO();if($('aclSTo'))$('aclSTo').value=todayISO();
  document.querySelectorAll('#aclSimpleModal input[data-acls-role]').forEach(x=>x.checked=DEFAULT_ROLES.includes(x.dataset.aclsRole));
  const b=$('aclSSave');if(b)b.textContent='LƯU LIMIT';
  toggleSections();updateFleetHint();
}
function buildGeneratedItems(){
  const rawReg=displayReg($('aclSReg')?.value),reg=normReg(rawReg),from=$('aclSFrom')?.value||todayISO(),to=$('aclSTo')?.value||from,roles=selectedRoles();
  if(!reg)throw new Error('Chọn A/C REG trước.');if(!roles.length)throw new Error('Chọn ít nhất 1 đối tượng nhận cảnh báo.');
  const base={source:'MANUAL',active:true,airline:String(fleetInfo(rawReg)?.airline||''),flightNo:'',acReg:reg,displayReg:rawReg,matchMode:'REG',effectiveFrom:from,effectiveTo:to,recipientRoles:roles,updatedAtMs:Date.now(),updatedBy:actor()};
  const out=[];
  if(checked('aclSApu')){const eq=selectedEquipment(),text=eq.length?`APU INOP · NEED ${eq.join(' / ')}`:'APU INOP';out.push(normalizeItem({...base,category:'APU INOP',restriction:text}))}
  if(checked('aclSHold')){const text=String($('aclSHoldText')?.value||'').trim();if(!text)throw new Error('HOLD INOP đã tích — cần dán nội dung HOLD từ file LIMIT.');out.push(normalizeItem({...base,category:'HOLD INOP/ISSUES',restriction:text}))}
  if(checked('aclSOther')){const text=String($('aclSOtherText')?.value||'').trim();if(!text)throw new Error('OTHER đã tích — cần dán nội dung từ file LIMIT.');out.push(normalizeItem({...base,category:'OTHERS',restriction:text}))}
  if(!out.length)throw new Error('Tích ít nhất một loại LIMIT: APU INOP / HOLD INOP / OTHER.');
  return out;
}
async function save(){
  try{
    status('Đang lưu...');await loadCatalog(true);const made=buildGeneratedItems(),reg=made[0].acReg,now=Date.now();let arr=(catalog.items||[]).slice();
    if(editingId){arr=arr.filter(x=>x.id!==editingId)}
    for(let i=0;i<made.length;i++){
      const n=made[i],same=arr.find(x=>normReg(x.acReg)===reg&&String(x.category).toUpperCase()===String(n.category).toUpperCase());
      const old=(i===0&&editingId)?(catalog.items||[]).find(x=>x.id===editingId):same;
      if(same)arr=arr.filter(x=>x.id!==same.id);
      n.id=old?.id||uid();n.createdAtMs=Number(old?.createdAtMs||now);n.createdBy=old?.createdBy||actor();n.updatedAtMs=now;n.updatedBy=actor();n.active=true;
      arr.push(normalizeItem(n));
    }
    await writeCatalog(arr,editingId?'SIMPLE_EDIT':'SIMPLE_UPSERT');lastReg=made[0].displayReg||made[0].acReg;status(`✓ Đã lưu ${made.length} LIMIT cho ${lastReg}.`);clearForm(true);renderList();
  }catch(e){status(String(e?.message||e),true)}
}
async function toggleItem(id,on){try{await loadCatalog(true);const arr=(catalog.items||[]).map(x=>x.id===id?normalizeItem({...x,active:!!on,updatedAtMs:Date.now(),updatedBy:actor()}):x);await writeCatalog(arr,on?'SIMPLE_REACTIVATE':'SIMPLE_DEACTIVATE');renderList()}catch(e){status(String(e?.message||e),true)}}
async function deleteItem(id){if(!confirm('Xóa LIMIT này?'))return;try{await loadCatalog(true);await writeCatalog((catalog.items||[]).filter(x=>x.id!==id),'SIMPLE_DELETE');renderList()}catch(e){status(String(e?.message||e),true)}}
function editItem(id){
  const x=(catalog.items||[]).find(v=>v.id===id);if(!x)return;editingId=id;
  $('aclSReg').value=x.displayReg||x.acReg||'';$('aclSFrom').value=x.effectiveFrom||todayISO();$('aclSTo').value=x.effectiveTo||x.effectiveFrom||todayISO();
  ['aclSApu','aclSEqGPU','aclSEqACU','aclSEqASU','aclSHold','aclSOther'].forEach(k=>setChecked(k,false));$('aclSHoldText').value='';$('aclSOtherText').value='';
  const cat=String(x.category||'').toUpperCase();
  if(cat==='APU INOP'){setChecked('aclSApu',true);const t=String(x.restriction||'').toUpperCase();['GPU','ACU','ASU'].forEach(eq=>setChecked('aclSEq'+eq,t.includes(eq)))}
  else if(cat==='HOLD INOP/ISSUES'){setChecked('aclSHold',true);$('aclSHoldText').value=x.restriction||''}
  else {setChecked('aclSOther',true);$('aclSOtherText').value=x.restriction||''}
  document.querySelectorAll('#aclSimpleModal input[data-acls-role]').forEach(c=>c.checked=(x.recipientRoles||[]).includes(c.dataset.aclsRole));
  $('aclSSave').textContent='LƯU THAY ĐỔI';updateFleetHint();toggleSections();status(`Đang sửa ${friendlyCategory(x.category)} · ${x.displayReg||x.acReg}.`);$('aclSimplePanel')?.scrollTo({top:0,behavior:'smooth'});
}
function itemDay(x){const d=String(x?.effectiveFrom||x?.batchDate||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(d))return d;const ms=Number(x?.createdAtMs||x?.updatedAtMs||0);if(ms){const z=new Date(ms);if(!Number.isNaN(z.getTime()))return `${z.getFullYear()}-${String(z.getMonth()+1).padStart(2,'0')}-${String(z.getDate()).padStart(2,'0')}`}return 'KHONG_NGAY'}
function dayLabel(day){if(day==='KHONG_NGAY')return 'KHÔNG XÁC ĐỊNH NGÀY';const a=String(day).split('-');return a.length===3?`${a[2]}/${a[1]}/${a[0]}`:day}
function itemHtml(x){const reg=x.displayReg||x.acReg||'',cat=friendlyCategory(x.category),roles=(x.recipientRoles||[]).join(', '),date=x.effectiveFrom===x.effectiveTo?(x.effectiveFrom||''):`${x.effectiveFrom||''} → ${x.effectiveTo||''}`;return `<div class="acls-item ${x.active?'':'off'}"><div class="acls-item-head"><label class="acls-select"><input type="checkbox" data-acls-select="${esc(x.id)}"> <span><b>${esc(reg||'—')}</b>${x.flightNo?` · <b>${esc(x.flightNo)}</b>`:''}</span></label><span class="acls-badge ${cat==='APU INOP'?'apu':cat==='HOLD INOP'?'hold':'other'}">${esc(cat)}</span><span class="acls-state">${x.active?'ĐANG BẬT':'ĐÃ TẮT'}</span></div><div class="acls-text">${esc(x.restriction||'')}</div><div class="acls-meta">${esc(date)} · Nhận: ${esc(roles)}</div><div class="acls-actions"><button onclick="aclSimpleEdit('${esc(x.id)}')">SỬA</button><button onclick="aclSimpleToggle('${esc(x.id)}',${x.active?'false':'true'})">${x.active?'TẮT':'BẬT'}</button><button class="danger" onclick="aclSimpleDelete('${esc(x.id)}')">XÓA</button></div></div>`}
function renderList(){const h=$('aclSList');if(!h)return;const q=String($('aclSFilter')?.value||'').trim().toUpperCase(),dateFilter=String($('aclSDateFilter')?.value||'').trim();const arr=(catalog.items||[]).slice().filter(x=>{const hay=[x.displayReg,x.acReg,x.flightNo,x.restriction,x.category].join(' ').toUpperCase();return (!q||hay.includes(q))&&(!dateFilter||itemDay(x)===dateFilter)}).sort((a,b)=>itemDay(b).localeCompare(itemDay(a))||Number(b.active)-Number(a.active)||Number(b.updatedAtMs)-Number(a.updatedAtMs));const groups=new Map();for(const x of arr){const d=itemDay(x);if(!groups.has(d))groups.set(d,[]);groups.get(d).push(x)}h.innerHTML=groups.size?[...groups.entries()].map(([day,items])=>`<section class="acls-day" data-day="${esc(day)}"><div class="acls-day-head"><label><input type="checkbox" onchange="aclSimpleSelectDay('${esc(day)}',this.checked)"> <b>${esc(dayLabel(day))}</b> <span>${items.length} LIMIT</span></label><button class="acls-day-delete danger" onclick="aclSimpleDeleteDay('${esc(day)}')">XÓA NGÀY</button></div><div class="acls-day-body">${items.map(itemHtml).join('')}</div></section>`).join(''):'<div class="acls-empty">Chưa có LIMIT phù hợp.</div>';const n=$('aclSVisibleCount');if(n)n.textContent=`${arr.length} LIMIT`}
async function deleteMany(ids,action,label){ids=[...new Set((ids||[]).map(String).filter(Boolean))];if(!ids.length)return;try{await loadCatalog(true);const set=new Set(ids),before=(catalog.items||[]).length;await writeCatalog((catalog.items||[]).filter(x=>!set.has(String(x.id))),action);const removed=before-(catalog.items||[]).length;renderList();status(`✓ Đã xóa ${removed} LIMIT${label?' · '+label:''}.`)}catch(e){status('Không xóa được LIMIT: '+String(e?.message||e),true)}}
async function deleteSelected(){const ids=[...document.querySelectorAll('#aclSList input[data-acls-select]:checked')].map(x=>x.dataset.aclsSelect);if(!ids.length)return alert('Chưa chọn LIMIT cần xóa.');if(!confirm(`Xóa ${ids.length} LIMIT đã chọn?\n\nCác cảnh báo đang chờ của những LIMIT này cũng sẽ được hủy.`))return;await deleteMany(ids,'SIMPLE_DELETE_SELECTED','đã chọn')}
async function deleteDay(day){const ids=(catalog.items||[]).filter(x=>itemDay(x)===day).map(x=>x.id);if(!ids.length)return;if(!confirm(`Xóa TOÀN BỘ ${ids.length} LIMIT ngày ${dayLabel(day)}?\n\nAudit/lịch sử sự kiện đã phát sinh không bị sửa.`))return;await deleteMany(ids,'SIMPLE_DELETE_DAY',dayLabel(day))}
function selectDay(day,on){document.querySelectorAll('#aclSList section.acls-day').forEach(sec=>{if(sec.dataset.day===day)sec.querySelectorAll('input[data-acls-select]').forEach(x=>x.checked=!!on)})}
function rolesHtml(){return ALL_ROLES.map(r=>`<label class="acls-role"><input type="checkbox" data-acls-role="${r}" ${DEFAULT_ROLES.includes(r)?'checked':''}> ${r}</label>`).join('')}
function ensureCss(){if($('aclSimpleStyle'))return;const s=document.createElement('style');s.id='aclSimpleStyle';s.textContent=`
#aclSimpleModal{position:fixed;inset:0;z-index:16050;display:none;background:rgba(4,14,25,.72);padding:max(8px,env(safe-area-inset-top)) 7px max(8px,env(safe-area-inset-bottom));box-sizing:border-box;align-items:flex-start;justify-content:center;overflow:auto}.acls-panel{width:min(98vw,780px);max-height:96dvh;overflow:auto;background:#f7f9fb;border-radius:18px;padding:14px;box-sizing:border-box;color:#193047;font:14px/1.4 Arial;box-shadow:0 18px 54px rgba(0,0,0,.38)}.acls-top{position:sticky;top:-14px;z-index:5;background:#f7f9fb;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0 11px;border-bottom:1px solid #d6e0e8}.acls-top h3{margin:0;color:#003b8e;font:900 20px Arial}.acls-close{border:0;border-radius:10px;padding:10px 13px;background:#e5ebf0;font-weight:900}.acls-step{background:#fff;border:1px solid #d9e2ea;border-radius:14px;padding:12px;margin:10px 0}.acls-step-title{font:900 15px Arial;color:#17324d;margin-bottom:8px}.acls-num{display:inline-grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#003b8e;color:#fff;margin-right:6px}.acls-reg{width:100%;box-sizing:border-box;border:2px solid #7b93a8;border-radius:12px;padding:13px 14px;font:900 20px Arial;text-transform:uppercase;background:#fff}.acls-hint{margin-top:7px;font-weight:800;color:#426078}.acls-hint.warn{color:#9a5b00}.acls-types.disabled{pointer-events:none}.acls-type{display:block;border:2px solid #ced8e1;border-radius:13px;padding:11px;margin:8px 0;background:#fbfcfd}.acls-type:has(>label>input:checked){border-color:#0b67b2;background:#eef7ff}.acls-type>label{display:flex;align-items:center;gap:9px;font:900 17px Arial;cursor:pointer}.acls-type input[type=checkbox]{width:22px;height:22px;accent-color:#075ea8}.acls-detail{display:none;margin:10px 0 0 31px;padding-top:9px;border-top:1px dashed #cad5de}.acls-equipment{display:flex;gap:8px;flex-wrap:wrap}.acls-chip{display:flex;align-items:center;gap:6px;border:1px solid #bfcbd5;border-radius:999px;padding:8px 12px;background:#fff;font-weight:900}.acls-textarea{width:100%;min-height:76px;box-sizing:border-box;border:1px solid #9fb0bf;border-radius:10px;padding:10px;font:700 14px Arial;resize:vertical}.acls-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.acls-grid label{font-weight:900;font-size:11px;color:#54697a}.acls-date{width:100%;box-sizing:border-box;border:1px solid #aab9c5;border-radius:9px;padding:9px;font-weight:800}.acls-roles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}.acls-role{border:1px solid #d2dce5;border-radius:8px;padding:7px;background:#fff;font-weight:800}.acls-role input{accent-color:#075ea8}.acls-save-row{display:flex;gap:8px;flex-wrap:wrap;position:sticky;bottom:-14px;background:#f7f9fb;padding:10px 0 4px;z-index:4}.acls-save{flex:1;min-width:190px;border:0;border-radius:11px;padding:13px;background:#0a6d45;color:#fff;font:900 16px Arial}.acls-reset{border:1px solid #bdc9d3;border-radius:11px;padding:12px;background:#fff;font-weight:900}.acls-status{min-height:20px;font-weight:900;color:#0a6d45}.acls-status.err{color:#b42318}.acls-list-head{display:flex;gap:8px;align-items:center;justify-content:space-between}.acls-filter{width:min(210px,48%);border:1px solid #a9b8c4;border-radius:9px;padding:8px;font-weight:800;text-transform:uppercase}.acls-item{border:1px solid #d5dee6;border-radius:11px;padding:10px;margin:8px 0;background:#fff}.acls-item.off{opacity:.58}.acls-item-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.acls-item-head b{font-size:16px}.acls-badge{display:inline-block;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900}.acls-badge.apu{background:#fff0d7;color:#8c5700}.acls-badge.hold{background:#e9f2ff;color:#15528a}.acls-badge.other{background:#eceff3;color:#4b5662}.acls-state{font-size:10px;font-weight:900;color:#557}.acls-text{white-space:pre-wrap;font-weight:800;margin:7px 0}.acls-meta,.acls-legacy{font-size:11px;color:#657788}.acls-actions{display:flex;gap:6px;margin-top:8px}.acls-actions button{border:1px solid #bcc9d4;border-radius:8px;padding:7px 10px;background:#f4f7f9;font-weight:900}.acls-actions .danger{border-color:#e3b4b0;color:#a51f16}.acls-sub{margin-top:3px;font-size:11px;color:#657788;font-weight:800}.acls-filter-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.acls-filter-row .acls-filter{width:auto;min-width:180px;flex:1}.acls-bulk,.acls-day-delete{border:1px solid #e3b4b0;border-radius:8px;padding:8px 10px;background:#fff;color:#a51f16;font-weight:900}.acls-day{border:1px solid #cfdae4;border-radius:12px;background:#f8fafc;margin:9px 0;overflow:hidden}.acls-day-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;background:#eaf2f9;border-bottom:1px solid #d3dee8}.acls-day-head label{display:flex;align-items:center;gap:6px;font-weight:900;color:#173f60}.acls-day-head span{font-size:11px;color:#5c7184}.acls-day-body{padding:3px 8px 7px}.acls-select{display:flex;align-items:center;gap:7px;min-width:0;flex:1}.acls-select input{width:18px;height:18px;accent-color:#075ea8}.acls-empty{padding:14px;text-align:center;color:#617485;font-weight:800}.acls-help{font-size:12px;color:#506778;background:#eef4f8;border-radius:10px;padding:9px;margin-top:10px}.acls-help summary{font-weight:900;cursor:pointer}
@media(max-width:620px){.acls-grid{grid-template-columns:1fr}.acls-roles{grid-template-columns:repeat(2,minmax(0,1fr))}.acls-panel{padding:10px}.acls-top{top:-10px}.acls-detail{margin-left:0}.acls-item-head{align-items:flex-start;flex-wrap:wrap}.acls-list-head{align-items:stretch;flex-direction:column}.acls-filter{width:100%}.acls-filter-row{display:grid;grid-template-columns:1fr 1fr}.acls-filter-row .acls-filter{width:100%;min-width:0}.acls-bulk{grid-column:1/-1}.acls-day-head{align-items:flex-start}.acls-day-head label{flex-wrap:wrap}}
`;document.head.appendChild(s)}
function ensureUi(){
  ensureCss();if($('aclSimpleModal'))return;
  const d=document.createElement('div');d.id='aclSimpleModal';d.innerHTML=`<div id="aclSimplePanel" class="acls-panel"><div class="acls-top"><h3>A/C LIMITS</h3><button class="acls-close" onclick="aclSimpleClose()">ĐÓNG</button></div>
  <div id="aclSStatus" class="acls-status"></div>
  <div class="acls-step"><div class="acls-step-title"><span class="acls-num">1</span>CHỌN A/C REG</div><input id="aclSReg" class="acls-reg" list="aclSRegList" placeholder="VD: HL7269" autocomplete="off"><datalist id="aclSRegList"></datalist><div id="aclSFleetHint" class="acls-hint">Chọn A/C REG trước để mở phần loại LIMIT.</div></div>
  <div id="aclSTypes" class="acls-step acls-types disabled"><div class="acls-step-title"><span class="acls-num">2</span>TÍCH LOẠI LIMIT</div>
    <div id="aclSApuBox" class="acls-type"><label><input id="aclSApu" type="checkbox"> APU INOP</label><div id="aclSApuDetail" class="acls-detail"><div style="font-weight:900;margin-bottom:7px">Cần thiết bị nào?</div><div class="acls-equipment"><label class="acls-chip"><input id="aclSEqGPU" type="checkbox"> GPU</label><label class="acls-chip"><input id="aclSEqACU" type="checkbox"> ACU</label><label class="acls-chip"><input id="aclSEqASU" type="checkbox"> ASU</label></div></div></div>
    <div id="aclSHoldBox" class="acls-type"><label><input id="aclSHold" type="checkbox"> HOLD INOP</label><div id="aclSHoldDetail" class="acls-detail"><textarea id="aclSHoldText" class="acls-textarea" placeholder="Dán nguyên nội dung HOLD từ file LIMIT..."></textarea></div></div>
    <div id="aclSOtherBox" class="acls-type"><label><input id="aclSOther" type="checkbox"> OTHER</label><div id="aclSOtherDetail" class="acls-detail"><textarea id="aclSOtherText" class="acls-textarea" placeholder="Dán nguyên nội dung OTHER từ file LIMIT..."></textarea></div></div>
  </div>
  <div class="acls-step"><div class="acls-step-title"><span class="acls-num">3</span>ÁP DỤNG</div><div class="acls-grid"><label>TỪ NGÀY<input id="aclSFrom" class="acls-date" type="date"></label><label>ĐẾN NGÀY<input id="aclSTo" class="acls-date" type="date"></label></div><details class="acls-help"><summary>ĐỐI TƯỢNG NHẬN CẢNH BÁO</summary><div class="acls-roles">${rolesHtml()}</div></details></div>
  <div class="acls-save-row"><button id="aclSSave" class="acls-save" onclick="aclSimpleSave()">LƯU LIMIT</button><button class="acls-reset" onclick="aclSimpleClear()">XÓA Ô</button></div>
  <div class="acls-step"><div class="acls-list-head"><div><div class="acls-step-title" style="margin:0">QUẢN LÝ HỒ SƠ LIMIT</div><div class="acls-sub"><span id="aclSVisibleCount">0 LIMIT</span> · Gom theo ngày hiệu lực</div></div><div class="acls-filter-row"><input id="aclSFilter" class="acls-filter" placeholder="Tìm Flight / A/C Reg / nội dung"><input id="aclSDateFilter" class="acls-filter" type="date"><button class="acls-bulk danger" onclick="aclSimpleDeleteSelected()">XÓA ĐÃ CHỌN</button></div></div><div id="aclSList"></div></div>
  <details class="acls-help"><summary>HDSD A/C LIMITS</summary><ol><li>Chọn <b>A/C REG</b> rồi nhập tay, hoặc dán nhanh nội dung LIMIT vào biểu mẫu.</li><li>Hồ sơ LIMIT được <b>gom theo ngày hiệu lực</b>, có tìm Flight/A/C Reg/nội dung và lọc ngày.</li><li>Có thể XÓA từng LIMIT, <b>XÓA ĐÃ CHỌN</b> hoặc <b>XÓA NGÀY</b>. LIMIT đã xóa/tắt được hủy khỏi popup đang chờ.</li><li>Audit/lịch sử sự kiện đã phát sinh vẫn giữ nguyên.</li><li>LIMIT chung cảnh báo STA-10; nội dung có ASU dùng ETD-10, chưa có ETD thì STD-10.</li></ol></details>
  </div>`;document.body.appendChild(d);
  $('aclSFrom').value=todayISO();$('aclSTo').value=todayISO();
  $('aclSReg').addEventListener('input',()=>{updateFleetHint();toggleSections()});
  ['aclSApu','aclSHold','aclSOther'].forEach(id=>$(id).addEventListener('change',toggleSections));
  $('aclSFilter').addEventListener('input',renderList);$('aclSDateFilter').addEventListener('change',renderList);
}
async function open(){
  if(!isAdmin())return alert('Tài khoản chưa được AD cấp quyền A/C LIMITS.');ensureUi();
  try{const old=$('aclAdminModal');if(old)old.style.display='none'}catch(_){}
  $('aclSimpleModal').style.display='flex';status('Đang tải LIMIT...');
  try{await Promise.all([loadCatalog(true),refreshFleet()]);renderRegOptions();renderList();if(!editingId)clearForm(false);status('')}catch(e){status('Không tải được A/C LIMITS: '+String(e?.message||e),true)}
}
function close(){const m=$('aclSimpleModal');if(m)m.style.display='none'}
function patchButton(){const b=$('roleBtnAcLimits');if(!b)return;if(!b.dataset.aclSimple){b.dataset.aclSimple='1';b.onclick=e=>{e?.preventDefault?.();open();return false}}if(typeof window.v485Can==='function')b.style.display=window.v485Can('AC_LIMITS')?'inline-flex':'none'}
function init(){ensureUi();patchButton();refreshFleet();const mo=new MutationObserver(patchButton);mo.observe(document.documentElement,{childList:true,subtree:true});setInterval(patchButton,2500);window.aclOpenAdmin=open;window.aclCloseAdmin=close}

window.aclSimpleOpen=open;window.aclSimpleClose=close;window.aclSimpleSave=save;window.aclSimpleClear=()=>{clearForm(false);status('')};window.aclSimpleEdit=editItem;window.aclSimpleToggle=toggleItem;window.aclSimpleDelete=deleteItem;window.aclSimpleDeleteSelected=deleteSelected;window.aclSimpleDeleteDay=deleteDay;window.aclSimpleSelectDay=selectDay;window.ACLSimple={build:'V3.23',open,close,refresh:async()=>{await loadCatalog(true);renderList()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);
})();

/* ===== END ac-limits-simple.js ===== */

/* ===== BEGIN bbbt-quick-entry.js ===== */
/* E-REPORT SAGS · BBBT QUICK ENTRY
 * V1.85 · 2026-08-19
 * Adds a glove-friendly quick-entry layer for the existing F/SAGS-CXR/56 BBBT.
 * It does NOT create a new form and does NOT change PDF rendering.
 */
(function(){
  'use strict';

  const BUILD='V1.85-20260819-01';
  const BUTTON_ID='bbbtQuickEntryBtn';
  const MODAL_ID='bbbtQuickEntryModal';
  const STYLE_ID='bbbtQuickEntryStyle';
  const GUIDE_ID='bbbtQuickEntryGuide';

  const BOOL_KEYS=[
    'bbbtFoundSorting','bbbtFoundParking','bbbtFoundOther',
    'bbbtBaggage','bbbtCargo','bbbtMail','bbbtULD',
    'bbbtBrokenHandle','bbbtMissingWheel','bbbtDented','bbbtWet',
    'bbbtTorn','bbbtScratched','bbbtLeaking','bbbtDamageOther',
    'bbbtFoundOffload','bbbtFoundLoading','bbbtFoundUnidentified','bbbtFoundWhileOther',
    'bbbtReportRep','bbbtTakePicture','bbbtTape','bbbtHandover','bbbtHandlingOther'
  ];

  const TEXT_KEYS=[
    'bbbtReportAt','bbbtFoundOtherText',
    'bbbtPerson1','bbbtDuty1','bbbtPerson2','bbbtDuty2','bbbtPerson3','bbbtDuty3',
    'bbbtDamageOtherText','bbbtDetail','bbbtFoundWhileOtherText',
    'bbbtHandlingOtherText','bbbtComment'
  ];

  let draft={};
  let morePeople=false;

  function appState(){
    try{return (typeof state!=='undefined' && state) ? state : null;}catch(_){return null;}
  }

  function roleCode(){
    try{return String(typeof currentRole!=='undefined' ? currentRole : '').trim().toUpperCase();}catch(_){return '';}
  }

  function canUse(){
    const role=roleCode();
    if(!role || role==='VIEWER') return false;
    try{
      if(typeof v485Can==='function') return !!v485Can('BBBT');
    }catch(_){ }
    return true;
  }

  function h(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function normalizeTime(v){
    const raw=String(v||'').trim().replace(/\s/g,'');
    if(!raw) return '';
    let hh='',mm='';
    if(/^\d{4}$/.test(raw)){hh=raw.slice(0,2);mm=raw.slice(2);}
    else if(/^\d{1,2}:\d{2}$/.test(raw)){const p=raw.split(':');hh=p[0].padStart(2,'0');mm=p[1];}
    else return null;
    const H=Number(hh),M=Number(mm);
    if(H<0||H>23||M<0||M>59) return null;
    return hh+':'+mm;
  }

  function nowTime(){
    const d=new Date();
    return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

  function cloneDraft(){
    const s=appState();
    if(!s) return false;
    draft={};
    for(const k of BOOL_KEYS) draft[k]=!!s[k];
    for(const k of TEXT_KEYS) draft[k]=String(s[k]??'');
    morePeople=!!(draft.bbbtPerson2||draft.bbbtDuty2||draft.bbbtPerson3||draft.bbbtDuty3);
    return true;
  }

  function setDraft(key,value){draft[key]=value;}

  function metaHtml(){
    const s=appState()||{};
    const cells=[
      ['FLIGHT',s.bbbtFlight],['REG',s.bbbtRegn],['TYPE',s.bbbtAcType],
      ['DATE',s.bbbtDateText],['ROUTE',s.bbbtRoute]
    ];
    return `<div class="bq-meta">${cells.map(([l,v])=>`<div><small>${h(l)}</small><strong>${h(v||'—')}</strong></div>`).join('')}</div>`;
  }

  function toggleGroup(title,items,cls=''){
    return `<section class="bq-section ${cls}"><h3>${h(title)}</h3><div class="bq-chip-grid">${items.map(it=>`<button type="button" class="bq-chip ${draft[it[0]]?'on':''}" data-bq-toggle="${h(it[0])}" aria-pressed="${draft[it[0]]?'true':'false'}">${h(it[1])}</button>`).join('')}</div></section>`;
  }

  function textField(key,label,placeholder='',opts={}){
    const tag=opts.multiline?'textarea':'input';
    const value=h(draft[key]||'');
    return `<label class="bq-field ${opts.className||''}"><span>${h(label)}</span>${tag==='textarea'
      ? `<textarea data-bq-input="${h(key)}" rows="${opts.rows||3}" placeholder="${h(placeholder)}">${value}</textarea>`
      : `<input data-bq-input="${h(key)}" value="${value}" placeholder="${h(placeholder)}" ${opts.inputmode?`inputmode="${h(opts.inputmode)}"`:''}>`}</label>`;
  }

  function render(){
    const modal=document.getElementById(MODAL_ID);
    if(!modal) return;
    const body=modal.querySelector('.bq-body');
    if(!body) return;

    body.innerHTML=`
      ${metaHtml()}
      <section class="bq-section bq-time-section">
        <h3>GIỜ LẬP BBBT</h3>
        <div class="bq-time-row">
          <input id="bqReportAt" inputmode="numeric" maxlength="5" value="${h(draft.bbbtReportAt||'')}" placeholder="HHMM">
          <button type="button" class="bq-now" data-bq-now>🕐 BÂY GIỜ</button>
        </div>
      </section>

      ${toggleGroup('1 · PHÁT HIỆN TẠI',[
        ['bbbtFoundSorting','SORTING AREA'],['bbbtFoundParking','PARKING BAY'],['bbbtFoundOther','OTHER']
      ])}
      <div class="bq-conditional ${draft.bbbtFoundOther?'show':''}" data-bq-cond="bbbtFoundOther">
        ${textField('bbbtFoundOtherText','Vị trí khác','Nhập vị trí…')}
      </div>

      <section class="bq-section">
        <h3>2 · NGƯỜI LẬP / DUTY</h3>
        <div class="bq-two">${textField('bbbtPerson1','Person 1','Họ tên')}${textField('bbbtDuty1','Duty 1','Nhiệm vụ')}</div>
        <button type="button" class="bq-secondary-wide" data-bq-more>${morePeople?'THU GỌN':'＋ THÊM NGƯỜI'}</button>
        <div class="bq-more ${morePeople?'show':''}">
          <div class="bq-two">${textField('bbbtPerson2','Person 2','Họ tên')}${textField('bbbtDuty2','Duty 2','Nhiệm vụ')}</div>
          <div class="bq-two">${textField('bbbtPerson3','Person 3','Họ tên')}${textField('bbbtDuty3','Duty 3','Nhiệm vụ')}</div>
        </div>
      </section>

      ${toggleGroup('3 · ĐỐI TƯỢNG',[
        ['bbbtBaggage','BAGGAGE'],['bbbtCargo','CARGO'],['bbbtMail','MAIL'],['bbbtULD','ULD']
      ])}

      ${toggleGroup('4 · DẠNG HƯ HỎNG',[
        ['bbbtBrokenHandle','BROKEN HANDLE / ZIPPER'],['bbbtMissingWheel','MISSING WHEEL'],
        ['bbbtDented','DENTED'],['bbbtWet','WET'],['bbbtTorn','TORN'],['bbbtScratched','SCRATCHED'],
        ['bbbtLeaking','LEAKING'],['bbbtDamageOther','OTHER']
      ],'bq-damage')}
      <div class="bq-conditional ${draft.bbbtDamageOther?'show':''}" data-bq-cond="bbbtDamageOther">
        ${textField('bbbtDamageOtherText','Hư hỏng khác','Mô tả ngắn…',{multiline:true,rows:2})}
      </div>

      <section class="bq-section">
        <h3>5 · CHI TIẾT BẤT THƯỜNG</h3>
        ${textField('bbbtDetail','Detail of irregularity','Mô tả tình trạng thực tế…',{multiline:true,rows:4})}
      </section>

      ${toggleGroup('6 · PHÁT HIỆN TRONG LÚC',[
        ['bbbtFoundOffload','OFF-LOADING'],['bbbtFoundLoading','LOADING'],
        ['bbbtFoundUnidentified','UNIDENTIFIED'],['bbbtFoundWhileOther','OTHER']
      ])}
      <div class="bq-conditional ${draft.bbbtFoundWhileOther?'show':''}" data-bq-cond="bbbtFoundWhileOther">
        ${textField('bbbtFoundWhileOtherText','Trường hợp khác','Nhập nội dung…')}
      </div>

      ${toggleGroup('7 · XỬ LÝ BAN ĐẦU',[
        ['bbbtReportRep','REPORT AIRLINES REP'],['bbbtTakePicture','TAKE PICTURE & SEND REP'],
        ['bbbtTape','CELLOPHANE TAPE'],['bbbtHandover','HAND-OVER LnF / CARGO'],['bbbtHandlingOther','OTHER']
      ],'bq-handling')}
      <div class="bq-conditional ${draft.bbbtHandlingOther?'show':''}" data-bq-cond="bbbtHandlingOther">
        ${textField('bbbtHandlingOtherText','Xử lý khác','Nhập xử lý…')}
      </div>

      <section class="bq-section">
        <h3>8 · COMMENT</h3>
        ${textField('bbbtComment','Comment','Ghi chú nếu có…',{multiline:true,rows:3})}
      </section>

      <section class="bq-guide" id="${GUIDE_ID}">
        <strong>HDSD NHẬP NHANH BBBT</strong>
        <p>Chọn các nút lớn theo tình trạng thực tế → nhập phần chữ cần thiết → bấm <b>CẬP NHẬT BBBT</b> một lần. Dữ liệu được ghi vào đúng F/SAGS-CXR/56 hiện tại. Chữ ký vẫn thực hiện trực tiếp trên tờ BBBT.</p>
      </section>
    `;
  }

  function syncInputToDraft(el){
    const key=el?.dataset?.bqInput;
    if(key) draft[key]=el.value;
  }

  function refreshConditional(){
    document.querySelectorAll(`#${MODAL_ID} [data-bq-cond]`).forEach(el=>{
      el.classList.toggle('show',!!draft[el.dataset.bqCond]);
    });
  }

  function save(){
    const s=appState();
    if(!s){alert('Không đọc được dữ liệu BBBT hiện tại.');return;}
    document.querySelectorAll(`#${MODAL_ID} [data-bq-input]`).forEach(syncInputToDraft);
    const report=document.getElementById('bqReportAt');
    if(report) draft.bbbtReportAt=report.value;
    const nt=normalizeTime(draft.bbbtReportAt);
    if(draft.bbbtReportAt && nt===null){
      alert('Giờ lập BBBT không hợp lệ. Nhập 4 số HHMM, ví dụ 1524.');
      try{report?.focus();}catch(_){ }
      return;
    }
    draft.bbbtReportAt=nt||'';

    for(const k of BOOL_KEYS) s[k]=!!draft[k];
    for(const k of TEXT_KEYS) s[k]=String(draft[k]??'').trim();

    try{if(typeof persist==='function') persist();}catch(e){console.warn('[BBBT QUICK] persist',e);}
    try{if(typeof draw==='function') draw();}catch(e){console.warn('[BBBT QUICK] draw',e);}
    close();
    toast('✓ Đã cập nhật BBBT');
  }

  function open(){
    if(!canUse()){
      try{if(typeof roleDenied==='function') return roleDenied('Tài khoản chưa được cấp quyền BBBT.');}catch(_){ }
      alert('Tài khoản chưa được cấp quyền BBBT.');return;
    }
    if(!cloneDraft()){alert('Chưa sẵn sàng dữ liệu BBBT.');return;}
    render();
    const modal=document.getElementById(MODAL_ID);
    if(modal){modal.classList.add('show');modal.setAttribute('aria-hidden','false');}
  }

  function close(){
    const modal=document.getElementById(MODAL_ID);
    if(modal){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');}
  }

  function toast(msg){
    let el=document.getElementById('bbbtQuickToast');
    if(!el){el=document.createElement('div');el.id='bbbtQuickToast';el.className='bq-toast';document.body.appendChild(el);}
    el.textContent=msg;el.classList.add('show');
    clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),1800);
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const st=document.createElement('style');st.id=STYLE_ID;
    st.textContent=`
#${BUTTON_ID}{background:#0b5cab!important;color:#fff!important;font-weight:900!important;white-space:nowrap!important}
#${MODAL_ID}{position:fixed;inset:0;z-index:26050;background:#0a1421;display:none;flex-direction:column;color:#eef5fb;font-family:Arial,sans-serif;overscroll-behavior:contain}
#${MODAL_ID}.show{display:flex}
#${MODAL_ID} .bq-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:max(10px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) 10px max(12px,env(safe-area-inset-left));background:#102336;border-bottom:1px solid #28445f}
#${MODAL_ID} .bq-head h2{font-size:20px;line-height:1.05;margin:0;font-weight:900;letter-spacing:.2px}
#${MODAL_ID} .bq-close{min-width:76px;min-height:50px;border:0;border-radius:10px;background:#334a5e;color:#fff;font:900 15px Arial;touch-action:manipulation}
#${MODAL_ID} .bq-body{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px max(12px,env(safe-area-inset-right)) 110px max(12px,env(safe-area-inset-left))}
#${MODAL_ID} .bq-meta{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin-bottom:10px}
#${MODAL_ID} .bq-meta>div{min-width:0;background:#162c40;padding:8px 6px;border-radius:8px;text-align:center}
#${MODAL_ID} .bq-meta small{display:block;color:#91a8bb;font-size:9px;font-weight:800;margin-bottom:3px}
#${MODAL_ID} .bq-meta strong{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${MODAL_ID} .bq-section{margin:0 0 13px;padding:0;border:0}
#${MODAL_ID} .bq-section h3{margin:0 0 7px;color:#c8dae8;font-size:13px;letter-spacing:.6px;font-weight:900}
#${MODAL_ID} .bq-chip-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
#${MODAL_ID} .bq-chip{min-height:60px;border:0;border-radius:10px;padding:8px 6px;background:#1d3449;color:#eef5fb;font:900 14px/1.15 Arial;touch-action:manipulation;box-shadow:inset 0 0 0 1px #36536e}
#${MODAL_ID} .bq-chip.on{background:#0d6d63;box-shadow:inset 0 0 0 2px #6fe0ce;color:#fff}
#${MODAL_ID} .bq-damage .bq-chip-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
#${MODAL_ID} .bq-field{display:block;margin:0 0 8px}
#${MODAL_ID} .bq-field>span{display:block;margin:0 0 4px;color:#a9bdcc;font-size:12px;font-weight:800}
#${MODAL_ID} input,#${MODAL_ID} textarea{width:100%;border:1px solid #39566e;border-radius:10px;background:#14283a;color:#fff;font:800 17px Arial;padding:12px;outline:none;box-sizing:border-box;-webkit-appearance:none}
#${MODAL_ID} input{min-height:54px}
#${MODAL_ID} textarea{min-height:82px;resize:vertical;line-height:1.3}
#${MODAL_ID} input:focus,#${MODAL_ID} textarea:focus{border-color:#61c5ff;box-shadow:0 0 0 2px rgba(97,197,255,.18)}
#${MODAL_ID} .bq-two{display:grid;grid-template-columns:1.2fr .8fr;gap:7px}
#${MODAL_ID} .bq-time-row{display:grid;grid-template-columns:1fr 1.25fr;gap:7px}
#${MODAL_ID} .bq-time-row input{text-align:center;font-size:24px;font-variant-numeric:tabular-nums}
#${MODAL_ID} .bq-now,#${MODAL_ID} .bq-secondary-wide{min-height:56px;border:0;border-radius:10px;background:#28506e;color:#fff;font:900 15px Arial;touch-action:manipulation}
#${MODAL_ID} .bq-secondary-wide{width:100%;margin:0 0 8px;background:#263d51}
#${MODAL_ID} .bq-more{display:none}.bq-more.show{display:block}
#${MODAL_ID} .bq-conditional{display:none;margin:-5px 0 12px;padding:8px 8px 0;background:#10263a;border-radius:10px}.bq-conditional.show{display:block}
#${MODAL_ID} .bq-guide{margin-top:16px;padding:12px;border-radius:10px;background:#10263a;color:#c7d9e7;font-size:13px;line-height:1.4}
#${MODAL_ID} .bq-guide strong{display:block;color:#fff;margin-bottom:5px}#${MODAL_ID} .bq-guide p{margin:0}
#${MODAL_ID} .bq-foot{position:fixed;left:0;right:0;bottom:0;z-index:1;padding:8px max(12px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));background:linear-gradient(to top,#0a1421 78%,rgba(10,20,33,.88));display:grid;grid-template-columns:.8fr 1.8fr;gap:8px}
#${MODAL_ID} .bq-foot button{min-height:60px;border:0;border-radius:11px;font:900 16px Arial;touch-action:manipulation}
#${MODAL_ID} .bq-cancel{background:#334a5e;color:#fff}#${MODAL_ID} .bq-save{background:#137333;color:#fff}
.bq-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translate(-50%,20px);z-index:27000;background:#137333;color:#fff;padding:11px 18px;border-radius:999px;font:900 14px Arial;opacity:0;pointer-events:none;transition:.18s}.bq-toast.show{opacity:1;transform:translate(-50%,0)}
@media(max-width:390px){#${MODAL_ID} .bq-meta{grid-template-columns:repeat(3,minmax(0,1fr))}#${MODAL_ID} .bq-chip{min-height:58px;font-size:13px}#${MODAL_ID} .bq-two{grid-template-columns:1fr}#${MODAL_ID} .bq-head h2{font-size:18px}}
@media(min-width:700px){#${MODAL_ID} .bq-body{width:min(760px,100%);margin:0 auto}#${MODAL_ID} .bq-chip-grid{grid-template-columns:repeat(3,minmax(0,1fr))}#${MODAL_ID} .bq-damage .bq-chip-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media print{#${MODAL_ID},#${BUTTON_ID},.bq-toast{display:none!important}}
`;
    document.head.appendChild(st);
  }

  function ensureModal(){
    if(document.getElementById(MODAL_ID)) return;
    const modal=document.createElement('div');
    modal.id=MODAL_ID;modal.setAttribute('aria-hidden','true');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
    modal.innerHTML=`<div class="bq-head"><h2>Nhập nhanh BBBT</h2><button type="button" class="bq-close" data-bq-close>ĐÓNG</button></div><div class="bq-body"></div><div class="bq-foot"><button type="button" class="bq-cancel" data-bq-close>ĐÓNG</button><button type="button" class="bq-save" data-bq-save>CẬP NHẬT BBBT</button></div>`;
    document.body.appendChild(modal);

    modal.addEventListener('click',ev=>{
      const btn=ev.target.closest('button');
      if(!btn) return;
      if(btn.hasAttribute('data-bq-close')){close();return;}
      if(btn.hasAttribute('data-bq-save')){save();return;}
      if(btn.hasAttribute('data-bq-now')){
        draft.bbbtReportAt=nowTime();
        const el=document.getElementById('bqReportAt');if(el)el.value=draft.bbbtReportAt;
        return;
      }
      if(btn.hasAttribute('data-bq-more')){morePeople=!morePeople;render();return;}
      const key=btn.dataset.bqToggle;
      if(key){
        draft[key]=!draft[key];
        btn.classList.toggle('on',!!draft[key]);
        btn.setAttribute('aria-pressed',draft[key]?'true':'false');
        refreshConditional();
      }
    });
    modal.addEventListener('input',ev=>{
      if(ev.target?.matches?.('[data-bq-input]')) syncInputToDraft(ev.target);
      if(ev.target?.id==='bqReportAt') draft.bbbtReportAt=ev.target.value;
    });
  }

  function buttonVisible(){return canUse();}

  function ensureButton(){
    const row=document.querySelector('.toolbar-row.main-actions');
    if(!row) return false;
    let btn=document.getElementById(BUTTON_ID);
    if(!btn){
      btn=document.createElement('button');btn.id=BUTTON_ID;btn.type='button';btn.textContent='Nhập nhanh BBBT';btn.addEventListener('click',open);
      const manual=document.getElementById('roleBtnManualBBBT');
      if(manual?.parentNode===row) manual.insertAdjacentElement('afterend',btn);
      else {
        const quick=document.getElementById('roleBtnQuickTime');
        if(quick?.parentNode===row) quick.insertAdjacentElement('afterend',btn); else row.appendChild(btn);
      }
    }
    btn.style.display=buttonVisible()?'':'none';
    return true;
  }


  function injectUserGuide(){
    const host=document.getElementById('roleGuideContent');
    if(!host || host.querySelector('[data-bbbt-quick-guide]')) return;
    const guide=document.createElement('div');guide.setAttribute('data-bbbt-quick-guide','1');
    guide.style.cssText='margin-top:14px;padding:12px;border:1px solid #ccd8e3;border-radius:10px;background:#f7fbff;color:#123;line-height:1.45';
    guide.innerHTML='<b>NHẬP NHANH BBBT</b><br>Trong thanh chức năng chọn <b>Nhập nhanh BBBT</b> → bấm các nút lớn theo tình trạng thực tế → nhập phần mô tả cần thiết → bấm <b>CẬP NHẬT BBBT</b>. Dữ liệu được điền vào đúng F/SAGS-CXR/56 đang sử dụng. Chữ ký thực hiện trên tờ BBBT.';
    host.appendChild(guide);
  }

  function hookRoleUi(){
    try{
      const base=window.applyRoleUI;
      if(typeof base!=='function' || base.__bbbtQuickWrapped) return;
      const wrapped=function(){
        const out=base.apply(this,arguments);
        setTimeout(()=>{try{ensureButton();}catch(_){ }},0);
        return out;
      };
      wrapped.__bbbtQuickWrapped=true;
      window.applyRoleUI=wrapped;
    }catch(_){ }
  }

  function init(){
    ensureStyle();ensureModal();ensureButton();injectUserGuide();hookRoleUi();
    const obs=new MutationObserver(()=>{ensureButton();injectUserGuide();hookRoleUi();});
    obs.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>{ensureButton();hookRoleUi();},800);
    setTimeout(()=>{ensureButton();hookRoleUi();},2500);
    window.BBBTQuickEntry={build:BUILD,open,close,refresh:()=>{ensureButton();injectUserGuide();}};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();

/* ===== END bbbt-quick-entry.js ===== */
}
if(phase==='flight'){

/* ===== BEGIN daily-roster.js ===== */
/* E-REPORT SAGS · DAILY ROSTER ROLE MAP + PVHK FSAGS09 + DIRECT REASSIGN · V2.4 UI */
(function(root){
  "use strict";

  const BUILD="V1.82-20260821-01";
  const ENGINE="DAILY_ROSTER_V1";
  const MAIL_PATH="roster_mail";
  const MANIFEST_PATH="roster_manifests";
  const SESSION_PATH="roster_sessions";
  const REVOKE_PATH="roster_revocations";
  const FLIGHT_PATH="flight_records";
  const FIXED_ROLE_COLUMNS=["Grnd_Cor","Grnd_Ld","Grnd_Ls","Pax_Supr"];

  const S=v=>String(v??"").trim();
  const upper=v=>S(v).toUpperCase();
  const normUser=v=>{
    try{ if(typeof normalizePersonalUsername==="function") return normalizePersonalUsername(v); }catch(e){}
    return upper(v).replace(/\s+/g,"").replace(/[^A-Z0-9._-]/g,"_").slice(0,40);
  };
  const safeKey=v=>{
    try{ if(typeof sagsV470Safe==="function") return sagsV470Safe(v); }catch(e){}
    return S(v).replace(/[.#$\[\]\/]/g,"_");
  };
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function xmlUnescape(s){
    return S(s)
      .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16)))
      .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(Number(d)))
      .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");
  }
  function attrsOf(s){
    const o={};
    String(s||"").replace(/([:\w-]+)="([^"]*)"/g,(_,k,v)=>{o[k]=xmlUnescape(v);return "";});
    return o;
  }
  function colIndex(ref){
    const m=/^([A-Z]+)\d+$/i.exec(S(ref));
    if(!m)return -1;
    let n=0; for(const ch of m[1].toUpperCase()) n=n*26+(ch.charCodeAt(0)-64);
    return n-1;
  }
  function textFromSi(body){
    let out="";
    String(body||"").replace(/<t\b[^>]*>([\s\S]*?)<\/t>/gi,(_,x)=>{out+=xmlUnescape(x);return "";});
    return out;
  }
  async function inflateRaw(u8){
    if(typeof DecompressionStream!=="function") throw new Error("Trình duyệt chưa hỗ trợ giải nén XLSX. Hãy dùng Safari/Chrome mới hoặc lưu roster thành CSV.");
    const ds=new DecompressionStream("deflate-raw");
    const ab=await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(ab);
  }
  async function unzipEntries(bytes){
    const u8=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
    let eocd=-1;
    const from=Math.max(0,u8.length-65557);
    for(let i=u8.length-22;i>=from;i--){ if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;} }
    if(eocd<0)throw new Error("File XLSX không hợp lệ: không tìm thấy ZIP directory.");
    const count=dv.getUint16(eocd+10,true),cdOffset=dv.getUint32(eocd+16,true);
    const decoder=new TextDecoder("utf-8");
    const entries={}; let p=cdOffset;
    for(let n=0;n<count;n++){
      if(dv.getUint32(p,true)!==0x02014b50)throw new Error("File XLSX lỗi central directory.");
      const method=dv.getUint16(p+10,true),compSize=dv.getUint32(p+20,true),nameLen=dv.getUint16(p+28,true),extraLen=dv.getUint16(p+30,true),commentLen=dv.getUint16(p+32,true),localOff=dv.getUint32(p+42,true);
      const name=decoder.decode(u8.subarray(p+46,p+46+nameLen));
      entries[name]={method,compSize,localOff};
      p+=46+nameLen+extraLen+commentLen;
    }
    async function read(name){
      const e=entries[name]; if(!e)return null;
      const q=e.localOff;
      if(dv.getUint32(q,true)!==0x04034b50)throw new Error("File XLSX lỗi local header: "+name);
      const nameLen=dv.getUint16(q+26,true),extraLen=dv.getUint16(q+28,true),start=q+30+nameLen+extraLen;
      const src=u8.subarray(start,start+e.compSize);
      if(e.method===0)return src.slice();
      if(e.method===8)return await inflateRaw(src);
      throw new Error("XLSX dùng kiểu nén chưa hỗ trợ: "+e.method);
    }
    return {entries,read};
  }
  async function parseXlsxBytes(bytes){
    const zip=await unzipEntries(bytes);
    const dec=new TextDecoder("utf-8");
    const readText=async name=>{const b=await zip.read(name);return b?dec.decode(b):"";};
    const workbook=await readText("xl/workbook.xml");
    const rels=await readText("xl/_rels/workbook.xml.rels");
    if(!workbook||!rels)throw new Error("Không đọc được cấu trúc workbook.");

    const sheets=[];
    workbook.replace(/<sheet\b([^>]*)\/?\s*>/gi,(_,a)=>{const x=attrsOf(a);if(x.name&&x["r:id"])sheets.push({name:x.name,rid:x["r:id"]});return "";});
    const wanted=sheets.find(x=>upper(x.name)==="DAILY_ROSTER")||sheets[0];
    if(!wanted)throw new Error("Workbook không có sheet dữ liệu.");

    const relMap={};
    rels.replace(/<Relationship\b([^>]*)\/?\s*>/gi,(_,a)=>{const x=attrsOf(a);if(x.Id&&x.Target)relMap[x.Id]=x.Target;return "";});
    let target=relMap[wanted.rid];
    if(!target)throw new Error("Không xác định được sheet DAILY_ROSTER.");
    target=target.replace(/^\//,"");
    if(!target.startsWith("xl/"))target="xl/"+target.replace(/^\.\//,"");

    const sharedXml=await readText("xl/sharedStrings.xml");
    const shared=[];
    if(sharedXml)sharedXml.replace(/<si\b[^>]*>([\s\S]*?)<\/si>/gi,(_,b)=>{shared.push(textFromSi(b));return "";});
    const sheetXml=await readText(target);
    if(!sheetXml)throw new Error("Không đọc được sheet DAILY_ROSTER.");

    const rows=[];
    sheetXml.replace(/<row\b([^>]*)>([\s\S]*?)<\/row>/gi,(_,ra,body)=>{
      const rattrs=attrsOf(ra),rnum=Number(rattrs.r||rows.length+1),arr=[];
      body.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi,(__,ca,cb)=>{
        const a=attrsOf(ca),idx=colIndex(a.r); if(idx<0)return "";
        const inside=cb||"",vm=/<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(inside),raw=vm?xmlUnescape(vm[1]):"";
        let v="";
        if(a.t==="s")v=shared[Number(raw)]??"";
        else if(a.t==="inlineStr")v=textFromSi(inside);
        else if(a.t==="e")v="";
        else if(a.t==="b")v=raw==="1"?"TRUE":"FALSE";
        else v=raw;
        arr[idx]=v; return "";
      });
      rows[rnum-1]=arr; return "";
    });
    return {sheetName:wanted.name,rows};
  }
  function parseCsvText(text){
    const rows=[]; let row=[],cell="",q=false;
    const s=String(text||"");
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(q){ if(c==='"'&&s[i+1]==='"'){cell+='"';i++;} else if(c==='"')q=false; else cell+=c; }
      else if(c==='"')q=true; else if(c===','){row.push(cell);cell="";} else if(c==='\n'){row.push(cell.replace(/\r$/, ""));rows.push(row);row=[];cell="";} else cell+=c;
    }
    row.push(cell.replace(/\r$/, "")); if(row.some(x=>S(x)))rows.push(row);
    return {sheetName:"CSV",rows};
  }
  async function parseRosterFile(file){
    const name=upper(file?.name||"");
    if(name.endsWith(".CSV"))return parseCsvText(await file.text());
    const buf=await file.arrayBuffer();
    return await parseXlsxBytes(new Uint8Array(buf));
  }

  function headerRowInfo(rows){
    for(let i=0;i<Math.min(rows.length,80);i++){
      const r=rows[i]||[];
      const map={};r.forEach((v,j)=>{const k=S(v);if(k)map[k]=j;});
      if(map.FlightNo!==undefined && (map.STA!==undefined||map.STD!==undefined))return {row:i,map};
    }
    throw new Error("Không tìm thấy hàng tiêu đề có FlightNo / STA / STD.");
  }
  function parseDate(v){
    const s=S(v);if(!s||/^\d+(?:\.\d+)?$/.test(s))return null;
    let m=/^(\d{1,2})[-\/]([A-Za-z]{3}|\d{1,2})[-\/,\s](\d{2,4})$/.exec(s);
    if(m){
      const mons={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
      const d=Number(m[1]),mo=mons[upper(m[2])]||Number(m[2]),y=Number(m[3])+(Number(m[3])<100?2000:0);
      if(d&&mo>=1&&mo<=12)return {iso:`${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`,display:`${String(d).padStart(2,"0")}/${String(mo).padStart(2,"0")}/${y}`};
    }
    const d=new Date(s);
    if(Number.isFinite(d.getTime()))return {iso:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,display:`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`};
    return null;
  }
  function addIsoDays(iso,n){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(iso));if(!m)return S(iso);
    const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])+Number(n||0)));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
  }
  function isoDayDiff(base,target){
    const a=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(base)),b=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(target));if(!a||!b)return 0;
    return Math.round((Date.UTC(Number(b[1]),Number(b[2])-1,Number(b[3]))-Date.UTC(Number(a[1]),Number(a[2])-1,Number(a[3])))/86400000);
  }
  function parseRosterTime(v){
    let raw=S(v);if(!raw)return {clock:"",display:"",nextDay:false,dayOffset:0,raw:""};
    raw=raw.replace(/\.0+$/,'').trim();
    const nextDay=/\+\s*$/.test(raw);
    let s=raw.replace(/\+\s*$/,'').trim(),clock="";
    if(/^\d{1,4}$/.test(s)){s=s.padStart(4,"0");const h=Number(s.slice(0,2)),m=Number(s.slice(2));if(h<24&&m<60)clock=`${s.slice(0,2)}:${s.slice(2)}`;}
    if(!clock){const m=/^(\d{1,2}):(\d{2})/.exec(s);if(m&&Number(m[1])<24&&Number(m[2])<60)clock=`${String(Number(m[1])).padStart(2,"0")}:${m[2]}`;}
    return {clock,display:clock?(clock+(nextDay?"+":"")):"",nextDay:!!nextDay,dayOffset:nextDay?1:0,raw};
  }
  function fmtTime(v){return parseRosterTime(v).display;}
  function resolveEventDate(opIso,explicitIso,timeInfo){
    const base=S(opIso),exp=S(explicitIso);let out=exp||base;
    if(timeInfo?.dayOffset>0 && isoDayDiff(base,out)<timeInfo.dayOffset)out=addIsoDays(base,timeInfo.dayOffset);
    return out||base;
  }
  function sortMinuteFor(opIso,eventIso,clock){
    const m=/^(\d{2}):(\d{2})$/.exec(S(clock));if(!m)return 999999;
    return isoDayDiff(opIso,eventIso)*1440+Number(m[1])*60+Number(m[2]);
  }
  function safeSortMinute(value,opIso,eventIso,clock){
    const raw=S(value),n=raw===""?NaN:Number(raw);
    return Number.isFinite(n)?n:sortMinuteFor(opIso,eventIso,clock);
  }
  function safeFiniteNumber(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
  function splitFlights(raw){
    const parts=upper(raw).replace(/[\/]+/g," ").split(/\s+/).filter(Boolean);
    let prefix="";const out=[];
    for(const p0 of parts){
      const p=p0.replace(/[^A-Z0-9]/g,"");if(!p)continue;
      let m=/^([A-Z0-9]{2,3}?)(\d{1,5})$/.exec(p);
      if(m&&/[A-Z]/.test(m[1])){prefix=m[1];out.push(prefix+m[2]);continue;}
      m=/^(\d{1,5})$/.exec(p);if(m&&prefix){out.push(prefix+m[1]);continue;}
    }
    return [...new Set(out)];
  }
  function routeParts(route){
    const a=upper(route).split(/[-–—>/]+/).map(S).filter(Boolean),i=a.indexOf("CXR");
    if(i>=0)return {route1:a[i-1]||"",route3:a[i+1]||""};
    return {route1:a[0]||"",route3:a[1]||""};
  }
  function usersFromCell(v){
    return [...new Set(upper(v).split(/[\/,;|\n]+/).map(normUser).filter(x=>x&&/^[A-Z][A-Z0-9._-]{1,39}$/.test(x)&&!/^N\/?A$/.test(x)&&!/^\d+$/.test(x)))];
  }
  function formLabel(g){g=upper(g);return g==="FINAL"?"FINAL":g==="FSAGS421"?"42.1":(g==="FSAGS551"?"55.1":(g==="FSAGS09"?"FSAGS 09":"42.3"));}
  function hashId(s){
    let h=2166136261>>>0;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase();
  }
  function flightIdForRoster(rec){
    let fid="";
    try{if(typeof root.sagsFlightHubFlightId==="function")fid=S(root.sagsFlightHubFlightId(rec?.opDate,rec?.arrFlight,rec?.depFlight,rec?.flightRaw||rec?.flightName));}catch(_){ }
    if(fid)return fid;
    const normFlight=v=>upper(v).replace(/[^A-Z0-9]/g,"");
    const flights=[normFlight(rec?.arrFlight),normFlight(rec?.depFlight)].filter(Boolean);
    if(!flights.length)flights.push(...splitFlights(rec?.flightRaw||rec?.flightName).map(normFlight));
    const sig=`${S(rec?.opDate)}|${flights.join("|")||normFlight(rec?.flightRaw||rec?.flightName)||"UNKNOWN"}`;
    return `FLT_${hashId(sig)}`;
  }
  function getCell(row,map,key){const i=map[key];return i===undefined?"":S(row?.[i]);}
  function allFlightRows(parsed){
    const {row:hi,map}=headerRowInfo(parsed.rows||[]),out=[];
    let rosterDate=null;
    for(let i=0;i<Math.min(hi,15);i++){
      for(const x of (parsed.rows[i]||[])){
        const d=parseDate(x);if(d){rosterDate=d;break;}
      }
      if(rosterDate)break;
    }
    const seen=new Set();
    for(let i=hi+1;i<(parsed.rows||[]).length;i++){
      const row=parsed.rows[i]||[],flightRaw=getCell(row,map,"FlightNo");if(!flightRaw)continue;
      const arrDate=parseDate(getCell(row,map,"ArrFlightDate")),depDate=parseDate(getCell(row,map,"DepFlightDate"));
      const opDate=arrDate||depDate||rosterDate;if(!opDate)continue;
      const staInfo=parseRosterTime(getCell(row,map,"STA")),stdInfo=parseRosterTime(getCell(row,map,"STD")),etaInfo=parseRosterTime(getCell(row,map,"ETA")),etdInfo=parseRosterTime(getCell(row,map,"ETD"));
      const sta=staInfo.display,std=stdInfo.display,arrFlightDate=resolveEventDate(opDate.iso,arrDate?.iso,staInfo),depFlightDate=resolveEventDate(opDate.iso,depDate?.iso,stdInfo);
      const etaFlightDate=resolveEventDate(opDate.iso,arrDate?.iso||arrFlightDate,etaInfo),etdFlightDate=resolveEventDate(opDate.iso,depDate?.iso||depFlightDate,etdInfo);
      const flights=splitFlights(flightRaw);
      let arrFlight="",depFlight="";
      if(flights.length>=2){arrFlight=flights[0];depFlight=flights[1];}
      else if(flights.length===1){if(arrDate||sta)arrFlight=flights[0];else if(depDate||std)depFlight=flights[0];}
      if(!arrFlight&&!depFlight)continue;
      const rp=routeParts(getCell(row,map,"Route"));
      const rec={
        rowNo:i+1,opDate:opDate.iso,date:opDate.display,flightRaw:upper(flightRaw),
        flightName:[arrFlight,depFlight].filter(Boolean).join(" / ")||upper(flightRaw),
        arrFlight,depFlight,sta,std,eta:etaInfo.display,etd:etdInfo.display,
        arrFlightDate,depFlightDate,etaFlightDate,etdFlightDate,
        staClock:staInfo.clock,stdClock:stdInfo.clock,etaClock:etaInfo.clock,etdClock:etdInfo.clock,
        staDayOffset:isoDayDiff(opDate.iso,arrFlightDate),stdDayOffset:isoDayDiff(opDate.iso,depFlightDate),etaDayOffset:isoDayDiff(opDate.iso,etaFlightDate),etdDayOffset:isoDayDiff(opDate.iso,etdFlightDate),
        staSortMinute:sortMinuteFor(opDate.iso,arrFlightDate,staInfo.clock),stdSortMinute:sortMinuteFor(opDate.iso,depFlightDate,stdInfo.clock),etaSortMinute:sortMinuteFor(opDate.iso,etaFlightDate,etaInfo.clock),etdSortMinute:sortMinuteFor(opDate.iso,etdFlightDate,etdInfo.clock),
        acReg:upper(getCell(row,map,"ACRegNo")),acType:upper(getCell(row,map,"ACType")),
        route:upper(getCell(row,map,"Route")),route1:rp.route1,route3:rp.route3,
        bay:S(getCell(row,map,"ParkingBay")),gate:S(getCell(row,map,"Gate")),
        booking:S(getCell(row,map,"Booking"))
      };
      const key=rec.opDate+"|"+rec.flightName;
      if(seen.has(key))continue;
      seen.add(key);out.push(rec);
    }
    return {records:out,headerMap:map,headerRow:hi+1,rosterDate:rosterDate?.iso||""};
  }

  function pvhk09SeedFor(rec){
    const s={
      f09_date:rec.date,f09_fltBefore:rec.arrFlight,f09_fltAfter:rec.depFlight,
      f09_sta:rec.sta,f09_std:rec.std,f09_eta:rec.eta,f09_etd:rec.etd,
      f09_regn:rec.acReg,f09_acType:rec.acType,f09_route1:rec.route1,f09_route3:rec.route3
    };
    if(rec.bay){s.f09_parkingArr=rec.bay;s.f09_parkingDep=rec.bay;}
    if(rec.gate){s.f09_gateArr=rec.gate;s.f09_gateDep=rec.gate;}
    if(rec.booking)s.f09_booking=rec.booking;
    for(const k of Object.keys(s))if(!S(s[k]))delete s[k];
    return s;
  }

  function rosterRecords(parsed){
    const {row:hi,map}=headerRowInfo(parsed.rows||[]),out=[];
    let rosterDate=null;
    for(let i=0;i<Math.min(hi,15);i++)for(const x of (parsed.rows[i]||[])){const d=parseDate(x);if(d){rosterDate=d;break;}if(rosterDate)break;}
    for(let i=hi+1;i<(parsed.rows||[]).length;i++){
      const row=parsed.rows[i]||[],flightRaw=getCell(row,map,"FlightNo");if(!flightRaw)continue;
      const arrDate=parseDate(getCell(row,map,"ArrFlightDate")),depDate=parseDate(getCell(row,map,"DepFlightDate"));
      const opDate=arrDate||depDate||rosterDate;if(!opDate)continue;
      const staInfo=parseRosterTime(getCell(row,map,"STA")),stdInfo=parseRosterTime(getCell(row,map,"STD")),etaInfo=parseRosterTime(getCell(row,map,"ETA")),etdInfo=parseRosterTime(getCell(row,map,"ETD"));
      const sta=staInfo.display,std=stdInfo.display,arrFlightDate=resolveEventDate(opDate.iso,arrDate?.iso,staInfo),depFlightDate=resolveEventDate(opDate.iso,depDate?.iso,stdInfo);
      const etaFlightDate=resolveEventDate(opDate.iso,arrDate?.iso||arrFlightDate,etaInfo),etdFlightDate=resolveEventDate(opDate.iso,depDate?.iso||depFlightDate,etdInfo);
      const flights=splitFlights(flightRaw);
      let arrFlight="",depFlight="";
      if(flights.length>=2){arrFlight=flights[0];depFlight=flights[1];}
      else if(flights.length===1){if(arrDate||sta)arrFlight=flights[0];else if(depDate||std)depFlight=flights[0];}
      const rp=routeParts(getCell(row,map,"Route"));
      const corUsers=usersFromCell(getCell(row,map,"Grnd_Cor"));
      const ldUsers=usersFromCell(getCell(row,map,"Grnd_Ld"));
      const lsUsers=usersFromCell(getCell(row,map,"Grnd_Ls"));
      const paxUsers=usersFromCell(getCell(row,map,"Pax_Supr"));
      const corSet=new Set(corUsers),ldSet=new Set(ldUsers);
      const common=corUsers.filter(u=>ldSet.has(u));
      const corOnly=corUsers.filter(u=>!ldSet.has(u));
      const ldOnly=ldUsers.filter(u=>!corSet.has(u));
      if(!common.length&&!corOnly.length&&!ldOnly.length&&!lsUsers.length&&!paxUsers.length)continue;

      const base={
        rowNo:i+1,opDate:opDate.iso,date:opDate.display,flightRaw:upper(flightRaw),arrFlight,depFlight,sta,std,eta:etaInfo.display,etd:etdInfo.display,
        arrFlightDate,depFlightDate,etaFlightDate,etdFlightDate,
        staClock:staInfo.clock,stdClock:stdInfo.clock,etaClock:etaInfo.clock,etdClock:etdInfo.clock,
        staDayOffset:isoDayDiff(opDate.iso,arrFlightDate),stdDayOffset:isoDayDiff(opDate.iso,depFlightDate),etaDayOffset:isoDayDiff(opDate.iso,etaFlightDate),etdDayOffset:isoDayDiff(opDate.iso,etdFlightDate),
        staSortMinute:sortMinuteFor(opDate.iso,arrFlightDate,staInfo.clock),stdSortMinute:sortMinuteFor(opDate.iso,depFlightDate,stdInfo.clock),etaSortMinute:sortMinuteFor(opDate.iso,etaFlightDate,etaInfo.clock),etdSortMinute:sortMinuteFor(opDate.iso,etdFlightDate,etdInfo.clock),
        acReg:upper(getCell(row,map,"ACRegNo")),acType:upper(getCell(row,map,"ACType")),route:upper(getCell(row,map,"Route")),
        route1:rp.route1,route3:rp.route3,bay:S(getCell(row,map,"ParkingBay")),
        grndCor:corUsers,grndLd:ldUsers,grndLs:lsUsers,paxSupr:paxUsers,
        flightName:[arrFlight,depFlight].filter(Boolean).join(" / ")||upper(flightRaw)
      };
      const add=(u,formGroup,sourceColumn,roleKey,workPartOrder=1,workPartTotal=1)=>{
        // ID dựa trên roster gốc + vai trò. Khi AD chuyển người, ID giữ nguyên để giữ dữ liệu và override.
        const id="RA_"+hashId([base.opDate,base.flightRaw,roleKey,u].join("|"));
        out.push({...base,assignmentId:id,targetUser:u,originalTargetUser:u,formGroup,sourceColumn,roleKey,workPartOrder:Number(workPartOrder)||1,workPartTotal:Number(workPartTotal)||1,workPartSequenceSource:sourceColumn});
      };
      // V1.69:
      // - Không có Grnd_Ld: mọi Grnd_Cor nhận 42.3.
      // - Có Grnd_Ld:
      //   + cùng username ở cả Cor + Ld => 42.3
      //   + Cor khác người Ld => Cor 42.1, Ld 55.1
      if(!ldUsers.length){
        corUsers.forEach((u,i)=>add(u,"fsags","Grnd_Cor","COR",i+1,corUsers.length));
      }else{
        common.forEach((u,i)=>add(u,"fsags","Grnd_Cor + Grnd_Ld","BOTH",i+1,common.length));
        corOnly.forEach((u,i)=>add(u,"fsags421","Grnd_Cor","COR",i+1,corOnly.length));
        ldOnly.forEach((u,i)=>add(u,"fsags551","Grnd_Ld","LD",i+1,ldOnly.length));
      }
      // V1.82: Grnd_Ls là nguồn phân công CBTT. Mỗi username trong Grnd_Ls sinh nhiệm vụ FINAL/CROSSCHECK cho đúng chuyến.
      // Thứ tự username trong cùng ô là thứ tự bắt buộc nhận/làm: A / B / C => A → B → C.
      lsUsers.forEach((u,i)=>add(u,"final","Grnd_Ls","CBTT",i+1,lsUsers.length));
      // V1.77: PVHK Passenger Supervisor nhận F/SAGS-CXR/09.
      paxUsers.forEach((u,i)=>add(u,"fsags09","Pax_Supr","PAX09",i+1,paxUsers.length));
    }
    return {records:out,headerMap:map,headerRow:hi+1,rosterDate:rosterDate?.iso||""};
  }
  function seedFor(rec){
    const s={};
    if(rec.formGroup==="fsags421"){
      Object.assign(s,{f421_date:rec.date,f421_fltBefore:rec.arrFlight,f421_fltAfter:rec.depFlight,f421_sta:rec.sta,f421_std:rec.std,f421_regn:rec.acReg,f421_acType:rec.acType,f421_route1:rec.route1,f421_route3:rec.route3});
      if(rec.bay){s.f421_bayBefore=rec.bay;s.f421_bayAfter=rec.bay;}
    }else if(rec.formGroup==="fsags551"){
      Object.assign(s,{f551_date:rec.date,f551_fltBefore:rec.arrFlight,f551_fltAfter:rec.depFlight,f551_sta:rec.sta,f551_std:rec.std,f551_regn:rec.acReg,f551_acType:rec.acType,f551_route1:rec.route1,f551_route3:rec.route3});
      if(rec.bay)s.f551_bay=rec.bay;
    }else if(rec.formGroup==="fsags09"){
      Object.assign(s,{
        f09_date:rec.date,f09_fltBefore:rec.arrFlight,f09_fltAfter:rec.depFlight,
        f09_sta:rec.sta,f09_std:rec.std,f09_regn:rec.acReg,f09_acType:rec.acType,
        f09_route1:rec.route1,f09_route3:rec.route3
      });
      if(rec.bay){s.f09_parkingArr=rec.bay;s.f09_parkingDep=rec.bay;}
    }else{
      Object.assign(s,{date:rec.date,fltBefore:rec.arrFlight,fltAfter:rec.depFlight,sta:rec.sta,std:rec.std,regn:rec.acReg,acType:rec.acType,route1:rec.route1,route2:"CXR",route3:rec.route3});
      if(rec.bay){s.bayBefore=rec.bay;s.bayAfter=rec.bay;}
    }
    for(const k of Object.keys(s))if(!S(s[k]))delete s[k];
    return s;
  }


  // Pure helpers exposed for validation/tests.
  root.__SAGS_DAILY_ROSTER_TEST__={parseXlsxBytes,parseCsvText,headerRowInfo,parseDate,parseRosterTime,fmtTime,addIsoDays,isoDayDiff,resolveEventDate,sortMinuteFor,splitFlights,usersFromCell,allFlightRows,pvhk09SeedFor,rosterRecords,seedFor,flightIdForRoster};
  if(typeof document==="undefined")return;

  let preview=null,mailRef=null,mailCb=null,revRef=null,revCb=null,lastToastSig="";
  const rosterSyncTimers=new Map(),rosterSyncSig=new Map();
  function isAD(){try{return upper(currentRole)==="AD";}catch(e){return false;}}
  function canManageDailyRoster(){
    if(isAD())return true;
    try{return typeof v485Can==="function"&&v485Can("DAILY_ROSTER");}catch(e){return false;}
  }
  function ensureUI(){
    if(document.getElementById("dailyRosterModal"))return;
    const style=document.createElement("style");
    style.textContent=`
      #dailyRosterModal{display:none;position:fixed;inset:0;z-index:16050;background:rgba(0,0,0,.52);align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:Arial,sans-serif}
      #dailyRosterModal.show{display:flex}.drPanel{width:min(96vw,960px);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 16px 45px rgba(0,0,0,.28);padding:16px;box-sizing:border-box}.drHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.drHead h3{margin:0;color:#0b4f91}.drSub{font-size:13px;color:#5d6875;line-height:1.45;margin:5px 0 12px}.drGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.drField{border:1px solid #d9e1e8;border-radius:11px;padding:10px;background:#f9fbfd}.drField label{display:block;font-size:12px;font-weight:800;color:#29445e;margin-bottom:5px}.drField input,.drField select{width:100%;box-sizing:border-box;padding:9px;border:1px solid #c9d5df;border-radius:8px;background:#fff}.drCols{display:flex;flex-wrap:wrap;gap:7px}.drCheck{display:flex!important;align-items:center;gap:5px;font-size:12px!important;font-weight:700!important;margin:0!important;padding:5px 7px;border:1px solid #d7e0e8;border-radius:8px;background:#fff}.drCheck input{width:auto!important}.drActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}.drBtn{border:0;border-radius:9px;padding:9px 13px;font-weight:800;cursor:pointer;background:#0b67b2;color:#fff}.drBtn.secondary{background:#eef3f7;color:#31475a;border:1px solid #ccd7df}.drBtn.publish{background:#15803d}.drBtn.createFlight{display:none;width:100%;min-height:58px;font-size:18px;justify-content:center;align-items:center;box-shadow:0 8px 20px rgba(21,128,61,.22)}.drBtn.createFlight.ready{display:flex}.drStatus{margin-top:10px;padding:9px 10px;border-radius:9px;background:#eef6ff;color:#234764;font-size:13px;white-space:pre-wrap}.drStatus.err{background:#fff0f0;color:#9b1c1c}.drTableWrap{overflow:auto;margin-top:10px;border:1px solid #d9e1e8;border-radius:10px;max-height:38vh}.drTable{border-collapse:collapse;width:100%;font-size:12px;white-space:nowrap}.drTable th,.drTable td{border-bottom:1px solid #e5ebf0;padding:7px 8px;text-align:left}.drTable th{position:sticky;top:0;background:#edf5fb;color:#214968;z-index:1}.drBadge{display:inline-block;border-radius:999px;padding:2px 7px;background:#e8f5e9;color:#176b32;font-weight:800;margin:1px}.drEmpty{padding:14px;color:#667}.drToast{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:17000;background:#123d64;color:#fff;border-radius:12px;padding:10px 14px;font:700 13px Arial;box-shadow:0 8px 25px rgba(0,0,0,.25);max-width:min(90vw,520px);text-align:center}
      #roleBtnPVHK09Roster{background:#0b6b72!important;color:#fff!important}
      @media(max-width:650px){.drGrid{grid-template-columns:1fr}.drPanel{padding:12px}.drActions .drBtn{flex:1}}
    `;
    document.head.appendChild(style);
    const m=document.createElement("div");m.id="dailyRosterModal";
    m.innerHTML=`<div class="drPanel"><div class="drHead"><div><h3>📋 DAILY ROSTER · TỰ TẠO CHUYẾN</h3><div class="drSub"><b>AD chỉ cần chọn file.</b> Hệ thống tự đọc roster, tự tạo Flight Workspace và phân công dữ liệu roster hiện có. Không cần bấm TẠO CHUYẾN.</div></div><button class="drBtn secondary" onclick="closeDailyRosterManager()">ĐÓNG</button></div>
      <div class="drField"><label>File DAILY ROSTER</label><input id="drFile" type="file" accept=".xlsx,.xlsm,.csv"></div>
      <div class="drStatus"><b>QUY TẮC TẠO FORM</b><br>• Không có Grnd_Ld: Grnd_Cor → 42.3<br>• Có Grnd_Ld khác người: Grnd_Cor → 42.1, Grnd_Ld → 55.1<br>• Cùng người ở Grnd_Cor + Grnd_Ld → 42.3<br>• <b>Grnd_Ls → CBTT · FINAL/CROSSCHECK</b><br>• <b>Pax_Supr → FSAGS 09</b>.</div>
      <div class="drActions" style="display:none"><button class="drBtn" id="drReadBtn" onclick="dailyRosterReadPreview()">📄 ĐỌC DAILY ROSTER</button></div>
      <div class="drActions"><button class="drBtn publish createFlight" id="drPublishBtn" onclick="dailyRosterPublish()" disabled style="display:none">✓ XÁC NHẬN TẠO CHUYẾN</button></div>
      <div class="drStatus" id="drStatus">Chọn file roster để bắt đầu.</div><div id="drPreview"></div>
      <div class="drField" style="margin-top:14px"><label>AD · CHUYỂN NGƯỜI PHỤ TRÁCH TRỰC TIẾP</label><div class="drSub">Không dùng GIAO CA. Chọn ngày → tải phân công → bấm CHUYỂN ở đúng biểu mẫu. Dữ liệu roster đã lưu trên V1.66 được giữ qua bản đồng bộ roster.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="drManageDate" type="date" style="flex:1;min-width:160px"><button class="drBtn secondary" onclick="dailyRosterLoadAssignments()">TẢI PHÂN CÔNG</button></div><div id="drManage"></div></div>
      </div>`;
    document.body.appendChild(m);
    const td=new Date(),d=`${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,"0")}-${String(td.getDate()).padStart(2,"0")}`;const md=document.getElementById("drManageDate");if(md)md.value=d;
    document.getElementById("drFile")?.addEventListener("change",async(e)=>{preview=null;const b=document.getElementById("drPublishBtn");if(b){b.disabled=true;b.classList.remove("ready");b.style.display="none";}const file=e?.target?.files?.[0];if(!file)return;setStatus("Đã nhận file. Hệ thống đang tự đọc DAILY ROSTER và tạo chuyến…");await root.dailyRosterLoadFile?.(file);});
  }
  function canBuildPVHK09(){
    try{return upper(currentRole)==="AD"||(typeof v485Can==="function"&&v485Can("FSAGS09"));}catch(e){return false;}
  }
  function ensureButton(){
    const bar=document.querySelector(".toolbar-row.main-actions");if(!bar)return;
    let b=document.getElementById("roleBtnDailyRoster");
    if(!b){b=document.createElement("button");b.id="roleBtnDailyRoster";b.textContent="📋 DAILY ROSTER";b.onclick=()=>openDailyRosterManager();b.style.display="none";const anchor=document.getElementById("roleBtnActivity");if(anchor?.parentNode)anchor.parentNode.insertBefore(b,anchor.nextSibling);else bar.appendChild(b);}
    b.style.display=canManageDailyRoster()?"":"none";

    let p=document.getElementById("roleBtnPVHK09Roster");
    if(!p){
      p=document.createElement("button");p.id="roleBtnPVHK09Roster";p.textContent="📋 PHÂN CHUYẾN 09";p.style.display="none";
      p.onclick=()=>root.dailyRosterPickPVHK09?.();
      const anchor=document.getElementById("roleBtnFlights");
      if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else bar.appendChild(p);

      const f=document.createElement("input");f.id="pvhk09RosterFile";f.type="file";f.accept=".xlsx,.xlsm,.csv";
      f.style.position="fixed";f.style.left="-9999px";f.style.top="-9999px";f.style.width="1px";f.style.height="1px";f.style.opacity="0";
      f.addEventListener("change",async()=>{const file=f.files?.[0];f.value="";if(file)await root.dailyRosterCreatePVHK09FromFile?.(file);});
      document.body.appendChild(f);
    }
    p.style.display=canBuildPVHK09()?"":"none";
  }
  function setStatus(msg,err=false){const e=document.getElementById("drStatus");if(e){e.textContent=msg;e.classList.toggle("err",!!err);}}
  function rosterFlightKey(v){return upper(v).replace(/[^A-Z0-9]/g,"");}
  function rosterFlightTokens(){const out=new Set();for(const v of arguments){for(const m of upper(v).matchAll(/[A-Z0-9]{2,3}\s*\d{1,5}/g)){const k=rosterFlightKey(m[0]);if(k)out.add(k)}}return out;}
  function sameRosterFlightIdentity(a,b){const x=rosterFlightTokens(a?.flightRaw,a?.flightName,a?.arrFlight,a?.depFlight),y=rosterFlightTokens(b?.flightRaw,b?.flightName,b?.arrFlight,b?.depFlight);return [...x].some(k=>y.has(k));}
  function renderPreview(data){
    const host=document.getElementById("drPreview");if(!host)return;
    const recs=data.records||[],users=[...new Set(recs.map(x=>x.targetUser))];
    const grouped=new Map();
    for(const r of recs){
      const k=r.opDate+"|"+r.flightRaw;
      if(!grouped.has(k))grouped.set(k,{...r,assignments:[]});
      grouped.get(k).assignments.push({user:r.targetUser,formGroup:r.formGroup,sourceColumn:r.sourceColumn});
    }
    const rows=[...grouped.values()].slice(0,100);
    host.innerHTML=`<div class="drStatus">Đọc được <b>${grouped.size}</b> dòng chuyến · <b>${recs.length}</b> biểu mẫu · <b>${users.length}</b> username.<br>Ngày roster: ${esc(data.rosterDate||"không xác định")} · Sheet: ${esc(data.sheetName||"")}</div>${rows.length?`<div class="drTableWrap"><table class="drTable"><thead><tr><th>Ngày KT</th><th>Flight</th><th>STA</th><th>STD</th><th>Ngày đi</th><th>Grnd_Cor</th><th>Grnd_Ld</th><th>Grnd_Ls</th><th>Pax_Supr</th><th>Biểu mẫu sinh ra</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td><b>${esc(r.flightRaw)}</b></td><td>${esc(r.sta)}</td><td>${esc(r.std)}</td><td>${esc(r.depFlightDate||r.opDate)}${Number(r.stdDayOffset||0)>0?' <span class="drBadge">NEXT DAY</span>':''}</td><td>${(r.grndCor||[]).map(u=>`<span class="drBadge">${esc(u)}</span>`).join(" ")}</td><td>${(r.grndLd||[]).map(u=>`<span class="drBadge">${esc(u)}</span>`).join(" ")}</td><td>${(r.grndLs||[]).map(u=>`<span class="drBadge">${esc(u)}</span>`).join(" ")}</td><td>${(r.paxSupr||[]).map(u=>`<span class="drBadge">${esc(u)}</span>`).join(" ")}</td><td>${r.assignments.map(a=>`<span class="drBadge">${esc(a.user)} · ${formLabel(a.formGroup)}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table></div>`:'<div class="drEmpty">Không có tên hợp lệ ở Grnd_Cor / Grnd_Ld / Grnd_Ls / Pax_Supr.</div>'}`;
  }

  root.dailyRosterLoadFile=async function(file){
    if(!file||!canManageDailyRoster())return false;
    ensureUI();
    root.openDailyRosterManager();
    const inp=document.getElementById("drFile");
    if(inp&&inp.files?.[0]!==file){try{const dt=new DataTransfer();dt.items.add(file);inp.files=dt.files;}catch(e){console.info("DAILY ROSTER file bridge",e?.message||e);}}
    await root.dailyRosterReadPreview();
    if(!preview?.records?.length)return false;
    setStatus(`✓ DAILY ROSTER hợp lệ (${preview.records.length} phân công). Đang tự tạo Flight Workspace…`);
    const ok=await root.dailyRosterPublish();
    if(ok)setStatus("✓ ĐÃ TỰ TẠO CHUYẾN. Bấm CHUYẾN khi muốn mở danh sách.");
    return !!ok;
  };

  root.openDailyRosterManager=function(){if(!canManageDailyRoster()){try{roleDenied?.("Tài khoản chưa được cấp quyền DAILY ROSTER.");}catch(e){}return;}ensureUI();document.getElementById("dailyRosterModal")?.classList.add("show");};
  root.closeDailyRosterManager=function(){document.getElementById("dailyRosterModal")?.classList.remove("show");};
  root.dailyRosterReadPreview=async function(){
    if(!canManageDailyRoster())return;
    const file=document.getElementById("drFile")?.files?.[0];if(!file)return setStatus("Chưa chọn file roster.",true);
    try{
      setStatus("Đang đọc "+file.name+"…");
      const parsed=await parseRosterFile(file),x=rosterRecords(parsed);
      preview={...x,sheetName:parsed.sheetName,fileName:file.name};
      renderPreview(preview);
      const md=document.getElementById("drManageDate");if(md&&preview.rosterDate)md.value=preview.rosterDate;
      const createBtn=document.getElementById("drPublishBtn");if(createBtn){const ok=!!preview.records.length;createBtn.disabled=!ok;createBtn.classList.toggle("ready",ok);createBtn.style.display=ok?"inline-flex":"none";}
      setStatus(`✓ DAILY ROSTER hợp lệ. Đã nhận ${preview.records.length} phân công. Hệ thống sẽ tự tạo chuyến.`);
    }catch(e){preview=null;const createBtn=document.getElementById("drPublishBtn");if(createBtn){createBtn.disabled=true;createBtn.classList.remove("ready");createBtn.style.display="none";}setStatus("Không đọc được roster: "+S(e?.message||e),true);}
  };

  async function publishRecords(data){
    const byDate=new Map();for(const r of data.records||[]){if(!byDate.has(r.opDate))byDate.set(r.opDate,[]);byDate.get(r.opDate).push(r);}
    let writes=0,removes=0,overrides=0,removedFlights=0;
    for(const [opDate,recs0] of byDate){
      const manRef=sagsV470Ref(MANIFEST_PATH+"/"+safeKey(opDate));let old={};try{old=(await manRef.once("value")).val()||{};}catch(e){}
      const oldItems=old.items||{},nextItems={},patch={},now=Date.now(),by=normUser(currentUserProfile?.username||"");
      const nextFlightKeys=new Set(recs0.map(r=>rosterFlightKey(r.flightRaw||r.flightName)).filter(Boolean));
      for(const baseRec of recs0){
        const oldItem=oldItems[baseRec.assignmentId]||{};
        const manual=oldItem.manualOverride===true&&S(oldItem.user);
        const effectiveUser=manual?normUser(oldItem.user):baseRec.targetUser;
        if(manual)overrides++;
        const r={...baseRec,targetUser:effectiveUser};
        const rk=upper(r.roleKey),src=upper(r.sourceColumn),fg=upper(r.formGroup),unit=(rk==="CBTT"||src.includes("GRND_LS")||fg==="FINAL")?"CBTT":((rk==="PAX09"||src.includes("PAX_SUPR")||fg==="FSAGS09")?"PVHK":"DH");
        const manualBase=Object.values(oldItems).find(x=>x?.manualCreatedV340===true&&upper(x.manualUnit)===unit&&sameRosterFlightIdentity(x,r)),resolvedFlightId=S(oldItem.flightId||manualBase?.flightId)||flightIdForRoster(r);
        const payload={engine:ENGINE,schema:2,assignmentId:r.assignmentId,targetUser:r.targetUser,originalTargetUser:baseRec.originalTargetUser||baseRec.targetUser,opDate:r.opDate,date:r.date,flightId:resolvedFlightId,flightRaw:r.flightRaw,flightName:r.flightName||"",arrFlight:r.arrFlight,depFlight:r.depFlight,sta:r.sta,std:r.std,eta:r.eta||"",etd:r.etd||"",arrFlightDate:r.arrFlightDate||r.opDate,depFlightDate:r.depFlightDate||r.opDate,etaFlightDate:r.etaFlightDate||r.arrFlightDate||r.opDate,etdFlightDate:r.etdFlightDate||r.depFlightDate||r.opDate,staClock:r.staClock||"",stdClock:r.stdClock||"",etaClock:r.etaClock||"",etdClock:r.etdClock||"",staDayOffset:safeFiniteNumber(r.staDayOffset,0),stdDayOffset:safeFiniteNumber(r.stdDayOffset,0),etaDayOffset:safeFiniteNumber(r.etaDayOffset,0),etdDayOffset:safeFiniteNumber(r.etdDayOffset,0),staSortMinute:safeSortMinute(r.staSortMinute,r.opDate,r.arrFlightDate||r.opDate,r.staClock),stdSortMinute:safeSortMinute(r.stdSortMinute,r.opDate,r.depFlightDate||r.opDate,r.stdClock),etaSortMinute:safeSortMinute(r.etaSortMinute,r.opDate,r.etaFlightDate||r.arrFlightDate||r.opDate,r.etaClock),etdSortMinute:safeSortMinute(r.etdSortMinute,r.opDate,r.etdFlightDate||r.depFlightDate||r.opDate,r.etdClock),acReg:r.acReg,acType:r.acType,route:r.route,route1:r.route1,route3:r.route3,bay:r.bay,formGroup:r.formGroup,sourceColumn:r.sourceColumn,roleKey:r.roleKey,workPartOrder:safeFiniteNumber(r.workPartOrder,1),workPartTotal:safeFiniteNumber(r.workPartTotal,1),workPartSequenceSource:S(r.workPartSequenceSource||r.sourceColumn),sourceFile:data.fileName||"",active:true,manualOverride:manual,publishedAtMs:now,publishedBy:by};
        patch[`${MAIL_PATH}/${safeKey(r.targetUser)}/items/${safeKey(r.assignmentId)}`]=payload;
        patch[`${REVOKE_PATH}/${safeKey(r.targetUser)}/items/${safeKey(r.assignmentId)}`]=null;
        if(oldItem.user&&normUser(oldItem.user)!==normUser(r.targetUser)){
          patch[`${MAIL_PATH}/${safeKey(oldItem.user)}/items/${safeKey(r.assignmentId)}`]=null;
          patch[`${REVOKE_PATH}/${safeKey(oldItem.user)}/items/${safeKey(r.assignmentId)}`]={assignmentId:r.assignmentId,reason:"REASSIGNED",atMs:now,by};
        }
        nextItems[r.assignmentId]={assignmentId:r.assignmentId,user:r.targetUser,originalUser:baseRec.originalTargetUser||baseRec.targetUser,flightRaw:r.flightRaw,flightName:r.flightName||"",arrFlight:r.arrFlight||"",depFlight:r.depFlight||"",sta:r.sta||"",std:r.std||"",eta:r.eta||"",etd:r.etd||"",arrFlightDate:r.arrFlightDate||r.opDate,depFlightDate:r.depFlightDate||r.opDate,etaFlightDate:r.etaFlightDate||r.arrFlightDate||r.opDate,etdFlightDate:r.etdFlightDate||r.depFlightDate||r.opDate,staClock:r.staClock||"",stdClock:r.stdClock||"",etaClock:r.etaClock||"",etdClock:r.etdClock||"",staDayOffset:safeFiniteNumber(r.staDayOffset,0),stdDayOffset:safeFiniteNumber(r.stdDayOffset,0),etaDayOffset:safeFiniteNumber(r.etaDayOffset,0),etdDayOffset:safeFiniteNumber(r.etdDayOffset,0),staSortMinute:safeSortMinute(r.staSortMinute,r.opDate,r.arrFlightDate||r.opDate,r.staClock),stdSortMinute:safeSortMinute(r.stdSortMinute,r.opDate,r.depFlightDate||r.opDate,r.stdClock),etaSortMinute:safeSortMinute(r.etaSortMinute,r.opDate,r.etaFlightDate||r.arrFlightDate||r.opDate,r.etaClock),etdSortMinute:safeSortMinute(r.etdSortMinute,r.opDate,r.etdFlightDate||r.depFlightDate||r.opDate,r.etdClock),acReg:r.acReg||"",acType:r.acType||"",route:r.route||"",route1:r.route1||"",route3:r.route3||"",bay:r.bay||"",formGroup:r.formGroup,sourceColumn:r.sourceColumn,roleKey:r.roleKey,workPartOrder:safeFiniteNumber(r.workPartOrder,1),workPartTotal:safeFiniteNumber(r.workPartTotal,1),workPartSequenceSource:S(r.workPartSequenceSource||r.sourceColumn),manualOverride:manual,active:true,flightId:resolvedFlightId};writes++;
      }
      const removedFlightIds=new Set();
      for(const [id,x] of Object.entries(oldItems)){
        if(!nextItems[id]&&x?.manualCreatedV340===true){
          const manualUnit=upper(x.manualUnit);
          const replaced=recs0.some(r=>{
            const rk=upper(r.roleKey),src=upper(r.sourceColumn),fg=upper(r.formGroup);
            const unit=(rk==="CBTT"||src.includes("GRND_LS")||fg==="FINAL")?"CBTT":((rk==="PAX09"||src.includes("PAX_SUPR")||fg==="FSAGS09")?"PVHK":"DH");
            return manualUnit===unit&&sameRosterFlightIdentity(x,r);
          });
          if(!replaced){const kept={...x,eta:S(x.eta),etd:S(x.etd),arrFlightDate:S(x.arrFlightDate||opDate),depFlightDate:S(x.depFlightDate||opDate),etaFlightDate:S(x.etaFlightDate||x.arrFlightDate||opDate),etdFlightDate:S(x.etdFlightDate||x.depFlightDate||opDate),staClock:S(x.staClock),stdClock:S(x.stdClock),etaClock:S(x.etaClock),etdClock:S(x.etdClock),staDayOffset:safeFiniteNumber(x.staDayOffset,0),stdDayOffset:safeFiniteNumber(x.stdDayOffset,0),etaDayOffset:safeFiniteNumber(x.etaDayOffset,0),etdDayOffset:safeFiniteNumber(x.etdDayOffset,0),staSortMinute:safeSortMinute(x.staSortMinute,opDate,x.arrFlightDate||opDate,x.staClock),stdSortMinute:safeSortMinute(x.stdSortMinute,opDate,x.depFlightDate||opDate,x.stdClock),etaSortMinute:safeSortMinute(x.etaSortMinute,opDate,x.etaFlightDate||x.arrFlightDate||opDate,x.etaClock),etdSortMinute:safeSortMinute(x.etdSortMinute,opDate,x.etdFlightDate||x.depFlightDate||opDate,x.etdClock),workPartOrder:safeFiniteNumber(x.workPartOrder,1),workPartTotal:safeFiniteNumber(x.workPartTotal,1),active:true};nextItems[id]=kept;patch[`${MAIL_PATH}/${safeKey(x.user||x.targetUser)}/items/${safeKey(id)}`]={...kept,engine:ENGINE,schema:2,assignmentId:id,targetUser:normUser(x.user||x.targetUser),originalTargetUser:normUser(x.originalUser||x.user||x.targetUser),opDate:opDate,date:opDate,sourceFile:"MANUAL_V340",active:true,manualCreatedV340:true};continue;}
        }
        if(!nextItems[id]&&x?.user){
          patch[`${MAIL_PATH}/${safeKey(x.user)}/items/${safeKey(id)}`]=null;
          patch[`${REVOKE_PATH}/${safeKey(x.user)}/items/${safeKey(id)}`]={assignmentId:id,reason:"ROSTER_REMOVED",atMs:now,by};
          removes++;
        }
        const oldFlightKey=rosterFlightKey(x?.flightRaw||x?.flightName);
        if(oldFlightKey&&!nextFlightKeys.has(oldFlightKey)){
          let fid=S(x?.flightId);
          if(!fid&&typeof root.sagsFlightHubFlightId==="function")try{fid=S(root.sagsFlightHubFlightId(opDate,"","",x?.flightRaw||x?.flightName));}catch(_){ }
          if(fid){
            removedFlightIds.add(fid);
            patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/assignments/${safeKey(id)}/active`]=false;
            patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/assignments/${safeKey(id)}/rosterStatus`]="ROSTER_REMOVED";
            patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/assignments/${safeKey(id)}/rosterRemovedAtMs`]=now;
          }
        }
      }
      for(const fid of removedFlightIds){
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterActive`]=false;
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterStatus`]="ROSTER_REMOVED";
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterRemovedAtMs`]=now;
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterRemovedBy`]=by;
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/rosterRemovedSourceFile`]=data.fileName||"";
        patch[`${FLIGHT_PATH}/${safeKey(opDate)}/${safeKey(fid)}/updatedAtMs`]=now;
      }
      removedFlights+=removedFlightIds.size;
      patch[`${MANIFEST_PATH}/${safeKey(opDate)}`]={engine:ENGINE,schema:2,opDate,fileName:data.fileName||"",columns:FIXED_ROLE_COLUMNS,publishedAtMs:now,publishedBy:by,items:nextItems};
      await sagsV470Ref("").update(patch);
    }
    return {writes,removes,overrides,removedFlights,dates:byDate.size};
  }
  root.dailyRosterPublish=async function(){
    if(!canManageDailyRoster()||!preview?.records?.length)return false;const btn=document.getElementById("drPublishBtn");if(btn)btn.disabled=true;let ok=false;
    try{
      setStatus("Đang đồng bộ chuyến và phân công công việc…");
      const r=await publishRecords(preview);ok=true;
      setStatus(`✓ ĐÃ ĐỒNG BỘ DAILY ROSTER. Đã phân công ${r.writes} công việc cho ${r.dates} ngày. Thu hồi ${r.removes} phân công cũ. ${r.removedFlights?`Đánh dấu ${r.removedFlights} chuyến ROSTER_REMOVED/INACTIVE. `:""}Giữ ${r.overrides} chuyển người thủ công.\nKhông xóa Flight Record hoặc dữ liệu nghiệp vụ cũ. Bấm CHUYẾN khi muốn mở danh sách.`);
      void root.dailyRosterLoadAssignments();
    }catch(e){setStatus("Không đồng bộ DAILY ROSTER được: "+S(e?.message||e),true);}
    finally{if(btn)btn.disabled=false;}
    return ok;
  };

  function opDateMs(iso){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(iso));if(!m)return Date.now();return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0).getTime();}
  function sameFlightDate(env,rec){
    const st=env?.state||{},date=S(st.date||st.f421_date||st.f551_date||st.f09_date),flt=[S(st.fltBefore||st.f421_fltBefore||st.f551_fltBefore||st.f09_fltBefore),S(st.fltAfter||st.f421_fltAfter||st.f551_fltAfter||st.f09_fltAfter)].filter(Boolean).map(upper);
    const recFlights=[rec.arrFlight,rec.depFlight].filter(Boolean).map(upper),group=S(env?.mainForm||env?.activeFormGroup||"");
    return group===S(rec.formGroup) && date===rec.date && recFlights.some(f=>flt.includes(f));
  }
  function mergeRosterSeed(env,seed){
    env=env&&typeof env==="object"?env:{};env.state=env.state&&typeof env.state==="object"?env.state:{};const prev=env.rosterSeed||{};
    for(const [k,v] of Object.entries(seed||{})){const cur=S(env.state[k]),old=S(prev[k]);if(!cur||cur===old)env.state[k]=v;}
    env.rosterSeed={...seed};return env;
  }
  function makeRosterLocalId(rec){return "roster-"+hashId(rec.assignmentId);}
  function startPageForGroup(g){return g==="fsags421"?6:(g==="fsags551"?9:(g==="fsags09"?11:1));}
  function sanitizeRosterEnvelope(env){
    const x=env&&typeof env==="object"?env:{},src=x.state&&typeof x.state==="object"?x.state:{},state={};
    for(const [k,v] of Object.entries(src)){
      if(/attachment/i.test(k))continue;
      try{const s=JSON.stringify(v);if(s.length<=180000)state[k]=JSON.parse(s);}catch(e){}
    }
    return {state,mainForm:S(x.mainForm||x.activeFormGroup||"fsags"),activeFormGroup:S(x.mainForm||x.activeFormGroup||"fsags"),currentPage:Number(x.currentPage)||1,scrollY:0,arrivalOp:S(x.arrivalOp||"passenger"),departureOp:S(x.departureOp||"passenger"),rosterSeed:x.rosterSeed||{}};
  }
  async function readSharedAssignment(id){try{return (await sagsV470Ref(`${SESSION_PATH}/${safeKey(id)}`).once("value")).val()||null;}catch(e){return null;}}
  async function writeSharedAssignment(id,env,owner,formGroup,force=false){
    if(!id||!env)return false;
    const clean=sanitizeRosterEnvelope(env),sig=JSON.stringify(clean);
    if(!force&&rosterSyncSig.get(id)===sig)return false;
    try{await sagsV470Ref(`${SESSION_PATH}/${safeKey(id)}`).update({engine:ENGINE,schema:1,assignmentId:id,ownerUser:normUser(owner),formGroup:S(formGroup||clean.mainForm),envelope:clean,updatedAtMs:Date.now(),updatedBy:normUser(currentUserProfile?.username||owner)});rosterSyncSig.set(id,sig);return true;}catch(e){console.info("Roster shared sync",e?.message||e);return false;}
  }
  function scheduleSharedSync(meta,env,delay=260){
    const id=S(meta?.rosterAssignmentId);if(!id)return;
    if(rosterSyncTimers.has(id))clearTimeout(rosterSyncTimers.get(id));
    rosterSyncTimers.set(id,setTimeout(()=>{rosterSyncTimers.delete(id);void writeSharedAssignment(id,env,currentUserProfile?.username||"",meta.initialGroup||env?.mainForm||"",false);},delay));
  }
  async function autoReceiveOne(rec){
    if(!rec||rec.engine!==ENGINE||rec.active===false)return {ok:false,reason:"INACTIVE"};
    const me=normUser(currentUserProfile?.username||"");if(!me||me!==normUser(rec.targetUser))return {ok:false,reason:"USER"};
    if(upper(rec.formGroup)==="FINAL"){
      if(typeof root.sagsV340EnsureFinalForRoster==="function"){
        const out=await root.sagsV340EnsureFinalForRoster(rec,{open:false});
        return {ok:true,created:!!out?.created,moduleOnly:true,pendingTemplate:!!out?.pendingTemplate};
      }
      setTimeout(()=>{try{void root.sagsV340EnsureFinalForRoster?.(rec,{open:false})}catch(_){}},300);
      return {ok:true,created:false,moduleOnly:true};
    }
    if(upper(rec.formGroup)==="UNIT_TASK")return {ok:true,created:false,moduleOnly:true};
    const list=readFlightSessionList();let meta=list.find(x=>S(x.rosterAssignmentId)===S(rec.assignmentId));let id=meta?.id||"";
    if(!id){for(const x of list){const env=readFlightSessionEnvelope(x.id);if(sameFlightDate(env,rec)){meta=x;id=x.id;break;}}}
    const seed=seedFor(rec),now=Date.now(),shared=await readSharedAssignment(rec.assignmentId);
    if(!id){
      id=makeRosterLocalId(rec);if(list.some(x=>x.id===id))id=id+"-"+Math.random().toString(36).slice(2,6);
      meta={id,name:rec.flightName||[rec.arrFlight,rec.depFlight].filter(Boolean).join(" / ")||rec.flightRaw,customName:true,initialGroup:rec.formGroup||"fsags",arrivalOp:"passenger",departureOp:"passenger",createdAt:opDateMs(rec.opDate),updatedAt:now,rosterAssignmentId:rec.assignmentId,rosterFlightId:S(rec.flightId),rosterAutoReceived:true,rosterSourceColumn:rec.sourceColumn,rosterOpDate:rec.opDate,rosterOwner:me};
      list.push(meta);writeFlightSessionList(list);
      let env=shared?.envelope&&typeof shared.envelope==="object"?JSON.parse(JSON.stringify(shared.envelope)):{state:{},mainForm:meta.initialGroup,activeFormGroup:meta.initialGroup,currentPage:startPageForGroup(meta.initialGroup),scrollY:0,arrivalOp:"passenger",departureOp:"passenger"};
      env.mainForm=meta.initialGroup;env.activeFormGroup=meta.initialGroup;env.currentPage=startPageForGroup(meta.initialGroup);
      env=mergeRosterSeed(env,seed);env.rosterAssignmentId=rec.assignmentId;env.rosterAutoReceived=true;env.rosterReceivedAtMs=now;
      localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
      if(!shared)void writeSharedAssignment(rec.assignmentId,env,me,meta.initialGroup,true);
      return {ok:true,created:true,id};
    }
    meta.rosterAssignmentId=rec.assignmentId;meta.rosterFlightId=S(rec.flightId||meta.rosterFlightId);meta.rosterAutoReceived=true;meta.rosterSourceColumn=rec.sourceColumn;meta.rosterOpDate=rec.opDate;meta.rosterOwner=me;meta.initialGroup=rec.formGroup||meta.initialGroup;meta.updatedAt=now;writeFlightSessionList(list);
    let env=readFlightSessionEnvelope(id);
    if(shared?.envelope&&Number(shared.updatedAtMs||0)>Number(env?.rosterSharedAtMs||0)){
      const incoming=JSON.parse(JSON.stringify(shared.envelope));incoming.rosterSharedAtMs=Number(shared.updatedAtMs||0);env=incoming;
    }
    env.mainForm=rec.formGroup||env.mainForm;env.activeFormGroup=env.mainForm;env.currentPage=startPageForGroup(env.mainForm);
    env=mergeRosterSeed(env,seed);env.rosterAssignmentId=rec.assignmentId;env.rosterAutoReceived=true;env.rosterReceivedAtMs=env.rosterReceivedAtMs||now;
    localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
    return {ok:true,created:false,id};
  }
  function showToast(msg){const sig=S(msg);if(!sig||sig===lastToastSig)return;lastToastSig=sig;document.querySelectorAll(".drToast").forEach(x=>x.remove());const e=document.createElement("div");e.className="drToast";e.textContent=msg;document.body.appendChild(e);setTimeout(()=>e.remove(),4500);}
  async function processMailbox(raw){
    const items=Object.values(raw||{}).filter(x=>x&&x.engine===ENGINE&&x.active!==false),created=[];
    for(const rec of items){try{const r=await autoReceiveOne(rec);if(r.ok&&r.created)created.push(`${rec.flightRaw||rec.arrFlight||rec.depFlight} · ${formLabel(rec.formGroup)}`);}catch(e){console.info("Daily roster auto receive",e?.message||e);}}
    if(created.length){showToast(`DAILY ROSTER: đã đồng bộ ${created.length} biểu mẫu chờ nhận · ${created.slice(0,3).join(", ")}${created.length>3?"…":""}`);try{window.rampProgressSyncAll?.("ROSTER_AUTO_RECEIVE");}catch(e){}try{renderFlightSessionList?.();}catch(e){}}
  }
  function stopMailbox(){try{if(mailRef&&mailCb)mailRef.off("value",mailCb);}catch(e){}mailRef=null;mailCb=null;}
  function startMailbox(){
    stopMailbox();const me=normUser(currentUserProfile?.username||"");if(!me)return;
    try{mailRef=sagsV470Ref(`${MAIL_PATH}/${safeKey(me)}/items`);mailCb=s=>void processMailbox(s.val()||{});mailRef.on("value",mailCb,e=>console.warn("Daily roster mailbox",e));}catch(e){console.warn("Daily roster mailbox start",e);}
  }
  root.dailyRosterRestartMailbox=startMailbox;
  root.dailyRosterCanManage=canManageDailyRoster;


  function manifestDate(){return S(document.getElementById("drManageDate")?.value||preview?.rosterDate||"");}
  async function loadManifest(date){if(!date)return null;try{return (await sagsV470Ref(`${MANIFEST_PATH}/${safeKey(date)}`).once("value")).val()||null;}catch(e){throw e;}}
  function renderManage(man){
    const host=document.getElementById("drManage");if(!host)return;
    const items=Object.values(man?.items||{}).filter(Boolean).sort((a,b)=>S(a.flightRaw).localeCompare(S(b.flightRaw))||S(a.formGroup).localeCompare(S(b.formGroup)));
    host.innerHTML=items.length?`<div class="drTableWrap"><table class="drTable"><thead><tr><th>Flight</th><th>Form</th><th>Vai trò</th><th>Người hiện tại</th><th>Thao tác</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${esc(x.flightRaw||"")}</b></td><td>${esc(formLabel(x.formGroup))}</td><td>${esc(x.sourceColumn||"")}</td><td>${esc(x.user||"")}${x.manualOverride?` <span class="drBadge">chuyển tay</span>`:""}</td><td><button class="drBtn" style="padding:6px 9px" onclick="dailyRosterReassign('${esc(x.assignmentId||"")}')">CHUYỂN</button>${x.manualOverride&&x.originalUser?` <button class="drBtn secondary" style="padding:6px 9px" onclick="dailyRosterResetToRoster('${esc(x.assignmentId||"")}')">THEO ROSTER</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:'<div class="drEmpty">Ngày này chưa có phân công DAILY ROSTER.</div>';
  }
  root.dailyRosterLoadAssignments=async function(){
    if(!canManageDailyRoster())return;const d=manifestDate();if(!d)return setStatus("Chọn ngày để tải phân công.",true);
    try{const man=await loadManifest(d);renderManage(man);if(!man)setStatus("Ngày "+d+" chưa có manifest DAILY ROSTER.",true);}catch(e){setStatus("Không tải được phân công: "+S(e?.message||e),true);}
  };
  async function transferAssignment(id,newUser,reset=false){
    const d=manifestDate(),man=await loadManifest(d);if(!man?.items?.[id])throw new Error("Không tìm thấy assignment trong ngày đã chọn.");
    const item=man.items[id],oldUser=normUser(item.user),target=normUser(newUser);if(!target)throw new Error("Username mới không hợp lệ.");if(target===oldUser&&!reset)return {same:true};
    let payload=null;try{payload=(await sagsV470Ref(`${MAIL_PATH}/${safeKey(oldUser)}/items/${safeKey(id)}`).once("value")).val();}catch(e){}
    payload=payload||{engine:ENGINE,schema:2,assignmentId:id,opDate:d,flightRaw:item.flightRaw||"",formGroup:item.formGroup||"fsags",sourceColumn:item.sourceColumn||"",roleKey:item.roleKey||""};
    payload={...payload,targetUser:target,originalTargetUser:item.originalUser||payload.originalTargetUser||oldUser,manualOverride:!reset,reassignedFrom:oldUser,reassignedAtMs:Date.now(),reassignedBy:normUser(currentUserProfile?.username||""),active:true};
    const patch={};
    patch[`${MAIL_PATH}/${safeKey(oldUser)}/items/${safeKey(id)}`]=null;
    patch[`${MAIL_PATH}/${safeKey(target)}/items/${safeKey(id)}`]=payload;
    patch[`${REVOKE_PATH}/${safeKey(oldUser)}/items/${safeKey(id)}`]={assignmentId:id,reason:"ROSTER_REASSIGN",toUser:target,atMs:Date.now(),by:normUser(currentUserProfile?.username||"")};
    patch[`${REVOKE_PATH}/${safeKey(target)}/items/${safeKey(id)}`]=null;
    patch[`${MANIFEST_PATH}/${safeKey(d)}/items/${safeKey(id)}`]={...item,user:target,originalUser:item.originalUser||payload.originalTargetUser||oldUser,manualOverride:!reset,assignmentId:id};
    patch[`${SESSION_PATH}/${safeKey(id)}/ownerUser`]=target;
    patch[`${SESSION_PATH}/${safeKey(id)}/reassignedAtMs`]=Date.now();
    patch[`${SESSION_PATH}/${safeKey(id)}/reassignedBy`]=normUser(currentUserProfile?.username||"");
    await sagsV470Ref("").update(patch);
    return {oldUser,target,item};
  }
  root.dailyRosterReassign=async function(id){
    if(!canManageDailyRoster())return;const man=await loadManifest(manifestDate()),item=man?.items?.[id];if(!item)return setStatus("Không tìm thấy phân công để chuyển.",true);
    const u=prompt(`CHUYỂN ${item.flightRaw||""} · ${formLabel(item.formGroup)}\\nTừ: ${item.user||""}\\nNhập username người mới:`);if(u===null)return;
    try{const r=await transferAssignment(id,u,false);if(r.same)return setStatus("Username mới đang là người phụ trách hiện tại.");setStatus(`✓ Đã chuyển ${r.item.flightRaw||""} · ${formLabel(r.item.formGroup)} từ ${r.oldUser} → ${r.target}. Không cần GIAO CA.`);await root.dailyRosterLoadAssignments();}catch(e){setStatus("Không chuyển được: "+S(e?.message||e),true);}
  };
  root.dailyRosterResetToRoster=async function(id){
    if(!canManageDailyRoster())return;const man=await loadManifest(manifestDate()),item=man?.items?.[id],u=normUser(item?.originalUser||"");if(!item||!u)return setStatus("Không xác định được người gốc trong roster.",true);
    try{const r=await transferAssignment(id,u,true);setStatus(`✓ Đã trả ${r.item.flightRaw||""} · ${formLabel(r.item.formGroup)} về ${r.target} theo roster.`);await root.dailyRosterLoadAssignments();}catch(e){setStatus("Không trả về roster được: "+S(e?.message||e),true);}
  };


  function mergePVHK09Seed(env,seed){
    env=env&&typeof env==="object"?env:{};env.state=env.state&&typeof env.state==="object"?env.state:{};
    const prev=env.pvhk09RosterSeed||{};
    for(const [k,v] of Object.entries(seed||{})){
      const cur=S(env.state[k]),old=S(prev[k]);
      if(!cur||cur===old)env.state[k]=v;
    }
    env.pvhk09RosterSeed={...seed};
    return env;
  }
  function pvhk09StableId(rec){return "pvhk09-"+hashId(rec.opDate+"|"+rec.flightName);}
  function findExistingPVHK09(list,rec){
    const stable=pvhk09StableId(rec);
    let m=list.find(x=>x.id===stable||S(x.pvhk09RosterKey)===S(rec.opDate+"|"+rec.flightName));
    if(m)return m;
    for(const x of list){
      try{const env=readFlightSessionEnvelope(x.id);if(sameFlightDate(env,{...rec,formGroup:"fsags09"}))return x;}catch(e){}
    }
    return null;
  }
  root.dailyRosterPickPVHK09=function(){
    if(!canBuildPVHK09())return;
    const f=document.getElementById("pvhk09RosterFile");if(f)f.click();
  };
  root.dailyRosterCreatePVHK09FromFile=async function(file){
    if(!canBuildPVHK09()||!file)return;
    try{
      showToast("PVHK: đang đọc roster "+file.name+"…");
      const parsed=await parseRosterFile(file),data=allFlightRows(parsed),rows=data.records||[];
      if(!rows.length){alert("Không tìm thấy dòng chuyến hợp lệ trong roster.");return;}
      if(!confirm(`Tạo/cập nhật ${rows.length} F/SAGS-CXR/09 từ roster?\\n\\nMỗi form được đặt tên theo chuyến bay. Dữ liệu đã nhập tay trước đó không bị ghi đè.`))return;

      const list=readFlightSessionList();let created=0,updated=0;
      const now=Date.now();
      for(const rec of rows){
        let meta=findExistingPVHK09(list,rec),id=meta?.id||pvhk09StableId(rec);
        const seed=pvhk09SeedFor(rec);
        if(!meta){
          meta={
            id,name:rec.flightName,customName:true,initialGroup:"fsags09",
            arrivalOp:"passenger",departureOp:"passenger",
            createdAt:opDateMs(rec.opDate),updatedAt:now,
            pvhk09RosterBatch:true,pvhk09RosterKey:rec.opDate+"|"+rec.flightName,
            rosterOpDate:rec.opDate
          };
          list.push(meta);created++;
          let env={state:{},mainForm:"fsags09",activeFormGroup:"fsags09",currentPage:11,scrollY:0,arrivalOp:"passenger",departureOp:"passenger"};
          env=mergePVHK09Seed(env,seed);
          localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
        }else{
          meta.name=rec.flightName;meta.customName=true;meta.initialGroup="fsags09";meta.updatedAt=now;
          meta.pvhk09RosterBatch=true;meta.pvhk09RosterKey=rec.opDate+"|"+rec.flightName;meta.rosterOpDate=rec.opDate;
          let env=readFlightSessionEnvelope(id)||{state:{},mainForm:"fsags09",activeFormGroup:"fsags09",currentPage:11,scrollY:0};
          env.mainForm="fsags09";env.activeFormGroup="fsags09";env.currentPage=11;
          env=mergePVHK09Seed(env,seed);
          localStorage.setItem(flightSessionStorageKey(id),JSON.stringify(env));
          updated++;
        }
      }
      writeFlightSessionList(list);
      try{renderFlightSessionList?.();}catch(e){}
      showToast(`PVHK FSAGS 09: tạo mới ${created} · cập nhật ${updated} · tổng ${rows.length} chuyến.`);
    }catch(e){
      console.error("PVHK FSAGS09 roster",e);
      alert("Không tạo được FSAGS 09 từ roster: "+S(e?.message||e));
    }
  };

  function backupKey(id){try{return sagsOwnedKey("rosterRevokedBackupV166_"+id)}catch(e){return "rosterRevokedBackupV166_"+id}}
  async function revokeLocalAssignment(id,info={}){
    const list=readFlightSessionList(),affected=list.filter(x=>S(x.rosterAssignmentId)===S(id));if(!affected.length)return false;
    for(const meta of affected){
      const env=readFlightSessionEnvelope(meta.id);try{localStorage.setItem(backupKey(id),JSON.stringify({meta,envelope:env,revokedAtMs:Date.now(),info}));}catch(e){}
      try{await writeSharedAssignment(id,env,meta.rosterOwner||currentUserProfile?.username||"",meta.initialGroup||env?.mainForm||"",true);}catch(e){}
      localStorage.removeItem(flightSessionStorageKey(meta.id));
    }
    const ids=new Set(affected.map(x=>x.id)),next=list.filter(x=>!ids.has(x.id));writeFlightSessionList(next);
    if(ids.has(activeFlightSessionId)){
      activeFlightSessionId="";try{localStorage.removeItem(sagsOwnedKey(FLIGHT_SESSION_ACTIVE_KEY));}catch(e){}
      if(next.length){const fb=next.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];switchFlightSession(fb.id);}
      else{
        try{for(const k of Object.keys(state))delete state[k];activeKey=null;editing=null;signing=null;updateBagTotals();draw();renderAttachments();renderBBBTAttachments();renderFSAGS421Attachments();renderFSAGS551Attachments?.();renderFlightSessionList();showRoleHomeIdle?.();}catch(e){console.info("Roster revoke idle",e);}
      }
    }else try{renderFlightSessionList?.();}catch(e){}
    showToast(`DAILY ROSTER: người phụ trách đã được chuyển cho ${affected.length} biểu mẫu.`);return true;
  }
  async function processRevocations(raw){for(const x of Object.values(raw||{})){if(x?.assignmentId)try{await revokeLocalAssignment(x.assignmentId,x);}catch(e){console.info("Roster revoke",e?.message||e);}}}
  function stopRevocations(){try{if(revRef&&revCb)revRef.off("value",revCb);}catch(e){}revRef=null;revCb=null;}
  function startRevocations(){
    stopRevocations();const me=normUser(currentUserProfile?.username||"");if(!me)return;
    try{revRef=sagsV470Ref(`${REVOKE_PATH}/${safeKey(me)}/items`);revCb=s=>void processRevocations(s.val()||{});revRef.on("value",revCb,e=>console.warn("Roster revocation",e));}catch(e){console.warn("Roster revocation start",e);}
  }

  // Đồng bộ dữ liệu form roster theo sự kiện persist, không heartbeat.
  const baseRosterPersist=root.persist||persist;
  root.persist=persist=function(){
    const r=baseRosterPersist.apply(this,arguments);
    try{
      const meta=currentFlightSessionMeta?.();if(meta?.rosterAssignmentId){const env=readFlightSessionEnvelope(meta.id);scheduleSharedSync(meta,env,260);}
    }catch(e){}
    return r;
  };
  function applyRole(){ensureUI();ensureButton();}
  const baseApply=root.applyRoleUI;
  if(typeof baseApply==="function")root.applyRoleUI=applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(applyRole,0);setTimeout(startMailbox,80);setTimeout(startRevocations,100);return r;};

  setTimeout(()=>{ensureUI();ensureButton();startMailbox();startRevocations();},900);
})(typeof window!=="undefined"?window:globalThis);

/* ===== END daily-roster.js ===== */

/* ===== BEGIN roster-extra-seed.js ===== */
/* E-REPORT SAGS · DAILY ROSTER ROUTE + BOOKING + ARR PAX SAFE SEED · V1.95
 * Reads Route/Booking from the same roster file and enriches mailbox payloads.
 * Applies only when target field is empty or still equals previous roster seed.
 */
(function(root){
'use strict';
const BUILD='V1.95-20260820-01',MAIL='roster_mail';
const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase(),safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
let lookup=new Map(),installed=false;
const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
const key=(date,flight)=>`${S(date)}|${normFlight(flight)}`;
function cell(row,map,name){const i=map?.[name];return i===undefined?'':S(row?.[i])}
function routeParts(v){const a=U(v).split(/[-–—>/]+/).map(S).filter(Boolean),i=a.indexOf('CXR');return i>=0?{route1:a[i-1]||'',route3:a[i+1]||''}:{route1:a[0]||'',route3:a[1]||''}}
function bookingParts(raw){const s=U(raw),o={raw:S(raw),total:'',F:'',C:'',Y:'',I:''};if(/^\d+$/.test(S(raw)))o.total=S(raw);for(const c of ['F','C','Y','I']){const m=new RegExp(`(?:^|[\\s,;/|])${c}\\s*[:=\\-]?\\s*(\\d+)`,'i').exec(s);if(m)o[c]=m[1]}return o}
function arrivalPaxTotal(raw){const s=S(raw);if(!s)return '';const first=s.split('/')[0].trim();const m=first.match(/\d+/);return m?m[0]:''}
async function parseFile(file){
  const T=root.__SAGS_DAILY_ROSTER_TEST__;if(!T||!file)return null;let parsed;if(/\.csv$/i.test(file.name||''))parsed=T.parseCsvText(await file.text());else parsed=await T.parseXlsxBytes(new Uint8Array(await file.arrayBuffer()));
  const hi=T.headerRowInfo(parsed.rows||[]),map=hi.map,next=new Map();let rosterDate=null;for(let i=0;i<Math.min(hi.row,15)&&!rosterDate;i++)for(const x of (parsed.rows[i]||[])){const d=T.parseDate(x);if(d){rosterDate=d;break}}
  for(let i=hi.row+1;i<(parsed.rows||[]).length;i++){
    const row=parsed.rows[i]||[],flightRaw=cell(row,map,'FlightNo');if(!flightRaw)continue;const arr=T.parseDate(cell(row,map,'ArrFlightDate')),dep=T.parseDate(cell(row,map,'DepFlightDate')),op=arr||dep||rosterDate;if(!op)continue;
    const route=U(cell(row,map,'Route')),rp=routeParts(route),booking=cell(row,map,'Booking'),totalPax=cell(row,map,'TotalPax'),extra={opDate:op.iso,flightRaw:U(flightRaw),route,route1:rp.route1,route3:rp.route3,booking,bookingParts:bookingParts(booking),totalPax,arrPaxTTL:arrivalPaxTotal(totalPax)};next.set(key(op.iso,flightRaw),extra);
  }
  lookup=next;root.__SAGS_ROSTER_EXTRA_LOOKUP__=Object.fromEntries(next);return next;
}
function findExtra(rec){return lookup.get(key(rec?.opDate,rec?.flightRaw))||null}
function enrichObject(x){if(!x||typeof x!=='object')return x;const e=findExtra(x);if(!e)return x;return {...x,rosterRoute:e.route,route:e.route||x.route,route1:e.route1||x.route1,route3:e.route3||x.route3,booking:e.booking,bookingParts:e.bookingParts,totalPax:e.totalPax,arrPaxTTL:e.arrPaxTTL}}
function enrichPatch(patch){for(const k of Object.keys(patch||{})){if(/^roster_mail\/[^/]+\/items\/[^/]+$/.test(k)&&patch[k]&&typeof patch[k]==='object')patch[k]=enrichObject(patch[k]);if(/^roster_manifests\/[^/]+$/.test(k)&&patch[k]?.items){for(const id of Object.keys(patch[k].items))patch[k].items[id]=enrichObject(patch[k].items[id])}}}
function safeSeed(env,k,v){v=S(v);if(!v)return false;env.state=env.state&&typeof env.state==='object'?env.state:{};env.rosterSeed=env.rosterSeed&&typeof env.rosterSeed==='object'?env.rosterSeed:{};const cur=S(env.state[k]),old=S(env.rosterSeed[k]);if(!cur||cur===old){env.state[k]=v;env.rosterSeed[k]=v;return true}return false}
function applyRec(rec){
  const list=typeof root.readFlightSessionList==='function'?root.readFlightSessionList():[],meta=list.find(x=>S(x.rosterAssignmentId)===S(rec.assignmentId));if(!meta)return false;let env=root.readFlightSessionEnvelope?.(meta.id);if(!env)return false;const g=S(meta.initialGroup||rec.formGroup||env.mainForm),bp=rec.bookingParts||bookingParts(rec.booking),r1=S(rec.route1),r3=S(rec.route3),arrTTL=S(rec.arrPaxTTL||arrivalPaxTotal(rec.totalPax));let changed=false;
  if(g==='fsags421'){changed=safeSeed(env,'f421_route1',r1)||changed;changed=safeSeed(env,'f421_route3',r3)||changed;if(arrTTL)changed=safeSeed(env,'f421_arrPaxTTL',arrTTL)||changed;if(bp.F)changed=safeSeed(env,'f421_bookingF',bp.F)||changed;if(bp.C)changed=safeSeed(env,'f421_bookingC',bp.C)||changed;if(bp.Y)changed=safeSeed(env,'f421_bookingY',bp.Y)||changed}
  else if(g==='fsags551'){changed=safeSeed(env,'f551_route1',r1)||changed;changed=safeSeed(env,'f551_route3',r3)||changed}
  else if(g==='fsags09'){changed=safeSeed(env,'f09_route1',r1)||changed;changed=safeSeed(env,'f09_route3',r3)||changed;if(bp.total)changed=safeSeed(env,'f09_booking',bp.total)||changed;if(bp.F)changed=safeSeed(env,'f09_bookF',bp.F)||changed;if(bp.C)changed=safeSeed(env,'f09_bookC',bp.C)||changed;if(bp.Y)changed=safeSeed(env,'f09_bookY',bp.Y)||changed;if(bp.I)changed=safeSeed(env,'f09_bookI',bp.I)||changed}
  else {changed=safeSeed(env,'route1',r1)||changed;changed=safeSeed(env,'route2','CXR')||changed;changed=safeSeed(env,'route3',r3)||changed;if(arrTTL)changed=safeSeed(env,'arrPaxTTL',arrTTL)||changed;if(bp.F)changed=safeSeed(env,'bookingF',bp.F)||changed;if(bp.C)changed=safeSeed(env,'bookingC',bp.C)||changed;if(bp.Y)changed=safeSeed(env,'bookingY',bp.Y)||changed}
  if(changed){try{localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env))}catch(_){return false}if(S(root.activeFlightSessionId)===S(meta.id)){try{for(const k of Object.keys(root.state||{}))delete root.state[k];Object.assign(root.state,env.state||{});root.draw?.()}catch(_){}}}return changed;
}
function scan(raw){const vals=Object.values(raw||{}).filter(x=>x&&x.engine==='DAILY_ROSTER_V1');for(const rec of vals)if(rec.booking||rec.route1||rec.route3||rec.totalPax||rec.arrPaxTTL){setTimeout(()=>applyRec(rec),250);setTimeout(()=>applyRec(rec),900);setTimeout(()=>applyRec(rec),1900)}}
function bindFile(){const f=document.getElementById('drFile');if(!f||f.dataset.extraSeedV195)return;f.dataset.extraSeedV195='1';f.addEventListener('change',async()=>{try{if(f.files?.[0]){await parseFile(f.files[0]);const e=document.getElementById('drStatus');if(e&&lookup.size)e.textContent=(e.textContent?e.textContent+'\n':'')+`Route/Booking/TotalPax: đã đọc ${lookup.size} dòng để tự điền an toàn.`}}catch(e){console.warn('Roster Route/Booking parse',e)}})}
function install(){
  if(installed)return;const prev=root.sagsV470Ref;if(typeof prev!=='function'||!root.__SAGS_DAILY_ROSTER_TEST__){setTimeout(install,400);return}installed=true;root.__ROSTER_EXTRA_SEED_V195=BUILD;
  root.sagsV470Ref=function(path=''){
    const p=S(path),ref=prev(p);if(p===''&&ref&&typeof ref.update==='function'){const base=ref.update.bind(ref);ref.update=async patch=>{if(patch&&typeof patch==='object')enrichPatch(patch);return base(patch)}}
    if(/^roster_mail\/[^/]+\/items$/.test(p)&&ref){if(typeof ref.on==='function'){const bon=ref.on.bind(ref);ref.on=function(event,cb,...rest){if(event==='value'&&typeof cb==='function'){const wrap=s=>{const r=cb(s);try{scan(s?.val?.()||{})}catch(_){}return r};return bon(event,wrap,...rest)}return bon(event,cb,...rest)}}if(typeof ref.once==='function'){const bo=ref.once.bind(ref);ref.once=async function(){const s=await bo.apply(this,arguments);try{scan(s?.val?.()||{})}catch(_){}return s}}
    }
    return ref;
  };
  bindFile();const mo=new MutationObserver(bindFile);mo.observe(document.documentElement,{childList:true,subtree:true});root.__ROSTER_EXTRA_HDSD='DAILY ROSTER V1.95 + CBTT Grnd_Ls: Route/Booking/TotalPax lấy từ file roster. TotalPax dạng 440/437 lấy phần trước dấu / (440) điền ARR PAX: TTL trên 42.1/42.3. Chỉ seed khi ô trống hoặc còn đúng seed roster cũ; không ghi đè dữ liệu nhân viên đã sửa. Booking tổng chỉ điền FSAGS09; F/C/Y chỉ điền khi file Booking ghi rõ F/C/Y.';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})(window);

/* ===== END roster-extra-seed.js ===== */

/* ===== BEGIN roster-completed.js ===== */
/* E-REPORT SAGS · DAILY ROSTER COMPLETED TASKS + CUMULATIVE IMPORT · V1.87
   Shared flight completion status: one DATE + flight pair => all roster assignments complete together.
   No heartbeat. RTDB is used only for lightweight completion state. */
(function(root){
  "use strict";

  const BUILD="V1.87-20260820-01";
  const SESSION_PATH="roster_sessions";
  const STATUS_PATH="roster_flight_status";
  const MANIFEST_PATH="roster_manifests";
  const MAIL_PATH="roster_mail";
  const REVOKE_PATH="roster_revocations";
  let activeTab="pending";
  let renderGuard=false;
  let statusRef=null,statusCb=null,statusDate="",statusCache={};
  let lastPublishedSig="";

  const S=v=>String(v??"").trim();
  const now=()=>Date.now();
  const safeId=v=>S(v).replace(/[.#$\[\]\/]/g,"_");
  const norm=v=>S(v).toUpperCase().replace(/\s+/g," ").trim();
  const hashId=s=>{let h=2166136261>>>0;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase();};
  const validClock=v=>{
    const s=S(v).replace(/\s+/g,"");
    if(/^([01]\d|2[0-3]):[0-5]\d$/.test(s))return s;
    if(/^\d{4}$/.test(s)){
      const h=Number(s.slice(0,2)),m=Number(s.slice(2));
      if(h<24&&m<60)return s.slice(0,2)+":"+s.slice(2);
    }
    return "";
  };
  function todayIso(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function isRoster(meta){return !!S(meta?.rosterAssignmentId);}
  function envelopeOf(meta){try{return root.readFlightSessionEnvelope?.(meta.id)||{};}catch(e){return {};}}
  function pushbackOf(env){const st=(env&&env.state&&typeof env.state==="object")?env.state:{};return validClock(st.h24Start||st.f421_h24Start||"");}
  function opDateOf(meta,env){return S(meta?.rosterOpDate||env?.rosterOpDate||"");}
  function flightPartsFromState(st){
    const arr=S(st?.fltBefore||st?.f421_fltBefore||st?.f551_fltBefore||st?.f09_fltBefore||"");
    const dep=S(st?.fltAfter||st?.f421_fltAfter||st?.f551_fltAfter||st?.f09_fltAfter||"");
    return [arr,dep].map(x=>norm(x).replace(/[^A-Z0-9]/g,"")).filter(Boolean);
  }
  function flightSignature(meta,env){
    const st=(env&&env.state&&typeof env.state==="object")?env.state:{};
    const parts=flightPartsFromState(st);
    if(parts.length)return parts.join("_");
    const fromName=norm(meta?.name||"").match(/[A-Z0-9]{2,3}\s*\d{1,5}/g)||[];
    if(fromName.length)return fromName.map(x=>x.replace(/\s+/g,"")).join("_");
    return norm(meta?.name||meta?.id||"").replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  }
  function tripInfo(meta,env){
    const opDate=opDateOf(meta,env),sig=flightSignature(meta,env);
    if(!opDate||!sig)return null;
    return {opDate,sig,key:"RF_"+hashId(opDate+"|"+sig),label:S(meta?.name||sig.replace(/_/g," / "))};
  }
  function archivedAt(meta,env){return Number(env?.rosterCompletedArchivedAtMs||meta?.rosterCompletedArchivedAtMs||0)||0;}
  function completedAt(meta,env){return Number(env?.rosterCompletedAtMs||meta?.rosterCompletedAtMs||0)||0;}
  function sharedStatus(meta,env){const t=tripInfo(meta,env);return t?statusCache[t.key]||null:null;}
  function isTodayRoster(meta,env){return isRoster(meta)&&opDateOf(meta,env)===todayIso();}

  function classify(meta){
    const env=envelopeOf(meta);
    if(!isRoster(meta))return {kind:"manual",env,pushback:"",archived:false};
    if(!isTodayRoster(meta,env))return {kind:"outdated",env,pushback:"",archived:false};
    const localPush=pushbackOf(env),ss=sharedStatus(meta,env);
    const completed=!!localPush||ss?.completed===true;
    if(!completed)return {kind:"pending",env,pushback:"",archived:false};
    const archived=archivedAt(meta,env)>0;
    return {kind:archived?"archived":"completed",env,pushback:localPush||validClock(ss?.pushback||"")||"",archived,completedAt:completedAt(meta,env)||Number(ss?.completedAtMs||0)||0};
  }
  function listSorted(){try{return (root.readFlightSessionList?.()||[]).slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));}catch(e){return [];}}

  function ensureStyle(){
    if(document.getElementById("rosterCompletedStyle"))return;
    const st=document.createElement("style");st.id="rosterCompletedStyle";st.textContent=`
#rosterTaskTabs{display:none;grid-template-columns:1fr 1.45fr;gap:7px;margin:8px 0 10px}
.rosterTaskTab{min-height:44px;border:0;border-radius:10px;background:#e8edf2;color:#29445d;font:900 13px Arial;padding:7px 8px;touch-action:manipulation}
.rosterTaskTab.active{background:#0b5cab;color:#fff;box-shadow:0 3px 10px rgba(11,92,171,.2)}
.rosterTaskCount{display:inline-flex;min-width:23px;height:23px;align-items:center;justify-content:center;margin-left:5px;padding:0 6px;border-radius:99px;background:rgba(255,255,255,.9);color:#0b5cab;font:900 12px Arial}
.rosterTaskTab:not(.active) .rosterTaskCount{background:#fff;color:#34495e}
#rosterCompletedTools{display:none;margin:-2px 0 10px;gap:7px;align-items:center;justify-content:space-between;flex-wrap:wrap}
#rosterCompletedClear{min-height:38px;border:0;border-radius:9px;background:#f2e7e6;color:#9b261f;font:900 12px Arial;padding:8px 11px;touch-action:manipulation}
#rosterCompletedGuideBtn{min-height:38px;border:0;border-radius:9px;background:#eaf2fb;color:#174f86;font:900 12px Arial;padding:8px 11px;touch-action:manipulation}
#rosterTaskEmpty{display:none;padding:18px 12px;text-align:center;border:1px dashed #c9d2dc;border-radius:10px;background:#fafcfe;color:#607080;font:800 12px/1.45 Arial}
#rosterCompletedGuide{display:none;margin:0 0 10px;padding:10px 11px;border-radius:10px;background:#f5f8fb;color:#405466;font:12px/1.45 Arial}
#rosterCompletedGuide b{color:#0b5cab}.rosterCompletedBadge{display:inline-flex;margin-left:5px;padding:2px 6px;border-radius:99px;background:#e7f6ec;color:#14713d;font:900 10px Arial;vertical-align:middle}
@media(max-width:430px){#rosterTaskTabs{grid-template-columns:1fr 1.55fr}.rosterTaskTab{font-size:12px;padding:6px 5px}.rosterTaskCount{min-width:21px;height:21px;margin-left:3px}}`;
    document.head.appendChild(st);
  }
  function ensureUi(){
    ensureStyle();const current=document.getElementById("flightSessionCurrent"),listEl=document.getElementById("flightSessionList");if(!current||!listEl)return null;
    let tabs=document.getElementById("rosterTaskTabs");if(!tabs){
      tabs=document.createElement("div");tabs.id="rosterTaskTabs";tabs.innerHTML=`<button type="button" class="rosterTaskTab active" id="rosterTaskPendingBtn">CHUYẾN <span class="rosterTaskCount" id="rosterTaskPendingCount">0</span></button><button type="button" class="rosterTaskTab" id="rosterTaskCompletedBtn">✅ ĐÃ HOÀN THÀNH <span class="rosterTaskCount" id="rosterTaskCompletedCount">0</span></button>`;
      current.insertAdjacentElement("afterend",tabs);
      document.getElementById("rosterTaskPendingBtn").onclick=()=>{activeTab="pending";enhanceList();};
      document.getElementById("rosterTaskCompletedBtn").onclick=()=>{activeTab="completed";enhanceList();};
      const tools=document.createElement("div");tools.id="rosterCompletedTools";tools.innerHTML=`<button id="rosterCompletedClear" type="button">🗑 XÓA DANH SÁCH HOÀN THÀNH</button><button id="rosterCompletedGuideBtn" type="button">HDSD</button>`;tabs.insertAdjacentElement("afterend",tools);
      document.getElementById("rosterCompletedClear").onclick=clearCompletedList;
      document.getElementById("rosterCompletedGuideBtn").onclick=()=>{const g=document.getElementById("rosterCompletedGuide");if(g)g.style.display=g.style.display==="block"?"none":"block";};
      const guide=document.createElement("div");guide.id="rosterCompletedGuide";guide.innerHTML=`<b>HDSD:</b> Chỉ DAILY ROSTER <b>ngày hiện tại</b> được tính. Khi 42.1/42.3 của cùng chuyến lưu <b>PUSHBACK</b>, trạng thái hoàn thành nhẹ được đồng bộ theo <b>Ngày + cặp chuyến</b>; 55.1 và các assignment khác của đúng chuyến tự chuyển sang <b>✅ ĐÃ HOÀN THÀNH</b>. Xóa PUSHBACK sẽ đưa chuyến về CHUYẾN. Dọn cuối ca chỉ ẩn danh sách hoàn thành, không xóa hồ sơ. <b>ROSTER CỘNG DỒN:</b> có thể tạo roster nhiều đợt trong cùng ngày; đợt sau chỉ thêm chuyến mới hoặc cập nhật assignment trùng, không tự gỡ các chuyến đã tạo từ đợt trước.`;tools.insertAdjacentElement("afterend",guide);
      const empty=document.createElement("div");empty.id="rosterTaskEmpty";listEl.insertAdjacentElement("afterend",empty);
    }
    return tabs;
  }

  function enhanceList(){
    if(renderGuard)return;renderGuard=true;
    try{
      const tabs=ensureUi();if(!tabs)return;const listEl=document.getElementById("flightSessionList"),rows=Array.from(listEl?.children||[]).filter(x=>x.classList?.contains("flightSessionRow")),list=listSorted();
      let rosterToday=0,pendingCount=0,completedCount=0,visible=0;
      list.forEach((meta,i)=>{
        const c=classify(meta),row=rows[i];if(!row)return;
        if(c.kind==="pending"||c.kind==="completed"||c.kind==="archived")rosterToday++;
        if(c.kind==="pending")pendingCount++;if(c.kind==="completed")completedCount++;
        let show=false;
        if(c.kind==="outdated"||c.kind==="archived")show=false;
        else if(c.kind==="manual")show=activeTab==="pending";
        else if(activeTab==="completed")show=c.kind==="completed";
        else show=c.kind==="pending";
        row.style.display=show?"":"none";if(show)visible++;
        const sub=row.querySelector(".flightSessionSelect span");if(sub){sub.querySelectorAll(".rosterCompletedBadge").forEach(x=>x.remove());if(c.kind==="completed"){const badge=document.createElement("span");badge.className="rosterCompletedBadge";badge.textContent="✓ PUSHBACK "+(c.pushback||"ĐÃ GHI NHẬN");sub.appendChild(badge);}}
      });
      tabs.style.display=rosterToday?"grid":"none";
      const tools=document.getElementById("rosterCompletedTools"),guide=document.getElementById("rosterCompletedGuide"),empty=document.getElementById("rosterTaskEmpty"),pBtn=document.getElementById("rosterTaskPendingBtn"),cBtn=document.getElementById("rosterTaskCompletedBtn"),pCount=document.getElementById("rosterTaskPendingCount"),cCount=document.getElementById("rosterTaskCompletedCount");
      if(pCount)pCount.textContent=String(pendingCount);if(cCount)cCount.textContent=String(completedCount);
      pBtn?.classList.toggle("active",activeTab==="pending");cBtn?.classList.toggle("active",activeTab==="completed");if(tools)tools.style.display=rosterToday&&activeTab==="completed"?"flex":"none";
      const clear=document.getElementById("rosterCompletedClear");if(clear){clear.disabled=completedCount===0;clear.style.opacity=completedCount?"1":".45";}if(guide&&activeTab!=="completed")guide.style.display="none";
      if(empty){empty.style.display=rosterToday&&visible===0?"block":"none";empty.textContent=activeTab==="completed"?"Chưa có chuyến DAILY ROSTER nào đã hoàn thành hôm nay.":"Không còn chuyến DAILY ROSTER cần làm hôm nay.";}
    }finally{renderGuard=false;}
  }

  function saveMarkers(meta,env,completed,completedMs,preserveArchive=true){
    let changed=false;
    if(completed){
      const at=Number(completedMs||env.rosterCompletedAtMs||meta.rosterCompletedAtMs||now())||now();
      if(Number(env.rosterCompletedAtMs||0)!==at){env.rosterCompletedAtMs=at;changed=true;}if(Number(meta.rosterCompletedAtMs||0)!==at){meta.rosterCompletedAtMs=at;changed=true;}
      if(!preserveArchive){if(env.rosterCompletedArchivedAtMs){delete env.rosterCompletedArchivedAtMs;changed=true;}if(meta.rosterCompletedArchivedAtMs){delete meta.rosterCompletedArchivedAtMs;changed=true;}}
    }else if(env.rosterCompletedAtMs||meta.rosterCompletedAtMs||env.rosterCompletedArchivedAtMs||meta.rosterCompletedArchivedAtMs){delete env.rosterCompletedAtMs;delete meta.rosterCompletedAtMs;delete env.rosterCompletedArchivedAtMs;delete meta.rosterCompletedArchivedAtMs;changed=true;}
    return changed;
  }
  function syncAssignment(meta,env){
    const assignment=S(meta?.rosterAssignmentId);if(!assignment||typeof root.sagsV470Ref!=="function")return;
    const patch={completedAtMs:Number(env?.rosterCompletedAtMs||0)||null,completedPushback:pushbackOf(env)||null,completedListClearedAtMs:Number(env?.rosterCompletedArchivedAtMs||0)||null,"envelope/rosterCompletedAtMs":Number(env?.rosterCompletedAtMs||0)||null,"envelope/rosterCompletedArchivedAtMs":Number(env?.rosterCompletedArchivedAtMs||0)||null};
    try{root.sagsV470Ref(`${SESSION_PATH}/${safeId(assignment)}`).update(patch).catch?.(()=>{});}catch(e){}
  }
  function applySharedToLocal(){
    const list=root.readFlightSessionList?.()||[];let listChanged=false;
    for(let i=0;i<list.length;i++){
      const meta=list[i],env=envelopeOf(meta);if(!isTodayRoster(meta,env))continue;const t=tripInfo(meta,env);if(!t)continue;const ss=statusCache[t.key]||null,localPush=pushbackOf(env),done=!!localPush||ss?.completed===true;
      const changed=saveMarkers(meta,env,done,Number(ss?.completedAtMs||0)||0,true);if(changed){try{localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env));}catch(e){}list[i]=meta;listChanged=true;syncAssignment(meta,env);}
    }
    if(listChanged)root.writeFlightSessionList?.(list);
  }
  function statusPayload(meta,env,push){
    const t=tripInfo(meta,env);if(!t)return null;return {engine:"DAILY_ROSTER_V1",schema:1,opDate:t.opDate,tripKey:t.key,flightLabel:t.label,flightSignature:t.sig,completed:!!push,pushback:push||null,completedAtMs:push?now():null,updatedAtMs:now(),updatedBy:S(root.currentUserProfile?.username||"")};
  }
  function publishFlightStatus(meta,env,push){
    const p=statusPayload(meta,env,push);if(!p||typeof root.sagsV470Ref!=="function")return;
    statusCache[p.tripKey]=p;applySharedToLocal();enhanceList();const sig=JSON.stringify([p.opDate,p.tripKey,p.completed,p.pushback]);if(sig===lastPublishedSig)return;lastPublishedSig=sig;
    try{root.sagsV470Ref(`${STATUS_PATH}/${safeId(p.opDate)}/${safeId(p.tripKey)}`).set(p).catch?.(e=>console.info("Roster flight status",e?.message||e));}catch(e){}
  }
  function reconcileActiveCompletion(){
    try{
      const meta=root.currentFlightSessionMeta?.();if(!meta||!isRoster(meta))return;
      const env=envelopeOf(meta);if(!isTodayRoster(meta,env))return;
      // Chỉ 42.3 / 42.1 là nguồn có field PUSHBACK. 55.1/FSAGS09 chỉ NHẬN trạng thái chung,
      // tuyệt đối không được persist "không có PUSHBACK" rồi xóa trạng thái hoàn thành của chuyến.
      const group=S(meta?.initialGroup||env?.mainForm||"");
      if(group!=="fsags"&&group!=="fsags421")return;
      publishFlightStatus(meta,env,pushbackOf(env));
    }catch(e){console.info("Roster completion reconcile",e?.message||e);}
  }
  function stopStatusListener(){try{if(statusRef&&statusCb)statusRef.off("value",statusCb);}catch(e){}statusRef=null;statusCb=null;statusDate="";}
  function startStatusListener(){
    const d=todayIso();if(statusRef&&statusDate===d)return;stopStatusListener();statusDate=d;if(typeof root.sagsV470Ref!=="function")return;
    try{statusRef=root.sagsV470Ref(`${STATUS_PATH}/${safeId(d)}`);statusCb=s=>{statusCache=s.val()||{};applySharedToLocal();try{root.renderFlightSessionList?.();}catch(e){enhanceList();}};statusRef.on("value",statusCb,e=>console.info("Roster status listener",e?.message||e));}catch(e){console.info("Roster status listener start",e?.message||e);}
  }
  function migrateExistingPushbacks(){
    for(const meta of listSorted()){const env=envelopeOf(meta);if(!isTodayRoster(meta,env))continue;const push=pushbackOf(env);if(push){publishFlightStatus(meta,env,push);break;}}
  }

  async function clearCompletedList(){
    const list=root.readFlightSessionList?.()||[],targets=[];for(const meta of list){const c=classify(meta);if(c.kind==="completed")targets.push({meta,c});}if(!targets.length)return;
    const d=new Date(),label=`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;if(!confirm(`Xóa ${targets.length} chuyến đã hoàn thành khỏi danh sách công việc ngày ${label}?\n\nHồ sơ chuyến và biểu mẫu vẫn được giữ lại.`))return;
    const at=now();for(const x of targets){const meta=x.meta,env=x.c.env||envelopeOf(meta);meta.rosterCompletedArchivedAtMs=at;env.rosterCompletedArchivedAtMs=at;try{localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env));}catch(e){}syncAssignment(meta,env);}root.writeFlightSessionList?.(list);enhanceList();
  }
  root.dailyRosterClearCompletedList=clearCompletedList;

  // V3.16: DAILY ROSTER re-import on the same operational date is authoritative.
  // The newest file replaces the active roster assignment set for that date. Missing
  // assignments are revoked by dailyRosterPublish; missing flights are retained only as
  // historical Flight Records and marked ROSTER_REMOVED/INACTIVE. Business/module data
  // is never deleted here.
  function installCumulativeRosterMerge(){
    if(root.__rosterCumulativeMergeV187)return true;
    const originalRef=root.sagsV470Ref;
    if(typeof originalRef!=="function")return false;
    root.__rosterCumulativeMergeV187=true;

    root.sagsV470Ref=function(path=""){
      const ref=originalRef(path);
      if(S(path)!==""||!ref||typeof ref.update!=="function")return ref;
      const originalUpdate=ref.update.bind(ref);
      ref.update=async function(patch){
        if(!patch||typeof patch!=="object"||Array.isArray(patch))return originalUpdate(patch);
        const manifestKeys=Object.keys(patch).filter(k=>/^roster_manifests\/[^/]+$/.test(k));
        if(!manifestKeys.length)return originalUpdate(patch);

        let removed=0,updated=0,added=0;
        for(const manifestKey of manifestKeys){
          const incoming=patch[manifestKey];
          if(!incoming||typeof incoming!=="object"||!incoming.items)continue;
          const dateKey=manifestKey.slice((MANIFEST_PATH+"/").length);
          let old={};
          try{old=(await originalRef(`${MANIFEST_PATH}/${dateKey}`).once("value")).val()||{};}catch(e){old={};}
          const oldItems=(old.items&&typeof old.items==="object")?old.items:{};
          const newItems=(incoming.items&&typeof incoming.items==="object")?incoming.items:{};
          for(const id of Object.keys(newItems)){if(oldItems[id])updated++;else added++;}
          for(const id of Object.keys(oldItems)){if(!Object.prototype.hasOwnProperty.call(newItems,id))removed++;}

          // Do not merge old.items back. The incoming manifest is the authoritative active
          // set. Removal/revocation paths already prepared by dailyRosterPublish must pass
          // through unchanged.
          patch[manifestKey]={
            ...incoming,
            schema:Math.max(Number(incoming.schema||0),2),
            cumulative:false,
            cumulativeMode:null,
            syncMode:"REPLACE_SAME_DAY",
            previousBatchFileName:S(old.fileName||old.lastBatchFileName||""),
            lastBatchFileName:S(incoming.fileName||""),
            lastBatchAtMs:Number(incoming.publishedAtMs||now())
          };
        }
        root.__ROSTER_CUMULATIVE_LAST={removed,updated,added,atMs:now(),mode:"REPLACE_SAME_DAY"};
        return originalUpdate(patch);
      };
      return ref;
    };
    return true;
  }

  function installHooks(){
    if(root.__rosterCompletedHooksV186B02)return;root.__rosterCompletedHooksV186B02=true;
    try{const baseRender=root.renderFlightSessionList;if(typeof baseRender==="function")root.renderFlightSessionList=function(){const out=baseRender.apply(this,arguments);setTimeout(enhanceList,0);return out;};}catch(e){}
    try{const baseOpen=root.openFlightSessions;if(typeof baseOpen==="function")root.openFlightSessions=function(){activeTab="pending";startStatusListener();const out=baseOpen.apply(this,arguments);setTimeout(enhanceList,0);return out;};}catch(e){}
    try{const basePersist=root.persist;if(typeof basePersist==="function")root.persist=function(){const out=basePersist.apply(this,arguments);reconcileActiveCompletion();setTimeout(()=>{try{root.renderFlightSessionList?.();}catch(e){}},0);return out;};}catch(e){}
    try{const baseApply=root.applyRoleUI;if(typeof baseApply==="function")root.applyRoleUI=function(){const out=baseApply.apply(this,arguments);setTimeout(startStatusListener,40);return out;};}catch(e){}
    setTimeout(()=>{ensureUi();startStatusListener();applySharedToLocal();migrateExistingPushbacks();try{root.renderFlightSessionList?.();}catch(e){}},450);
    setInterval(()=>{if(statusDate&&statusDate!==todayIso()){statusCache={};startStatusListener();try{root.renderFlightSessionList?.();}catch(e){}}},60000);
  }

  installCumulativeRosterMerge();
  installHooks();root.__ROSTER_COMPLETED_BUILD=BUILD;root.__ROSTER_CUMULATIVE_BUILD=BUILD;
})(window);

/* ===== END roster-completed.js ===== */

/* ===== BEGIN flight-hub.js ===== */
/* E-REPORT SAGS V3.53 · MASTER FLIGHT HUB
 * One Daily Roster flight = one master flight record. Operational modules keep their canonical data
 * but register a compact pointer/status under the same flightId so every department works in one flight workspace.
 */
(function(root){'use strict';
  const BUILD='V3.53-20260822-01';
  const ROOT='flight_records', MANIFEST='roster_manifests', MAIL='roster_mail';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const hash=s=>{let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase()};
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
  const finiteNumber=(v,fallback=0)=>{const n=Number(v);return Number.isFinite(n)?n:fallback};
  function finiteSortMinute(value,dayOffset,clock){const raw=S(value),n=raw===''?NaN:Number(raw);if(Number.isFinite(n))return n;const m=/^(\d{2}):(\d{2})$/.exec(S(clock));return m?finiteNumber(dayOffset,0)*1440+Number(m[1])*60+Number(m[2]):999999}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function isoDate(v){const s=S(v);let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);if(m)return s;m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);if(m)return `${m[3]}-${m[2]}-${m[1]}`;m=/^(\d{8})$/.exec(s.replace(/\D/g,''));if(m){const x=m[1];if(Number(x.slice(0,4))>2000)return `${x.slice(0,4)}-${x.slice(4,6)}-${x.slice(6,8)}`;return `${x.slice(4,8)}-${x.slice(2,4)}-${x.slice(0,2)}`;}return today()}
  function splitFlights(raw){const s=U(raw).replace(/[\/]+/g,' '),out=[];let prefix='';for(const p0 of s.split(/\s+/).filter(Boolean)){const p=p0.replace(/[^A-Z0-9]/g,'');let m=/^([A-Z0-9]{2,3}?)(\d{1,5})$/.exec(p);if(m&&/[A-Z]/.test(m[1])){prefix=m[1];out.push(prefix+m[2]);continue}m=/^(\d{1,5})$/.exec(p);if(m&&prefix)out.push(prefix+m[1]);}return [...new Set(out)]}
  function flightId(date,arr,dep,raw){const flights=[normFlight(arr),normFlight(dep)].filter(Boolean);if(!flights.length)flights.push(...splitFlights(raw).map(normFlight));const sig=`${isoDate(date)}|${flights.join('|')||normFlight(raw)||'UNKNOWN'}`;return `FLT_${hash(sig)}`}
  function extractMailByAssignment(patch){const out={};for(const [k,v] of Object.entries(patch||{})){const m=/^roster_mail\/[^/]+\/items\/([^/]+)$/.exec(k);if(m&&v&&typeof v==='object')out[S(v.assignmentId||m[1])]=v;}return out}
  function enrichRosterPatch(patch){
    const mails=extractMailByAssignment(patch);
    for(const [k,v] of Object.entries(patch||{})){
      const m=/^roster_manifests\/([^/]+)$/.exec(k);if(!m||!v?.items)continue;
      const date=m[1],records={};
      for(const [aid,item0] of Object.entries(v.items||{})){
        const item={...item0},mail=mails[aid]||{};
        // V3.40: a roster assignment that replaces a matching manual task keeps the
        // existing master flightId. This prevents a second Flight Record when the
        // manual task initially knew only one leg and the later roster knows both.
        const fid=S(item.flightId||mail.flightId)||flightId(date,mail.arrFlight||item.arrFlight,mail.depFlight||item.depFlight,item.flightRaw||mail.flightRaw);
        item.flightId=fid;v.items[aid]=item;if(mails[aid])mails[aid].flightId=fid;
        const get=name=>mail[name]??item[name];
        const rec=records[fid]||(records[fid]={flightId:fid,opDate:date,flightRaw:S(item.flightRaw||mail.flightRaw),flightName:S(item.flightName||mail.flightName),arrFlight:S(get('arrFlight')),depFlight:S(get('depFlight')),sta:S(get('sta')),std:S(get('std')),eta:S(get('eta')),etd:S(get('etd')),arrFlightDate:S(get('arrFlightDate')||date),depFlightDate:S(get('depFlightDate')||date),etaFlightDate:S(get('etaFlightDate')||get('arrFlightDate')||date),etdFlightDate:S(get('etdFlightDate')||get('depFlightDate')||date),staClock:S(get('staClock')),stdClock:S(get('stdClock')),etaClock:S(get('etaClock')),etdClock:S(get('etdClock')),staDayOffset:finiteNumber(get('staDayOffset'),0),stdDayOffset:finiteNumber(get('stdDayOffset'),0),etaDayOffset:finiteNumber(get('etaDayOffset'),0),etdDayOffset:finiteNumber(get('etdDayOffset'),0),staSortMinute:finiteSortMinute(get('staSortMinute'),get('staDayOffset'),get('staClock')),stdSortMinute:finiteSortMinute(get('stdSortMinute'),get('stdDayOffset'),get('stdClock')),etaSortMinute:finiteSortMinute(get('etaSortMinute'),get('etaDayOffset'),get('etaClock')),etdSortMinute:finiteSortMinute(get('etdSortMinute'),get('etdDayOffset'),get('etdClock')),acReg:S(get('acReg')),acType:S(get('acType')),route:S(get('route')),bay:S(get('bay')),createdFrom:'DAILY_ROSTER',createdAtMs:Date.now(),updatedAtMs:Date.now(),assignments:{}});
        rec.assignments[aid]={assignmentId:aid,user:S(item.user||mail.targetUser),originalUser:S(item.originalUser||mail.originalTargetUser),formGroup:S(item.formGroup||mail.formGroup),sourceColumn:S(item.sourceColumn||mail.sourceColumn),roleKey:S(item.roleKey||mail.roleKey),workspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey||mail.workspaceKey||mail.rosterWorkspaceKey),assignmentScope:S(item.assignmentScope||mail.assignmentScope||'BOTH'),workPartOrder:finiteNumber(item.workPartOrder||mail.workPartOrder,1),workPartTotal:finiteNumber(item.workPartTotal||mail.workPartTotal,1),workPartSequenceSource:S(item.workPartSequenceSource||mail.workPartSequenceSource||item.sourceColumn||mail.sourceColumn),active:item.active!==false};
      }
      for(const [fid,rec] of Object.entries(records)){
        const base=`${ROOT}/${safe(date)}/${safe(fid)}`;
        for(const k of ['flightId','opDate','flightRaw','flightName','arrFlight','depFlight','sta','std','eta','etd','arrFlightDate','depFlightDate','etaFlightDate','etdFlightDate','staClock','stdClock','etaClock','etdClock','staDayOffset','stdDayOffset','etaDayOffset','etdDayOffset','staSortMinute','stdSortMinute','etaSortMinute','etdSortMinute','acReg','acType','route','bay','createdFrom'])patch[`${base}/${k}`]=rec[k]??'';
        patch[`${base}/updatedAtMs`]=Date.now();patch[`${base}/createdAtMs`]=rec.createdAtMs||Date.now();patch[`${base}/rosterActive`]=true;patch[`${base}/rosterStatus`]="ACTIVE";patch[`${base}/rosterRemovedAtMs`]=null;patch[`${base}/rosterRemovedBy`]=null;patch[`${base}/rosterRemovedSourceFile`]=null;
        // Firebase multi-location update forbids an ancestor path together with
        // any descendant path. DAILY ROSTER may already contain a removal such
        // as assignments/<oldId>/active, so never add the parent assignments
        // object here. Write each current assignment at its own sibling path.
        for(const [aid,assignment] of Object.entries(rec.assignments||{}))patch[`${base}/assignments/${safe(aid)}`]=assignment;
      }
      v.flightHubSchema=1;
    }
  }
  async function readDate(date){try{return (await root.sagsV470Ref(`${ROOT}/${safe(date)}`).once('value')).val()||{}}catch(_){return {}}}
  function identity(payload,meta){const id=payload?.identity||{},f09=payload?.f09||{},st=payload?.state||{};const rawFlights=[];for(const x of [id.flightToken,...(id.flights||[]),payload?.flight,payload?.flightRaw,f09.f09_fltBefore,f09.f09_fltAfter,st.fltBefore,st.fltAfter,st.f421_fltBefore,st.f421_fltAfter])if(S(x))rawFlights.push(normFlight(x));const flights=[...new Set(rawFlights.filter(Boolean))];const date=isoDate(meta?.opDate||id.date||id.dateToken||payload?.date||f09.f09_date||st.date||st.f421_date||meta?.date||today());return {date,flights,reg:S(id.acRegToken||payload?.acReg||payload?.acreg||f09.f09_regn||st.regn||st.f421_regn).toUpperCase()}}
  function matchRecord(records,flights){const fset=new Set(flights);for(const rec of Object.values(records||{})){const rfl=[rec.arrFlight,rec.depFlight,...splitFlights(rec.flightRaw),...splitFlights(rec.flightName)].map(normFlight).filter(Boolean);if(rfl.some(x=>fset.has(x)))return rec;}return null}
  function moduleSummary(kind,payload,meta){const k=U(kind),id=identity(payload,meta);const base={kind:k,updatedAtMs:Date.now(),updatedBy:S(root.currentUserProfile?.username||root.currentRole||''),docId:S(meta?.docId),sourcePath:S(meta?.sourcePath),revisionNo:Number(meta?.revisionNo||payload?.revisionNo||payload?.closeoutNo||0)||0,reg:id.reg};if(k==='KẾT SỔ'||k==='KET_SO'||k==='CLOSEOUT')return {...base,kind:'KẾT SỔ',status:'ĐÃ CÓ',adl:payload?.f09?.f09_finalADL??null,chd:payload?.f09?.f09_finalCHD??null,inf:payload?.f09?.f09_finalINF??null,bagPcs:payload?.f09?.f09_finalBagP??null,bagKg:payload?.f09?.f09_finalBagW??null};if(k==='FINAL')return {...base,status:'ĐÃ CÓ',form:S(payload?.form),crosscheckStatus:S(payload?.cleanCrosscheck?.[String(payload?.revisionNo||1)]?.status||'WAITING')};if(k==='RAMP')return {...base,status:S(meta?.status||'ĐANG KHAI THÁC'),sessionId:S(meta?.sessionId),assignmentId:S(meta?.assignmentId),workspaceKey:S(meta?.workspaceKey),sourcePath:S(meta?.sourcePath),chockOn:S(meta?.chockOn),doorClose:S(meta?.doorClose),chockOff:S(meta?.chockOff),pushback:S(meta?.pushback),cargoOffload:S(meta?.cargoOffload),cargoOnload:S(meta?.cargoOnload)};return {...base,status:S(meta?.status||'ĐÃ CẬP NHẬT')};}
  root.sagsFlightHubLink=async function(kind,payload,meta={}){try{if(typeof root.sagsV470Ref!=='function')return null;const id=identity(payload,meta),records=await readDate(id.date);let rec=matchRecord(records,id.flights),fid=rec?.flightId;if(!fid){fid=flightId(id.date,id.flights[0],id.flights[1],id.flights.join('/'));rec={flightId:fid,opDate:id.date,flightRaw:id.flights.join('/'),flightName:id.flights.join(' / '),arrFlight:id.flights[0]||'',depFlight:id.flights[1]||'',createdFrom:'MODULE_FALLBACK',createdAtMs:Date.now(),assignments:{}};}const mod=moduleSummary(kind,payload,meta),eventId=`EV_${Date.now()}_${hash(kind+'|'+S(meta.docId)+'|'+Math.random())}`;const patch={};patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/flightId`]=fid;patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/opDate`]=id.date;patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/updatedAtMs`]=Date.now();if(id.reg)patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/acReg`]=id.reg;patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/modules/${safe(mod.kind)}`]=mod;patch[`${ROOT}/${safe(id.date)}/${safe(fid)}/timeline/${safe(eventId)}`]={eventId,kind:mod.kind,status:mod.status,atMs:Date.now(),by:mod.updatedBy,docId:mod.docId,revisionNo:mod.revisionNo};await root.sagsV470Ref('').update(patch);return {flightId:fid,opDate:id.date}}catch(e){console.warn('FlightHub link',kind,e);return null}};
  function rampMeta(){try{const st=root.state||{},meta=typeof root.currentFlightSessionMeta==='function'?root.currentFlightSessionMeta():null,aid=S(meta?.rosterAssignmentId||st.rosterAssignmentId),wi=typeof root.rosterWorkspaceInfo==='function'?root.rosterWorkspaceInfo(aid):null;return {opDate:S(meta?.rosterOpDate),sessionId:S(root.activeFlightSessionId),assignmentId:aid,workspaceKey:S(wi?.workspaceKey),sourcePath:wi?.workspaceKey?`roster_flight_workspaces/${safe(wi.workspaceKey)}`:'',chockOn:S(st.h5||st.f421_h5),doorClose:S(st.h21||st.f421_h21),chockOff:S(st.h22||st.f421_h22),pushback:S(st.h24||st.f421_h24),cargoOffload:S(st.offloadCargoFinish||st.f421_offloadCargoFinish),cargoOnload:S(st.onloadCargoFinish||st.f421_onloadCargoFinish),status:S(st.h24||st.f421_h24)?'PUSHBACK':(S(st.h21||st.f421_h21)?'DOOR CLOSE':'ĐANG KHAI THÁC')}}catch(_){return {}}}
  let syncTimer=0,lastRampSig='';root.sagsFlightHubSyncCurrentRamp=function(){clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{try{if(!root.activeFlightSessionId)return;const st=clone(root.state||{}),m=rampMeta(),sig=JSON.stringify([root.activeFlightSessionId,m.chockOn,m.doorClose,m.chockOff,m.pushback,m.cargoOffload,m.cargoOnload,S(st.fltBefore||st.f421_fltBefore),S(st.fltAfter||st.f421_fltAfter)]);if(sig===lastRampSig)return;lastRampSig=sig;await root.sagsFlightHubLink('RAMP',{state:st},m)}catch(e){console.warn('FlightHub ramp',e)}},700)};
  function installPersistHook(){if(root.__FLIGHT_HUB_PERSIST_HOOK)return;const base=root.persist;if(typeof base!=='function'){setTimeout(installPersistHook,500);return}root.__FLIGHT_HUB_PERSIST_HOOK=1;root.persist=function(){const r=base.apply(this,arguments);try{root.sagsFlightHubSyncCurrentRamp()}catch(_){}return r}}
  function installRefHook(){if(root.__FLIGHT_HUB_REF_HOOK)return;const prev=root.sagsV470Ref;if(typeof prev!=='function'){setTimeout(installRefHook,500);return}root.__FLIGHT_HUB_REF_HOOK=1;root.sagsV470Ref=function(path=''){const ref=prev(path);if(S(path)===''&&ref&&typeof ref.update==='function'){const base=ref.update.bind(ref);ref.update=function(patch){if(patch&&typeof patch==='object'&&!Array.isArray(patch))try{enrichRosterPatch(patch)}catch(e){console.warn('FlightHub roster enrich',e)}return base(patch)}}return ref};}
  root.sagsFlightHubRead=async function(date){return await readDate(isoDate(date))};
  root.sagsFlightHubFlightId=flightId;
  root.__FLIGHT_HUB_HDSD='V3.53: DAILY ROSTER tạo 1 flightId/hồ sơ mẹ cho mỗi chuyến. Sửa bản update Firebase bị chồng đường dẫn assignments cha/con khi roster mới vừa thu hồi phân công cũ vừa ghi phân công mới trên cùng flightId.';

  function installDailyRosterUi(){
    try{const b=document.getElementById('drPublishBtn');if(b)b.textContent='✈ TẠO CHUYẾN';}catch(_){}
    if(root.__FLIGHT_HUB_DAILY_HOOK)return;const base=root.dailyRosterPublish;if(typeof base!=='function'){setTimeout(installDailyRosterUi,500);return}
    root.__FLIGHT_HUB_DAILY_HOOK=1;root.dailyRosterPublish=async function(){return await base.apply(this,arguments)};
  }
  root.sagsFlightHubModuleBadges=function(rec){const mods=rec?.modules||{},order=['KẾT SỔ','FINAL','RAMP','HÀNG HÓA','ULD','MVT','MVA'];return order.filter(k=>mods[k]).map(k=>({kind:k,status:S(mods[k]?.status||'ĐÃ CÓ'),revisionNo:Number(mods[k]?.revisionNo||0)}));};

  root.__SAGS_FLIGHT_HUB_TEST__={enrichRosterPatch};
  installRefHook();installPersistHook();installDailyRosterUi();root.__FLIGHT_HUB_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);

/* ===== END flight-hub.js ===== */

/* ===== BEGIN roster-leg-workspace.js ===== */
/* E-REPORT SAGS · DAILY ROSTER LEG WORKSPACE CONTINUITY · V1.93
 * One flight pair keeps one shared roster workspace for a given operational role/form.
 * Later roster batches may split ARRIVAL and DEPARTURE assignees without recreating form state.
 * No heartbeat. Only roster publish/mailbox/session events are intercepted.
 */
(function(root){
  'use strict';
  const BUILD='V1.93-20260820-01';
  const MANIFEST_PATH='roster_manifests';
  const MAIL_PATH='roster_mail';
  const SESSION_PATH='roster_sessions';
  const WORKSPACE_PATH='roster_flight_workspaces';
  const REVOKE_PATH='roster_revocations';
  const MAP_KEY='sags_roster_workspace_map_v193';
  const S=v=>String(v??'').trim();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const norm=v=>S(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
  const hash=s=>{let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h.toString(36).toUpperCase()};
  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
  let map={};
  try{map=JSON.parse(localStorage.getItem(MAP_KEY)||'{}')||{}}catch(_){map={}};
  function persistMap(){try{localStorage.setItem(MAP_KEY,JSON.stringify(map))}catch(_){}}
  function remember(id,workspaceKey,scope){id=S(id);workspaceKey=S(workspaceKey);if(!id||!workspaceKey)return;map[id]={workspaceKey,scope:S(scope||map[id]?.scope||'BOTH'),atMs:Date.now()};persistMap()}
  function mapping(id){return map[S(id)]||null}
  function stableKey(opDate,item){
    const flight=norm(item?.flightRaw||item?.flightName||'');
    const role=norm(item?.roleKey||item?.sourceColumn||'ROLE');
    const form=norm(item?.formGroup||'FORM');
    return 'RW_'+hash([S(opDate),flight,role,form].join('|'));
  }
  function sameDuty(a,b){
    if(!a||!b)return false;
    return norm(a.flightRaw||a.flightName)===norm(b.flightRaw||b.flightName)
      && norm(a.roleKey||a.sourceColumn)===norm(b.roleKey||b.sourceColumn)
      && norm(a.formGroup)===norm(b.formGroup);
  }
  function scanMailbox(raw){
    for(const rec of Object.values(raw||{})){
      if(!rec||typeof rec!=='object')continue;
      const id=S(rec.assignmentId),wk=S(rec.workspaceKey||rec.rosterWorkspaceKey);
      if(id&&wk)remember(id,wk,rec.assignmentScope||rec.legScope||'BOTH');
    }
  }
  function wrapMailboxRef(ref,path){
    if(!ref||!/^roster_mail\/[^/]+\/items$/.test(S(path)))return ref;
    const cbMap=new Map();
    if(typeof ref.on==='function'){
      const baseOn=ref.on.bind(ref);
      ref.on=function(event,cb,cancel){
        if(event!=='value'||typeof cb!=='function')return baseOn(event,cb,cancel);
        const wrapped=snap=>{try{scanMailbox(snap?.val?.()||{})}catch(_){}return cb(snap)};
        cbMap.set(cb,wrapped);
        return baseOn(event,wrapped,cancel);
      };
    }
    if(typeof ref.off==='function'){
      const baseOff=ref.off.bind(ref);
      ref.off=function(event,cb){const wrapped=cbMap.get(cb)||cb;const r=baseOff(event,wrapped);if(cb)cbMap.delete(cb);return r};
    }
    if(typeof ref.once==='function'){
      const baseOnce=ref.once.bind(ref);
      ref.once=async function(){const snap=await baseOnce.apply(this,arguments);try{scanMailbox(snap?.val?.()||{})}catch(_){}return snap};
    }
    return ref;
  }
  function redirectSessionPath(path){
    const m=/^roster_sessions\/([^/]+)(\/.*)?$/.exec(S(path));
    if(!m)return S(path);
    const hit=mapping(m[1]);
    return hit?.workspaceKey?`${WORKSPACE_PATH}/${safe(hit.workspaceKey)}${m[2]||''}`:S(path);
  }
  function rewriteSessionPatchPaths(patch){
    const adds={};
    for(const key of Object.keys(patch||{})){
      const m=/^roster_sessions\/([^/]+)(\/.*)?$/.exec(key);if(!m)continue;
      const hit=mapping(m[1]);if(!hit?.workspaceKey)continue;
      const nk=`${WORKSPACE_PATH}/${safe(hit.workspaceKey)}${m[2]||''}`;
      adds[nk]=patch[key];delete patch[key];
    }
    Object.assign(patch,adds);
  }
  async function loadVal(baseRef,path){try{return (await baseRef(path).once('value')).val()||null}catch(_){return null}}
  function patchMailFields(patch,user,id,wk,scope){
    user=safe(user);id=safe(id);if(!user||!id)return;
    const parent=`${MAIL_PATH}/${user}/items/${id}`;
    if(patch[parent]&&typeof patch[parent]==='object'){
      patch[parent]={...patch[parent],workspaceKey:wk,rosterWorkspaceKey:wk,assignmentScope:scope,active:true};
    }else if(patch[parent]!==null){
      patch[`${parent}/workspaceKey`]=wk;patch[`${parent}/rosterWorkspaceKey`]=wk;patch[`${parent}/assignmentScope`]=scope;patch[`${parent}/active`]=true;
    }
  }
  async function enhanceRosterPublish(baseRef,patch){
    const manifestKeys=Object.keys(patch||{}).filter(k=>/^roster_manifests\/[^/]+$/.test(k));
    if(!manifestKeys.length)return;
    for(const manifestKey of manifestKeys){
      const incoming=patch[manifestKey];if(!incoming?.items||typeof incoming.items!=='object')continue;
      const dateKey=manifestKey.slice(MANIFEST_PATH.length+1);
      const old=(await loadVal(baseRef,`${MANIFEST_PATH}/${dateKey}`))||{};
      const oldItems=old.items||{};
      const incomingItems=incoming.items||{};
      const incomingIds=new Set(Object.keys(incomingItems));

      for(const [newId,newItem0] of Object.entries(incomingItems)){
        const newItem={...newItem0};
        const sameId=oldItems[newId]||null;
        let peers=Object.entries(oldItems).filter(([id,x])=>id!==newId&&sameDuty(x,newItem));
        let arrival=peers.find(([,x])=>S(x.assignmentScope)==='ARRIVAL')||null;
        let departure=peers.find(([,x])=>S(x.assignmentScope)==='DEPARTURE')||null;
        const unscoped=peers.filter(([,x])=>!S(x.assignmentScope)||S(x.assignmentScope)==='BOTH');
        const wk=S(sameId?.workspaceKey||sameId?.rosterWorkspaceKey||arrival?.[1]?.workspaceKey||departure?.[1]?.workspaceKey||unscoped?.[0]?.[1]?.workspaceKey)||stableKey(dateKey,newItem);

        if(sameId){
          newItem.workspaceKey=wk;newItem.rosterWorkspaceKey=wk;newItem.assignmentScope=S(sameId.assignmentScope||'BOTH');
          incomingItems[newId]=newItem;remember(newId,wk,newItem.assignmentScope);
          patchMailFields(patch,newItem.user||newItem.targetUser,newId,wk,newItem.assignmentScope);
          continue;
        }

        // A later batch assigning the same flight/role to a different user means:
        // preserve the original worker as ARRIVAL and assign the latest worker to DEPARTURE.
        let source=arrival||unscoped[0]||departure;
        if(source){
          const [srcId,src0]=source,src={...src0,workspaceKey:wk,rosterWorkspaceKey:wk,assignmentScope:'ARRIVAL',active:true};
          // If an ARRIVAL already exists, the previous DEPARTURE is superseded instead.
          if(arrival&&departure){
            const [depId,dep0]=departure;
            const dep={...dep0,workspaceKey:wk,rosterWorkspaceKey:wk,assignmentScope:'DEPARTURE',active:false,supersededAtMs:Date.now(),supersededBy:newId};
            incomingItems[depId]=dep;
            const du=S(dep0.user||dep0.targetUser);
            if(du){patch[`${MAIL_PATH}/${safe(du)}/items/${safe(depId)}`]=null;patch[`${REVOKE_PATH}/${safe(du)}/items/${safe(depId)}`]={assignmentId:depId,reason:'LEG_REASSIGNED_DEPARTURE',toUser:S(newItem.user||newItem.targetUser),atMs:Date.now()};}
          }else{
            incomingItems[srcId]=src;
            patchMailFields(patch,src.user||src.targetUser,srcId,wk,'ARRIVAL');
            remember(srcId,wk,'ARRIVAL');
          }

          newItem.workspaceKey=wk;newItem.rosterWorkspaceKey=wk;newItem.assignmentScope='DEPARTURE';newItem.active=true;
          incomingItems[newId]=newItem;remember(newId,wk,'DEPARTURE');
          patchMailFields(patch,newItem.user||newItem.targetUser,newId,wk,'DEPARTURE');

          // Seed the common workspace once from the already-used assignment session.
          const wsPath=`${WORKSPACE_PATH}/${safe(wk)}`;
          let ws=await loadVal(baseRef,wsPath);
          if(!ws){
            const srcSession=await loadVal(baseRef,`${SESSION_PATH}/${safe(srcId)}`);
            if(srcSession)patch[wsPath]={...clone(srcSession),workspaceKey:wk,rosterWorkspaceKey:wk,migratedFromAssignmentId:srcId,migratedAtMs:Date.now()};
          }
        }else{
          newItem.workspaceKey=wk;newItem.rosterWorkspaceKey=wk;newItem.assignmentScope='BOTH';incomingItems[newId]=newItem;remember(newId,wk,'BOTH');patchMailFields(patch,newItem.user||newItem.targetUser,newId,wk,'BOTH');
        }
      }
      patch[manifestKey]={...incoming,workspaceSchema:1,legAssignmentMode:true,items:incomingItems};
    }
  }
  function install(){
    if(root.__ROSTER_LEG_WORKSPACE_V193)return;
    const previous=root.sagsV470Ref;if(typeof previous!=='function'){setTimeout(install,500);return;}
    root.__ROSTER_LEG_WORKSPACE_V193=BUILD;
    root.sagsV470Ref=function(path=''){
      const originalPath=S(path);
      const redirected=redirectSessionPath(originalPath);
      const ref=previous(redirected);
      wrapMailboxRef(ref,originalPath);
      if(originalPath===''&&ref&&typeof ref.update==='function'){
        const baseUpdate=ref.update.bind(ref);
        ref.update=async function(patch){
          if(patch&&typeof patch==='object'&&!Array.isArray(patch)){
            await enhanceRosterPublish(previous,patch);
            rewriteSessionPatchPaths(patch);
          }
          return baseUpdate(patch);
        };
      }
      return ref;
    };

    root.rosterWorkspaceInfo=function(assignmentId){return clone(mapping(assignmentId)||null)};
    root.__ROSTER_LEG_WORKSPACE_HDSD='DAILY ROSTER: 1 cặp chuyến giữ cùng workspace theo nghiệp vụ. Roster lại cùng người không recreate state. Nếu đổi người cho đợt chiều, người cũ giữ ARRIVAL; người mới nhận DEPARTURE và mở dữ liệu đã có. Đổi tiếp người Departure chỉ thay Departure, không xóa Arrival. Excel roster không được seed đè dữ liệu đã nhập.';
  }
  install();
})(window);

/* ===== END roster-leg-workspace.js ===== */

/* ===== BEGIN roster-handoff.js ===== */
/* E-REPORT SAGS V3.0 · DAILY ROSTER flight list + approved handoff workflow.
 * Keeps DAILY ROSTER creation untouched.
 * Flow: current owner A requests B -> AD/department manager approves -> B accepts -> assignment moves A -> B.
 * A stays current owner until B accepts. Every state transition is event-based; no heartbeat.
 */
(function(root){"use strict";
  const MANIFEST_PATH="roster_manifests";
  const MAIL_PATH="roster_mail";
  const SESSION_PATH="roster_sessions";
  const REVOKE_PATH="roster_revocations";
  const HANDOFF_PATH="roster_handoffs";
  const HANDOFF_MAIL_PATH="roster_handoff_mail";
  const MANAGER_TITLES=new Set(["TRƯỞNG PHÒNG","PHÓ PHÒNG","ĐỘI TRƯỞNG","ĐỘI PHÓ","CA TRƯỞNG","CA PHÓ"]);
  const S=x=>String(x??"").trim();
  const U=x=>S(x).toUpperCase();
  const esc=x=>S(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safe=x=>S(x).replace(/[.#$\[\]\/]/g,"_");
  const norm=x=>{try{return typeof normalizePersonalUsername==="function"?normalizePersonalUsername(x):U(x)}catch(_){return U(x)}};
  const now=()=>Date.now();
  function profile(){try{return typeof currentUserProfile!=="undefined"?currentUserProfile:(root.currentUserProfile||null)}catch(_){return root.currentUserProfile||null}}
  function currentRoleValue(){try{return typeof currentRole!=="undefined"?currentRole:(root.currentRole||"")}catch(_){return root.currentRole||""}}
  function me(){const p=profile();return norm(p?.username||(U(currentRoleValue())==="AD"?"AD":""));}
  function actor(){try{return typeof currentActor==="function"?currentActor():{username:me(),name:S(profile()?.name||me()),role:U(currentRoleValue())}}catch(_){return {username:me(),name:S(profile()?.name||me()),role:U(currentRoleValue())}}}
  function role(){return U(currentRoleValue()||profile()?.role)}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function fmt(ms){if(!ms)return "";try{return new Date(Number(ms)).toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"})}catch(_){return ""}}
  function formLabel(g){return g==="fsags421"?"42.1":g==="fsags551"?"55.1":g==="fsags09"?"FSAGS 09":"42.3";}
  function dbref(path){if(typeof sagsV470Ref!=="function")throw new Error("RTDB chưa sẵn sàng.");return sagsV470Ref(path);}
  async function catalog(force=false){try{return typeof v466GetUserCatalog==="function"?await v466GetUserCatalog(force):[]}catch(_){return []}}
  function profileOf(items,username){const u=norm(username);return (items||[]).find(x=>norm(x.username)===u)||null;}
  function depOf(p){return U(p?.departmentCode||p?.systemDepartment||"");}
  function groupOf(p){return U(p?.groupCode||"");}
  function isManagerProfile(p){return !!p&&p.active!==false&&MANAGER_TITLES.has(U(p.jobTitle));}
  function sameOperationalUnit(a,b){if(!a||!b)return false;const ad=depOf(a),bd=depOf(b);if(ad&&bd)return ad===bd;const ag=groupOf(a),bg=groupOf(b);return !!ag&&!!bg&&ag===bg;}
  function canApproveFor(h,items){if(role()==="AD")return true;const p=profileOf(items,me());if(!isManagerProfile(p))return false;const dep=U(h.departmentCode||"");return !!dep&&depOf(p)===dep;}
  async function readManifest(date){const s=await dbref(`${MANIFEST_PATH}/${safe(date)}`).once("value");return s.val()||null;}
  async function readHandoffs(date){const s=await dbref(`${HANDOFF_PATH}/${safe(date)}`).once("value");return s.val()||{};}
  function assignmentIdOf(h){return S(h.assignmentId);}
  function handoffId(assignmentId){return `RH_${safe(assignmentId)}_${now()}_${Math.random().toString(36).slice(2,7).toUpperCase()}`;}
  async function mailPayload(user,id,item,date){let p=null;try{p=(await dbref(`${MAIL_PATH}/${safe(user)}/items/${safe(id)}`).once("value")).val();}catch(_){ }
    return p||{engine:"daily-roster-v2",schema:2,assignmentId:id,opDate:date,flightRaw:S(item.flightRaw),flightName:S(item.flightName),formGroup:S(item.formGroup||"fsags"),sourceColumn:S(item.sourceColumn),roleKey:S(item.roleKey),workspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey),rosterWorkspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey),assignmentScope:S(item.assignmentScope||"BOTH"),active:true};
  }
  function ensureUI(){
    if(document.getElementById("rhModal"))return;
    const st=document.createElement("style");st.textContent=`
      #rhModal{display:none;position:fixed;inset:0;z-index:16540;background:rgba(0,0,0,.52);align-items:center;justify-content:center;padding:10px;font-family:Arial,sans-serif}#rhModal.show{display:flex}
      .rhPanel{width:min(98vw,1080px);max-height:94vh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-sizing:border-box;box-shadow:0 18px 50px rgba(0,0,0,.3)}.rhHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.rhHead h3{margin:0;color:#0b4f91}.rhSub{font-size:12px;color:#5d6875;line-height:1.45;margin:5px 0 10px}.rhTools{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.rhTools input{padding:8px;border:1px solid #cad6df;border-radius:8px}.rhBtn{border:0;border-radius:9px;padding:8px 11px;font-weight:800;background:#0b67b2;color:#fff;cursor:pointer}.rhBtn.gray{background:#eef3f7;color:#31475a;border:1px solid #ccd7df}.rhBtn.green{background:#15803d}.rhBtn.orange{background:#b45309}.rhBtn.red{background:#b42318}.rhBtn:disabled{opacity:.45;cursor:not-allowed}
      .rhTabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.rhTab{border:1px solid #c9d6e1;background:#f6f9fc;color:#27465f;border-radius:999px;padding:7px 11px;font-weight:800;cursor:pointer}.rhTab.on{background:#0b67b2;color:#fff;border-color:#0b67b2}.rhBadge{display:inline-block;min-width:18px;text-align:center;border-radius:999px;background:#b42318;color:#fff;padding:1px 6px;font-size:11px;margin-left:4px}
      .rhFlight{border:1px solid #d7e1e9;border-radius:12px;margin:8px 0;overflow:hidden}.rhFlightHead{padding:9px 10px;background:#edf5fb;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.rhFlightHead b{color:#173f60}.rhAssign{padding:9px 10px;border-top:1px solid #e6edf2;display:grid;grid-template-columns:minmax(160px,1.3fr) minmax(150px,1fr) minmax(170px,1.4fr);gap:8px;align-items:center;font-size:12px}.rhMeta{color:#607080}.rhOwner{font-weight:800;color:#164d73}.rhActions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.rhEmpty{padding:16px;text-align:center;color:#657482}.rhStatus{margin:8px 0;padding:8px 10px;border-radius:9px;background:#eef6ff;color:#244862;font-size:12px;white-space:pre-wrap}.rhStatus.err{background:#fff0f0;color:#9b1c1c}.rhCard{border:1px solid #d8e2ea;border-radius:11px;padding:10px;margin:8px 0}.rhCard.pending{border-color:#e0b46a;background:#fffaf0}.rhCard.approved{border-color:#79b98d;background:#f4fbf6}.rhCard.done{border-color:#86a9c6;background:#f5f9fc}.rhCard .title{font-weight:900;color:#173f60}.rhCard .line{font-size:12px;color:#596b79;margin-top:4px}.rhCard .buttons{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      #rhNotice{display:none;position:fixed;inset:0;z-index:17550;align-items:center;justify-content:center;background:rgba(5,20,34,.76);padding:16px;font:13px Arial;box-sizing:border-box}#rhNotice.show{display:flex}.rhNoticeCard{width:min(94vw,540px);overflow:hidden;background:#fff;color:#17324a;border:4px solid #b42318;border-radius:18px;box-shadow:0 22px 56px rgba(0,0,0,.5)}#rhNoticeTitle{display:block;margin:0;padding:13px 15px;background:#b42318;color:#fff;font:900 19px/1.3 Arial}#rhNoticeText{padding:14px 15px;color:#405d73;font:800 14px/1.5 Arial}.rhNoticeActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;padding:0 15px 14px}#rhNotice button{border:0;border-radius:10px;min-height:43px;padding:8px 12px;font-weight:900;cursor:pointer}#rhNoticeOpen{background:#b42318;color:#fff}#rhNoticeLater{background:#e8eef4;color:#29445b}
      @media(max-width:720px){.rhAssign{grid-template-columns:1fr}.rhActions{justify-content:flex-start}.rhPanel{padding:10px}.rhBtn{padding:9px 10px}}
    `;document.head.appendChild(st);
    const m=document.createElement("div");m.id="rhModal";m.innerHTML=`<div class="rhPanel"><div class="rhHead"><div><h3>✈ DANH SÁCH CHUYẾN · DAILY ROSTER</h3><div class="rhSub">Mỗi chuyến dùng workspace chung. Bàn giao chỉ có hiệu lực sau khi AD/Quản lý bộ phận duyệt và người nhận xác nhận tiếp nhận.</div></div><button class="rhBtn gray" onclick="rosterHandoffClose()">ĐÓNG</button></div><div class="rhTools"><input id="rhDate" type="date"><button class="rhBtn" onclick="rosterHandoffRefresh()">TẢI DANH SÁCH</button></div><div class="rhTabs"><button id="rhTabFlights" class="rhTab on" onclick="rosterHandoffTab('flights')">CHUYẾN BAY</button><button id="rhTabMine" class="rhTab" onclick="rosterHandoffTab('mine')">BÀN GIAO CỦA TÔI <span id="rhMineBadge"></span></button><button id="rhTabApprove" class="rhTab" onclick="rosterHandoffTab('approve')">CHỜ DUYỆT <span id="rhApproveBadge"></span></button></div><div id="rhStatus" class="rhStatus">Đang tải…</div><div id="rhBody"></div></div>`;document.body.appendChild(m);document.getElementById("rhDate").value=today();
    const n=document.createElement("div");n.id="rhNotice";n.setAttribute("role","dialog");n.setAttribute("aria-modal","true");n.innerHTML=`<div class="rhNoticeCard"><b id="rhNoticeTitle"></b><div id="rhNoticeText"></div><div class="rhNoticeActions"><button id="rhNoticeLater" onclick="rosterHandoffDismissNotice()">ĐỂ SAU</button><button id="rhNoticeOpen" onclick="rosterHandoffOpenFromNotice()">MỞ DANH SÁCH CHUYẾN</button></div></div>`;document.body.appendChild(n);
  }
  function ensureButton(){const bar=document.querySelector(".toolbar-row.main-actions");if(!bar)return;let b=document.getElementById("roleBtnRosterFlights");if(!b){b=document.createElement("button");b.id="roleBtnRosterFlights";b.textContent="✈ CHUYẾN HÔM NAY";b.onclick=()=>root.rosterHandoffOpen?.();const a=document.getElementById("roleBtnFlights");if(a?.parentNode)a.parentNode.insertBefore(b,a.nextSibling);else bar.appendChild(b);}b.style.display=role()?"":"none";}
  let currentTab="flights",cache={manifest:null,handoffs:{},users:[],flights:{}},mailRef=null,mailCb=null,noticeQueue=[],noticeShowing=false,noticeActive=null;
  function status(t,err=false){const e=document.getElementById("rhStatus");if(e){e.textContent=t;e.classList.toggle("err",!!err)}}
  function selectedDate(){return S(document.getElementById("rhDate")?.value)||today();}
  function pendingForMe(h){const u=me();return h&&(norm(h.fromUser)===u||norm(h.toUser)===u);}
  function actionBadge(){const hs=Object.values(cache.handoffs||{}),u=me();const mine=hs.filter(h=>pendingForMe(h)&&!["COMPLETED","REJECTED","CANCELLED"].includes(U(h.status))).length;const appr=hs.filter(h=>U(h.status)==="PENDING_APPROVAL"&&canApproveFor(h,cache.users)).length;document.getElementById("rhMineBadge").innerHTML=mine?`<span class="rhBadge">${mine}</span>`:"";document.getElementById("rhApproveBadge").innerHTML=appr?`<span class="rhBadge">${appr}</span>`:"";}
  function groupedAssignments(){const items=Object.values(cache.manifest?.items||{}).filter(x=>x&&x.active!==false);const m=new Map();for(const a of items){const k=S(a.flightRaw||a.flightName||a.assignmentId);if(!m.has(k))m.set(k,[]);m.get(k).push(a);}return [...m.entries()].sort((a,b)=>S(a[0]).localeCompare(S(b[0])));}
  function latestHandoffForAssignment(id){return Object.values(cache.handoffs||{}).filter(h=>assignmentIdOf(h)===S(id)&&!["COMPLETED","REJECTED","CANCELLED"].includes(U(h.status))).sort((a,b)=>Number(b.updatedAtMs||b.requestedAtMs||0)-Number(a.updatedAtMs||a.requestedAtMs||0))[0]||null;}
    function renderFlights(){const host=document.getElementById("rhBody"),u=me(),groups=groupedAssignments();if(!groups.length){host.innerHTML='<div class="rhEmpty">Ngày này chưa có chuyến được tạo từ DAILY ROSTER.</div>';return;}const hubs=Object.values(cache.flights||{});host.innerHTML=groups.map(([flight,arr])=>{const a0=arr[0]||{},fid=S(a0.flightId),hub=hubs.find(x=>S(x.flightId)===fid)||hubs.find(x=>S(x.flightRaw)===S(flight))||null,badges=(typeof sagsFlightHubModuleBadges==="function"?sagsFlightHubModuleBadges(hub):[]),moduleLine=badges.length?`<div class="rhMeta" style="width:100%;margin-top:5px">${badges.map(x=>`<span style="display:inline-block;margin:2px 4px 0 0;padding:3px 7px;border-radius:999px;background:#e9f7ee;color:#17643a;font-weight:900">${esc(x.kind)}: ${esc(x.status)}${x.revisionNo?` · L${x.revisionNo}`:""}</span>`).join("")}</div>`:`<div class="rhMeta" style="width:100%;margin-top:5px">Hồ sơ chuyến đã tạo · chưa có dữ liệu nghiệp vụ phát sinh.</div>`;return `<div class="rhFlight"><div class="rhFlightHead"><div><b>${esc(flight)}</b>${fid?`<div class="rhMeta">${esc(fid)}</div>`:""}</div><span class="rhMeta">STA ${esc(a0.sta||hub?.sta||"—")} · STD ${esc(a0.std||hub?.std||"—")} · ${esc(a0.acReg||hub?.acReg||"")}</span>${moduleLine}</div>${arr.map(a=>{const owner=norm(a.user||a.targetUser),h=latestHandoffForAssignment(a.assignmentId),isMine=owner===u,local=(typeof readFlightSessionList==="function"?readFlightSessionList():[]).find(x=>S(x.rosterAssignmentId)===S(a.assignmentId));let hs="";if(h)hs=`<div class="rhMeta">Bàn giao: ${esc(h.fromUser)} → ${esc(h.toUser)} · <b>${esc(statusLabel(h.status))}</b></div>`;return `<div class="rhAssign"><div><b>${esc(formLabel(a.formGroup))}</b> · ${esc(a.sourceColumn||a.roleKey||"")}<div class="rhMeta">${esc(a.assignmentScope||"BOTH")}</div></div><div><span class="rhOwner">${esc(owner||"CHƯA CÓ")}</span>${hs}</div><div class="rhActions">${isMine&&local?`<button class="rhBtn green" onclick="rosterHandoffOpenWork('${esc(a.assignmentId)}')">MỞ CÔNG VIỆC</button>`:""}${isMine&&!h?`<button class="rhBtn orange" onclick="rosterHandoffRequest('${esc(a.assignmentId)}')">BÀN GIAO</button>`:""}${isMine&&h&&U(h.status)==="PENDING_APPROVAL"?`<button class="rhBtn red" onclick="rosterHandoffCancel('${esc(h.id)}')">HỦY YÊU CẦU</button>`:""}</div></div>`}).join("")}</div>`}).join("");}
  function statusLabel(s){s=U(s);return s==="PENDING_APPROVAL"?"CHỜ DUYỆT":s==="APPROVED_WAITING_ACCEPT"?"ĐÃ DUYỆT · CHỜ TIẾP NHẬN":s==="COMPLETED"?"ĐÃ BÀN GIAO":s==="REJECTED"?"ĐÃ TỪ CHỐI":s==="CANCELLED"?"ĐÃ HỦY":s;}
  function handoffCard(h,mode){const canAp=canApproveFor(h,cache.users),isTo=norm(h.toUser)===me(),isFrom=norm(h.fromUser)===me();return `<div class="rhCard ${U(h.status)==="PENDING_APPROVAL"?"pending":U(h.status)==="APPROVED_WAITING_ACCEPT"?"approved":"done"}"><div class="title">${esc(h.flightRaw||h.flightName)} · ${esc(formLabel(h.formGroup))}</div><div class="line"><b>${esc(h.fromUser)}</b> → <b>${esc(h.toUser)}</b> · ${esc(statusLabel(h.status))}</div><div class="line">Đề nghị: ${esc(fmt(h.requestedAtMs))}${h.approvedAtMs?` · Duyệt: ${esc(h.approvedByName||h.approvedBy)} ${esc(fmt(h.approvedAtMs))}`:""}${h.acceptedAtMs?` · Tiếp nhận: ${esc(fmt(h.acceptedAtMs))}`:""}</div>${h.reason?`<div class="line">Lý do: ${esc(h.reason)}</div>`:""}<div class="buttons">${mode==="approve"&&canAp&&U(h.status)==="PENDING_APPROVAL"?`<button class="rhBtn green" onclick="rosterHandoffApprove('${esc(h.id)}')">DUYỆT</button><button class="rhBtn red" onclick="rosterHandoffReject('${esc(h.id)}')">TỪ CHỐI</button>`:""}${isTo&&U(h.status)==="APPROVED_WAITING_ACCEPT"?`<button class="rhBtn green" onclick="rosterHandoffAccept('${esc(h.id)}')">TIẾP NHẬN</button>`:""}${isFrom&&U(h.status)==="PENDING_APPROVAL"?`<button class="rhBtn red" onclick="rosterHandoffCancel('${esc(h.id)}')">HỦY YÊU CẦU</button>`:""}</div></div>`;}
  function renderMine(){const host=document.getElementById("rhBody"),hs=Object.values(cache.handoffs||{}).filter(pendingForMe).sort((a,b)=>Number(b.updatedAtMs||0)-Number(a.updatedAtMs||0));host.innerHTML=hs.length?hs.map(h=>handoffCard(h,"mine")).join(""):'<div class="rhEmpty">Không có yêu cầu bàn giao liên quan tài khoản này.</div>';}
  function renderApprove(){const host=document.getElementById("rhBody"),hs=Object.values(cache.handoffs||{}).filter(h=>U(h.status)==="PENDING_APPROVAL"&&canApproveFor(h,cache.users)).sort((a,b)=>Number(a.requestedAtMs||0)-Number(b.requestedAtMs||0));host.innerHTML=hs.length?hs.map(h=>handoffCard(h,"approve")).join(""):'<div class="rhEmpty">Không có yêu cầu nào đang chờ bạn duyệt.</div>';}
  function render(){actionBadge();document.querySelectorAll(".rhTab").forEach(x=>x.classList.remove("on"));document.getElementById(currentTab==="flights"?"rhTabFlights":currentTab==="mine"?"rhTabMine":"rhTabApprove")?.classList.add("on");if(currentTab==="flights")renderFlights();else if(currentTab==="mine")renderMine();else renderApprove();}
  root.rosterHandoffTab=function(t){currentTab=t;render();};
  root.rosterHandoffRefresh=async function(){ensureUI();const d=selectedDate();status("Đang tải chuyến, hồ sơ nghiệp vụ và trạng thái bàn giao…");try{const [man,hs,users,flights]=await Promise.all([readManifest(d),readHandoffs(d),catalog(false),typeof sagsFlightHubRead==="function"?sagsFlightHubRead(d):Promise.resolve({})]);cache={manifest:man,handoffs:hs,users,flights:flights||{}};status(man?`Ngày ${d}: ${Object.keys(cache.flights||{}).length} chuyến · ${Object.keys(man.items||{}).length} phân công · ${Object.keys(hs||{}).length} lịch sử/yêu cầu bàn giao.`:`Ngày ${d} chưa có DAILY ROSTER.`);render();}catch(e){status("Không tải được danh sách: "+S(e?.message||e),true)}};
  root.rosterHandoffOpen=function(){ensureUI();document.getElementById("rhModal")?.classList.add("show");document.getElementById("rhDate").value=today();currentTab="flights";void root.rosterHandoffRefresh();};
  root.rosterHandoffClose=function(){document.getElementById("rhModal")?.classList.remove("show");};
  root.rosterHandoffOpenWork=function(id){try{const list=typeof readFlightSessionList==="function"?readFlightSessionList():[],x=list.find(v=>S(v.rosterAssignmentId)===S(id));if(!x)return alert("Công việc chưa được đồng bộ về máy này. Hãy mở lại danh sách sau vài giây.");if(typeof switchFlightSession==="function")switchFlightSession(x.id);root.rosterHandoffClose();}catch(e){alert("Không mở được công việc: "+S(e?.message||e))}};
  root.rosterHandoffRequest=async function(id){try{const d=selectedDate(),man=cache.manifest||await readManifest(d),item=man?.items?.[id];if(!item)throw new Error("Không tìm thấy phân công.");const from=norm(item.user||item.targetUser);if(from!==me())throw new Error("Chỉ người đang phụ trách mới được đề nghị bàn giao.");if(latestHandoffForAssignment(id))throw new Error("Phân công này đã có yêu cầu bàn giao đang xử lý.");const users=cache.users?.length?cache.users:await catalog(false),fromP=profileOf(users,from);if(!fromP)throw new Error("Không tìm thấy hồ sơ tài khoản hiện tại trong catalog.");const candidates=users.filter(x=>x.active!==false&&norm(x.username)!==from&&sameOperationalUnit(fromP,x)).sort((a,b)=>S(a.name).localeCompare(S(b.name),"vi"));if(!candidates.length)throw new Error("Không có tài khoản ACTIVE cùng phòng/đơn vị để bàn giao.");const text=candidates.map((x,i)=>`${i+1}. ${x.name} (${x.username})`).join("\n");const pick=prompt(`BÀN GIAO ${item.flightRaw||""} · ${formLabel(item.formGroup)}\n\nChọn số người tiếp nhận:\n${text}`);if(pick===null)return;const idx=Number(pick)-1,toP=candidates[idx];if(!toP)throw new Error("Lựa chọn người nhận không hợp lệ.");const reason=prompt("Lý do/ghi chú bàn giao (có thể để trống):","");if(reason===null)return;const hid=handoffId(id),t=now(),h={id:hid,opDate:d,assignmentId:id,workspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey),assignmentScope:S(item.assignmentScope||"BOTH"),flightRaw:S(item.flightRaw),flightName:S(item.flightName),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),roleKey:S(item.roleKey),fromUser:from,fromName:S(fromP.name||from),toUser:norm(toP.username),toName:S(toP.name||toP.username),departmentCode:depOf(fromP),groupCode:groupOf(fromP),role:U(fromP.role),reason:S(reason),status:"PENDING_APPROVAL",requestedAtMs:t,updatedAtMs:t,requestedBy:actor()};const patch={};patch[`${HANDOFF_PATH}/${safe(d)}/${safe(hid)}`]=h;patch[`${HANDOFF_MAIL_PATH}/${safe(from)}/${safe(hid)}`]={id:hid,opDate:d,status:h.status,updatedAtMs:t};
      const approvers=users.filter(x=>(U(x.role)==="AD")||(isManagerProfile(x)&&depOf(x)===depOf(fromP)));for(const p of approvers)patch[`${HANDOFF_MAIL_PATH}/${safe(norm(p.username))}/${safe(hid)}`]={id:hid,opDate:d,status:h.status,updatedAtMs:t,kind:"APPROVAL"};patch[`${HANDOFF_MAIL_PATH}/AD/${safe(hid)}`]={id:hid,opDate:d,status:h.status,updatedAtMs:t,kind:"APPROVAL"};await dbref("").update(patch);status(`✓ Đã gửi đề nghị ${from} → ${h.toUser}. A vẫn là người phụ trách cho đến khi được duyệt và B bấm TIẾP NHẬN.`);await root.rosterHandoffRefresh();}catch(e){status("Không tạo được bàn giao: "+S(e?.message||e),true)}};
  async function getHandoff(id){const d=selectedDate(),snap=await dbref(`${HANDOFF_PATH}/${safe(d)}/${safe(id)}`).once("value");return {d,h:snap.val()||null};}
  root.rosterHandoffApprove=async function(id){try{const {d,h}=await getHandoff(id);if(!h||U(h.status)!=="PENDING_APPROVAL")throw new Error("Yêu cầu không còn ở trạng thái chờ duyệt.");const users=cache.users?.length?cache.users:await catalog(false);if(!canApproveFor(h,users))throw new Error("Bạn không có quyền duyệt yêu cầu của bộ phận này.");const a=actor(),t=now(),patch={};patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/status`]="APPROVED_WAITING_ACCEPT";patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/approvedAtMs`]=t;patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/approvedBy`]=norm(a.username||me());patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/approvedByName`]=S(a.name||a.username);patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/updatedAtMs`]=t;patch[`${HANDOFF_MAIL_PATH}/${safe(h.toUser)}/${safe(id)}`]={id,opDate:d,status:"APPROVED_WAITING_ACCEPT",updatedAtMs:t,kind:"ACCEPT"};patch[`${HANDOFF_MAIL_PATH}/${safe(h.fromUser)}/${safe(id)}`]={id,opDate:d,status:"APPROVED_WAITING_ACCEPT",updatedAtMs:t};await dbref("").update(patch);status(`✓ Đã duyệt. ${h.toUser} đã nhận thông báo và phải bấm TIẾP NHẬN trước khi quyền được chuyển.`);await root.rosterHandoffRefresh();}catch(e){status("Không duyệt được: "+S(e?.message||e),true)}};
  root.rosterHandoffReject=async function(id){try{const {d,h}=await getHandoff(id);if(!h||U(h.status)!=="PENDING_APPROVAL")throw new Error("Yêu cầu không còn ở trạng thái chờ duyệt.");const users=cache.users?.length?cache.users:await catalog(false);if(!canApproveFor(h,users))throw new Error("Bạn không có quyền từ chối yêu cầu này.");const note=prompt("Lý do từ chối (có thể để trống):","");if(note===null)return;const a=actor(),t=now(),patch={};patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/status`]="REJECTED";patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/rejectedAtMs`]=t;patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/rejectedBy`]=norm(a.username||me());patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/rejectedByName`]=S(a.name||a.username);patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/rejectReason`]=S(note);patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/updatedAtMs`]=t;patch[`${HANDOFF_MAIL_PATH}/${safe(h.fromUser)}/${safe(id)}`]={id,opDate:d,status:"REJECTED",updatedAtMs:t};await dbref("").update(patch);status("Đã từ chối yêu cầu bàn giao.");await root.rosterHandoffRefresh();}catch(e){status("Không từ chối được: "+S(e?.message||e),true)}};
  root.rosterHandoffCancel=async function(id){try{const {d,h}=await getHandoff(id);if(!h||norm(h.fromUser)!==me()||U(h.status)!=="PENDING_APPROVAL")throw new Error("Chỉ người đề nghị được hủy khi yêu cầu còn chờ duyệt.");if(!confirm("Hủy yêu cầu bàn giao này?"))return;const t=now();await dbref("").update({[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/status`]:"CANCELLED",[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/cancelledAtMs`]:t,[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/updatedAtMs`]:t});status("Đã hủy yêu cầu bàn giao.");await root.rosterHandoffRefresh();}catch(e){status("Không hủy được: "+S(e?.message||e),true)}};
  root.rosterHandoffAccept=async function(id){try{const {d,h}=await getHandoff(id);if(!h||U(h.status)!=="APPROVED_WAITING_ACCEPT")throw new Error("Yêu cầu chưa được duyệt hoặc đã xử lý.");if(norm(h.toUser)!==me())throw new Error("Chỉ đúng người được bàn giao mới được tiếp nhận.");const man=await readManifest(d),item=man?.items?.[h.assignmentId];if(!item)throw new Error("Không còn tìm thấy assignment trong DAILY ROSTER.");const current=norm(item.user||item.targetUser);if(current!==norm(h.fromUser))throw new Error(`Người phụ trách đã thay đổi (${current}); không thể áp dụng yêu cầu cũ.`);if(!confirm(`TIẾP NHẬN ${h.flightRaw||""} · ${formLabel(h.formGroup)} từ ${h.fromUser}?\n\nSau xác nhận, bạn trở thành người phụ trách hiện tại.`))return;const t=now(),old=norm(h.fromUser),target=norm(h.toUser),payload=await mailPayload(old,h.assignmentId,item,d);const a=actor();const nextPayload={...payload,targetUser:target,originalTargetUser:item.originalUser||payload.originalTargetUser||old,manualOverride:true,reassignedFrom:old,reassignedAtMs:t,reassignedBy:target,handoffId:id,handoffApprovedBy:S(h.approvedBy),active:true};const nextItem={...item,user:target,originalUser:item.originalUser||payload.originalTargetUser||old,manualOverride:true,assignmentId:h.assignmentId,lastHandoffId:id,lastHandoffAtMs:t};const patch={};patch[`${MAIL_PATH}/${safe(old)}/items/${safe(h.assignmentId)}`]=null;patch[`${MAIL_PATH}/${safe(target)}/items/${safe(h.assignmentId)}`]=nextPayload;patch[`${REVOKE_PATH}/${safe(old)}/items/${safe(h.assignmentId)}`]={assignmentId:h.assignmentId,reason:"APPROVED_HANDOFF",toUser:target,atMs:t,by:target,handoffId:id};patch[`${REVOKE_PATH}/${safe(target)}/items/${safe(h.assignmentId)}`]=null;patch[`${MANIFEST_PATH}/${safe(d)}/items/${safe(h.assignmentId)}`]=nextItem;patch[`${SESSION_PATH}/${safe(h.assignmentId)}/ownerUser`]=target;patch[`${SESSION_PATH}/${safe(h.assignmentId)}/reassignedAtMs`]=t;patch[`${SESSION_PATH}/${safe(h.assignmentId)}/reassignedBy`]=target;patch[`${SESSION_PATH}/${safe(h.assignmentId)}/handoffId`]=id;patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/status`]="COMPLETED";patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/acceptedAtMs`]=t;patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/acceptedBy`]=target;patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/acceptedByName`]=S(a.name||target);patch[`${HANDOFF_PATH}/${safe(d)}/${safe(id)}/updatedAtMs`]=t;patch[`${HANDOFF_MAIL_PATH}/${safe(old)}/${safe(id)}`]={id,opDate:d,status:"COMPLETED",updatedAtMs:t};patch[`${HANDOFF_MAIL_PATH}/${safe(target)}/${safe(id)}`]={id,opDate:d,status:"COMPLETED",updatedAtMs:t};await dbref("").update(patch);status(`✓ ${target} đã tiếp nhận. Người phụ trách hiện tại: ${target}. Lịch sử ${old} → ${target} được giữ trong hồ sơ bàn giao.`);await root.rosterHandoffRefresh();}catch(e){status("Không tiếp nhận được: "+S(e?.message||e),true)}};
  function seenKey(id,status){return `sags_rh_seen_${safe(me())}_${safe(id)}_${safe(status)}`}
  function enqueueNotice(x){if(!x?.id||!x.status)return;const k=seenKey(x.id,x.status);try{if(localStorage.getItem(k))return;localStorage.setItem(k,"1")}catch(_){ }noticeQueue.push(x);showNextNotice();}
  async function showNextNotice(){if(noticeShowing||!noticeQueue.length)return;noticeShowing=true;const x=noticeQueue.shift(),approval=U(x.status)==="PENDING_APPROVAL"&&U(x.kind)==="APPROVAL";let title="THÔNG BÁO BÀN GIAO",text=statusLabel(x.status);try{const snap=await dbref(`${HANDOFF_PATH}/${safe(x.opDate||today())}/${safe(x.id)}`).once("value"),h=snap.val()||{};if(approval){title="CÓ YÊU CẦU BÀN GIAO CHỜ DUYỆT";text=`${h.flightRaw||""} · ${h.fromUser||""} → ${h.toUser||""}. Bấm ĐỂ SAU thì yêu cầu vẫn còn trong CẦN XỬ LÝ.`;}else if(U(x.status)==="APPROVED_WAITING_ACCEPT"&&norm(h.toUser)===me()){title="CHUYẾN ĐƯỢC BÀN GIAO CHO BẠN";text=`${h.flightRaw||""} · ${formLabel(h.formGroup)} · từ ${h.fromUser||""}. Mở danh sách để TIẾP NHẬN.`;}else if(U(x.status)==="REJECTED"){title="YÊU CẦU BÀN GIAO BỊ TỪ CHỐI";text=`${h.flightRaw||""} · ${h.fromUser||""} → ${h.toUser||""}`;}else if(U(x.status)==="COMPLETED"){title="BÀN GIAO ĐÃ HOÀN TẤT";text=`${h.flightRaw||""} · ${h.fromUser||""} → ${h.toUser||""}`;}}catch(_){ }
    noticeActive=x;const n=document.getElementById("rhNotice"),open=document.getElementById("rhNoticeOpen");document.getElementById("rhNoticeTitle").textContent=title;document.getElementById("rhNoticeText").textContent=text;if(open)open.textContent=approval?"MỞ HÀNG CHỜ DUYỆT":"MỞ DANH SÁCH CHUYẾN";n?.classList.add("show");if(approval)try{navigator.vibrate?.([160,80,160])}catch(_){}}
  root.rosterHandoffDismissNotice=function(){document.getElementById("rhNotice")?.classList.remove("show");noticeShowing=false;noticeActive=null;setTimeout(showNextNotice,120);};
  root.rosterHandoffOpenFromNotice=function(){const tab=U(noticeActive?.status)==="PENDING_APPROVAL"&&U(noticeActive?.kind)==="APPROVAL"?"approve":"mine";root.rosterHandoffDismissNotice();root.rosterHandoffOpen();currentTab=tab;setTimeout(()=>{currentTab=tab;render()},300);};
  root.sagsRosterHandoffOpenTab=async function(tab="mine",date=today()){ensureUI();document.getElementById("rhModal")?.classList.add("show");const input=document.getElementById("rhDate");if(input)input.value=S(date)||today();currentTab=["approve","mine","flights"].includes(tab)?tab:"mine";await root.rosterHandoffRefresh();currentTab=["approve","mine","flights"].includes(tab)?tab:"mine";render()};
  root.sagsRosterHandoffGetActionItems=async function(){const u=me();if(!u)return[];const paths=[`${HANDOFF_MAIL_PATH}/${safe(u)}`];if(role()==="AD"&&safe(u)!=="AD")paths.push(`${HANDOFF_MAIL_PATH}/AD`);const boxes=await Promise.allSettled(paths.map(p=>dbref(p).once("value"))),mail={};for(const x of boxes)if(x.status==="fulfilled")Object.assign(mail,x.value.val()||{});const dates=[...new Set([today(),...Object.values(mail).map(x=>S(x?.opDate)).filter(Boolean)])].slice(0,4),sets=await Promise.allSettled(dates.map(d=>readHandoffs(d))),byId={};sets.forEach((x,i)=>{if(x.status==="fulfilled")for(const [id,h] of Object.entries(x.value||{}))byId[id]={...h,id:S(h?.id||id),opDate:S(h?.opDate||dates[i])}});const users=await catalog(false),out=[];for(const [id,m] of Object.entries(mail)){const h=byId[id]||{...m,id,opDate:S(m?.opDate||today())},st=U(h.status||m?.status),from=norm(h.fromUser),to=norm(h.toUser),canAp=st==="PENDING_APPROVAL"&&canApproveFor(h,users),base={id:`HANDOFF:${id}`,source:"HANDOFF",sourceId:id,title:"BÀN GIAO CHUYẾN",flight:S(h.flightRaw||h.flightName),flightId:S(h.flightId),flightToken:S(h.flightRaw||h.flightName),opDate:S(h.opDate||today()),status:st,createdAtMs:Number(h.requestedAtMs||h.updatedAtMs||m?.updatedAtMs||0),updatedAtMs:Number(h.updatedAtMs||m?.updatedAtMs||h.requestedAtMs||0),author:S(h.fromName||h.fromUser),target:S(h.toName||h.toUser),reason:S(h.rejectReason||h.reason)};if(canAp){out.push({...base,bucket:"approval",nextAction:"MỞ HÀNG CHỜ DUYỆT",handoffTab:"approve"});continue}if(st==="APPROVED_WAITING_ACCEPT"&&to===u){out.push({...base,bucket:"mine",nextAction:"TIẾP NHẬN CHUYẾN",handoffTab:"mine"});continue}if(["PENDING_APPROVAL","APPROVED_WAITING_ACCEPT"].includes(st)&&from===u){out.push({...base,bucket:"waiting",nextAction:"XEM TRẠNG THÁI",handoffTab:"mine"});continue}if(st==="REJECTED"&&from===u){out.push({...base,bucket:"returned",nextAction:"XEM LÝ DO",handoffTab:"mine"});continue}if(["COMPLETED","REJECTED","CANCELLED"].includes(st)&&(from===u||to===u||role()==="AD"))out.push({...base,bucket:"history",nextAction:"XEM LỊCH SỬ",handoffTab:"mine"})}return out};
  function stopMail(){try{if(mailRef&&mailCb)mailRef.off("child_added",mailCb);}catch(_){ }mailRef=mailCb=null;}
  function startMail(){stopMail();const u=me();if(!u)return;try{mailRef=dbref(`${HANDOFF_MAIL_PATH}/${safe(u)}`);mailCb=s=>enqueueNotice(s.val()||{});mailRef.on("child_added",mailCb,e=>console.warn("handoff mail",e));}catch(e){console.warn("handoff listener",e)}}
  const baseApply=root.applyRoleUI;if(typeof baseApply==="function")root.applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(()=>{ensureUI();ensureButton();startMail()},0);return r;};
  setTimeout(()=>{ensureUI();ensureButton();startMail()},1000);
  root.__ROSTER_HANDOFF_HDSD="DAILY ROSTER tạo danh sách chuyến. Người đang phụ trách A bấm BÀN GIAO và chọn B ACTIVE cùng phòng/đơn vị; không bắt buộc cùng role/chức danh. A vẫn phụ trách trong lúc chờ. AD hoặc quản lý cùng phòng (Trưởng/Phó phòng, Đội trưởng/Đội phó, Ca trưởng/Ca phó) DUYỆT. Sau duyệt B nhận thông báo và bấm TIẾP NHẬN. Chỉ lúc đó assignment/workspace mới chuyển A→B; lịch sử người đề nghị, người duyệt, người tiếp nhận và thời gian được giữ trong roster_handoffs.";
})(typeof window!=="undefined"?window:globalThis);

/* ===== END roster-handoff.js ===== */

/* ===== BEGIN admin-hub.js ===== */
/* E-REPORT SAGS V3.0 · Compact Admin Management Hub */
(function(root){'use strict';
 const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
 function session(){try{return root.__sagsGetSession?.()||{}}catch(_){return {}}}
 function isAD(){const x=session();return U(x.role||x.profile?.role)==='AD'}
 const groups=[
  {key:'ops',title:'✈ VẬN HÀNH CHUYẾN',sub:'DAILY ROSTER tự tạo chuyến, Flight Workspace và theo dõi khai thác',items:[
    ['roleBtnRosterFlights','✈ DANH SÁCH CHUYẾN HÔM NAY','Mở hồ sơ chuyến và phân công/bàn giao'],
    ['roleBtnActivity','📊 TIẾN ĐỘ','Theo dõi các chuyến đang khai thác'],
    ['roleBtnAcLimits','⚠ A/C LIMITS','Hạn chế tàu bay / cảnh báo khai thác'],
    ['roleBtnFleet','🛫 FLEET TÀU BAY','A/C REG · A/C TYPE · CONFIG']
  ]},
  {key:'people',title:'👥 NHÂN SỰ & CẤU HÌNH',sub:'Tài khoản, quyền và cấu hình chức năng',items:[
    ['roleBtnAccounts','👤 TÀI KHOẢN & PHÂN QUYỀN','Tạo/sửa tài khoản, vai trò và quyền'],
    ['roleBtnAdminBuilder','🧩 ADMIN BUILDER','Biểu mẫu động, nút, cảnh báo và cấu hình']
  ]},
  {key:'monitor',title:'🛡 GIÁM SÁT & HỒ SƠ',sub:'Nhật ký, tài nguyên hệ thống và lưu trữ',items:[
    ['roleBtnAudit','🧾 NHẬT KÝ / AUDIT','Các mốc FINAL, KẾT SỔ và UPDATE quan trọng'],
    ['roleBtnFirebaseUsage','🔥 FIREBASE USAGE','Theo dõi mức sử dụng Firebase'],
    ['roleBtnArchive','🗄 HỒ SƠ','Tra cứu hồ sơ lưu trữ'],
  ]}
 ];
 const hideIds=['roleBtnDailyRoster','roleBtnRosterFlights','roleBtnActivity','roleBtnAcLimits','roleBtnFleet','roleBtnAccounts','roleBtnAdminBuilder','roleBtnAudit','roleBtnFirebaseUsage','roleBtnArchive'];
 function ensure(){
  if(!document.getElementById('adminHubStyle')){const st=document.createElement('style');st.id='adminHubStyle';st.textContent=`body.sagsAdminHub ${hideIds.map(x=>'#'+x).join(',body.sagsAdminHub ')}{display:none!important}#adminHubModal{display:none;position:fixed;inset:0;z-index:17600;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:12px;font-family:Arial,sans-serif}#adminHubModal.show{display:flex}.ahPanel{width:min(95vw,760px);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 18px 48px rgba(0,0,0,.35)}.ahHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.ahHead h3{margin:0;color:#0b4f91}.ahClose,.ahGroupBtn,.ahBack,.ahItem,.ahRosterBtn{border:0;border-radius:11px;font-weight:900;cursor:pointer}.ahClose,.ahBack{padding:8px 11px;background:#eef2f6;color:#334}.ahGroups{display:grid;grid-template-columns:1fr;gap:10px;margin-top:14px}.ahGroupBtn{min-height:78px;padding:14px;text-align:left;background:#eef6ff;color:#164e7a;border:1px solid #c9def0;font-size:18px}.ahGroupBtn small,.ahItem small{display:block;font-size:12px;font-weight:700;color:#657789;margin-top:5px}.ahSectionHead{display:flex;align-items:center;gap:8px;margin:14px 0 8px}.ahSectionHead h4{margin:0;color:#294b66;font-size:17px}.ahGrid{display:grid;grid-template-columns:1fr;gap:8px}.ahItem{min-height:58px;padding:10px 12px;text-align:left;background:#f7fbff;color:#164e7a;border:1px solid #d3e3ef;font-size:15px}.ahRosterBox{padding:14px;border-radius:14px;background:#eaf7ef;border:2px solid #9bcfab;margin:10px 0 14px}.ahRosterTitle{font-size:19px;font-weight:900;color:#176b32;margin-bottom:5px}.ahRosterSub{font-size:12px;font-weight:700;color:#526b59;margin-bottom:10px}.ahRosterFile{display:block;width:100%;box-sizing:border-box;padding:10px;background:#fff;border:1px solid #b8c9bd;border-radius:10px;margin-bottom:9px}.ahRosterBtn{width:100%;padding:14px;background:#18783a;color:white;font-size:17px}.ahRosterBtn:disabled{opacity:.45;cursor:not-allowed}.ahSub{font-size:12px;color:#667788;margin-top:4px}`;document.head.appendChild(st)}
  if(!document.getElementById('adminHubModal')){const m=document.createElement('div');m.id='adminHubModal';m.innerHTML=`<div class="ahPanel"><div class="ahHead"><div><h3>⚙ QUẢN LÝ ADMIN</h3><div class="ahSub">Các chức năng cùng mục đích được gom theo nhóm.</div></div><button class="ahClose" onclick="adminHubClose()">ĐÓNG</button></div><div id="adminHubBody"></div></div>`;document.body.appendChild(m)}
  const bar=document.querySelector('.toolbar-row.main-actions');if(bar&&!document.getElementById('roleBtnAdminHub')){const b=document.createElement('button');b.id='roleBtnAdminHub';b.textContent='⚙ QUẢN LÝ';b.onclick=()=>root.adminHubOpen();const anchor=document.getElementById('roleBtnAccounts');if(anchor?.parentNode)anchor.parentNode.insertBefore(b,anchor);else bar.appendChild(b)}
 }
 function renderHome(){const host=document.getElementById('adminHubBody');if(!host)return;host.innerHTML=`<div class="ahGroups">${groups.map(g=>`<button class="ahGroupBtn" onclick="adminHubOpenGroup('${g.key}')">${g.title}<small>${g.sub}</small></button>`).join('')}</div>`}
 root.adminHubOpenGroup=function(key){const g=groups.find(x=>x.key===key),host=document.getElementById('adminHubBody');if(!g||!host)return;const roster=key==='ops'?`<div class="ahRosterBox"><div class="ahRosterTitle">📋 DAILY ROSTER → TỰ TẠO CHUYẾN</div><div class="ahRosterSub">Chọn file DAILY ROSTER. Hệ thống tự đọc, tự tạo Flight Workspace và mở DANH SÁCH CHUYẾN HÔM NAY khi thành công.</div><input class="ahRosterFile" id="adminRosterFile" type="file" accept=".xlsx,.xlsm,.csv" onchange="adminHubRosterPicked(this)"><button class="ahRosterBtn" id="adminRosterOpenBtn" onclick="adminHubOpenRoster()">CHỌN DAILY ROSTER / TỰ TẠO CHUYẾN</button></div>`:'';host.innerHTML=`<div class="ahSectionHead"><button class="ahBack" onclick="adminHubHome()">← QUAY LẠI</button><h4>${g.title}</h4></div>${roster}<div class="ahGrid">${g.items.map(([id,label,note])=>{const exists=!!document.getElementById(id);return `<button class="ahItem${exists?'':' missing'}" ${exists?`onclick="adminHubRun('${id}')"`:'disabled'}>${label}<small>${note}</small></button>`}).join('')}</div>`}
 root.adminHubRosterPicked=function(inp){const f=inp?.files?.[0];if(f)root.dailyRosterLoadFile?.(f)};
 root.adminHubOpenRoster=function(){root.adminHubClose();if(typeof root.flightWorkspacePickRoster==='function')root.flightWorkspacePickRoster();else root.openDailyRosterManager?.()};
 root.adminHubHome=renderHome;
 root.adminHubRun=function(id){const b=document.getElementById(id);if(!b)return alert('Chức năng này chưa sẵn sàng.');root.adminHubClose();const old=b.style.display;b.style.setProperty('display','inline-flex','important');try{b.click()}finally{setTimeout(()=>{b.style.display=old||'';sync()},0)}};
 root.adminHubOpen=function(){ensure();if(!isAD())return;renderHome();document.getElementById('adminHubModal')?.classList.add('show')};
 root.adminHubClose=function(){document.getElementById('adminHubModal')?.classList.remove('show')};
 function sync(){ensure();const ad=isAD();document.body.classList.toggle('sagsAdminHub',ad);const b=document.getElementById('roleBtnAdminHub');if(b)b.style.display=ad?'inline-flex':'none'}
 const base=root.applyRoleUI;if(typeof base==='function')root.applyRoleUI=function(){const r=base.apply(this,arguments);setTimeout(sync,0);return r};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,50),{once:true});else setTimeout(sync,50);
 setInterval(sync,1500);
 root.__ADMIN_HUB_HDSD='V3.0: AD → ⚙ QUẢN LÝ → ✈ VẬN HÀNH CHUYẾN → chọn DAILY ROSTER. Hệ thống tự đọc và tự tạo Flight Workspace; không cần bấm TẠO CHUYẾN.';
})(typeof window!=='undefined'?window:globalThis);

/* ===== END admin-hub.js ===== */

/* ===== BEGIN flight-workspace-core.js ===== */
/* E-REPORT/SAGS V3.0 · FLIGHT WORKSPACE CORE
 * One flight = one workspace shared by all operating units.
 * Phase 1: list flights sorted by STD, unit ownership, module status, and direct DAILY ROSTER entry.
 */
(function(root){'use strict';
  const BUILD='V3.3-20260821-01';
  const ROOT='flight_records', MANIFEST='roster_manifests';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
  const UNITS=[
    {key:'DH',label:'ĐH · ĐIỀU HÀNH',icon:'✈',tasks:['Theo dõi và điều phối tổng thể chuyến','Theo dõi STA/STD/ETD, Door Close, Pushback, MVA/MVT','Theo dõi tiến độ và bất thường khai thác']},
    {key:'CBTT',label:'CBTT · CÂN BẰNG TRỌNG TẢI',icon:'⚖',tasks:['Nhận dữ liệu KẾT SỔ, hành lý và hàng hóa','Lập/kiểm tra FINAL, Weight & Balance','Thực hiện CROSSCHECK FINAL theo revision']},
    {key:'PVHK',label:'PVHK · PHỤC VỤ HÀNH KHÁCH',icon:'👥',tasks:['Check-in/boarding và KẾT SỔ','ADL / CHD / INF','BAG PCS / KG và khách đặc biệt']},
    {key:'HLNG',label:'HLNG · HÀNH LÝ NHÀ GA',icon:'🛄',tasks:['Chuyến đi: nhận hành lý từ băng chuyền, phân loại, chất lên móc/ULD','Chuyến đến: nhận hành lý từ móc/ULD, đưa lên băng chuyền trả khách','Ghi nhận thời gian hoàn tất và bất thường']},
    {key:'CARGO',label:'KHO HÀNG · CARGO',icon:'📦',tasks:['Tiếp nhận/xử lý hàng hóa','Build-up / loading / breakdown','Cargo weight, ULD hàng và hàng đặc biệt']},
    {key:'VSTB',label:'VSTB · VỆ SINH TÀU BAY',icon:'🧹',tasks:['Nhận nhiệm vụ vệ sinh tàu bay','Bắt đầu và hoàn tất vệ sinh','Ghi nhận bất thường phục vụ cabin']},
    {key:'VHTTB',label:'VHTTB · VẬN HÀNH TRANG THIẾT BỊ',icon:'🚜',tasks:['Nhận yêu cầu thiết bị phục vụ','Điều động thiết bị và nhân sự vận hành','Cập nhật tình trạng đáp ứng']},
    {key:'KTTB',label:'KTTB · KỸ THUẬT THIẾT BỊ',icon:'🔧',tasks:['Tiếp nhận yêu cầu báo hỏng thiết bị','Bảo trì / bảo dưỡng / sửa chữa','Cập nhật tình trạng thiết bị sau xử lý'],requestOnly:true},
    {key:'LNF',label:'LNF · LOST & FOUND',icon:'🔎',tasks:['Tiếp nhận case hành lý thất lạc chuyến đến','Theo dõi xử lý','Ghi nhận kết quả trả khách'],requestOnly:true}
  ];
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){const p=profile();return S(p.username||(role()==='AD'?'AD':''));}
  function myName(){const p=profile();return S(p.name||p.fullName||p.displayName||p.username||me());}
  function dep(){const p=profile();return U(p.departmentCode||p.systemDepartment||p.department||p.groupCode||p.group||'');}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function unitForProfile(){
    if(role()==='AD')return '';
    const p=profile(), text=U([p.role,p.roleCode,p.groupCode,p.departmentCode,p.systemDepartment,p.department,p.group,p.jobTitle].filter(Boolean).join(' '));
    const tests=[
      ['CBTT',/(CBTT|CÂN BẰNG TRỌNG TẢI|CAN BANG TRONG TAI|LOAD CONTROL)/],
      ['PVHK',/(PVHK|PHỤC VỤ HÀNH KHÁCH|PHUC VU HANH KHACH)/],
      ['HLNG',/(HLNG|HÀNH LÝ NHÀ GA|HANH LY NHA GA)/],
      ['CARGO',/(KHO HÀNG|KHO HANG|CARGO)/],
      ['VSTB',/(VSTB|VỆ SINH TÀU BAY|VE SINH TAU BAY)/],
      ['VHTTB',/(VHTTB|VẬN HÀNH TRANG THIẾT BỊ|VAN HANH TRANG THIET BI)/],
      ['KTTB',/(KTTB|KỸ THUẬT THIẾT BỊ|KY THUAT THIET BI)/],
      ['LNF',/(LNF|LOST\s*&?\s*FOUND|LOST AND FOUND)/],
      ['DH',/(^|\s)(ĐH|DH)(\s|$)|ĐIỀU HÀNH|DIEU HANH/]
    ];
    for(const [k,re] of tests)if(re.test(text))return k;
    return '';
  }
  function timeScore(v){const raw=S(v),plus=/\+\s*$/.test(raw),s=raw.replace(/[^0-9]/g,'');if(s.length<3)return 99999;const hh=Number(s.slice(0,-2)),mm=Number(s.slice(-2));return (plus?1440:0)+(Number.isFinite(hh)?hh:99)*60+(Number.isFinite(mm)?mm:99);}
  function recordTimeScore(rec,key='std'){const n=Number(rec?.[`${key}SortMinute`]);return Number.isFinite(n)&&n>=0?n:timeScore(rec?.[key]);}
  function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path);}
  async function readFlights(date){if(typeof root.sagsFlightHubRead==='function')return await root.sagsFlightHubRead(date);const s=await dbref(`${ROOT}/${safe(date)}`).once('value');return s.val()||{};}
  async function readManifest(date){try{const s=await dbref(`${MANIFEST}/${safe(date)}`).once('value');return s.val()||null}catch(_){return null}}
  function rosterUnit(item){const roleKey=U(item?.roleKey),src=U(item?.sourceColumn),form=U(item?.formGroup);if(roleKey==='CBTT'||src.includes('GRND_LS')||form==='FINAL')return 'CBTT';if(roleKey==='PAX09'||src.includes('PAX_SUPR')||form==='FSAGS09')return 'PVHK';if(['COR','LD','BOTH'].includes(roleKey)||src.includes('GRND_COR')||src.includes('GRND_LD')||['FSAGS','FSAGS421','FSAGS551'].includes(form))return 'DH';return ''}
  function sameRosterFlight(item,rec){if(!item||!rec)return false;const ifid=S(item.flightId),rfid=S(rec.flightId);if(ifid&&rfid)return ifid===rfid;const a=U(item.flightRaw||item.flightName),b=U(rec.flightRaw||rec.flightName);if(a&&b&&a===b)return true;const af=U(rec.arrFlight),df=U(rec.depFlight),x=U(item.flightRaw||item.flightName);return !!x&&((af&&x.includes(af))||(df&&x.includes(df)))}
  function rosterUsersForUnit(rec,unit,manifest){const out=[];for(const item of Object.values(manifest?.items||{})){if(!item||item.active===false||rosterUnit(item)!==unit||!sameRosterFlight(item,rec))continue;const u=normUser(item.user||item.targetUser);if(u&&!out.includes(u))out.push(u)}return out}
  async function reconcileRosterClaims(date,flights,manifest){const patch={},events=[];for(const rec of Object.values(flights||{})){if(!rec?.flightId)continue;for(const unit of ['DH','CBTT','PVHK']){const rosterUsers=rosterUsersForUnit(rec,unit,manifest),a=rec.unitAssignments?.[unit],owner=normUser(a?.username);if(!rosterUsers.length||!owner||rosterUsers.includes(owner))continue;const at=Date.now(),eid=`ROSTER_FIX_${safe(unit)}_${at}`;patch[`${ROOT}/${safe(date)}/${safe(rec.flightId)}/assignmentHistory/${safe(eid)}`]={eventId:eid,action:'INVALID_ROSTER_CLAIM_REMOVED',unit,removedUser:owner,removedName:S(a?.name||a?.username),rosterEligibleUsers:rosterUsers,atMs:at,by:'SYSTEM_V3.3'};patch[`${ROOT}/${safe(date)}/${safe(rec.flightId)}/unitAssignments/${safe(unit)}`]=null;if(rec.unitAssignments)delete rec.unitAssignments[unit];events.push({flightId:rec.flightId,unit,owner,rosterUsers})}}if(Object.keys(patch).length)await dbref('').update(patch);return events}
  let cache={date:'',flights:{},manifest:null,selected:null};
  function ensureUI(){
    if(document.getElementById('fwcModal'))return;
    const st=document.createElement('style');st.textContent=`
      #fwcModal{display:none;position:fixed;inset:0;z-index:16820;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:10px;font-family:Arial,sans-serif}#fwcModal.show{display:flex}
      .fwcPanel{width:min(98vw,1120px);max-height:95vh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-sizing:border-box;box-shadow:0 18px 50px rgba(0,0,0,.32)}.fwcHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.fwcHead h3{margin:0;color:#0b4f91}.fwcSub{font-size:12px;color:#5f6f7d;line-height:1.45;margin-top:4px}.fwcBtn{border:0;border-radius:9px;padding:9px 12px;font-weight:900;cursor:pointer;background:#0b67b2;color:#fff}.fwcBtn.gray{background:#eef3f7;color:#31475a;border:1px solid #ccd7df}.fwcBtn.green{background:#15803d}.fwcBtn.orange{background:#b45309}.fwcBtn:disabled{opacity:.45;cursor:not-allowed}.fwcTools{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:10px 0}.fwcTools input{padding:9px;border:1px solid #cad6df;border-radius:9px}.fwcStatus{padding:9px 10px;border-radius:9px;background:#eef6ff;color:#244862;font-size:12px;margin:8px 0}.fwcStatus.err{background:#fff0f0;color:#9b1c1c}
      .fwcFlight{border:1px solid #d9e2e9;border-radius:12px;margin:8px 0;padding:10px;display:grid;grid-template-columns:minmax(200px,1.3fr) minmax(200px,1fr) auto;gap:10px;align-items:center}.fwcFlight:hover{background:#f8fbfd}.fwcFlightTitle{font-size:17px;font-weight:900;color:#173f60}.fwcMeta{font-size:12px;color:#5e6f7d;margin-top:3px}.fwcBadges{display:flex;gap:5px;flex-wrap:wrap}.fwcBadge{display:inline-block;padding:3px 7px;border-radius:999px;background:#e9f7ee;color:#17643a;font-size:11px;font-weight:900}.fwcBadge.warn{background:#fff3cd;color:#7a5200}.fwcEmpty{padding:18px;text-align:center;color:#687987}
      .fwcBack{margin:6px 0 10px}.fwcWorkspaceHead{border:1px solid #cfe0ed;background:#f3f9fd;border-radius:13px;padding:12px;margin-bottom:10px}.fwcWorkspaceTitle{font-size:22px;font-weight:900;color:#123f63}.fwcUnitGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fwcUnit{border:1px solid #d8e3eb;border-radius:12px;padding:10px;background:#fff}.fwcUnit.mine{border-color:#76b98b;background:#f5fbf7}.fwcUnit h4{margin:0 0 6px;color:#194766}.fwcOwner{font-size:12px;font-weight:800;color:#31556f;margin:5px 0}.fwcTasks{margin:6px 0 0;padding-left:18px;color:#596a78;font-size:12px;line-height:1.45}.fwcUnitActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.fwcNotice{font-size:11px;color:#6c7b87;margin-top:6px}.fwcModules{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      @media(max-width:720px){.fwcUnitGrid{grid-template-columns:1fr}.fwcFlight{grid-template-columns:1fr}.fwcPanel{padding:10px}.fwcBtn{width:auto}.fwcFlight .fwcBtn{width:100%}}
    `;document.head.appendChild(st);
    const m=document.createElement('div');m.id='fwcModal';m.innerHTML=`<div class="fwcPanel"><div class="fwcHead"><div><h3>✈ CHUYẾN HÔM NAY · FLIGHT WORKSPACE</h3><div class="fwcSub">Một chuyến bay = một hồ sơ chung. Danh sách mặc định xếp theo STD tăng dần.</div></div><button class="fwcBtn gray" onclick="flightWorkspaceClose()">ĐÓNG</button></div><div id="fwcBody"></div></div>`;document.body.appendChild(m);
  }
  function status(msg,err=false){const e=document.getElementById('fwcStatus');if(e){e.textContent=msg;e.classList.toggle('err',!!err)}}
  function moduleBadges(rec){try{return root.sagsFlightHubModuleBadges?.(rec)||[]}catch(_){return []}}
  function listHtml(date,flights){const arr=Object.values(flights||{}).filter(rec=>rec&&rec.rosterActive!==false&&U(rec.rosterStatus)!=='ROSTER_REMOVED').sort((a,b)=>recordTimeScore(a,'std')-recordTimeScore(b,'std')||S(a.depFlight||a.arrFlight||a.flightRaw).localeCompare(S(b.depFlight||b.arrFlight||b.flightRaw),'vi'));if(!arr.length)return '<div class="fwcEmpty">Ngày này chưa có chuyến. AD hãy vào ⚙ QUẢN LÝ → VẬN HÀNH CHUYẾN → DAILY ROSTER và chọn file.</div>';
    return arr.map(rec=>{const name=S(rec.depFlight||rec.arrFlight||rec.flightName||rec.flightRaw||rec.flightId),mods=moduleBadges(rec),assign=rec.unitAssignments||{},owners=Object.keys(assign).filter(k=>assign[k]?.username).length;return `<div class="fwcFlight"><div><div class="fwcFlightTitle">${esc(name)}</div><div class="fwcMeta">${esc(rec.route||'')} · A/C ${esc(rec.acReg||'—')} · STA ${esc(rec.sta||'—')} · <b>STD ${esc(rec.std||'—')}</b></div><div class="fwcMeta">${esc(rec.flightId||'')}</div></div><div><div class="fwcBadges">${mods.length?mods.map(x=>`<span class="fwcBadge">${esc(x.kind)}: ${esc(x.status)}</span>`).join(''):'<span class="fwcBadge warn">CHƯA CÓ DỮ LIỆU NGHIỆP VỤ</span>'}</div><div class="fwcMeta">Đơn vị đã nhận: ${owners}/${UNITS.filter(x=>!x.requestOnly).length}</div></div><button class="fwcBtn" onclick="flightWorkspaceOpenFlight('${esc(rec.flightId)}')">MỞ CHUYẾN</button></div>`}).join('');}
  async function renderList(date){ensureUI();const body=document.getElementById('fwcBody');body.innerHTML=`<div class="fwcTools"><input id="fwcDate" type="date" value="${esc(date)}"><button class="fwcBtn" onclick="flightWorkspaceRefresh()">TẢI DANH SÁCH</button>${role()==='AD'?'<button class="fwcBtn green" onclick="flightWorkspacePickRoster()">📋 CHỌN DAILY ROSTER</button>':''}<button class="fwcBtn gray" onclick="rosterHandoffOpen?.()">BÀN GIAO / DUYỆT</button></div><div id="fwcStatus" class="fwcStatus">Đang tải danh sách chuyến…</div><div id="fwcList"></div>`;
    try{const [flights,manifest]=await Promise.all([readFlights(date),readManifest(date)]),fixed=await reconcileRosterClaims(date,flights,manifest);cache={date,flights,manifest,selected:null};for(const [fid,rec] of Object.entries(flights||{}))root.sagsV338PrimeDossier?.(date,S(rec?.flightId||fid),rec);document.getElementById('fwcList').innerHTML=listHtml(date,flights);const activeCount=Object.values(flights||{}).filter(rec=>rec&&rec.rosterActive!==false&&U(rec.rosterStatus)!=='ROSTER_REMOVED').length;status(`✓ ${activeCount} Flight Workspace đang ACTIVE · xếp theo STD. Chuyến bị bỏ khỏi roster mới được giữ hồ sơ nhưng ẩn khỏi danh sách khai thác.${fixed.length?` Đã tự gỡ ${fixed.length} claim cũ không khớp roster.`:''}`);}catch(e){status('Không tải được danh sách chuyến: '+S(e?.message||e),true)}}
  root.flightWorkspaceOpenList=function(date){ensureUI();document.getElementById('fwcModal').classList.add('show');return renderList(S(date)||today());};
  root.flightWorkspaceClose=function(){document.getElementById('fwcModal')?.classList.remove('show');};
  root.flightWorkspaceRefresh=function(){return renderList(S(document.getElementById('fwcDate')?.value)||cache.date||today());};
  root.flightWorkspacePickRoster=function(){if(role()!=='AD')return;let inp=document.getElementById('fwcRosterFile');if(!inp){inp=document.createElement('input');inp.id='fwcRosterFile';inp.type='file';inp.accept='.xlsx,.xlsm,.csv';inp.style.position='fixed';inp.style.left='-9999px';inp.addEventListener('change',async()=>{const f=inp.files?.[0];inp.value='';if(!f)return;try{status('Đang đọc DAILY ROSTER và tự tạo chuyến…');const ok=await root.dailyRosterLoadFile?.(f);if(ok)setTimeout(()=>root.flightWorkspaceRefresh?.(),500);}catch(e){status('Không tạo chuyến từ DAILY ROSTER: '+S(e?.message||e),true)}});document.body.appendChild(inp);}inp.click();};
  root.flightWorkspaceOpenFlight=function(fid){const rec=cache.flights?.[fid];if(!rec)return;cache.selected=fid;root.sagsV338PrimeDossier?.(cache.date,fid,rec);const body=document.getElementById('fwcBody'),myUnit=unitForProfile(),isAdmin=role()==='AD',mods=moduleBadges(rec);body.innerHTML=`<div class="fwcBack"><button class="fwcBtn gray" onclick="flightWorkspaceOpenList('${esc(cache.date)}')">← DANH SÁCH CHUYẾN</button> <button class="fwcBtn gray" onclick="rosterHandoffOpen?.()">BÀN GIAO / DUYỆT</button></div><div class="fwcWorkspaceHead"><div class="fwcWorkspaceTitle">${esc(rec.depFlight||rec.arrFlight||rec.flightName||rec.flightRaw||fid)}</div><div class="fwcMeta">${esc(rec.route||'')} · STA ${esc(rec.sta||'—')} · STD ${esc(rec.std||'—')} · A/C ${esc(rec.acReg||'—')} · ${esc(fid)}</div><div class="fwcModules">${mods.length?mods.map(x=>`<span class="fwcBadge">${esc(x.kind)}: ${esc(x.status)}</span>`).join(''):'<span class="fwcBadge warn">Chưa phát sinh dữ liệu module</span>'}</div></div><div class="fwcUnitGrid">${UNITS.map(u=>unitHtml(rec,u,myUnit,isAdmin)).join('')}</div>`;};
  function unitHtml(rec,u,myUnit,isAdmin){const a=rec.unitAssignments?.[u.key]||{},mine=myUnit===u.key,ownerUser=normUser(a.username),owner=S(a.name||a.username),rosterUsers=rosterUsersForUnit(rec,u.key,cache.manifest),meUser=normUser(me()),rosterLocked=rosterUsers.length>0,eligible=!rosterLocked||rosterUsers.includes(meUser),ownerValid=!ownerUser||!rosterLocked||rosterUsers.includes(ownerUser),isOwner=!!ownerUser&&ownerUser===meUser&&ownerValid,canClaim=!u.requestOnly&&!owner&&mine&&eligible;const rosterLine=rosterLocked?`<div class="fwcNotice"><b>DAILY ROSTER:</b> ${esc(rosterUsers.join(', '))}${mine&&!eligible?' · Tài khoản này không được phân nhiệm vụ.':''}${ownerUser&&!ownerValid?' · ⚠ Người đang nhận KHÔNG KHỚP roster.':''}</div>`:'';return `<div class="fwcUnit ${mine?'mine':''}"><h4>${u.icon} ${esc(u.label)}</h4><div class="fwcOwner">${u.requestOnly?'Loại công việc: tiếp nhận yêu cầu theo sự kiện':`Người phụ trách: ${owner?esc(owner):'<span style="color:#9b1c1c">CHƯA NHẬN</span>'}`}</div>${rosterLine}<ul class="fwcTasks">${u.tasks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><div class="fwcUnitActions">${canClaim?`<button class="fwcBtn green" onclick="flightWorkspaceClaim('${esc(rec.flightId)}','${u.key}')">NHẬN CÔNG VIỆC</button>`:''}${isOwner?'<span class="fwcBadge">BẠN ĐANG PHỤ TRÁCH</span>':''}${ownerUser&&!ownerValid?'<span class="fwcBadge warn">⚠ NHẬN SAI DAILY ROSTER</span>':''}${mine&&rosterLocked&&!eligible?'<span class="fwcBadge warn">KHÔNG ĐÚNG NGƯỜI ROSTER</span>':''}${isAdmin&&!u.requestOnly?`<span class="fwcNotice">AD theo dõi; đổi người phải dùng CHUYỂN/BÀN GIAO theo quy trình.</span>`:''}</div>${!myUnit&&!isAdmin?'<div class="fwcNotice">Tài khoản chưa map được đơn vị; AD cần kiểm tra Department/Group/Role trong hồ sơ.</div>':''}</div>`;}
  root.flightWorkspaceClaim=async function(fid,unit){try{const rec=cache.flights?.[fid];if(!rec)throw new Error('Không tìm thấy chuyến.');const myUnit=unitForProfile();if(myUnit!==unit)throw new Error('Tài khoản không thuộc đơn vị này.');const liveManifest=await readManifest(cache.date),rosterUsers=rosterUsersForUnit(rec,unit,liveManifest),meUser=normUser(me());cache.manifest=liveManifest;if(rosterUsers.length&&!rosterUsers.includes(meUser))throw new Error(`DAILY ROSTER đã phân nhiệm vụ cho ${rosterUsers.join(', ')}. Tài khoản ${meUser||'hiện tại'} không được nhận thay. Muốn đổi người phải dùng CHUYỂN/BÀN GIAO theo quy trình.`);const snap=await dbref(`${ROOT}/${safe(cache.date)}/${safe(fid)}/unitAssignments/${safe(unit)}`).once('value'),current=snap.val()||null;if(current?.username)throw new Error(`Đơn vị đã có người phụ trách: ${S(current.name||current.username)}. Hãy dùng quy trình bàn giao.`);const t=Date.now(),p=profile(),value={unit,username:meUser||me(),name:myName(),departmentCode:S(p.departmentCode||p.systemDepartment||p.department),groupCode:S(p.groupCode||p.group),claimedAtMs:t,updatedAtMs:t,status:'ACTIVE',claimSource:rosterUsers.length?'DAILY_ROSTER':'OPEN_UNIT',rosterEligibleUsers:rosterUsers};await dbref(`${ROOT}/${safe(cache.date)}/${safe(fid)}/unitAssignments/${safe(unit)}`).set(value);cache.flights[fid].unitAssignments=cache.flights[fid].unitAssignments||{};cache.flights[fid].unitAssignments[unit]=value;root.flightWorkspaceOpenFlight(fid);}catch(e){alert('Không nhận được công việc: '+S(e?.message||e));}};
  function installButton(){const bar=document.querySelector('.toolbar-row.main-actions');if(!bar)return;let b=document.getElementById('roleBtnRosterFlights');if(!b){b=document.createElement('button');b.id='roleBtnRosterFlights';b.textContent='✈ CHUYẾN HÔM NAY';bar.appendChild(b);}b.onclick=()=>root.flightWorkspaceOpenList();b.style.display=role()?'inline-flex':'none';}
  function sync(){ensureUI();installButton();const b=document.getElementById('roleBtnRosterFlights');if(b)b.onclick=()=>root.flightWorkspaceOpenList();}
  const base=root.applyRoleUI;if(typeof base==='function')root.applyRoleUI=function(){const r=base.apply(this,arguments);setTimeout(sync,0);return r};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,100),{once:true});else setTimeout(sync,100);
  setInterval(sync,1800);
  root.__FLIGHT_WORKSPACE_V33_TEST__={rosterUnit,sameRosterFlight,rosterUsersForUnit,normUser,reconcileRosterClaims};
  root.__FLIGHT_WORKSPACE_V3_HDSD='V3.37: Grnd_Ls trong Daily Roster map trực tiếp sang CBTT/FINAL và được kiểm soát roster giống các đơn vị khác. V3.16: Re-upload DAILY ROSTER cùng ngày không xóa Flight Record/dữ liệu nghiệp vụ; chuyến không còn trong roster mới chuyển ROSTER_REMOVED/INACTIVE và ẩn khỏi danh sách khai thác. V3.3: AD chọn DAILY ROSTER → hệ thống tự đọc và tự tạo Flight Workspace. Màn CHUYẾN HÔM NAY xếp theo STD. Mỗi chuyến có các phân hệ ĐH, CBTT, PVHK, HLNG, Cargo, VSTB, VHTTB, KTTB, LNF. Nếu DAILY ROSTER đã phân username thì chỉ đúng username đó được bấm NHẬN CÔNG VIỆC; người khác cùng đơn vị bị khóa và phải dùng CHUYỂN/BÀN GIAO. Với đơn vị chưa có tên trong roster, tài khoản đúng đơn vị mới được nhận; KTTB/LNF nhận yêu cầu theo sự kiện. Một chuyến chỉ có một flightId và mọi dữ liệu module liên quan được liên kết vào flightId đó.';
  root.__FLIGHT_WORKSPACE_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);

/* ===== END flight-workspace-core.js ===== */
}
if(phase==='control'){

/* ===== BEGIN multitask-crosscheck-v36.js ===== */
/* E-REPORT/SAGS V3.6 · STICKY FLIGHT WORKSPACE + MULTITASK + CROSSCHECK COMPLETE */
(function(root){'use strict';
const BUILD='V3.6-20260821-01', ROOT='flight_records', MANIFEST='roster_manifests', AUDIO='./alert-crosscheck-complete.mp3';
const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase(),safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_'),esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const sess=()=>{try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}, role=()=>U(sess().role||sess().profile?.role), me=()=>normUser(sess().profile?.username||(role()==='AD'?'AD':''));
function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
function timeScore(v){const raw=S(v),plus=/\+\s*$/.test(raw),s=raw.replace(/[^0-9]/g,'');if(s.length<3)return 99999;return (plus?1440:0)+Number(s.slice(0,-2))*60+Number(s.slice(-2))}
function recordTimeScore(rec,key='std'){const n=Number(rec?.[`${key}SortMinute`]);return Number.isFinite(n)&&n>=0?n:timeScore(rec?.[key])}
const flightName=r=>S(r?.depFlight||r?.arrFlight||r?.flightName||r?.flightRaw||r?.flightId);
const opDate=()=>S(sessionStorage.getItem('sagsV36FwcDate'))||S(document.getElementById('fwcDate')?.value)||today(), selected=()=>S(sessionStorage.getItem('sagsV36FwcSelected'));
function setCtx(d,f=''){if(d)sessionStorage.setItem('sagsV36FwcDate',d);if(f)sessionStorage.setItem('sagsV36FwcSelected',f);else sessionStorage.removeItem('sagsV36FwcSelected')}
function css(){if(document.getElementById('sags-v36-style'))return;const e=document.createElement('style');e.id='sags-v36-style';e.textContent=`
#fwcModal{padding:max(6px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left))!important}
#fwcModal .fwcPanel{max-height:calc(100dvh - max(12px,env(safe-area-inset-top)) - max(12px,env(safe-area-inset-bottom)))!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;padding:12px!important}
#fwcModal .fwcHead{flex:0 0 auto;background:#fff;z-index:4;padding-bottom:8px;border-bottom:1px solid #e3eaf0}#fwcStickyNav{display:none;flex:0 0 auto;gap:7px;flex-wrap:wrap;align-items:center;background:#fff;padding:8px 0;border-bottom:1px solid #e5ebf0;z-index:4}#fwcStickyNav.show{display:flex}#fwcBody{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding-top:4px}#fwcBody>.fwcBack{display:none!important}.fwcMultiBtn{background:#5b21b6!important;color:#fff!important}.fwcMultiCount{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;margin-left:5px;border-radius:999px;background:#fff;color:#5b21b6;font:900 10px Arial}
#fwcMultitaskModal{position:fixed;inset:0;z-index:52040;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.58);padding:max(12px,env(safe-area-inset-top)) 10px max(12px,env(safe-area-inset-bottom));box-sizing:border-box;font-family:Arial}#fwcMultitaskModal.show{display:flex}.fwcMultiPanel{width:min(94vw,620px);max-height:88dvh;overflow:hidden;background:#fff;border-radius:16px;box-shadow:0 18px 55px rgba(0,0,0,.34);display:flex;flex-direction:column}.fwcMultiHead{padding:13px 14px 10px;border-bottom:1px solid #dbe4eb;display:flex;justify-content:space-between;gap:10px}.fwcMultiTitle{font:900 18px Arial;color:#183f62}.fwcMultiSub{font:700 11px/1.4 Arial;color:#687784;margin-top:3px}.fwcMultiList{padding:9px;overflow:auto}.fwcMultiItem{width:100%;display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center;text-align:left;border:1px solid #d8e3eb;border-radius:12px;padding:10px;margin:7px 0;background:#fff}.fwcMultiItem.active{border:2px solid #0b67b2;background:#f0f7fd}.fwcMultiItem.alert{border-color:#d97706;background:#fff8e8}.fwcMultiName{font:900 16px Arial;color:#173f60}.fwcMultiMeta{font:700 11px/1.45 Arial;color:#647584;margin-top:3px}.fwcMultiState{font:900 10px Arial;padding:4px 7px;border-radius:999px;background:#e8f5ed;color:#17663b}.fwcMultiOpen{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center;width:100%;border:0;background:transparent;text-align:left;padding:0;color:inherit}.fwcMultiDone{grid-column:1/-1;border:1px solid #c8d3dd;border-radius:8px;background:#f5f8fa;color:#42586b;padding:7px 9px;font:900 10px Arial}.fwcMultiEmpty{padding:24px 14px;text-align:center;color:#657786;font:700 13px/1.5 Arial}
#sagsCxDoneV36{position:fixed;inset:0;z-index:53050;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.42);padding:14px;box-sizing:border-box;font-family:Arial}#sagsCxDoneV36.show{display:flex}.sagsCxDoneCard{width:min(92vw,470px);background:#fff;border:4px solid #16a34a;border-radius:18px;box-shadow:0 20px 65px rgba(0,0,0,.42);padding:18px;text-align:center}.sagsCxDoneIcon{font-size:46px}.sagsCxDoneTitle{margin-top:7px;color:#08783b;font:900 22px/1.15 Arial}.sagsCxDoneFlight{margin-top:10px;color:#173f60;font:900 18px Arial}.sagsCxDoneText{margin-top:7px;color:#4b5d6a;font:700 13px/1.5 Arial}.sagsCxDoneActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:15px}.sagsCxDoneActions button{border:0;border-radius:10px;padding:11px 10px;font:900 12px Arial}.sagsCxDoneOpen{background:#0b67b2;color:#fff}.sagsCxDoneAck{background:#e9eef3;color:#33485b}
@media(max-width:620px){#fwcModal .fwcPanel{padding:9px!important}.fwcHead h3{font-size:16px}.fwcSub{font-size:10.5px}.fwcStickyNav .fwcBtn{padding:8px 9px;font-size:11px}.fwcMultiItem{grid-template-columns:1fr}.sagsCxDoneActions{grid-template-columns:1fr}}`;document.head.appendChild(e)}
function modal(){if(!document.getElementById('fwcMultitaskModal')){const m=document.createElement('div');m.id='fwcMultitaskModal';m.innerHTML=`<div class="fwcMultiPanel"><div class="fwcMultiHead"><div><div class="fwcMultiTitle">⇄ MULTITASK · CHUYẾN ĐANG LÀM</div><div class="fwcMultiSub">MULTITASK là chuyến đang làm cùng lúc; MY FLIGHT là tổng chuyến được phân công.</div></div><button class="fwcBtn gray" onclick="sagsV36CloseMultitask()">ĐÓNG</button></div><div id="fwcMultiStatus" class="fwcStatus" style="margin:9px 9px 0">Đang tải…</div><div id="fwcMultiList" class="fwcMultiList"></div></div>`;document.body.appendChild(m)}if(!document.getElementById('sagsCxDoneV36')){const m=document.createElement('div');m.id='sagsCxDoneV36';m.innerHTML=`<div class="sagsCxDoneCard"><div class="sagsCxDoneIcon">✅</div><div class="sagsCxDoneTitle">ĐÃ HOÀN TẤT CROSSCHECK</div><div id="sagsCxDoneFlight" class="sagsCxDoneFlight"></div><div id="sagsCxDoneText" class="sagsCxDoneText"></div><div class="sagsCxDoneActions"><button class="sagsCxDoneOpen" onclick="sagsV36OpenCxFlight()">MỞ CHUYẾN</button><button class="sagsCxDoneAck" onclick="sagsV36AckCxDone()">ĐÃ BIẾT</button></div></div>`;document.body.appendChild(m)}}
function sticky(){css();modal();const p=document.querySelector('#fwcModal .fwcPanel'),h=p?.querySelector('.fwcHead'),b=document.getElementById('fwcBody');if(!p||!h||!b)return null;let n=document.getElementById('fwcStickyNav');if(!n){n=document.createElement('div');n.id='fwcStickyNav';h.insertAdjacentElement('afterend',n)}return n}
function navFlight(fid){const n=sticky();if(!n)return;n.innerHTML=`<button class="fwcBtn gray" onclick="flightWorkspaceOpenList('${esc(opDate())}')">← DANH SÁCH CHUYẾN</button><button class="fwcBtn gray" onclick="rosterHandoffOpen?.()">BÀN GIAO / DUYỆT</button><button id="fwcMultitaskBtn" class="fwcBtn fwcMultiBtn" onclick="sagsV36OpenMultitask()">⇄ MULTITASK<span id="fwcMultitaskCount" class="fwcMultiCount">…</span></button>`;n.classList.add('show');setCtx(opDate(),fid);multiAdd(fid);setTimeout(count,50)}
function navList(d){const n=sticky();if(n){n.innerHTML='';n.classList.remove('show')}setCtx(d||today(),'')}
function multiKey(){return `sagsV323Multi:${me()||'UNKNOWN'}:${opDate()}`}
function multiSet(){try{return new Set(JSON.parse(sessionStorage.getItem(multiKey())||'[]').map(S).filter(Boolean))}catch(_){return new Set()}}
function multiSave(set){try{sessionStorage.setItem(multiKey(),JSON.stringify([...set].filter(Boolean)))}catch(_){}}
function multiAdd(fid){fid=S(fid);if(!fid)return;const set=multiSet();set.add(fid);multiSave(set)}
function multiRemove(fid){const set=multiSet();set.delete(S(fid));multiSave(set)}
async function assignedData(){
  const d=opDate(),u=me();if(!u)throw new Error('Không xác định được tài khoản.');
  const [a,b]=await Promise.all([dbref(`${ROOT}/${safe(d)}`).once('value'),dbref(`${MANIFEST}/${safe(d)}`).once('value')]),fl=a.val()||{},man=b.val()||{},ids=new Set();
  Object.values(fl).forEach(r=>Object.values(r?.unitAssignments||{}).forEach(x=>{if(normUser(x?.username)===u&&S(r.flightId))ids.add(S(r.flightId))}));
  Object.values(man?.items||{}).forEach(x=>{
    if(x?.active===false||normUser(x?.user||x?.targetUser)!==u)return;
    const fid=S(x?.flightId)||S(root.sagsV346ResolveRosterFlightId?.(d,x,fl));if(fid)ids.add(fid);
  });
  if(role()==='AD'&&selected())ids.add(selected());
  const list=[...ids].map(id=>fl[id]).filter(Boolean).sort((x,y)=>recordTimeScore(x,'std')-recordTimeScore(y,'std')||flightName(x).localeCompare(flightName(y),'vi'));return {d,list}
}
async function data(){const all=await assignedData(),set=multiSet(),cur=selected();if(cur&&all.list.some(r=>S(r.flightId)===cur)){set.add(cur);multiSave(set)}const list=all.list.filter(r=>set.has(S(r.flightId)));const clean=new Set(list.map(r=>S(r.flightId)));if([...set].some(id=>!clean.has(id)))multiSave(clean);return {d:all.d,list,totalMyFlight:all.list.length}}
function alerting(r){const x=r?.modules?.FINAL||{},s=U(x.crosscheckStatus||'');return !!s&&!/(COMPLETE|COMPLETED|OK)/.test(s)}
async function count(){const e=document.getElementById('fwcMultitaskCount');if(!e)return;try{e.textContent=String((await data()).list.length)}catch(_){e.textContent='0'}}
root.sagsV36OpenMultitask=async()=>{sticky();const m=document.getElementById('fwcMultitaskModal'),l=document.getElementById('fwcMultiList'),s=document.getElementById('fwcMultiStatus');m?.classList.add('show');if(l)l.innerHTML='';try{const d=await data();if(s){s.classList.remove('err');s.textContent=`ĐANG LÀM CÙNG LÚC: ${d.list.length} · MY FLIGHT: ${d.totalMyFlight}`;}const mb=document.getElementById('v38NavMulti');if(mb)mb.textContent=`⇄ MULTITASK · ${d.list.length}`;if(!d.list.length){if(l)l.innerHTML='<div class="fwcMultiEmpty"><b>MULTITASK = 0</b><br>Chưa có chuyến nào đang làm đồng thời. Mở chuyến trong MY FLIGHT để đưa vào MULTITASK.</div>';return}const cur=selected();if(l)l.innerHTML=d.list.map(r=>`<div class="fwcMultiItem ${S(r.flightId)===cur?'active':''} ${alerting(r)?'alert':''}"><button class="fwcMultiOpen" onclick="sagsV36SwitchFlight('${esc(r.flightId)}')"><div><div class="fwcMultiName">${esc(flightName(r))}</div><div class="fwcMultiMeta">${esc(r.route||'')} · STA ${esc(r.sta||'—')} · STD ${esc(r.std||'—')} · A/C ${esc(r.acReg||'—')}</div></div><span class="fwcMultiState">${S(r.flightId)===cur?'ĐANG MỞ':alerting(r)?'⚠ CẦN CHÚ Ý':'ĐANG LÀM'}</span></button><button class="fwcMultiDone" onclick="sagsV323FinishMultitask('${esc(r.flightId)}')">✓ XONG / BỎ MULTI</button></div>`).join('')}catch(e){if(s){s.textContent='Không tải được Multitask: '+S(e?.message||e);s.classList.add('err')}}};
root.sagsV36CloseMultitask=()=>document.getElementById('fwcMultitaskModal')?.classList.remove('show');root.sagsV36SwitchFlight=f=>{multiAdd(f);root.sagsV36CloseMultitask();setCtx(opDate(),f);root.flightWorkspaceOpenFlight?.(f)};root.sagsV323FinishMultitask=f=>{f=S(f);const wasCurrent=selected()===f;if(wasCurrent)setCtx(opDate(),'');multiRemove(f);if(wasCurrent){root.sagsV36CloseMultitask();root.flightWorkspaceOpenList?.(opDate());setTimeout(count,80)}else{count();setTimeout(()=>root.sagsV36OpenMultitask?.(),20)}};
root.sagsV36OpenFlightByToken=async token=>{const d=opDate(),k=U(token).replace(/[^A-Z0-9]/g,'');if(!k)return false;try{const fl=(await dbref(`${ROOT}/${safe(d)}`).once('value')).val()||{},r=Object.values(fl).find(x=>[x?.depFlight,x?.arrFlight,x?.flightRaw,x?.flightName].some(v=>U(v).replace(/[^A-Z0-9]/g,'').includes(k)));if(!r?.flightId)return false;root.flightWorkspaceOpenList?.(d);setTimeout(()=>root.flightWorkspaceOpenFlight?.(r.flightId),120);return true}catch(_){return false}};
let done=null,audio=null,primed=false,q=[],retry=0;const seenKey=m=>`sagsV36CxDone:${S(m?.eventKey||m?.eventAtMs||`${m?.package?.parentDocId}:R${m?.package?.revisionNo}`)}`;const seen=m=>{try{return sessionStorage.getItem(seenKey(m))==='1'}catch(_){return false}},mark=m=>{try{sessionStorage.setItem(seenKey(m),'1')}catch(_){}};
function prime(){if(primed)return;primed=true;try{audio=new Audio(AUDIO);audio.muted=true;const p=audio.play();p?.then?.(()=>{audio.pause();audio.currentTime=0;audio.muted=false}).catch(()=>primed=false)}catch(_){primed=false}}
function sound(){try{if(!audio)audio=new Audio(AUDIO);audio.pause();audio.currentTime=0;audio.muted=false;audio.volume=1;audio.play()?.catch?.(()=>{})}catch(_){ }try{navigator.vibrate?.([220,90,220,90,380])}catch(_){}}
function blocked(){return document.getElementById('finalPaperNotifyToast')?.style.display==='block'||document.getElementById('rhNotice')?.classList.contains('show')||!!document.querySelector('#opsAlertTrayScroller .opsAlertCard')}
function schedule(){clearTimeout(retry);retry=setTimeout(()=>{if(done||blocked()||!q.length){if(q.length)schedule();return}show(q.shift(),true)},500)}
function show(mail,fromQ=false){if(role()!=='DH'||seen(mail))return false;const key=S(mail?.eventKey||mail?.eventAtMs);if(!fromQ&&(done||blocked())){if(!q.some(x=>S(x?.eventKey||x?.eventAtMs)===key))q.push(mail);schedule();return true}modal();done=mail;const p=mail.package||{},f=S(p.identity?.flightToken||p.identity?.flightRaw||'');document.getElementById('sagsCxDoneFlight').textContent=f?`CHUYẾN ${f}`:`FINAL LẦN ${p.revisionNo||1}`;document.getElementById('sagsCxDoneText').innerHTML=`CBTT đã xác nhận <b>FINAL lần ${esc(p.revisionNo||1)}</b> hoàn tất CROSSCHECK${p.attemptNo?` · CHECK lần ${esc(p.attemptNo)}`:''}.`;document.getElementById('sagsCxDoneV36')?.classList.add('show');sound();return true}
root.sagsV36AckCxDone=()=>{if(done)mark(done);document.getElementById('sagsCxDoneV36')?.classList.remove('show');done=null;if(q.length)schedule()};root.sagsV36OpenCxFlight=async()=>{const m=done,p=m?.package||{},t=S(p.identity?.flightToken||p.identity?.flightRaw||'');if(m)mark(m);document.getElementById('sagsCxDoneV36')?.classList.remove('show');done=null;if(q.length)schedule();if(t&&await root.sagsV36OpenFlightByToken(t))return;root.flightWorkspaceOpenList?.(opDate())};
function patch(){let n=0,t=setInterval(()=>{if(typeof root.flightWorkspaceOpenFlight==='function'&&typeof root.flightWorkspaceOpenList==='function'){clearInterval(t);if(!root.flightWorkspaceOpenFlight.__v36){const f=root.flightWorkspaceOpenFlight,l=root.flightWorkspaceOpenList,c=root.flightWorkspaceClose;root.flightWorkspaceOpenFlight=function(id){const r=f.apply(this,arguments);setTimeout(()=>{sticky();document.querySelector('#fwcBody>.fwcBack')?.remove();navFlight(id)},0);return r};root.flightWorkspaceOpenFlight.__v36=1;root.flightWorkspaceOpenList=function(d){d=S(d)||today();const r=l.apply(this,arguments);navList(d);Promise.resolve(r).finally(()=>setTimeout(()=>navList(d),0));return r};root.flightWorkspaceClose=function(){root.sagsV36CloseMultitask();return c?.apply(this,arguments)}}sticky()}else if(++n>60)clearInterval(t)},200);n=0;t=setInterval(()=>{if(typeof root.cxCleanShowToast==='function'){clearInterval(t);if(!root.cxCleanShowToast.__v36){const b=root.cxCleanShowToast;root.cxCleanShowToast=function(m){if(S(m?.eventType)==='COMPLETE_OK'&&role()==='DH'&&show(m))return;return b.apply(this,arguments)};root.cxCleanShowToast.__v36=1}}else if(++n>60)clearInterval(t)},250)}
function boot(){css();modal();patch();document.addEventListener('pointerdown',prime,{once:true,capture:true});document.addEventListener('keydown',prime,{once:true,capture:true})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,60),{once:true});else setTimeout(boot,60);root.__SAGS_V36_BUILD=BUILD;
})(typeof window!=='undefined'?window:globalThis);

/* ===== END multitask-crosscheck-v36.js ===== */

/* ===== BEGIN permission-authority-v31.js ===== */
/* E-REPORT/SAGS V3.1 · Permission live-refresh hardening */
(()=>{
  'use strict';
  const norm=o=>{const out={};if(!o||typeof o!=='object')return out;Object.keys(o).sort().forEach(k=>{if(typeof o[k]==='boolean')out[k]=!!o[k];});return out;};
  try{
    const verifyBase=window.verifyPersonalSession;
    if(typeof verifyBase==='function' && !verifyBase.__v31Wrapped){
      const wrapped=async function(force=false){
        const beforeRev=Number(currentUserProfile?.permissionRevV485||0),before=JSON.stringify(norm(currentUserProfile?.featureOverridesV485));
        const out=await verifyBase.call(this,force);
        const afterRev=Number(currentUserProfile?.permissionRevV485||0),after=JSON.stringify(norm(currentUserProfile?.featureOverridesV485));
        if(beforeRev!==afterRev||before!==after){
          try{applyRoleUI?.();}catch(e){}
          try{updateFormMenuForCurrentFlight?.();}catch(e){}
        }
        return out;
      };
      wrapped.__v31Wrapped=true;
      window.verifyPersonalSession=wrapped;
      try{verifyPersonalSession=wrapped;}catch(e){}
    }
  }catch(e){console.info('V3.1 permission verify wrapper',e?.message||e);}
  const restart=()=>{try{if(currentUserProfile?.username&&typeof v485StartPermissionSignal==='function')v485StartPermissionSignal();}catch(e){}};
  setTimeout(restart,700);
  window.addEventListener('pageshow',()=>setTimeout(restart,80),{passive:true});
})();

/* ===== END permission-authority-v31.js ===== */

/* ===== BEGIN quick-time-save-v32.js ===== */
/* E-REPORT SAGS · V3.2 QUICK TIME SAVE RELIABILITY
 * 2026-08-21
 * Fixes mobile/iOS cases where the visible quick-entry input value had not yet
 * been committed to the internal draft when UPDATE/tab navigation was tapped.
 */
(function(){
  'use strict';
  const BUILD='V3.2-20260821-01';
  const S=v=>String(v??'').trim();

  function callInputHandler(el,name){
    if(!el)return;
    try{
      const fn=window[name];
      if(typeof fn==='function'){fn(el);return;}
    }catch(_){ }
    try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){ }
  }

  function flushRampQuickDom(){
    try{
      document.querySelectorAll('#quickTimeBody .quickTimeInput[data-key]').forEach(el=>callInputHandler(el,'qteInputChanged'));
    }catch(e){console.warn('[V3.2 QUICK TIME] flush ramp',e);}
  }

  function flushFs09QuickDom(){
    try{
      document.querySelectorAll('#fs09qBody .fs09qInput[data-key]').forEach(el=>callInputHandler(el,'fs09qTimeInput'));
      document.querySelectorAll('#fs09qBody .fs09qDataInput[data-key],#fs09qBody .fs09qTextArea[data-key]').forEach(el=>callInputHandler(el,'fs09qDataChanged'));
    }catch(e){console.warn('[V3.2 QUICK TIME] flush fs09',e);}
  }

  function normalizeTime(v){
    v=S(v);
    if(!v)return '';
    if(v.toUpperCase()==='N/A')return 'N/A';
    let d=v.replace(/\D/g,'').slice(0,4);
    if(d.length===3)d='0'+d;
    if(d.length!==4)return null;
    const h=Number(d.slice(0,2)),m=Number(d.slice(2));
    if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>23||m<0||m>59)return null;
    return d.slice(0,2)+':'+d.slice(2);
  }

  function captureExpected(selector){
    const out=[];
    try{
      document.querySelectorAll(selector).forEach(el=>{
        const key=S(el.dataset?.key);if(!key)return;
        const v=normalizeTime(el.value);
        if(v!==null)out.push([key,v]);
      });
    }catch(_){ }
    return out;
  }

  function repairState(expected,label){
    let changed=false;
    try{
      if(typeof state==='undefined'||!state)return false;
      for(const [key,value] of expected){
        const cur=S(state[key]);
        if(value===''){
          if(Object.prototype.hasOwnProperty.call(state,key)){delete state[key];changed=true;}
        }else if(cur!==value){
          state[key]=value;changed=true;
          try{clearTimeSkipFlag?.(key);}catch(_){ }
        }
      }
      if(changed){
        try{persist?.();}catch(e){console.warn('[V3.2 QUICK TIME] persist repair '+label,e);}
        try{draw?.();}catch(_){ }
      }
    }catch(e){console.warn('[V3.2 QUICK TIME] repair '+label,e);}
    return changed;
  }

  function install(){
    if(window.__SAGS_QUICK_TIME_V32_INSTALLED)return true;
    const qSave=window.qteSaveCompact;
    const qPage=window.qteGoPage;
    const fSave=window.fs09qSave;
    const fPage=window.fs09qGoPage;
    if(typeof qSave!=='function'||typeof fSave!=='function')return false;
    window.__SAGS_QUICK_TIME_V32_INSTALLED=BUILD;

    window.qteSaveCompact=function(){
      flushRampQuickDom();
      const expected=captureExpected('#quickTimeBody .quickTimeInput[data-key]');
      const r=qSave.apply(this,arguments);
      const repaired=repairState(expected,'RAMP');
      if(repaired){
        const st=document.getElementById('quickTimeSaveStatus');
        if(st)st.textContent='ĐÃ CẬP NHẬT';
      }
      return r;
    };

    if(typeof qPage==='function')window.qteGoPage=function(){
      flushRampQuickDom();
      return qPage.apply(this,arguments);
    };

    window.fs09qSave=function(){
      flushFs09QuickDom();
      const expected=captureExpected('#fs09qBody .fs09qInput[data-key]');
      const r=fSave.apply(this,arguments);
      const repaired=repairState(expected,'FSAGS09');
      if(repaired){
        const st=document.getElementById('fs09qStatus');
        if(st)st.textContent='ĐÃ CẬP NHẬT';
      }
      return r;
    };

    if(typeof fPage==='function')window.fs09qGoPage=function(){
      flushFs09QuickDom();
      return fPage.apply(this,arguments);
    };

    // Extra safety for iOS: commit the field on change/blur as well as input.
    document.addEventListener('change',ev=>{
      const el=ev.target;
      if(el?.matches?.('#quickTimeBody .quickTimeInput[data-key]'))callInputHandler(el,'qteInputChanged');
      else if(el?.matches?.('#fs09qBody .fs09qInput[data-key]'))callInputHandler(el,'fs09qTimeInput');
      else if(el?.matches?.('#fs09qBody .fs09qDataInput[data-key],#fs09qBody .fs09qTextArea[data-key]'))callInputHandler(el,'fs09qDataChanged');
    },true);

    return true;
  }

  function boot(){
    if(install())return;
    let n=0;const t=setInterval(()=>{n++;if(install()||n>40)clearInterval(t);},100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* ===== END quick-time-save-v32.js ===== */

/* V3.31: unused Pilot Control module removed. */

/* ===== BEGIN clean-workflow-v38.js ===== */
/* E-REPORT/SAGS V3.8 · CLEAN WORKFLOW UI
 * Clean workflow shell.
 * Flow: Login -> Flight list -> MY FLIGHT filter -> Flight Workspace -> assigned operational module.
 * Legacy operational functions remain as engines, but old role-specific toolbar/menu entry points are hidden.
 */
(function(root){'use strict';
  const BUILD='V3.8-20260821-01';
  const ROOT='flight_records', MANIFEST='roster_manifests', HANDOFF='roster_handoffs';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}};
  const today=()=>{const d=new Date(),iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`,cur=iso(d),p=new Date(d);p.setDate(p.getDate()-1);const prev=iso(p),saved=S(sessionStorage.getItem('sagsV36FwcDate'));if(saved===cur||saved===prev)return saved;return d.getHours()<4?prev:cur};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){const p=profile();return normUser(p.username||(role()==='AD'?'AD':''))}
  function logged(){return !!role()&&!!me()}
  function isAD(){return role()==='AD'}
  function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function canFeature(k){try{return isAD()||typeof root.v485Can!=='function'||!!root.v485Can(k)}catch(_){return isAD()}}
  function dateFromUi(){return S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today()}
  function flightIdFromCard(card){const s=S(card?.querySelector('button[onclick*="flightWorkspaceOpenFlight"]')?.getAttribute('onclick'));return s.match(/flightWorkspaceOpenFlight\(['"]([^'"]+)['"]\)/)?.[1]||''}
  function flightName(rec){return S(rec?.depFlight||rec?.arrFlight||rec?.flightName||rec?.flightRaw||rec?.flightId)}
  function normFlight(v){return U(v).replace(/[^A-Z0-9]/g,'')}
  function splitFlightTokens(raw){const out=[],s=U(raw).replace(/[\/]+/g,' ');let prefix='';for(const p0 of s.split(/\s+/).filter(Boolean)){const p=p0.replace(/[^A-Z0-9]/g,'');let m=/^([A-Z0-9]{2,3}?)(\d{1,5})$/.exec(p);if(m&&/[A-Z]/.test(m[1])){prefix=m[1];out.push(prefix+m[2]);continue}m=/^(\d{1,5})$/.exec(p);if(m&&prefix)out.push(prefix+m[1])}return [...new Set(out)]}
  function rosterFlightTokens(item){return [...new Set([normFlight(item?.arrFlight),normFlight(item?.depFlight),...splitFlightTokens(item?.flightRaw),...splitFlightTokens(item?.flightName)].filter(Boolean))]}
  function resolveRosterFlightId(date,item,flights={}){
    if(!item||item.active===false)return '';
    const direct=S(item.flightId);if(direct&&(!flights||!Object.keys(flights).length||flights[direct]))return direct;
    let derived='';try{if(typeof root.sagsFlightHubFlightId==='function')derived=S(root.sagsFlightHubFlightId(date,item?.arrFlight||'',item?.depFlight||'',item?.flightRaw||item?.flightName||''))}catch(_){ }
    if(derived&&(!flights||!Object.keys(flights).length||flights?.[derived]))return S(flights?.[derived]?.flightId||derived);
    const wanted=new Set(rosterFlightTokens(item));if(!wanted.size)return '';
    const hits=[];for(const [key,rec] of Object.entries(flights||{})){if(!rec||rec.rosterActive===false||U(rec.rosterStatus)==='ROSTER_REMOVED')continue;const common=rosterFlightTokens(rec).filter(x=>wanted.has(x)).length;if(common)hits.push({fid:S(rec.flightId||key),score:common})}
    hits.sort((a,b)=>b.score-a.score);return hits.length&&(!hits[1]||hits[0].score>hits[1].score)?hits[0].fid:'';
  }
  root.sagsV346ResolveRosterFlightId=resolveRosterFlightId;
  function rosterItemMatches(item,fid){return item&&item.active!==false&&resolveRosterFlightId(dataCache.date||dateFromUi(),item,dataCache.flights)===S(fid)}
  function myFilterKey(){return `sagsV38MyFlight:${me()||'ANON'}`}
  function myOnlyDefault(){try{const v=sessionStorage.getItem(myFilterKey());if(v==='0'||v==='1')return v==='1'}catch(_){}return !isAD()}
  function setMyOnly(v){try{sessionStorage.setItem(myFilterKey(),v?'1':'0')}catch(_){} }

  let dataCache={date:'',flights:{},manifest:{},handoffs:{},myIds:new Set(),pendingIds:new Set()};
  async function loadContext(date){
    date=S(date)||today();
    const [fs,ms,hs]=await Promise.all([
      dbref(`${ROOT}/${safe(date)}`).once('value'),
      dbref(`${MANIFEST}/${safe(date)}`).once('value'),
      dbref(`${HANDOFF}/${safe(date)}`).once('value').catch(()=>({val:()=>({})}))
    ]);
    const flights=fs.val()||{},manifest=ms.val()||{},handoffs=hs.val?.()||{},u=me(),myIds=new Set(),pendingIds=new Set(),repairPatch={};
    for(const rec of Object.values(flights)){if(rec?.rosterActive===false||U(rec?.rosterStatus)==='ROSTER_REMOVED')continue;for(const a of Object.values(rec?.unitAssignments||{}))if(normUser(a?.username)===u)myIds.add(S(rec.flightId));}
    for(const [aid,item] of Object.entries(manifest?.items||{})){
      if(!item||item.active===false)continue;
      const oldFid=S(item.flightId),fid=resolveRosterFlightId(date,item,flights),owner=normUser(item.user||item.targetUser);
      if(fid)item.flightId=fid;
      if(owner===u&&fid)myIds.add(fid);
      if(fid&&oldFid!==fid&&(owner===u||isAD())){
        repairPatch[`${MANIFEST}/${safe(date)}/items/${safe(aid)}/flightId`]=fid;
        if(owner)repairPatch[`roster_mail/${safe(owner)}/items/${safe(aid)}/flightId`]=fid;
      }
    }
    for(const h of Object.values(handoffs||{})){
      if(U(h?.status)!=='APPROVED_WAITING_ACCEPT'||normUser(h?.toUser)!==u)continue;
      const item=manifest?.items?.[h.assignmentId],fid=resolveRosterFlightId(date,item,flights);if(fid)pendingIds.add(fid);
    }
    dataCache={date,flights,manifest,handoffs,myIds,pendingIds};
    if(Object.keys(repairPatch).length)Promise.resolve(dbref('').update(repairPatch)).then(()=>{root.__SAGS_V346_LAST_REPAIR={date,count:Object.keys(repairPatch).length,atMs:Date.now()}}).catch(e=>console.info('V3.46 roster flightId repair',e?.message||e));
    return dataCache;
  }
  function isMine(fid){return dataCache.myIds.has(S(fid))}

  function ensureStyle(){if(document.getElementById('v38CleanStyle'))return;const st=document.createElement('style');st.id='v38CleanStyle';st.textContent=`
body.v38-clean-workflow .toolbar-row.main-actions{display:none!important}
body.v38-clean-workflow .toolbar{gap:6px!important;padding-bottom:6px!important}
#v38CleanNav{display:none;gap:6px;flex-wrap:wrap;width:100%;align-items:center;padding-top:4px}
body.v38-clean-workflow #v38CleanNav{display:flex}
.v38NavBtn{border:0;border-radius:10px;min-height:38px;padding:8px 12px;background:#0b67b2;color:#fff;font:900 12px Arial;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.10)}
.v38NavBtn.purple{background:#5b21b6}.v38NavBtn.gray{background:#e9eef3;color:#30475b}.v38NavBtn.admin{background:#7c2d12}.v38NavBtn.rs{background:#0f766e}.v38NavSpacer{flex:1}
#v38FlowHint{font:800 10px/1.25 Arial;color:#526777;white-space:nowrap;align-self:center;padding:0 4px}
.v38MyToggle{display:inline-flex;align-items:center;gap:7px;border:2px solid #0b67b2;border-radius:10px;padding:7px 10px;background:#eef7ff;color:#0b4f91;font:900 12px Arial;cursor:pointer;user-select:none}.v38MyToggle input{width:19px;height:19px;accent-color:#0b67b2;margin:0}.v38MyToggle.on{background:#0b67b2;color:#fff}
.v38ListHint{font:800 11px Arial;color:#5d7080;padding:4px 0}.v38Flag{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;margin-right:5px;font:900 10px Arial}.v38Flag.my{background:#dff6e8;color:#126b39}.v38Flag.view{background:#edf2f6;color:#566877}.v38Flag.hand{background:#fff1cb;color:#855a00}
.v38ViewOnly{margin:0 0 10px;padding:10px 12px;border:2px solid #e0a400;border-radius:11px;background:#fff9df;color:#705100;font:900 12px/1.45 Arial}
.v38MyOps{margin:0 0 12px;border:2px solid #0b67b2;border-radius:13px;padding:11px;background:#f4faff}.v38MyOpsTitle{font:900 15px Arial;color:#0b4f91;margin-bottom:4px}.v38MyOpsSub{font:700 11px/1.4 Arial;color:#607383;margin-bottom:8px}.v38MyOpsBtns{display:flex;gap:7px;flex-wrap:wrap}.v38OpBtn{border:0;border-radius:9px;padding:9px 11px;background:#0b67b2;color:#fff;font:900 12px Arial;cursor:pointer}.v38OpBtn.green{background:#15803d}.v38OpBtn.orange{background:#b45309}.v38OpBtn.gray{background:#e8eef3;color:#31485a}.v38OpBtn:disabled{opacity:.5}
body.v38-clean-workflow #roleHomeIdle{pointer-events:none}
body.v344-login-settling #v38CleanNav{pointer-events:none!important}
@media(max-width:620px){#v38CleanNav{display:grid!important;grid-template-columns:1fr 1fr}.v38NavBtn{width:100%;padding:8px 7px;font-size:11px}.v38NavSpacer,#v38FlowHint{display:none}.v38MyOpsBtns{display:grid;grid-template-columns:1fr}.v38OpBtn{width:100%}}
/* V3.21 · compact flat operator action bar */
body.v38-clean-workflow .toolbar.compact-main-toolbar{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:6px!important;row-gap:5px!important;padding:6px 8px calc(6px + env(safe-area-inset-bottom))!important;align-items:center!important;background:linear-gradient(180deg,#0869b6,#075d9f)!important;border-radius:14px 14px 0 0!important;box-shadow:0 -2px 10px rgba(0,45,82,.12)!important}
body.v38-clean-workflow .toolbar.compact-main-toolbar>.badge{display:none!important}
body.v38-clean-workflow #roleAccountCluster{grid-column:1/-1!important;justify-self:end!important;display:flex!important;gap:4px!important;margin:0!important;min-height:0!important;align-items:center!important}
body.v38-clean-workflow #roleStatusBadge{font-size:10px!important;line-height:1.15!important;padding:5px 8px!important;border-radius:8px!important}
body.v38-clean-workflow #roleChangePasswordBtn,body.v38-clean-workflow #roleLogoutBtn{min-height:30px!important;padding:5px 8px!important;border-radius:8px!important;font-size:10px!important;box-shadow:none!important}
body.v38-clean-workflow #v313QuickContext{grid-column:1!important;width:100%!important;padding:0!important;margin:0!important;min-width:0!important}
body.v38-clean-workflow #v320NaContext{grid-column:2!important;width:100%!important;padding:0!important;margin:0!important;min-width:0!important}
body.v38-clean-workflow #v313QuickContext.show,body.v38-clean-workflow #v320NaContext.show{display:block!important}
body.v38-clean-workflow #v313QuickContextBtn,body.v38-clean-workflow #v320NaBtn{width:100%!important;min-height:39px!important;height:39px!important;padding:6px 8px!important;border-radius:9px!important;font:900 11px/1.1 Arial!important;box-shadow:none!important;white-space:normal!important;touch-action:manipulation!important}
body.v38-clean-workflow #v313QuickContextBtn{background:#0b77d1!important;border:1px solid rgba(255,255,255,.18)!important}
body.v38-clean-workflow #v320NaBtn{background:#3f5366!important;border:1px solid rgba(255,255,255,.14)!important}
body.v38-clean-workflow #v313QuickContextHint,body.v38-clean-workflow #v320NaHint{display:none!important}
body.v38-clean-workflow #v38CleanNav{grid-column:1/-1!important;display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;gap:5px!important;width:100%!important;padding:0 0 1px!important;margin:0!important;align-items:stretch!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important}
body.v38-clean-workflow #v38CleanNav::-webkit-scrollbar{display:none!important}
body.v38-clean-workflow .v38NavBtn{flex:0 0 auto!important;width:auto!important;min-width:96px!important;min-height:34px!important;height:34px!important;padding:5px 9px!important;border-radius:9px!important;font:900 10.5px/1 Arial!important;box-shadow:none!important;border:1px solid #d8e3ec!important;background:#f8fbfd!important;color:#23455f!important;white-space:nowrap!important}
body.v38-clean-workflow .v38NavBtn.flights{background:#eef7ff!important;color:#07599d!important;border-color:#bad9f1!important}
body.v38-clean-workflow .v38NavBtn.multi{background:#f5f1ff!important;color:#5b21b6!important;border-color:#d9ccfa!important}
body.v38-clean-workflow .v38NavBtn.shift{background:#fff7e9!important;color:#a65400!important;border-color:#f0d3aa!important}
body.v38-clean-workflow .v38NavBtn.sign{background:#f4f6f8!important;color:#35495a!important;border-color:#d7dee4!important}
body.v38-clean-workflow .v38NavBtn.admin{background:#fff0ed!important;color:#9a3412!important;border-color:#efc2b5!important}
body.v38-clean-workflow .v38NavSpacer,body.v38-clean-workflow #v38FlowHint{display:none!important}
body.v38-clean-workflow #v38NavRS,body.v38-clean-workflow #readSignQuickBtn,body.v38-clean-workflow .readSignNotifyBadge{display:none!important}
@media(max-width:620px){body.v38-clean-workflow #v38CleanNav{display:flex!important;grid-template-columns:none!important}.v38NavBtn{width:auto!important}.v38MyOpsBtns{display:grid;grid-template-columns:1fr}.v38OpBtn{width:100%}}
`;document.head.appendChild(st)}

  function ensureCleanNav(){
    ensureStyle();const bar=document.querySelector('.toolbar');if(!bar)return;
    let nav=document.getElementById('v38CleanNav');if(!nav){nav=document.createElement('div');nav.id='v38CleanNav';bar.appendChild(nav)}
    const rsAvailable=false; // V3.21: READ & SIGN is not enabled for operation yet.
    const shiftAvailable=typeof root.v310ShiftOpen==='function';
    const signAvailable=typeof root.openTemplateMenu==='function' && ['AD','DH','PVHK','CBTT','KH'].includes(role());
    const sig=[logged()?'1':'0',rsAvailable?'1':'0',shiftAvailable?'1':'0',signAvailable?'1':'0',isAD()?'1':'0'].join('|');
    // V3.11: do not rebuild the navigation bar on polling/sync. Replacing innerHTML
    // every few seconds caused READ & SIGN and GIAO CA to visibly blink on mobile.
    if(nav.dataset.v311Sig===sig && document.getElementById('v38NavFlights') && document.getElementById('v38NavMulti'))return;
    nav.dataset.v311Sig=sig;
    nav.innerHTML=`<button class="v38NavBtn flights" id="v38NavFlights">✈ CHUYẾN</button><button class="v38NavBtn" id="v350CurrentFlightDossierNav" style="display:none" title="Hồ sơ chuyến bay này">📁 HỒ SƠ</button><button class="v38NavBtn multi" id="v38NavMulti">⇄ MULTI</button>${shiftAvailable?'<button class="v38NavBtn shift" id="v310ShiftNav">↔ GIAO CA</button>':''}${signAvailable?'<button class="v38NavBtn sign" id="v38NavSignature">✍ KÝ</button>':''}<span class="v38NavSpacer"></span><span id="v38FlowHint">FLIGHT WORKSPACE · V3.23</span>${isAD()?'<button class="v38NavBtn admin" id="v38NavAdmin">⚙ QUẢN LÝ</button>':''}`;
    document.getElementById('v38NavFlights').onclick=()=>root.flightWorkspaceOpenList?.(today());
    document.getElementById('v350CurrentFlightDossierNav').onclick=()=>root.sagsV338OpenCurrentDossier?.();
    document.getElementById('v38NavMulti').onclick=()=>root.sagsV36OpenMultitask?.();
    const sh=document.getElementById('v310ShiftNav');if(sh)sh.onclick=()=>root.v310ShiftOpen?.('create');
    const sign=document.getElementById('v38NavSignature');if(sign)sign.onclick=()=>root.openTemplateMenu?.();
    const ad=document.getElementById('v38NavAdmin');if(ad)ad.onclick=()=>root.adminHubOpen?.();
  }

  async function decorateList(date){
    const host=document.getElementById('fwcList');if(!host)return;date=S(date)||dateFromUi();
    try{await loadContext(date)}catch(e){console.warn('V3.8 list context',e);return}
    const tools=document.querySelector('#fwcBody .fwcTools');
    if(tools&&!document.getElementById('v38MyFlightToggle')){
      const wrap=document.createElement('label');wrap.id='v38MyFlightLabel';wrap.className='v38MyToggle';wrap.innerHTML='<input id="v38MyFlightToggle" type="checkbox"> MY FLIGHT';tools.insertBefore(wrap,tools.firstChild);
      const hint=document.createElement('div');hint.id='v38ListHint';hint.className='v38ListHint';tools.insertAdjacentElement('afterend',hint);
      document.getElementById('v38MyFlightToggle').onchange=e=>{setMyOnly(!!e.target.checked);applyListFilter()};
    }
    const tog=document.getElementById('v38MyFlightToggle');if(tog)tog.checked=myOnlyDefault();
    for(const card of host.querySelectorAll('.fwcFlight')){
      const fid=flightIdFromCard(card);if(!fid)continue;card.dataset.v38Fid=fid;
      let flags=card.querySelector('.v38Flags');if(!flags){flags=document.createElement('div');flags.className='v38Flags';card.querySelector('.fwcFlightTitle')?.insertAdjacentElement('beforebegin',flags)}
      const mine=isMine(fid),pending=dataCache.pendingIds.has(fid);flags.innerHTML=`${mine?'<span class="v38Flag my">MY</span>':'<span class="v38Flag view">VIEW</span>'}${pending?'<span class="v38Flag hand">HANDOVER</span>':''}`;
    }
    applyListFilter();
  }
  function applyListFilter(){
    const only=!!document.getElementById('v38MyFlightToggle')?.checked;setMyOnly(only);const lab=document.getElementById('v38MyFlightLabel');lab?.classList.toggle('on',only);
    let shown=0,total=0,myCount=0;for(const card of document.querySelectorAll('#fwcList .fwcFlight')){total++;const mine=isMine(card.dataset.v38Fid);if(mine)myCount++;const show=!only||mine;card.style.display=show?'grid':'none';if(show)shown++}
    const h=document.getElementById('v38ListHint');if(h)h.textContent=only?`MY FLIGHT: ${shown} chuyến được phân/đang phụ trách · bỏ tích để xem mở rộng ${total} chuyến.`:`ĐANG XEM MỞ RỘNG: ${shown} chuyến · ${myCount} chuyến có badge MY. Chuyến VIEW không được tự nhận nhiệm vụ.`;
    const status=document.getElementById('fwcStatus');if(status){if(only)status.textContent=shown?`✓ MY FLIGHT · ${shown} chuyến được phân/đang phụ trách.`:'Tài khoản hiện tại chưa có chuyến được Daily Roster phân hoặc đã tiếp nhận hợp lệ.';else status.textContent=`✓ DANH SÁCH MỞ RỘNG · ${shown} chuyến · MY ${myCount}. Chuyến VIEW không được tự nhận nhiệm vụ.`;}
  }

  function assignedItems(fid){const u=me(),items=[];for(const x of Object.values(dataCache.manifest?.items||{}))if(rosterItemMatches(x,fid)&&normUser(x.user||x.targetUser)===u)items.push(x);return items}
  function formLabel(g){g=S(g).toLowerCase();return g==='fsags421'?'FSAGS 42.1':g==='fsags551'?'FSAGS 55.1':g==='fsags09'?'PVHK · KẾT SỔ':'FSAGS 42.3 / ĐIỀU HÀNH'}
  function injectWorkspace(fid){
    const body=document.getElementById('fwcBody'),head=body?.querySelector('.fwcWorkspaceHead');if(!body||!head)return;
    body.querySelectorAll('.v38ViewOnly,.v38MyOps').forEach(x=>x.remove());
    const mine=isMine(fid),pending=dataCache.pendingIds.has(fid);
    // Never allow claim on a flight that is only being viewed.
    if(!mine){
      body.querySelectorAll('button[onclick*="flightWorkspaceClaim"]').forEach(b=>b.style.display='none');
      const n=document.createElement('div');n.className='v38ViewOnly';n.innerHTML=`👁 <b>CHỈ VIEW</b> · Chuyến này không được phân cho tài khoản ${esc(me()||'hiện tại')}. Không được NHẬN/INPUT/VERIFY/APPROVE chỉ vì đang xem.${pending?' <b>Đang có HANDOVER chờ bạn tiếp nhận.</b>':''}`;head.insertAdjacentElement('afterend',n);return;
    }
    const items=assignedItems(fid),buttons=[];
    for(const item of items){const aid=S(item.assignmentId);if(!aid)continue;buttons.push(`<button class="v38OpBtn green" onclick="v38OpenRosterAssignment('${esc(aid)}')">${esc(formLabel(item.formGroup))}</button>`)}
    const r=role();
    if((r==='CBTT'||isAD())&&canFeature('FINAL'))buttons.push('<button class="v38OpBtn" onclick="v38OpenLegacyModule(\'FINAL\')">⚖ FINAL / CROSSCHECK</button>');
    if((r==='KH'||r==='CARGO'||isAD())&&canFeature('FSAGS208'))buttons.push('<button class="v38OpBtn orange" onclick="v38OpenLegacyModule(\'CARGO\')">📦 KHO HÀNG / FSAGS 208</button>');
    const box=document.createElement('div');box.className='v38MyOps';box.innerHTML=`<div class="v38MyOpsTitle">NGHIỆP VỤ CỦA TÔI · ${esc(flightName(dataCache.flights?.[fid]||{}))}</div><div class="v38MyOpsSub">Chỉ các chức năng gắn với chuyến/assignment hiện tại được đưa ra đây. Các nút chức năng cũ ngoài Flight Workspace đã bị loại khỏi luồng.</div><div class="v38MyOpsBtns">${buttons.join('')||'<span class="v38ListHint">Chuyến thuộc MY FLIGHT nhưng chưa có module thao tác trực tiếp được cấu hình cho tài khoản này.</span>'}</div>`;head.insertAdjacentElement('afterend',box);
  }

  root.v38OpenRosterAssignment=async function(aid){
    aid=S(aid);if(!aid)return;const item=dataCache.manifest?.items?.[aid];if(!item||normUser(item.user||item.targetUser)!==me())return alert('Assignment này không còn thuộc tài khoản hiện tại. Hãy tải lại MY FLIGHT.');
    let meta=null;try{meta=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===aid)}catch(_){}
    if(!meta){try{root.dailyRosterRestartMailbox?.();await new Promise(r=>setTimeout(r,700));meta=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===aid)}catch(_){} }
    if(!meta)return alert('Biểu mẫu roster chưa đồng bộ xuống thiết bị. Hãy chờ vài giây rồi bấm lại.');
    try{root.flightWorkspaceClose?.();root.switchFlightSession?.(meta.id)}catch(e){alert('Không mở được nghiệp vụ: '+S(e?.message||e))}
  };
  root.v38OpenLegacyModule=function(kind){
    kind=U(kind);try{root.flightWorkspaceClose?.();if(kind==='FINAL')return root.openFinalSheetManager?.();if(kind==='CARGO')return root.openKH208Manager?.();if(kind==='QUICK_TIME')return root.openQuickTimePanel?.()}catch(e){alert('Không mở được module: '+S(e?.message||e))}
  };

  function patchWorkspace(){
    if(typeof root.flightWorkspaceOpenList!=='function'||typeof root.flightWorkspaceOpenFlight!=='function')return false;
    if(!root.flightWorkspaceOpenList.__v38){
      const baseList=root.flightWorkspaceOpenList,baseFlight=root.flightWorkspaceOpenFlight,baseClaim=root.flightWorkspaceClaim;
      root.flightWorkspaceOpenList=function(d){d=S(d)||today();const r=baseList.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(()=>decorateList(d),80));return r};root.flightWorkspaceOpenList.__v38=1;
      root.flightWorkspaceOpenFlight=function(fid){const r=baseFlight.apply(this,arguments);(async()=>{try{if(dataCache.date!==dateFromUi())await loadContext(dateFromUi())}catch(_){}setTimeout(()=>injectWorkspace(fid),50)})();return r};root.flightWorkspaceOpenFlight.__v38=1;
      if(typeof baseClaim==='function'){root.flightWorkspaceClaim=async function(fid,unit){try{if(dataCache.date!==dateFromUi())await loadContext(dateFromUi());if(!isMine(fid))return alert('Không được nhận nhiệm vụ: chuyến này không thuộc MY FLIGHT của tài khoản hiện tại. Muốn đổi người phải qua BÀN GIAO → DUYỆT → TIẾP NHẬN.');return await baseClaim.apply(this,arguments)}catch(e){alert(S(e?.message||e))}};root.flightWorkspaceClaim.__v38=1}
    }
    return true;
  }

  let loginSettledFor='';
  function sync(){
    ensureStyle();document.body.classList.toggle('v38-clean-workflow',logged());ensureCleanNav();patchWorkspace();
    const nav=document.getElementById('v38CleanNav');if(nav)nav.style.display=logged()?'flex':'none';
    const key=logged()?`${me()}|${today()}`:'';
    if(key&&key!==loginSettledFor){loginSettledFor=key;try{root.flightWorkspaceClose?.()}catch(_){}document.body.classList.add('v344-login-settling');setTimeout(()=>document.body.classList.remove('v344-login-settling'),850)}
    if(!logged())loginSettledFor='';
  }
  const baseApply=root.applyRoleUI;if(typeof baseApply==='function'&&!baseApply.__v38){root.applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(sync,0);return r};root.applyRoleUI.__v38=1}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,350),{once:true});else setTimeout(sync,350);
  setInterval(sync,2200);
  root.__SAGS_V38_BUILD=BUILD;
  root.__SAGS_V38_HDSD='V3.44 CLEAN WORKFLOW: ẩn toàn bộ toolbar nghiệp vụ cũ. Sau đăng nhập giữ nguyên màn hình chờ; CHUYẾN HÔM NAY chỉ mở khi người dùng bấm CHUYẾN. MY FLIGHT mặc định bật cho nhân viên và chỉ hiện chuyến Daily Roster phân/đã tiếp nhận; bỏ tích để xem danh sách mở rộng với badge VIEW. Chuyến VIEW không được nhận việc. Nghiệp vụ chỉ mở từ đúng Flight Workspace/assignment; Multitask chỉ lấy MY FLIGHT. AD dùng QUẢN LÝ qua Admin Hub.';
  root.__SAGS_V346_HDSD='V3.46: assignment roster thiếu flightId được đối chiếu theo ngày khai thác + cặp Flight, dùng ngay cho MY FLIGHT/NHẬN CHUYẾN/MULTITASK và tự ghi sửa lại manifest/mailbox. Roster mới luôn ghi flightId trực tiếp khi publish; chỉ assignment ACTIVE đúng username được phục hồi.';
})(typeof window!=='undefined'?window:globalThis);

/* ===== END clean-workflow-v38.js ===== */

/* ===== BEGIN clean-ops-v310.js ===== */
/* E-REPORT/SAGS V3.10 · TASK EXPORT/SHARE + SHIFT HANDOVER
 * Clean workflow extension on top of V3.9.
 * - Each roster task can be exported/shared from its Flight Workspace.
 * - FINAL gets a native Share button next to Export PDF.
 * - Shift handover moves multiple current assignments as one controlled batch:
 *   A requests -> AD/department manager approves -> B accepts -> ownership changes atomically.
 */
(function(root){'use strict';
  const BUILD='V3.12-20260821-01';
  const MANIFEST='roster_manifests', MAIL='roster_mail', SESSION='roster_sessions', REVOKE='roster_revocations';
  const HANDOFF='roster_handoffs', SHIFT='shift_handoffs', SHIFT_MAIL='shift_handoff_mail', FLIGHTS='flight_records';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const now=()=>Date.now();
  const today=()=>{const d=new Date(),iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`,cur=iso(d),p=new Date(d);p.setDate(p.getDate()-1);const prev=iso(p),saved=S(sessionStorage.getItem('sagsV36FwcDate'));if(saved===cur||saved===prev)return saved;return d.getHours()<4?prev:cur};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){return norm(profile().username||(role()==='AD'?'AD':''))}
  function actor(){const p=profile();return {principalId:S(p.uid||p.firebaseUid||p.authUid||(me()?'LEGACY:'+me():'LEGACY:'+role())),username:me(),name:S(p.name||p.fullName||p.username||me()),role:role(),departmentCode:S(p.departmentCode||p.systemDepartment||p.department),groupCode:S(p.groupCode||p.group)}}
  function ref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function catalog(force=false){try{return typeof root.v466GetUserCatalog==='function'?await root.v466GetUserCatalog(force):[]}catch(_){return []}}
  function depOf(p){return U(p?.departmentCode||p?.systemDepartment||p?.department||'')}
  function groupOf(p){return U(p?.groupCode||p?.group||'')}
  function sameUnit(a,b){if(!a||!b)return false;const ad=depOf(a),bd=depOf(b);if(ad&&bd)return ad===bd;const ag=groupOf(a),bg=groupOf(b);return !!ag&&ag===bg}
  const MANAGER_TITLES=new Set(['TRƯỞNG PHÒNG','PHÓ PHÒNG','ĐỘI TRƯỞNG','ĐỘI PHÓ','CA TRƯỞNG','CA PHÓ']);
  function isManager(p){return !!p&&p.active!==false&&MANAGER_TITLES.has(U(p.jobTitle))}
  function profileOf(items,u){u=norm(u);return (items||[]).find(x=>norm(x.username)===u)||null}
  function canApprove(batch,users){if(role()==='AD')return true;const p=profileOf(users,me());return isManager(p)&&!!U(batch.departmentCode)&&depOf(p)===U(batch.departmentCode)}
  function formLabel(g){g=U(g);return g==='FSAGS421'?'FSAGS 42.1':g==='FSAGS551'?'FSAGS 55.1':g==='FSAGS09'?'PVHK · KẾT SỔ':g==='LOADING208'?'FSAGS 208':'FSAGS 42.3'}
  function rosterUnit(item){const rk=U(item?.roleKey),src=U(item?.sourceColumn),form=U(item?.formGroup);if(rk==='PAX09'||src.includes('PAX_SUPR')||form==='FSAGS09')return 'PVHK';if(['COR','LD','BOTH'].includes(rk)||src.includes('GRND_COR')||src.includes('GRND_LD')||['FSAGS','FSAGS421','FSAGS551'].includes(form))return 'DH';return ''}
  async function opsAudit(event,detail,reason=''){try{const a=actor(),ctx={flightId:S(root.activeFlightSessionId||''),flightLabel:S(root.currentFlightSessionMeta?.()?.name||'')};await ref('ops_audit_v331').push({schema:1,event:S(event),systemTimestamp:root.firebase?.database?.ServerValue?.TIMESTAMP||now(),clientAtMs:now(),actor:a,flightId:ctx.flightId,flightLabel:ctx.flightLabel,reason:S(reason),detail:detail||{}})}catch(e){console.warn('V3.10 audit',e)}}

  /* ---------- TASK EXPORT / SHARE ---------- */
  async function currentManifest(date=today()){const s=await ref(`${MANIFEST}/${safe(date)}`).once('value');return s.val()||{}}
  async function assignmentMeta(aid){let m=null;try{m=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===S(aid))}catch(_){}if(!m){try{root.dailyRosterRestartMailbox?.();await new Promise(r=>setTimeout(r,650));m=(root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===S(aid))}catch(_){}}return m}
  function v312AutoFillNA(){
    try{
      if(typeof root.fillBlankNA!=='function')return 0;
      const count=Number(root.fillBlankNA({silent:true,source:'EXPORT'}))||0;
      if(count>0)void opsAudit('AUTO_FILL_NA_BEFORE_EXPORT',{count,flightSessionId:S(root.activeFlightSessionId||''),formGroup:S(root.activeFormGroup||'')});
      return count;
    }catch(e){console.warn('V3.12 auto N/A',e);return 0}
  }

  root.v310ExportAssignment=async function(aid){
    try{
      aid=S(aid);const date=S(document.getElementById('fwcDate')?.value)||today(),man=await currentManifest(date),item=man?.items?.[aid];
      if(!item||item.active===false||norm(item.user||item.targetUser)!==me())throw new Error('Công việc này không còn thuộc MY FLIGHT của tài khoản hiện tại.');
      const meta=await assignmentMeta(aid);if(!meta)throw new Error('Biểu mẫu chưa đồng bộ xuống thiết bị. Hãy mở công việc một lần rồi thử lại.');
      root.flightWorkspaceClose?.();root.switchFlightSession?.(meta.id);await new Promise(r=>setTimeout(r,180));
      if(typeof root.openExportChoiceMenu==='function')root.openExportChoiceMenu();else if(typeof openExportChoiceMenu==='function')openExportChoiceMenu();else throw new Error('Chức năng xuất PDF chưa sẵn sàng.');
      await opsAudit('TASK_EXPORT_OPENED',{assignmentId:aid,flightId:S(item.flightId),formGroup:S(item.formGroup)});
    }catch(e){alert('Không mở được XUẤT / CHIA SẺ: '+S(e?.message||e))}
  };
  root.v310ShareCurrentFinal=async function(){
    try{
      if(!['CBTT','AD'].includes(role()))throw new Error('Chỉ CBTT/AD được xuất/chia sẻ FINAL.');
      if(typeof ffBuildExportCanvas!=='function'||typeof canvasesToPdfFile!=='function')throw new Error('Engine PDF FINAL chưa sẵn sàng.');
      const rec=typeof currentFinalSheetRecord==='function'?currentFinalSheetRecord():null;
      const form=(typeof ffCurrent!=='undefined'&&ffCurrent)||rec?.form;if(!form)throw new Error('Chưa mở FINAL cần chia sẻ.');
      const data=typeof ffCurrentData==='function'?ffCurrentData(form):{};const canvas=await ffBuildExportCanvas(form,data);
      const ident=typeof ffBuildSendIdentity==='function'?ffBuildSendIdentity(form,data):{};
      const code=typeof ffFormCode==='function'?ffFormCode(form):'FINAL',rev=typeof ffCurrentRevisionNo==='function'?ffCurrentRevisionNo():1;
      const dt=ident.dateToken||(typeof ffTodayISO==='function'?ffTodayISO().replace(/-/g,''):today().replace(/-/g,''));
      const name=[code,ident.flightToken||'FINAL',dt,'V'+rev].filter(Boolean).join('_')+'.pdf';
      const file=await canvasesToPdfFile([canvas],name);
      if(typeof preparedPdfFile!=='undefined'){preparedPdfFile=file;preparedPdfName=name;try{v479ReleasePreparedUrl?.()}catch(_){};try{openExportModal?.('PDF FINAL đã sẵn sàng. Chọn GỬI PDF để mở Share Sheet (Zalo nếu thiết bị hỗ trợ).');v479ShowPreparedButtons?.();}catch(_){}}
      else if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({title:name.replace(/\.pdf$/i,''),files:[file]});
      else{const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
      await opsAudit('FINAL_SHARE_PREPARED',{name,revision:rev,flightToken:ident.flightToken||''});
    }catch(e){if(e?.name!=='AbortError')alert('Không chia sẻ được FINAL: '+S(e?.message||e))}
  };
  let v312ExportRenderToken=0;
  async function injectTaskExports(fid){
    const token=++v312ExportRenderToken;
    const body=document.getElementById('fwcBody'),ops=body?.querySelector('.v38MyOps');if(!body||!ops)return;
    let box=body.querySelector('#v310TaskDocsSingleton');
    body.querySelectorAll('.v310TaskDocs').forEach(x=>{if(x!==box)x.remove()});
    if(!box){box=document.createElement('div');box.id='v310TaskDocsSingleton';box.className='v310TaskDocs';ops.insertAdjacentElement('afterend',box)}
    else if(box.previousElementSibling!==ops)ops.insertAdjacentElement('afterend',box);
    box.dataset.flightId=S(fid);
    box.innerHTML='<div class="v310DocsTitle">📤 XUẤT / CHIA SẺ TÀI LIỆU CỦA TÔI</div><div class="v310DocsSub">Đang tải tài liệu của chuyến...</div>';
    const date=S(document.getElementById('fwcDate')?.value)||today();let man={};try{man=await currentManifest(date)}catch(_){if(token===v312ExportRenderToken)box.remove();return}
    if(token!==v312ExportRenderToken||!document.body.contains(box)||box.dataset.flightId!==S(fid))return;
    const items=Object.values(man?.items||{}).filter(x=>x&&x.active!==false&&(S(x.flightId)||S(root.sagsV346ResolveRosterFlightId?.(date,x,{})))===S(fid)&&norm(x.user||x.targetUser)===me());
    const buttons=items.map(x=>`<button class="v310DocBtn" onclick="v310ExportAssignment('${esc(x.assignmentId)}')">📤 ${esc(formLabel(x.formGroup))}</button>`);
    if(['CBTT','AD'].includes(role()))buttons.push('<button class="v310DocBtn final" onclick="v38OpenLegacyModule(\'FINAL\')">⚖ MỞ FINAL · PDF/CHIA SẺ</button>');
    body.querySelectorAll('.v310TaskDocs').forEach(x=>{if(x!==box)x.remove()});
    box.innerHTML=`<div class="v310DocsTitle">📤 XUẤT / CHIA SẺ TÀI LIỆU CỦA TÔI</div><div class="v310DocsSub">Tạo PDF của đúng công việc/chuyến đang phụ trách. N/A chỉ được điền khi người dùng chủ động bấm <b>N/A · ĐIỀN CÁC Ô TRỐNG</b> trên biểu mẫu. Sau khi tạo PDF, chọn <b>GỬI PDF</b> để mở Share Sheet và chọn Zalo/ứng dụng khác nếu thiết bị hỗ trợ.</div><div class="v310DocsBtns">${buttons.join('')||'<span>Chưa có tài liệu được gắn cho tài khoản này.</span>'}</div>`;
  }
  function patchAutoNAExportMenu(){ /* V3.20: export must never auto-fill N/A. */ return; }
  function injectFinalShare(){const exp=document.getElementById('ffExportBtn'),host=exp?.parentElement;if(!exp||!host)return;let b=document.getElementById('ffShareBtnV310');if(!b){b=document.createElement('button');b.id='ffShareBtnV310';b.className='finalHeaderBtn choose';b.textContent='CHIA SẺ';b.onclick=()=>root.v310ShareCurrentFinal();host.insertBefore(b,exp.nextSibling)}b.style.display=exp.style.display==='none'?'none':''}

  /* ---------- SHIFT HANDOVER ---------- */
  let shiftCache={date:'',manifest:{},flights:{},batches:{},users:[]},shiftTab='create',mailRef=null,mailCb=null;
  function batchId(){return `SHIFT_${safe(me())}_${now()}_${Math.random().toString(36).slice(2,7).toUpperCase()}`}
  function ensureUI(){
    if(!document.getElementById('v310Style')){const st=document.createElement('style');st.id='v310Style';st.textContent=`
      .v310DocBtn{border:0;border-radius:9px;padding:9px 11px;background:#0f766e;color:#fff;font:900 12px Arial;cursor:pointer}.v310DocBtn.final{background:#5b21b6}.v310TaskDocs{margin:0 0 12px;border:2px solid #0f766e;border-radius:13px;padding:11px;background:#f0fdfa}.v310DocsTitle{font:900 14px Arial;color:#0f5e58}.v310DocsSub{font:700 11px/1.45 Arial;color:#607383;margin:4px 0 8px}.v310DocsBtns{display:flex;gap:7px;flex-wrap:wrap}
      #v310ShiftModal{display:none;position:fixed;inset:0;z-index:19050;background:rgba(0,0,0,.58);align-items:center;justify-content:center;padding:10px;font-family:Arial,sans-serif}#v310ShiftModal.show{display:flex}.v310ShiftPanel{width:min(98vw,900px);max-height:94vh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-shadow:0 18px 50px rgba(0,0,0,.32)}.v310ShiftHead{display:flex;justify-content:space-between;gap:10px;align-items:start}.v310ShiftHead h3{margin:0;color:#0b4f91}.v310ShiftTabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.v310ShiftTab,.v310ShiftBtn{border:0;border-radius:9px;padding:9px 11px;font-weight:900;cursor:pointer;background:#0b67b2;color:#fff}.v310ShiftTab.on{background:#173f60}.v310ShiftBtn.gray{background:#e9eef3;color:#31475a}.v310ShiftBtn.green{background:#15803d}.v310ShiftBtn.red{background:#b42318}.v310ShiftCard{border:1px solid #d8e2ea;border-radius:12px;padding:10px;margin:8px 0}.v310ShiftFlight{font-weight:900;color:#173f60}.v310ShiftMeta{font-size:12px;color:#607080;margin-top:4px}.v310ShiftAssign{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid #edf1f4}.v310ShiftAssign input{width:20px;height:20px;accent-color:#0b67b2}.v310ShiftForm{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v310ShiftForm select,.v310ShiftForm textarea{width:100%;padding:9px;border:1px solid #ccd7df;border-radius:9px}.v310ShiftForm textarea{grid-column:1/-1;min-height:70px}.v310ShiftStatus{padding:9px 10px;border-radius:9px;background:#eef6ff;color:#244862;font-size:12px;margin:8px 0}.v310ShiftBatch{border:1px solid #d8e2ea;border-radius:12px;padding:10px;margin:8px 0}.v310ShiftBatch.pending{background:#fffaf0;border-color:#e0b46a}.v310ShiftBatch.approved{background:#f4fbf6;border-color:#79b98d}.v310ShiftButtons{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      @media(max-width:620px){.v310DocsBtns,.v310ShiftForm{display:grid;grid-template-columns:1fr}.v310DocBtn{width:100%}.v310ShiftForm textarea{grid-column:auto}}
    `;document.head.appendChild(st)}
    if(document.getElementById('v310ShiftModal'))return;
    const m=document.createElement('div');m.id='v310ShiftModal';m.innerHTML=`<div class="v310ShiftPanel"><div class="v310ShiftHead"><div><h3>🔄 GIAO CA</h3><div class="v310ShiftMeta">Chuyển nhiều công việc đang phụ trách trong một lần. Chỉ chuyển quyền sau khi Quản lý/AD duyệt và người nhận bấm TIẾP NHẬN.</div></div><button class="v310ShiftBtn gray" onclick="v310ShiftClose()">ĐÓNG</button></div><div class="v310ShiftTabs"><button id="v310TabCreate" class="v310ShiftTab" onclick="v310ShiftTab('create')">GIAO CA</button><button id="v310TabApprove" class="v310ShiftTab" onclick="v310ShiftTab('approve')">CHỜ DUYỆT</button><button id="v310TabAccept" class="v310ShiftTab" onclick="v310ShiftTab('accept')">TIẾP NHẬN</button><button id="v310TabHistory" class="v310ShiftTab" onclick="v310ShiftTab('history')">LỊCH SỬ</button></div><div id="v310ShiftStatus" class="v310ShiftStatus"></div><div id="v310ShiftBody"></div></div>`;document.body.appendChild(m);
  }
  function stmsg(s){const e=document.getElementById('v310ShiftStatus');if(e)e.textContent=S(s)}
  async function loadShift(){const date=today(),[ma,fl,sh,us]=await Promise.all([ref(`${MANIFEST}/${safe(date)}`).once('value'),ref(`${FLIGHTS}/${safe(date)}`).once('value'),ref(`${SHIFT}/${safe(date)}`).once('value').catch(()=>({val:()=>({})})),catalog(false)]);shiftCache={date,manifest:ma.val()||{},flights:fl.val()||{},batches:sh.val?.()||{},users:us||[]};return shiftCache}
  function myAssignments(){return Object.values(shiftCache.manifest?.items||{}).filter(x=>x&&x.active!==false&&norm(x.user||x.targetUser)===me())}
  function activeBatchForAssignment(aid){return Object.values(shiftCache.batches||{}).find(b=>['PENDING_APPROVAL','APPROVED_WAITING_ACCEPT'].includes(U(b.status))&&(b.assignmentIds||[]).map(S).includes(S(aid)))||null}
  function candidateList(){const meP=profileOf(shiftCache.users,me());return (shiftCache.users||[]).filter(x=>x.active!==false&&norm(x.username)!==me()&&sameUnit(meP,x)).sort((a,b)=>S(a.name||a.username).localeCompare(S(b.name||b.username),'vi'))}
  function batchStatus(s){s=U(s);return s==='PENDING_APPROVAL'?'CHỜ DUYỆT':s==='APPROVED_WAITING_ACCEPT'?'ĐÃ DUYỆT · CHỜ TIẾP NHẬN':s==='COMPLETED'?'ĐÃ GIAO CA':s==='REJECTED'?'ĐÃ TỪ CHỐI':s==='CANCELLED'?'ĐÃ HỦY':s}
  function renderCreate(){const items=myAssignments(),groups={};for(const x of items){const k=S(x.flightId||x.flightRaw||x.flightName||x.assignmentId);(groups[k]||(groups[k]=[])).push(x)}const cands=candidateList();const cards=Object.entries(groups).map(([fid,arr])=>{const f=shiftCache.flights?.[fid]||{},name=S(f.depFlight||f.arrFlight||arr[0]?.flightRaw||arr[0]?.flightName||fid);return `<div class="v310ShiftCard"><div class="v310ShiftFlight">✈ ${esc(name)}</div><div class="v310ShiftMeta">STD ${esc(f.std||arr[0]?.std||'—')} · A/C ${esc(f.acReg||arr[0]?.acReg||'—')}</div>${arr.map(a=>{const busy=activeBatchForAssignment(a.assignmentId);return `<label class="v310ShiftAssign"><input class="v310ShiftCheck" type="checkbox" value="${esc(a.assignmentId)}" ${busy?'disabled':''} checked><span><b>${esc(formLabel(a.formGroup))}</b> · ${esc(a.sourceColumn||a.roleKey||'')} ${busy?`<br><span class="v310ShiftMeta">Đang có GIAO CA: ${esc(batchStatus(busy.status))}</span>`:''}</span></label>`}).join('')}</div>`}).join('');document.getElementById('v310ShiftBody').innerHTML=`<div class="v310ShiftForm"><select id="v310ShiftTo"><option value="">-- Chọn người nhận ca cùng đơn vị --</option>${cands.map(x=>`<option value="${esc(norm(x.username))}">${esc(x.name||x.username)} (${esc(x.username)})</option>`).join('')}</select><button class="v310ShiftBtn gray" onclick="document.querySelectorAll('.v310ShiftCheck:not(:disabled)').forEach(x=>x.checked=true)">CHỌN TẤT CẢ</button><textarea id="v310ShiftReason" placeholder="Ghi chú giao ca: việc đang dở, cảnh báo tồn, nội dung cần theo dõi..."></textarea></div>${cards||'<div class="v310ShiftCard">Không có công việc MY FLIGHT đang phụ trách để giao ca.</div>'}<button class="v310ShiftBtn green" onclick="v310ShiftSubmit()">GỬI BÀN GIAO CA</button>`;stmsg(`${items.length} công việc hiện thuộc tài khoản ${me()}. Chỉ chọn các việc cần ca sau tiếp tục.`)}
  function batchesFor(tab){const all=Object.values(shiftCache.batches||{}).sort((a,b)=>Number(b.updatedAtMs||b.requestedAtMs||0)-Number(a.updatedAtMs||a.requestedAtMs||0));if(tab==='approve')return all.filter(b=>U(b.status)==='PENDING_APPROVAL'&&canApprove(b,shiftCache.users));if(tab==='accept')return all.filter(b=>U(b.status)==='APPROVED_WAITING_ACCEPT'&&norm(b.toUser)===me());if(tab==='history')return all.filter(b=>norm(b.fromUser)===me()||norm(b.toUser)===me()||canApprove(b,shiftCache.users));return []}
  function renderBatches(tab){const arr=batchesFor(tab);document.getElementById('v310ShiftBody').innerHTML=arr.length?arr.map(b=>`<div class="v310ShiftBatch ${U(b.status)==='PENDING_APPROVAL'?'pending':U(b.status)==='APPROVED_WAITING_ACCEPT'?'approved':''}"><div class="v310ShiftFlight">${esc(b.fromName||b.fromUser)} → ${esc(b.toName||b.toUser)} · ${esc(batchStatus(b.status))}</div><div class="v310ShiftMeta">${(b.items||[]).map(x=>`${esc(x.flightRaw||x.flightName||x.flightId)} · ${esc(formLabel(x.formGroup))}`).join('<br>')}</div>${b.reason?`<div class="v310ShiftMeta"><b>Ghi chú:</b> ${esc(b.reason)}</div>`:''}<div class="v310ShiftButtons">${tab==='approve'&&U(b.status)==='PENDING_APPROVAL'?`<button class="v310ShiftBtn green" onclick="v310ShiftApprove('${esc(b.id)}')">DUYỆT CA</button><button class="v310ShiftBtn red" onclick="v310ShiftReject('${esc(b.id)}')">TỪ CHỐI</button>`:''}${tab==='accept'&&U(b.status)==='APPROVED_WAITING_ACCEPT'?`<button class="v310ShiftBtn green" onclick="v310ShiftAccept('${esc(b.id)}')">TIẾP NHẬN CA</button>`:''}</div></div>`).join(''):'<div class="v310ShiftCard">Không có mục nào.</div>';stmsg(`${arr.length} yêu cầu trong mục ${tab==='approve'?'CHỜ DUYỆT':tab==='accept'?'TIẾP NHẬN':'LỊCH SỬ'}.`)}
  async function renderShift(){await loadShift();['create','approve','accept','history'].forEach(k=>document.getElementById('v310Tab'+k[0].toUpperCase()+k.slice(1))?.classList.toggle('on',shiftTab===k));if(shiftTab==='create')renderCreate();else renderBatches(shiftTab)}
  root.v310ShiftOpen=async function(tab='create'){ensureUI();shiftTab=S(tab)||'create';document.getElementById('v310ShiftModal').classList.add('show');try{await renderShift()}catch(e){stmsg('Không tải được dữ liệu giao ca: '+S(e?.message||e))}};
  root.v310ShiftClose=()=>document.getElementById('v310ShiftModal')?.classList.remove('show');
  root.v310ShiftTab=async k=>{shiftTab=S(k);try{await renderShift()}catch(e){stmsg(S(e?.message||e))}};
  root.v310ShiftSubmit=async function(){try{await loadShift();const ids=[...document.querySelectorAll('.v310ShiftCheck:checked:not(:disabled)')].map(x=>S(x.value));if(!ids.length)throw new Error('Chưa chọn công việc cần giao ca.');const to=norm(document.getElementById('v310ShiftTo')?.value);if(!to)throw new Error('Chưa chọn người nhận ca.');const fromP=profileOf(shiftCache.users,me()),toP=profileOf(shiftCache.users,to);if(!fromP||!toP||toP.active===false||!sameUnit(fromP,toP))throw new Error('Người nhận phải ACTIVE và cùng phòng/đơn vị.');const live=await currentManifest(shiftCache.date),items=[];for(const id of ids){const x=live?.items?.[id];if(!x||x.active===false||norm(x.user||x.targetUser)!==me())throw new Error(`Phân công ${id} không còn thuộc tài khoản hiện tại.`);if(activeBatchForAssignment(id))throw new Error(`Phân công ${id} đã có giao ca đang xử lý.`);items.push({assignmentId:id,flightId:S(x.flightId),flightRaw:S(x.flightRaw),flightName:S(x.flightName),formGroup:S(x.formGroup),sourceColumn:S(x.sourceColumn),roleKey:S(x.roleKey),workspaceKey:S(x.workspaceKey||x.rosterWorkspaceKey),assignmentScope:S(x.assignmentScope||'BOTH')})}const reason=S(document.getElementById('v310ShiftReason')?.value),id=batchId(),t=now(),b={id,opDate:shiftCache.date,fromUser:me(),fromName:S(fromP.name||me()),toUser:to,toName:S(toP.name||to),departmentCode:depOf(fromP),groupCode:groupOf(fromP),assignmentIds:ids,items,reason,status:'PENDING_APPROVAL',requestedAtMs:t,updatedAtMs:t,requestedBy:actor(),schema:1,build:BUILD};const patch={[`${SHIFT}/${safe(shiftCache.date)}/${safe(id)}`]:b,[`${SHIFT_MAIL}/${safe(me())}/${safe(id)}`]:{id,opDate:shiftCache.date,status:b.status,updatedAtMs:t}};for(const p of shiftCache.users.filter(x=>U(x.role)==='AD'||(isManager(x)&&depOf(x)===depOf(fromP))))patch[`${SHIFT_MAIL}/${safe(norm(p.username))}/${safe(id)}`]={id,opDate:shiftCache.date,status:b.status,kind:'APPROVAL',updatedAtMs:t};patch[`${SHIFT_MAIL}/AD/${safe(id)}`]={id,opDate:shiftCache.date,status:b.status,kind:'APPROVAL',updatedAtMs:t};await ref('').update(patch);await opsAudit('SHIFT_HANDOVER_REQUESTED',{shiftBatchId:id,toUser:to,assignmentIds:ids,items},reason);alert(`Đã gửi GIAO CA ${items.length} công việc cho ${to}. Bạn vẫn là người phụ trách cho tới khi được duyệt và ${to} bấm TIẾP NHẬN.`);await renderShift()}catch(e){alert('Không gửi được GIAO CA: '+S(e?.message||e))}};
  async function getBatch(id){const s=await ref(`${SHIFT}/${safe(today())}/${safe(id)}`).once('value');return s.val()||null}
  root.v310ShiftApprove=async function(id){try{await loadShift();const b=await getBatch(id);if(!b||U(b.status)!=='PENDING_APPROVAL')throw new Error('Yêu cầu không còn chờ duyệt.');if(!canApprove(b,shiftCache.users))throw new Error('Bạn không có quyền duyệt giao ca của đơn vị này.');const a=actor(),t=now(),patch={};patch[`${SHIFT}/${safe(today())}/${safe(id)}/status`]='APPROVED_WAITING_ACCEPT';patch[`${SHIFT}/${safe(today())}/${safe(id)}/approvedAtMs`]=t;patch[`${SHIFT}/${safe(today())}/${safe(id)}/approvedBy`]=a.username;patch[`${SHIFT}/${safe(today())}/${safe(id)}/approvedByName`]=a.name;patch[`${SHIFT}/${safe(today())}/${safe(id)}/updatedAtMs`]=t;patch[`${SHIFT_MAIL}/${safe(b.toUser)}/${safe(id)}`]={id,opDate:today(),status:'APPROVED_WAITING_ACCEPT',kind:'ACCEPT',updatedAtMs:t};patch[`${SHIFT_MAIL}/${safe(b.fromUser)}/${safe(id)}`]={id,opDate:today(),status:'APPROVED_WAITING_ACCEPT',updatedAtMs:t};await ref('').update(patch);await opsAudit('SHIFT_HANDOVER_APPROVED',{shiftBatchId:id,fromUser:b.fromUser,toUser:b.toUser,assignmentIds:b.assignmentIds});alert(`Đã duyệt. ${b.toUser} phải bấm TIẾP NHẬN CA trước khi quyền được chuyển.`);await renderShift()}catch(e){alert('Không duyệt được: '+S(e?.message||e))}};
  root.v310ShiftReject=async function(id){try{await loadShift();const b=await getBatch(id);if(!b||U(b.status)!=='PENDING_APPROVAL')throw new Error('Yêu cầu không còn chờ duyệt.');if(!canApprove(b,shiftCache.users))throw new Error('Bạn không có quyền từ chối.');const reason=S(prompt('Lý do từ chối giao ca:','')||'');if(!reason)return;const a=actor(),t=now(),patch={};patch[`${SHIFT}/${safe(today())}/${safe(id)}/status`]='REJECTED';patch[`${SHIFT}/${safe(today())}/${safe(id)}/rejectReason`]=reason;patch[`${SHIFT}/${safe(today())}/${safe(id)}/rejectedAtMs`]=t;patch[`${SHIFT}/${safe(today())}/${safe(id)}/rejectedBy`]=a.username;patch[`${SHIFT}/${safe(today())}/${safe(id)}/updatedAtMs`]=t;patch[`${SHIFT_MAIL}/${safe(b.fromUser)}/${safe(id)}`]={id,opDate:today(),status:'REJECTED',updatedAtMs:t};await ref('').update(patch);await opsAudit('SHIFT_HANDOVER_REJECTED',{shiftBatchId:id},reason);await renderShift()}catch(e){alert(S(e?.message||e))}};
  async function mailPayload(user,aid,item,date){try{const s=await ref(`${MAIL}/${safe(user)}/items/${safe(aid)}`).once('value'),v=s.val();if(v)return v}catch(_){}return {engine:'daily-roster-v2',schema:2,assignmentId:aid,opDate:date,flightRaw:S(item.flightRaw),flightName:S(item.flightName),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),roleKey:S(item.roleKey),workspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey),rosterWorkspaceKey:S(item.workspaceKey||item.rosterWorkspaceKey),assignmentScope:S(item.assignmentScope||'BOTH'),active:true}}
  root.v310ShiftAccept=async function(id){try{await loadShift();const b=await getBatch(id);if(!b||U(b.status)!=='APPROVED_WAITING_ACCEPT')throw new Error('Giao ca chưa được duyệt hoặc đã xử lý.');if(norm(b.toUser)!==me())throw new Error('Chỉ đúng người nhận ca mới được TIẾP NHẬN.');const man=await currentManifest(today()),t=now(),target=me(),patch={},changed=[];for(const aid of b.assignmentIds||[]){const item=man?.items?.[aid];if(!item)throw new Error(`Không tìm thấy assignment ${aid}.`);const old=norm(item.user||item.targetUser);if(old!==norm(b.fromUser))throw new Error(`${item.flightRaw||aid}: người phụ trách đã thay đổi thành ${old}; không áp dụng giao ca cũ.`);const payload=await mailPayload(old,aid,item,today()),nextPayload={...payload,targetUser:target,originalTargetUser:item.originalUser||payload.originalTargetUser||old,manualOverride:true,reassignedFrom:old,reassignedAtMs:t,reassignedBy:target,shiftBatchId:id,handoffApprovedBy:S(b.approvedBy),active:true},nextItem={...item,user:target,originalUser:item.originalUser||payload.originalTargetUser||old,manualOverride:true,lastShiftBatchId:id,lastHandoffAtMs:t};patch[`${MAIL}/${safe(old)}/items/${safe(aid)}`]=null;patch[`${MAIL}/${safe(target)}/items/${safe(aid)}`]=nextPayload;patch[`${REVOKE}/${safe(old)}/items/${safe(aid)}`]={assignmentId:aid,reason:'APPROVED_SHIFT_HANDOVER',toUser:target,atMs:t,by:target,shiftBatchId:id};patch[`${REVOKE}/${safe(target)}/items/${safe(aid)}`]=null;patch[`${MANIFEST}/${safe(today())}/items/${safe(aid)}`]=nextItem;patch[`${SESSION}/${safe(aid)}/ownerUser`]=target;patch[`${SESSION}/${safe(aid)}/reassignedAtMs`]=t;patch[`${SESSION}/${safe(aid)}/reassignedBy`]=target;patch[`${SESSION}/${safe(aid)}/shiftBatchId`]=id;const unit=rosterUnit(item);if(unit&&item.flightId)patch[`${FLIGHTS}/${safe(today())}/${safe(item.flightId)}/unitAssignments/${safe(unit)}`]={unit,username:target,name:S(profile().name||target),departmentCode:S(profile().departmentCode||profile().systemDepartment||profile().department),groupCode:S(profile().groupCode||profile().group),claimedAtMs:t,updatedAtMs:t,status:'ACTIVE',claimSource:'SHIFT_HANDOVER',shiftBatchId:id};const hid=`RH_SHIFT_${safe(aid)}_${t}`;patch[`${HANDOFF}/${safe(today())}/${safe(hid)}`]={id:hid,opDate:today(),assignmentId:aid,flightId:S(item.flightId),flightRaw:S(item.flightRaw),flightName:S(item.flightName),formGroup:S(item.formGroup),fromUser:old,toUser:target,status:'COMPLETED',requestedAtMs:Number(b.requestedAtMs||t),approvedAtMs:Number(b.approvedAtMs||t),approvedBy:S(b.approvedBy),acceptedAtMs:t,acceptedBy:target,shiftBatchId:id,reason:S(b.reason),schema:1};changed.push({assignmentId:aid,flightId:S(item.flightId),flightRaw:S(item.flightRaw),formGroup:S(item.formGroup),fromUser:old,toUser:target})}patch[`${SHIFT}/${safe(today())}/${safe(id)}/status`]='COMPLETED';patch[`${SHIFT}/${safe(today())}/${safe(id)}/acceptedAtMs`]=t;patch[`${SHIFT}/${safe(today())}/${safe(id)}/acceptedBy`]=target;patch[`${SHIFT}/${safe(today())}/${safe(id)}/acceptedByName`]=S(profile().name||target);patch[`${SHIFT}/${safe(today())}/${safe(id)}/updatedAtMs`]=t;patch[`${SHIFT_MAIL}/${safe(b.fromUser)}/${safe(id)}`]={id,opDate:today(),status:'COMPLETED',updatedAtMs:t};patch[`${SHIFT_MAIL}/${safe(target)}/${safe(id)}`]={id,opDate:today(),status:'COMPLETED',updatedAtMs:t};await ref('').update(patch);await opsAudit('SHIFT_HANDOVER_ACCEPTED',{shiftBatchId:id,changed},S(b.reason));try{root.dailyRosterRestartMailbox?.()}catch(_){}alert(`ĐÃ TIẾP NHẬN CA · ${changed.length} công việc đã chuyển sang ${target}. MY FLIGHT sẽ cập nhật theo người nhận mới.`);root.v310ShiftClose();setTimeout(()=>root.flightWorkspaceOpenList?.(today()),450)}catch(e){alert('Không tiếp nhận được ca: '+S(e?.message||e))}};

  function ensureNav(){ensureUI();try{document.getElementById('v310ShiftNav')?.remove()}catch(_){}injectFinalShare()}
  function startShiftMail(){try{if(mailRef&&mailCb)mailRef.off('child_added',mailCb)}catch(_){}mailRef=null;mailCb=null}
  function patchFlight(){if(typeof root.flightWorkspaceOpenFlight!=='function'||root.flightWorkspaceOpenFlight.__v310)return;const base=root.flightWorkspaceOpenFlight;root.flightWorkspaceOpenFlight=function(fid){const r=base.apply(this,arguments);setTimeout(()=>injectTaskExports(fid),180);return r};root.flightWorkspaceOpenFlight.__v310=1}
  function sync(){ensureNav();patchFlight();patchAutoNAExportMenu();injectFinalShare();startShiftMail()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,500),{once:true});else setTimeout(sync,500);
  setInterval(()=>{ensureNav();patchFlight();patchAutoNAExportMenu();injectFinalShare()},1800);
  const baseApply=root.applyRoleUI;if(typeof baseApply==='function'&&!baseApply.__v310){root.applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(()=>{sync()},0);return r};root.applyRoleUI.__v310=1}
  root.__SAGS_V310_BUILD=BUILD;
  root.__SAGS_V310_HDSD='V3.27: Luồng GIAO CA batch có duyệt/tiếp nhận đã ngừng dùng và không còn listener/mail popup trong CLEAN. Giao ca tờ RAMP thực hiện trực tiếp trong biểu mẫu theo thứ tự Daily Roster; dữ liệu được lưu draft trước khi bàn giao.';
})(typeof window!=='undefined'?window:globalThis);
/* ===== END clean-ops-v310.js ===== */

}
})();


/* ===== BEGIN contextual-quick-time-v313.js ===== */
/* E-REPORT/SAGS V3.13 · CONTEXTUAL QUICK TIME
 * NHẬP GIỜ NHANH is not a permanent legacy navigation button.
 * It appears only while an eligible assigned form is actually open:
 * FSAGS 42.3 / FSAGS 42.1 / FSAGS 09.
 */
(function(root){'use strict';
  const BUILD='V3.13-20260821-01';
  const firstInstall=!root.__SAGS_V313_QUICK_CONTEXT;
  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  function group(){try{return S(activeFormGroup).toLowerCase()}catch(_){return S(root.activeFormGroup).toLowerCase()}}
  function sessionId(){try{return S(activeFlightSessionId)}catch(_){return S(root.activeFlightSessionId)}}
  function currentRole(){try{return U(window.currentRole||root.currentRole)}catch(_){return U(root.currentRole)}}
  function feature(name){try{return currentRole()==='AD'||(typeof v485Can==='function'&&v485Can(name))}catch(_){return currentRole()==='AD'}}
  function idleVisible(){
    const el=document.getElementById('roleHomeIdle');
    if(!el)return false;
    try{return getComputedStyle(el).display!=='none'}catch(_){return false}
  }
  function eligible(){
    const g=group();
    if(!sessionId()||idleVisible())return false;
    if(g==='fsags'||g==='fsags421')return feature('QUICK_TIME');
    if(g==='fsags09')return feature('FSAGS09');
    return false;
  }
  function label(){return '⏱ NHẬP NHANH'}
  function ensureStyle(){
    if(document.getElementById('v313QuickContextStyle'))return;
    const st=document.createElement('style');st.id='v313QuickContextStyle';st.textContent=`
#v313QuickContext{display:none;align-items:center;gap:7px;width:100%;box-sizing:border-box;padding:2px 0 0}
#v313QuickContext.show{display:flex}
#v313QuickContextBtn{min-height:42px;border:0;border-radius:10px;padding:9px 14px;background:#075b9e;color:#fff;font:900 13px Arial;box-shadow:0 2px 6px rgba(0,0,0,.16);cursor:pointer}
#v313QuickContextHint{font:800 10px/1.3 Arial;color:#45647d}
@media(max-width:620px){#v313QuickContext{display:none;grid-template-columns:1fr}#v313QuickContext.show{display:grid}#v313QuickContextBtn{width:100%;font-size:14px;min-height:46px}#v313QuickContextHint{text-align:center}}
@media print{#v313QuickContext{display:none!important}}
`;
    document.head.appendChild(st);
  }
  function ensure(){
    ensureStyle();
    const toolbar=document.querySelector('.toolbar');
    if(!toolbar)return null;
    let box=document.getElementById('v313QuickContext');
    if(!box){
      box=document.createElement('div');box.id='v313QuickContext';
      box.innerHTML='<button id="v313QuickContextBtn" type="button" title="Nhập nhanh">⏱ NHẬP NHANH</button><span id="v313QuickContextHint">Chỉ hiện khi đang mở biểu mẫu hỗ trợ.</span>';
      const nav=document.getElementById('v38CleanNav');
      if(nav?.parentNode===toolbar)nav.insertAdjacentElement('afterend',box);else toolbar.appendChild(box);
      document.getElementById('v313QuickContextBtn').onclick=()=>{
        if(!eligible()){refresh();return alert('NHẬP GIỜ NHANH chỉ dùng khi đang mở đúng FSAGS 42.3 / 42.1 / 09 và tài khoản có quyền thao tác.');}
        try{root.openQuickTimePanel?.()}catch(e){alert('Không mở được NHẬP GIỜ NHANH: '+S(e?.message||e))}
      };
    }
    return box;
  }
  function refresh(){
    const box=ensure();if(!box)return;
    const ok=eligible();box.classList.toggle('show',ok);
    const btn=document.getElementById('v313QuickContextBtn');if(btn)btn.textContent=label();
    const hint=document.getElementById('v313QuickContextHint');
    if(hint)hint.textContent=ok?`Đang mở ${group()==='fsags'?'FSAGS 42.3':group()==='fsags421'?'FSAGS 42.1':'FSAGS 09'} · nhập nhanh các mốc giờ của biểu mẫu này.`:'Chỉ hiện khi đang mở biểu mẫu hỗ trợ.';
  }
  function wrap(name){
    const fn=root[name];if(typeof fn!=='function'||fn.__v313QuickContext)return;
    const w=function(){const r=fn.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(refresh,30));return r};
    w.__v313QuickContext=1;root[name]=w;
    try{if(name==='showFormGroup')showFormGroup=w;else if(name==='showRoleHomeIdle')showRoleHomeIdle=w;else if(name==='hideRoleHomeIdle')hideRoleHomeIdle=w;else if(name==='applyRoleUI')applyRoleUI=w;else if(name==='switchFlightSession')switchFlightSession=w}catch(_){}
  }
  ['showFormGroup','showRoleHomeIdle','hideRoleHomeIdle','applyRoleUI','switchFlightSession','selectFormGroup'].forEach(wrap);
  // Keep legacy button state logic alive for compatibility, but the legacy toolbar itself remains hidden in CLEAN workflow.
  const oldRefresh=root.quickTimeRefreshVisibility;
  if(typeof oldRefresh==='function'&&!oldRefresh.__v313QuickContext){
    root.quickTimeRefreshVisibility=function(){const r=oldRefresh.apply(this,arguments);setTimeout(refresh,0);return r};
    root.quickTimeRefreshVisibility.__v313QuickContext=1;
  }
  if(firstInstall){
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)root.v313QuickTimeRefresh?.()});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>root.v313QuickTimeRefresh?.(),250),{once:true});else setTimeout(()=>root.v313QuickTimeRefresh?.(),250);
  }
  root.v313QuickTimeRefresh=refresh;
  root.__SAGS_V313_QUICK_CONTEXT=BUILD;
})(typeof window!=='undefined'?window:globalThis);
/* ===== END contextual-quick-time-v313.js ===== */

/* ===== BEGIN consolidated-ops-v320.js ===== */
/* E-REPORT/SAGS V3.20 · CONSOLIDATED OPS UPDATE
 * One consolidated operational update on top of V3.16.
 * - Daily Roster preview + explicit AD confirmation
 * - Operational-day rollover through midnight
 * - Flight Workspace summary/progress/docs/timeline/alerts
 * - Direct RAMP sheet transfer for shift continuation (no approval/accept step)
 * - Manual bulk N/A button; export never auto-fills N/A
 * - Quick-time interaction stabilization is completed in index.html
 */
(function(root){'use strict';
  const phase=(document.currentScript&&document.currentScript.dataset&&document.currentScript.dataset.phase)||'';
  if(phase!=='control'||root.__SAGS_V320_CONSOLIDATED)return;
  root.__SAGS_V320_CONSOLIDATED='V3.20-20260821-01';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const iso=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const yesterday=()=>{const d=new Date();d.setDate(d.getDate()-1);return iso(d)};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){return norm(profile().username||(role()==='AD'?'AD':''))}
  function dbref(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function depOf(p){return U(p?.departmentCode||p?.systemDepartment||p?.department||'')}
  function groupOf(p){return U(p?.groupCode||p?.group||'')}
  function sameUnit(a,b){const ad=depOf(a),bd=depOf(b);if(ad&&bd)return ad===bd;const ag=groupOf(a),bg=groupOf(b);return !!ag&&ag===bg}
  function currentOpDate(){
    const stored=S(sessionStorage.getItem('sagsV36FwcDate'));
    const today=iso(),prev=yesterday();
    if(stored===today||stored===prev)return stored;
    return new Date().getHours()<=4?prev:today;
  }
  function selectedDate(){return S(document.getElementById('fwcDate')?.value)||currentOpDate()}
  function selectedFid(){return S(sessionStorage.getItem('sagsV36FwcSelected')||root.__v320SelectedFlight||'')}
  async function audit(event,detail){try{await dbref('ops_audit_v331').push({schema:1,event,systemTimestamp:root.firebase?.database?.ServerValue?.TIMESTAMP||Date.now(),clientAtMs:Date.now(),actor:{username:me(),name:S(profile().name||profile().fullName||me()),role:role(),departmentCode:depOf(profile()),groupCode:groupOf(profile())},detail:detail||{}})}catch(e){console.warn('V3.20 audit',e)}}

  function ensureStyle(){
    if(document.getElementById('v320Style'))return;
    const st=document.createElement('style');st.id='v320Style';st.textContent=`
#v320NaContext{display:none;width:100%;box-sizing:border-box;padding:2px 0 0;gap:7px;align-items:center}#v320NaContext.show{display:flex}#v320NaBtn{min-height:42px;border:0;border-radius:10px;padding:9px 14px;background:#475569;color:#fff;font:900 13px Arial;cursor:pointer}#v320NaHint{font:800 10px/1.3 Arial;color:#45647d}
.v320Core{display:grid;gap:10px;margin:10px 0 14px}.v320Card{border:1px solid #d7e2eb;border-radius:12px;background:#fff;padding:11px;box-sizing:border-box}.v320Title{font:900 14px Arial;color:#123f67;margin-bottom:7px}.v320Sub{font:700 11px/1.45 Arial;color:#607383}.v320Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.v320Unit{border:1px solid #e1e8ee;border-radius:9px;padding:8px;background:#f8fafc}.v320Unit b{font:900 11px Arial;color:#263f55}.v320Unit span{display:block;margin-top:3px;font:800 10px Arial;color:#687a89}.v320Status{display:inline-flex!important;width:auto!important;border-radius:999px;padding:3px 8px;background:#e8f2fb;color:#145b91!important}.v320Timeline{display:grid;gap:6px}.v320Event{border-left:3px solid #8aa9c0;padding:5px 8px;background:#f8fafc;border-radius:0 8px 8px 0;font:700 11px/1.4 Arial;color:#455d70}.v320Alert{padding:8px;border-radius:8px;background:#fff4df;color:#84540a;font:800 11px/1.4 Arial}.v320RampBtn{border:0;border-radius:9px;padding:9px 11px;background:#0f766e;color:#fff;font:900 12px Arial;cursor:pointer}
#v320RampModal{display:none;position:fixed;inset:0;z-index:19050;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:12px;box-sizing:border-box}#v320RampModal.show{display:flex}.v320ModalPanel{width:min(94vw,720px);max-height:90svh;overflow:auto;background:#fff;border-radius:15px;padding:14px;box-sizing:border-box}.v320ModalTop{display:flex;justify-content:space-between;gap:10px;align-items:center}.v320ModalTop h3{margin:0;color:#0b4f91}.v320Btn{border:0;border-radius:9px;padding:9px 12px;background:#0b67b2;color:#fff;font:900 12px Arial;cursor:pointer}.v320Btn.gray{background:#e8eef3;color:#31485a}.v320Btn.green{background:#15803d}.v320Select,.v320Input{width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd7e0;border-radius:9px;background:#fff}.v320ModalStatus{margin-top:8px;padding:8px;border-radius:8px;background:#eef6ff;color:#294c68;font:700 11px/1.45 Arial;white-space:pre-wrap}
@media(max-width:700px){#v320NaContext.show{display:grid}.v320Grid{grid-template-columns:1fr}.v320ModalPanel{max-height:92svh}.v320RampBtn{width:100%}}
@media print{#v320NaContext,.v320RampBtn,#v320RampModal{display:none!important}}
`;
    document.head.appendChild(st);
  }

  /* DAILY ROSTER: preview first, explicit confirmation only. */
  function prepareRosterUi(){
    const modal=document.getElementById('dailyRosterModal');if(!modal)return;
    const h=modal.querySelector('.drHead h3');if(h)h.textContent='📋 DAILY ROSTER · XEM TRƯỚC & XÁC NHẬN';
    const sub=modal.querySelector('.drHead .drSub');if(sub)sub.innerHTML='<b>Bước 1:</b> chọn file → hệ thống chỉ đọc và hiển thị PREVIEW. <b>Bước 2:</b> AD kiểm tra rồi bấm XÁC NHẬN TẠO CHUYẾN. Chưa xác nhận thì không ghi Flight Record/Assignment.';
    const b=document.getElementById('drPublishBtn');if(b){b.textContent='✓ XÁC NHẬN TẠO CHUYẾN';b.parentElement.style.display='flex';}
  }
  const baseRosterOpen=root.openDailyRosterManager;
  if(typeof baseRosterOpen==='function')root.openDailyRosterManager=function(){const r=baseRosterOpen.apply(this,arguments);setTimeout(prepareRosterUi,0);return r};
  const baseRosterLoad=root.dailyRosterLoadFile;
  if(typeof baseRosterLoad==='function')root.dailyRosterLoadFile=async function(file){
    if(!file)return false;
    root.openDailyRosterManager?.();prepareRosterUi();
    const inp=document.getElementById('drFile');
    if(inp&&inp.files?.[0]!==file){try{const dt=new DataTransfer();dt.items.add(file);inp.files=dt.files}catch(_){}}
    await root.dailyRosterReadPreview?.();prepareRosterUi();
    const stat=document.getElementById('drStatus');if(stat&&!stat.classList.contains('err'))stat.textContent='✓ ĐÃ ĐỌC DAILY ROSTER · CHƯA TẠO CHUYẾN. AD kiểm tra bảng PREVIEW rồi bấm XÁC NHẬN TẠO CHUYẾN.';
    return !!document.getElementById('drPublishBtn')&&!document.getElementById('drPublishBtn').disabled;
  };
  const baseRosterPublish=root.dailyRosterPublish;
  if(typeof baseRosterPublish==='function')root.dailyRosterPublish=async function(){
    prepareRosterUi();const ok=await baseRosterPublish.apply(this,arguments);
    if(ok)void audit('DAILY_ROSTER_CONFIRMED',{opDate:S(document.getElementById('drManageDate')?.value),sourceFile:S(document.getElementById('drFile')?.files?.[0]?.name)});
    return ok;
  };
  root.flightWorkspacePickRoster=function(){if(role()!=='AD')return;root.openDailyRosterManager?.();setTimeout(()=>{prepareRosterUi();document.getElementById('drFile')?.click()},30)};

  /* OPERATIONAL DAY rollover: preserve previous operational day during the overnight window. */
  const baseOpenList=root.flightWorkspaceOpenList;
  if(typeof baseOpenList==='function'){
    const w=function(date){const d=S(date)||currentOpDate();try{sessionStorage.setItem('sagsV36FwcDate',d)}catch(_){}return baseOpenList.call(this,d)};
    w.__v38=baseOpenList.__v38||1;w.__v320=1;root.flightWorkspaceOpenList=w;
  }
  const navFlights=document.getElementById('v38NavFlights');if(navFlights)navFlights.onclick=()=>root.flightWorkspaceOpenList?.(currentOpDate());

  /* N/A is manual only. No silent/export path is allowed to fill it. */
  const originalFillNA=root.fillBlankNA;
  if(typeof originalFillNA==='function'){
    root.fillBlankNA=function(options){
      const auto=options&&typeof options==='object'&&(options.silent===true||U(options.source)==='EXPORT');
      if(auto)return 0;
      return originalFillNA.apply(this,arguments);
    };
    try{fillBlankNA=root.fillBlankNA}catch(_){}
  }
  function activeGroup(){try{return S(activeFormGroup)}catch(_){return S(root.activeFormGroup||'')}}
  function activeSid(){try{return S(activeFlightSessionId)}catch(_){return S(root.activeFlightSessionId||'')}}
  function formActive(){
    const idle=document.getElementById('roleHomeIdle'),g=activeGroup();
    return !!activeSid()&&!!g&&(!idle||getComputedStyle(idle).display==='none');
  }
  function ensureNaContext(){
    ensureStyle();const toolbar=document.querySelector('.toolbar');if(!toolbar)return null;
    let box=document.getElementById('v320NaContext');if(!box){box=document.createElement('div');box.id='v320NaContext';box.innerHTML='<button id="v320NaBtn" type="button" title="Điền N/A vào các ô trống">N/A Ô TRỐNG</button><span id="v320NaHint">Chỉ điền khi người dùng chủ động bấm.</span>';const q=document.getElementById('v313QuickContext');if(q?.parentNode===toolbar)q.insertAdjacentElement('afterend',box);else toolbar.appendChild(box);document.getElementById('v320NaBtn').onclick=()=>{if(!formActive())return; if(!confirm('Điền N/A cho các ô trống trong biểu mẫu hiện tại?\n\nDữ liệu đã nhập sẽ được giữ nguyên.'))return;try{root.fillBlankNA?.()}catch(e){alert('Không điền N/A được: '+S(e?.message||e))}}}return box;
  }
  function refreshNa(){const b=ensureNaContext();if(b)b.classList.toggle('show',formActive())}

  /* FLIGHT WORKSPACE core view + direct RAMP transfer. */
  const UNITS=['DH','CBTT','PVHK','HLNG','CARGO','VSTB','VHTTB','KTTB','LNF'];
  const UNIT_LABEL={DH:'ĐH',CBTT:'CBTT',PVHK:'PVHK',HLNG:'HLNG',CARGO:'Cargo',VSTB:'VSTB',VHTTB:'VHTTB',KTTB:'KTTB',LNF:'LNF'};
  function deriveStatus(rec){const mods=rec?.modules||{},final=U(mods['FINAL']?.status),ramp=U(mods['RAMP']?.status),all=Object.values(mods);if(rec?.closedAtMs||rec?.doorClose||/CLOSED|ĐÓNG/.test(ramp))return 'CLOSED';if(/CROSSCHECK.*OK|HOÀN TẤT|FINALIZED|SENT|ĐÃ GỬI/.test(final))return 'FINALIZED';if(all.length||Object.keys(rec?.unitAssignments||{}).length)return 'IN OPERATION';return 'READY'}
  function unitStatus(rec,u){const a=rec?.unitAssignments?.[u]||rec?.unitAssignments?.[u==='CARGO'?'KH':u];const mods=rec?.modules||{};let m=null;if(u==='DH')m=mods['RAMP'];else if(u==='PVHK')m=mods['KẾT SỔ'];else if(u==='CBTT')m=mods['FINAL'];else if(u==='CARGO')m=mods['HÀNG HÓA'];if(m)return `${S(m.status||'ĐÃ CÓ')}${a?.username?' · '+S(a.name||a.username):''}`;return a?.username?`ĐANG PHỤ TRÁCH · ${S(a.name||a.username)}`:'CHƯA NHẬN'}
  function majorTimeline(rec){const arr=Object.values(rec?.timeline||{}).filter(Boolean).sort((a,b)=>Number(b.atMs||0)-Number(a.atMs||0));return arr.filter(x=>{const s=U(`${x.kind} ${x.status}`);return /KẾT SỔ|FINAL|CROSSCHECK|RAMP|HOÀN TẤT|SENT|GỬI|COMPLETE/.test(s)}).slice(0,8)}
  function fmtAt(ms){if(!Number(ms))return '';try{return new Date(Number(ms)).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})}catch(_){return ''}}
  async function getFlight(date,fid){return (await dbref(`flight_records/${safe(date)}/${safe(fid)}`).once('value')).val()||null}
  async function getManifest(date){return (await dbref(`roster_manifests/${safe(date)}`).once('value')).val()||{}}
  async function enhanceWorkspace(fid){
    fid=S(fid);if(!fid)return;root.__v320SelectedFlight=fid;try{sessionStorage.setItem('sagsV36FwcSelected',fid)}catch(_){}
    const body=document.getElementById('fwcBody');if(!body)return;body.querySelectorAll('.v320Core').forEach(x=>x.remove());
    const date=selectedDate();let rec=null,man={};try{[rec,man]=await Promise.all([getFlight(date,fid),getManifest(date)])}catch(e){console.warn('V3.20 workspace read',e);return}if(!rec)return;
    const head=body.querySelector('.fwcWorkspaceHead');if(!head)return;
    let status=head.querySelector('.v320Status');if(!status){status=document.createElement('span');status.className='v320Status';head.appendChild(status)}status.textContent=deriveStatus(rec);
    const myRamp=Object.values(man?.items||{}).filter(x=>x&&x.active!==false&&(S(x.flightId)||S(root.sagsV346ResolveRosterFlightId?.(date,x,{})))===fid&&norm(x.user||x.targetUser)===me()&&['FSAGS','FSAGS421','FSAGS551'].includes(U(x.formGroup)));
    const ops=body.querySelector('.v38MyOps');if(myRamp.length&&ops&&!ops.querySelector('.v320RampBtn')){const b=document.createElement('button');b.className='v320RampBtn';b.textContent='↪ CHUYỂN TỜ RAMP CA SAU';b.onclick=()=>root.v320OpenRampTransfer(fid);ops.querySelector('.v38MyOpsBtns')?.appendChild(b)}
    const tl=majorTimeline(rec),alerts=Object.values(rec?.alerts||{}).filter(x=>x&&x.active!==false).slice(0,6),mods=Object.entries(rec?.modules||{});
    const core=document.createElement('div');core.className='v320Core';core.innerHTML=`
      <div class="v320Card"><div class="v320Title">TIẾN ĐỘ CHUYẾN</div><div class="v320Grid">${UNITS.map(u=>`<div class="v320Unit"><b>${esc(UNIT_LABEL[u])}</b><span>${esc(unitStatus(rec,u))}</span></div>`).join('')}</div></div>
      <div class="v320Card"><div class="v320Title">HỒ SƠ CHUYẾN</div><div class="v320Sub">Flight ID: <b>${esc(fid)}</b> · ${mods.length?mods.map(([k,v])=>`${esc(k)}: ${esc(v?.status||'ĐÃ CÓ')}`).join(' · '):'Chưa phát sinh module nghiệp vụ.'}<br>Xuất/Chia sẻ chỉ dùng các nút của đúng nhiệm vụ được phân quyền phía trên.</div></div>
      <div class="v320Card"><div class="v320Title">TIMELINE · MỐC CHÍNH</div><div class="v320Timeline">${tl.length?tl.map(x=>`<div class="v320Event"><b>${esc(x.kind||'SỰ KIỆN')}</b> · ${esc(x.status||'')} ${fmtAt(x.atMs)?`· ${esc(fmtAt(x.atMs))}`:''}</div>`).join(''):'<div class="v320Sub">Chưa có mốc nghiệp vụ chính.</div>'}</div></div>
      <div class="v320Card"><div class="v320Title">CẢNH BÁO CỦA CHUYẾN</div>${alerts.length?alerts.map(x=>`<div class="v320Alert">${esc(x.title||x.kind||'CẢNH BÁO')} · ${esc(x.text||x.message||x.status||'')}</div>`).join(''):'<div class="v320Sub">Không có cảnh báo đang hoạt động được gắn vào Flight Record.</div>'}</div>`;
    const exportBox=body.querySelector('.v310TaskDocs');if(exportBox)exportBox.insertAdjacentElement('afterend',core);else (ops||head).insertAdjacentElement('afterend',core);
  }
  const baseOpenFlight=root.flightWorkspaceOpenFlight;
  if(typeof baseOpenFlight==='function'){
    const w=function(fid){const r=baseOpenFlight.apply(this,arguments);setTimeout(()=>enhanceWorkspace(fid),320);setTimeout(()=>enhanceWorkspace(fid),850);return r};
    w.__v38=baseOpenFlight.__v38||1;w.__v310=baseOpenFlight.__v310||1;w.__v320=1;root.flightWorkspaceOpenFlight=w;
  }

  function ensureRampModal(){if(document.getElementById('v320RampModal'))return;ensureStyle();const d=document.createElement('div');d.id='v320RampModal';d.innerHTML='<div class="v320ModalPanel"><div class="v320ModalTop"><h3>↪ CHUYỂN TỜ RAMP CA SAU</h3><button class="v320Btn gray" onclick="v320CloseRampTransfer()">ĐÓNG</button></div><div class="v320ModalStatus" id="v320RampInfo">Đang tải...</div><div style="margin-top:9px"><select class="v320Select" id="v320RampTo"><option value="">-- Chọn người ca sau cùng đơn vị --</option></select></div><div style="margin-top:10px"><button class="v320Btn green" id="v320RampGo" onclick="v320RampTransferNow()">CHUYỂN NGAY</button></div><div class="v320Sub" style="margin-top:8px">Không duyệt, không cần người nhận xác nhận. Dữ liệu TIME vẫn nằm trên cùng tờ RAMP; hệ thống chỉ đổi người tiếp tục nhập.</div></div>';document.body.appendChild(d)}
  let rampCtx={date:'',fid:'',items:[],users:[]};
  root.v320OpenRampTransfer=async function(fid){try{ensureRampModal();const date=selectedDate(),man=await getManifest(date),items=Object.values(man?.items||{}).filter(x=>x&&x.active!==false&&(S(x.flightId)||S(root.sagsV346ResolveRosterFlightId?.(date,x,{})))===S(fid)&&norm(x.user||x.targetUser)===me()&&['FSAGS','FSAGS421','FSAGS551'].includes(U(x.formGroup)));if(!items.length)throw new Error('Không có tờ RAMP đang thuộc tài khoản hiện tại trên chuyến này.');const users=typeof root.v466GetUserCatalog==='function'?await root.v466GetUserCatalog(true):[],mine=profile(),cands=(users||[]).filter(x=>x&&x.active!==false&&norm(x.username)!==me()&&sameUnit(mine,x));rampCtx={date,fid:S(fid),items,users:cands};document.getElementById('v320RampInfo').textContent=`${items.length} tờ/assignment RAMP · chuyến ${S(items[0]?.flightRaw||items[0]?.flightName||fid)} · ngày khai thác ${date}.`;document.getElementById('v320RampTo').innerHTML='<option value="">-- Chọn người ca sau cùng đơn vị --</option>'+cands.map(x=>`<option value="${esc(norm(x.username))}">${esc(x.name||x.fullName||x.username)} (${esc(x.username)})</option>`).join('');document.getElementById('v320RampModal').classList.add('show')}catch(e){alert('Không mở được chuyển tờ RAMP: '+S(e?.message||e))}};
  root.v320CloseRampTransfer=function(){document.getElementById('v320RampModal')?.classList.remove('show')};
  root.v320RampTransferNow=async function(){
    const to=norm(document.getElementById('v320RampTo')?.value);if(!to)return alert('Chọn người ca sau.');const target=rampCtx.users.find(x=>norm(x.username)===to);if(!target)return alert('Người nhận không còn hợp lệ/cùng đơn vị.');
    const btn=document.getElementById('v320RampGo');if(btn)btn.disabled=true;
    try{const t=Date.now(),patch={},from=me();for(const item of rampCtx.items){const aid=S(item.assignmentId);let payload={};try{payload=(await dbref(`roster_mail/${safe(from)}/items/${safe(aid)}`).once('value')).val()||{}}catch(_){}const nextPayload={...payload,...item,assignmentId:aid,targetUser:to,active:true,manualOverride:true,reassignedFrom:from,reassignedAtMs:t,reassignedBy:from,transferType:'RAMP_DIRECT_SHIFT'};const nextItem={...item,user:to,manualOverride:true,lastHandoffAtMs:t,lastHandoffBy:from,lastHandoffType:'RAMP_DIRECT_SHIFT'};patch[`roster_mail/${safe(from)}/items/${safe(aid)}`]=null;patch[`roster_mail/${safe(to)}/items/${safe(aid)}`]=nextPayload;patch[`roster_revocations/${safe(from)}/items/${safe(aid)}`]={assignmentId:aid,reason:'RAMP_DIRECT_TRANSFER',toUser:to,atMs:t,by:from};patch[`roster_revocations/${safe(to)}/items/${safe(aid)}`]=null;patch[`roster_manifests/${safe(rampCtx.date)}/items/${safe(aid)}`]=nextItem;patch[`roster_sessions/${safe(aid)}/ownerUser`]=to;patch[`roster_sessions/${safe(aid)}/reassignedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/reassignedBy`]=from;patch[`roster_sessions/${safe(aid)}/handoffType`]='RAMP_DIRECT_SHIFT';const ev=`RAMP_SHIFT_${t}_${safe(aid)}`;patch[`flight_records/${safe(rampCtx.date)}/${safe(rampCtx.fid)}/rampTransferHistory/${safe(ev)}`]={eventId:ev,assignmentId:aid,fromUser:from,toUser:to,atMs:t,type:'RAMP_DIRECT_SHIFT'};patch[`flight_records/${safe(rampCtx.date)}/${safe(rampCtx.fid)}/unitAssignments/DH`]={unit:'DH',username:to,name:S(target.name||target.fullName||to),departmentCode:S(target.departmentCode||target.systemDepartment||target.department),groupCode:S(target.groupCode||target.group),updatedAtMs:t,status:'ACTIVE',claimSource:'RAMP_DIRECT_SHIFT'};}await dbref('').update(patch);await audit('RAMP_DIRECT_TRANSFER',{flightId:rampCtx.fid,opDate:rampCtx.date,fromUser:from,toUser:to,assignmentIds:rampCtx.items.map(x=>S(x.assignmentId))});try{root.dailyRosterRestartMailbox?.()}catch(_){}root.v320CloseRampTransfer();alert(`ĐÃ CHUYỂN TỜ RAMP · ${from} → ${to}. Không cần duyệt/xác nhận.`);setTimeout(()=>root.flightWorkspaceOpenList?.(rampCtx.date),350)}catch(e){alert('Không chuyển được tờ RAMP: '+S(e?.message||e))}finally{if(btn)btn.disabled=false}
  };

  function sync(){ensureStyle();prepareRosterUi();refreshNa();const h=document.getElementById('v38FlowHint');if(h)h.textContent='FLIGHT WORKSPACE · V3.20';const nav=document.getElementById('v38NavFlights');if(nav)nav.onclick=()=>root.flightWorkspaceOpenList?.(currentOpDate())}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,650),{once:true});else setTimeout(sync,650);
  const baseApply=root.applyRoleUI;if(typeof baseApply==='function'&&!baseApply.__v320){root.applyRoleUI=function(){const r=baseApply.apply(this,arguments);setTimeout(sync,20);return r};root.applyRoleUI.__v320=1;try{applyRoleUI=root.applyRoleUI}catch(_){}}
  ['showFormGroup','showRoleHomeIdle','hideRoleHomeIdle','switchFlightSession'].forEach(name=>{const fn=root[name];if(typeof fn!=='function'||fn.__v320)return;const w=function(){const r=fn.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(refreshNa,35));return r};w.__v320=1;root[name]=w;try{if(name==='showFormGroup')showFormGroup=w;else if(name==='showRoleHomeIdle')showRoleHomeIdle=w;else if(name==='hideRoleHomeIdle')hideRoleHomeIdle=w;else if(name==='switchFlightSession')switchFlightSession=w}catch(_){}});
  setTimeout(sync,1200);
  root.__SAGS_V320_HDSD='V3.20 CONSOLIDATED OPS: Daily Roster chỉ preview cho tới khi AD xác nhận tạo chuyến; giữ operational-day rollover, Flight Workspace, chuyển tờ RAMP trực tiếp, N/A thủ công và nhập giờ nhanh ổn định. A/C LIMITS chỉ nhập tay hoặc dán nhanh, không dùng ảnh/AI.'; root.__SAGS_V321_HDSD='V3.21: Thanh chức năng mobile dạng phẳng; người dùng chủ động chọn CHUYẾN/MULTITASK/KÝ TÊN/QUẢN LÝ. READ & SIGN chỉ hoạt động khi được cấu hình cho phép.';
})(typeof window!=='undefined'?window:globalThis);
/* ===== END consolidated-ops-v320.js ===== */

/* V3.23 */
(function(root){root.__SAGS_V323_BUILD='V3.23-20260821-01';root.__SAGS_V323_HDSD='A/C LIMITS quản lý hồ sơ theo ngày, hỗ trợ tìm/lọc/xóa từng dòng, xóa đã chọn và xóa ngày; popup chờ được hủy khi LIMIT bị xóa/tắt. MY FLIGHT là tổng chuyến được phân công; MULTITASK chỉ là các chuyến đang làm cùng lúc, có XONG/BỎ MULTI.';function f(){const h=document.getElementById('v38FlowHint');if(h)h.textContent='FLIGHT WORKSPACE · V3.23'}setTimeout(f,1600)})(typeof window!=='undefined'?window:globalThis);


/* ===== BEGIN v324-direct-myflight-handover.js ===== */
(function(root){'use strict';
  const BUILD='V3.30-20260821-01';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sess=()=>{try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}};
  const role=()=>U(sess().role||sess().profile?.role), profile=()=>sess().profile||{}, me=()=>norm(profile().username||(role()==='AD'?'AD':''));
  const dateNow=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const opDate=()=>S(sessionStorage.getItem('sagsV36FwcDate'))||S(document.getElementById('fwcDate')?.value)||dateNow();
  function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function multiKey(d=opDate()){return `sagsV323Multi:${me()||'UNKNOWN'}:${d}`}
  function multiSet(d=opDate()){try{return new Set(JSON.parse(sessionStorage.getItem(multiKey(d))||'[]').map(S).filter(Boolean))}catch(_){return new Set()}}
  function multiSave(set,d=opDate()){try{sessionStorage.setItem(multiKey(d),JSON.stringify([...set].filter(Boolean)))}catch(_){}}
  function multiAdd(fid,d=opDate()){const x=multiSet(d);x.add(S(fid));multiSave(x,d)}
  function multiRemove(fid,d=opDate()){const x=multiSet(d);x.delete(S(fid));multiSave(x,d)}
  async function manifest(d=opDate()){return (await db(`roster_manifests/${safe(d)}`).once('value')).val()||{}}
  async function sessionState(aid){try{return (await db(`roster_sessions/${safe(aid)}`).once('value')).val()||{}}catch(_){return {}}}
  function itemFlightId(man,item){const fid=S(item?.flightId)||S(root.sagsV346ResolveRosterFlightId?.(S(man?.opDate)||opDate(),item,{}));if(fid&&item&&!item.flightId)item.flightId=fid;return fid}
  function itemsOf(man){return Object.values(man?.items||{}).filter(x=>x&&x.active!==false).map(x=>{itemFlightId(man,x);return x})}
  function myItems(man,fid){const u=me();return itemsOf(man).filter(x=>itemFlightId(man,x)===S(fid)&&norm(x.user||x.targetUser)===u)}
  function laneKey(x){return [S(x?.flightId),U(x?.sourceColumn),U(x?.roleKey),U(x?.formGroup)].join('|')}
  function lane(man,item){const k=laneKey(item),a=itemsOf(man).filter(x=>laneKey(x)===k);return a.map((x,i)=>({x,i,n:Number(x?.workPartOrder)})).sort((p,q)=>{const ph=Number.isFinite(p.n)&&p.n>0,qh=Number.isFinite(q.n)&&q.n>0;if(ph&&qh)return p.n-q.n||p.i-q.i;if(ph!==qh)return ph?-1:1;return p.i-q.i}).map(v=>v.x)}
  function nextItem(man,item){const a=lane(man,item),i=a.findIndex(x=>S(x.assignmentId)===S(item?.assignmentId));return i>=0&&i+1<a.length?a[i+1]:null}
  function previousItem(man,item){const a=lane(man,item),i=a.findIndex(x=>S(x.assignmentId)===S(item?.assignmentId));return i>0?a[i-1]:null}
  function firstItem(man,item){return !previousItem(man,item)}
  async function previousCompleted(man,item){const prev=previousItem(man,item);if(!prev)return true;const pst=await sessionState(prev.assignmentId),pcs=U(pst.claimStatus),pws=U(pst.workPartStatus);let pts='';try{pts=U(root.sagsTaskStatusDerive?.(pst,prev,man)||pst.taskStatusV333||pst.taskStatus)}catch(_){pts=U(pst.taskStatusV333||pst.taskStatus)}if(pts==='COMPLETED'||pcs==='PART_COMPLETED'||pcs==='COMPLETED'||pcs==='HANDED_OVER'||pws==='COMPLETED')return true;if(U(prev.formGroup)==='FINAL'&&S(prev.flightId)){try{const fr=(await db(`flight_records/${safe(S(man?.opDate)||opDate())}/${safe(prev.flightId)}/modules/FINAL`).once('value')).val()||{},fs=U(`${fr.status||''} ${fr.crosscheckStatus||''}`);if(/CROSSCHECK.*OK|COMPLETE|COMPLETED|HOÀN TẤT|HOAN TAT/.test(fs))return true}catch(_){}}return false}
  function rosterLabel(item){return S(item?.flightName||item?.flightRaw||item?.depFlight||item?.arrFlight||item?.flightId)}
  function formLabel(g){g=U(g);return g==='FINAL'?'CBTT · FINAL':g==='FSAGS421'?'FSAGS 42.1':g==='FSAGS551'?'FSAGS 55.1':g==='FSAGS09'?'F/SAGS-CXR/09':g==='LOADING208'?'F/SAG-CXR/208':'FSAGS 42.3'}
  function localMeta(aid){try{return (root.readFlightSessionList?.()||[]).find(x=>S(x.rosterAssignmentId)===S(aid))||null}catch(_){return null}}
  function activeMeta(){try{return root.currentFlightSessionMeta?.()||null}catch(_){return null}}
  function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(_){return {}}}
  function sanitizeEnvelope(env){env=env&&typeof env==='object'?env:{};const src=env.state&&typeof env.state==='object'?env.state:{},state={};for(const [k,v] of Object.entries(src)){if(/attachment/i.test(k))continue;try{const z=JSON.stringify(v);if(z.length<=180000)state[k]=JSON.parse(z)}catch(_){}}return {state,mainForm:S(env.mainForm||env.activeFormGroup||'fsags'),activeFormGroup:S(env.mainForm||env.activeFormGroup||'fsags'),currentPage:Number(env.currentPage)||1,scrollY:0,arrivalOp:S(env.arrivalOp||'passenger'),departureOp:S(env.departureOp||'passenger'),rosterSeed:clone(env.rosterSeed||{})}}
  function addAudit(type,detail){try{return db('ops_audit_v331').push({schema:1,event:type,systemTimestamp:root.firebase?.database?.ServerValue?.TIMESTAMP||Date.now(),clientAtMs:Date.now(),actor:{username:me(),name:S(profile().name||profile().fullName||me()),role:role()},flightId:S(detail?.flightId),flightLabel:S(detail?.flightLabel),detail:detail||{}})}catch(_){}}

  function ensureCss(){if(document.getElementById('sagsV324Style'))return;const st=document.createElement('style');st.id='sagsV324Style';st.textContent=`
  .v324ClaimBadge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;margin-left:5px;font:900 10px Arial;background:#e7f2ff;color:#07599d}.v324ClaimBadge.wait{background:#fff3cd;color:#855a00}.v324ClaimBadge.done{background:#e8f5ed;color:#17663b}.v324ClaimBadge.blocked{background:#fee2e2;color:#991b1b}.v324ClaimBadge.na{background:#eef2f7;color:#596b7a}
  #v324FormActions{grid-column:1/-1;display:none;gap:5px;min-width:0;width:100%;margin:0;padding:0}#v324FormActions.show{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr)}
  #v324FormActions.one{grid-template-columns:1fr}.v324FormAction{min-height:34px;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:5px 8px;font:900 10.5px/1.1 Arial;box-shadow:none;touch-action:manipulation;white-space:normal}.v324Export{background:#e8f7f4;color:#086b62;border-color:#a9d9d2}.v324Handover{background:#fff2dd;color:#9a4d00;border-color:#ebc18e}
  .fwcFlight .v324ReceiveBtn[disabled]{background:#e5eaee!important;color:#667785!important;cursor:not-allowed!important}.fwcFlight .v324ReceiveBtn.wait{background:#fff4d6!important;color:#7c5600!important}.fwcFlight .v324ReceiveBtn.done{background:#eef2f5!important;color:#5b6c79!important}.fwcFlight .v324ReceiveBtn.blocked{background:#fee2e2!important;color:#991b1b!important}.fwcFlight .v324ReceiveBtn.na{background:#eef2f7!important;color:#596b7a!important}
  @media(max-width:520px){#v324FormActions.show{grid-template-columns:1fr 1.2fr}.v324FormAction{font-size:10px;padding:5px 6px}}
  `;document.head.appendChild(st)}

  async function claimStateFor(item,man){
    const st=await sessionState(item.assignmentId),cs=U(st.claimStatus);let ts='';
    try{ts=U(root.sagsTaskStatusDerive?.(st,item,man)||st.taskStatusV333||st.taskStatus)}catch(_){ts=U(st.taskStatusV333||st.taskStatus)}
    if(ts==='BLOCK')return {state:'BLOCKED',st,taskStatus:ts};
    if(ts==='NOT_APPLICABLE')return {state:'NA',st,taskStatus:ts};
    if(ts==='COMPLETED'||cs==='PART_COMPLETED'||cs==='COMPLETED'||cs==='HANDED_OVER')return {state:'DONE',st,taskStatus:'COMPLETED'};
    // V3.34: thứ tự trong Daily Roster là khóa nhận chuyến. Người sau không thể nhận/tiếp tục trước khi người ngay trước hoàn tất.
    if(!firstItem(man,item)&&!(await previousCompleted(man,item)))return {state:'WAIT',st,taskStatus:ts==='IN_PROGRESS'?'IN_PROGRESS':'UNCLAIMED'};
    if((ts==='IN_PROGRESS'||cs==='CLAIMED')&&norm(st.claimedBy||st.ownerUser)===me())return {state:'CLAIMED',st,taskStatus:'IN_PROGRESS'};
    return {state:'READY',st,taskStatus:'UNCLAIMED'}
  }
  async function decorateList(d=opDate()){
    const host=document.getElementById('fwcList');if(!host||role()==='AD')return;let man;try{man=await manifest(d)}catch(_){return}
    const u=me();for(const card of host.querySelectorAll('.fwcFlight')){
      const old=card.querySelector('button[onclick*="flightWorkspaceOpenFlight"],button.v324ReceiveBtn');let fid=S(card.dataset.v38Fid);if(!fid){const oc=S(old?.getAttribute('onclick')),m=oc.match(/flightWorkspaceOpenFlight\(['"]([^'"]+)['"]\)/);fid=m?.[1]||''}if(!fid||!old)continue;
      const mine=myItems(man,fid);if(!mine.length){if(!old.classList.contains('v324ReceiveBtn')){old.textContent='XEM';old.classList.add('gray')}continue}
      const primary=mine[0],cs=await claimStateFor(primary,man);old.classList.add('v324ReceiveBtn');old.onclick=null;old.removeAttribute('onclick');old.disabled=false;old.classList.remove('wait','done','blocked','na');
      if(cs.state==='CLAIMED'){old.textContent='TIẾP TỤC';old.onclick=()=>root.v324ReceiveOrOpen(fid);}
      else if(cs.state==='DONE'){old.textContent='PHẦN ĐÃ XONG';old.disabled=true;old.classList.add('done')}
      else if(cs.state==='BLOCKED'){old.textContent='ĐANG BLOCK';old.disabled=true;old.classList.add('blocked')}
      else if(cs.state==='NA'){old.textContent='KHÔNG ÁP DỤNG';old.disabled=true;old.classList.add('na')}
      else if(cs.state==='WAIT'){old.textContent='CHỜ PHẦN TRƯỚC';old.disabled=true;old.classList.add('wait')}
      else {old.textContent='NHẬN CHUYẾN';old.onclick=()=>root.v324ReceiveOrOpen(fid);}
      let b=card.querySelector('.v324ClaimBadge');if(!b){b=document.createElement('span');b.className='v324ClaimBadge';card.querySelector('.v38Flags,.fwcFlightTitle')?.appendChild?.(b)}if(b){b.className='v324ClaimBadge'+(cs.state==='WAIT'?' wait':cs.state==='DONE'?' done':cs.state==='BLOCKED'?' blocked':cs.state==='NA'?' na':'');b.textContent=cs.state==='CLAIMED'?'ĐANG LÀM':cs.state==='DONE'?'HOÀN TẤT':cs.state==='BLOCKED'?'BLOCK':cs.state==='NA'?'KHÔNG ÁP DỤNG':'CHƯA NHẬN';if(cs.state==='WAIT')b.title='Chưa nhận · đang chờ phần công việc trước hoàn tất';else b.removeAttribute('title')}
    }
    const head=document.querySelector('#fwcModal .fwcHead h3');if(head)head.textContent='✈ CHUYẾN HÔM NAY · MY FLIGHT';const sub=document.querySelector('#fwcModal .fwcHead .fwcSub');if(sub)sub.textContent='Chọn chuyến được phân công → NHẬN CHUYẾN → vào thẳng biểu mẫu của bạn.';
  }

  async function syncSharedIntoLocal(item,meta){if(!meta)return;try{const shared=await sessionState(item.assignmentId);if(!shared?.envelope)return;const env=clone(shared.envelope);env.rosterAssignmentId=S(item.assignmentId);env.mainForm=S(item.formGroup||env.mainForm);env.activeFormGroup=env.mainForm;env.rosterSharedAtMs=Number(shared.updatedAtMs||Date.now());if(typeof root.flightSessionStorageKey==='function')localStorage.setItem(root.flightSessionStorageKey(meta.id),JSON.stringify(env))}catch(e){console.warn('V3.24 shared draft load',e)}}
  async function openAssignment(item){if(U(item?.formGroup)==='FINAL'){try{root.flightWorkspaceClose?.()}catch(_){}if(typeof root.sagsV338OpenFinalForRoster!=='function')throw new Error('Biểu mẫu FINAL chưa sẵn sàng.');await root.sagsV338OpenFinalForRoster(item);return;}if(U(item?.formGroup)==='UNIT_TASK'){root.flightWorkspaceOpenFlight?.(S(item.flightId));return;}let meta=localMeta(item.assignmentId);if(!meta){try{root.dailyRosterRestartMailbox?.()}catch(_){}await new Promise(r=>setTimeout(r,700));meta=localMeta(item.assignmentId)}if(!meta&&item?.manualCreatedV340===true&&typeof root.sagsV340EnsureLocalSession==='function'){meta=await root.sagsV340EnsureLocalSession(item)}if(!meta)throw new Error('Biểu mẫu chưa đồng bộ xuống thiết bị. Hãy chờ vài giây rồi thử lại.');await syncSharedIntoLocal(item,meta);try{root.flightWorkspaceClose?.()}catch(_){}root.switchFlightSession?.(meta.id);setTimeout(syncFormActions,120)}
  async function markClaim(d,fid,item){const t=Date.now(),u=me(),p=profile(),patch={};patch[`roster_sessions/${safe(item.assignmentId)}/claimStatus`]='CLAIMED';patch[`roster_sessions/${safe(item.assignmentId)}/taskStatusV333`]='IN_PROGRESS';patch[`roster_sessions/${safe(item.assignmentId)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(item.assignmentId)}/claimedAtMs`]=t;patch[`roster_sessions/${safe(item.assignmentId)}/claimedBy`]=u;patch[`roster_sessions/${safe(item.assignmentId)}/handoverReady`]=false;patch[`roster_sessions/${safe(item.assignmentId)}/updatedAtMs`]=t;patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(u)}/${safe(item.assignmentId)}`]={assignmentId:S(item.assignmentId),username:u,name:S(p.name||p.fullName||u),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),workPartOrder:Number(item.workPartOrder||1),workPartTotal:Number(item.workPartTotal||1),status:'CLAIMED',taskStatus:'IN_PROGRESS',claimedAtMs:t,updatedAtMs:t};await db('').update(patch);await addAudit('MY_FLIGHT_CLAIMED',{flightId:fid,flightLabel:rosterLabel(item),assignmentId:S(item.assignmentId),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn)});}
  root.v324ReceiveOrOpen=async function(fid){fid=S(fid);if(!fid)return;const d=opDate();try{const man=await manifest(d),mine=myItems(man,fid);if(!mine.length)throw new Error('Chuyến này không thuộc MY FLIGHT của tài khoản hiện tại.');let item=mine[0],cs=await claimStateFor(item,man);if(cs.state==='DONE')throw new Error('Phần công việc của bạn trên chuyến này đã hoàn tất.');if(cs.state==='WAIT'){const prev=previousItem(man,item);throw new Error(`Phần công việc trước của ${norm(prev?.user||prev?.targetUser)||'chưa xác định'} chưa hoàn tất.`)}if(cs.state!=='CLAIMED'){await markClaim(d,fid,item);multiAdd(fid,d)}else multiAdd(fid,d);await openAssignment(item);setTimeout(()=>decorateList(d),300)}catch(e){alert('Không mở được MY FLIGHT: '+S(e?.message||e))}};

  async function currentHandoverContext(){const meta=activeMeta(),aid=S(meta?.rosterAssignmentId);if(!aid)return null;const d=S(meta.rosterOpDate)||opDate(),man=await manifest(d),item=itemsOf(man).find(x=>S(x.assignmentId)===aid);if(!item||norm(item.user||item.targetUser)!==me())return null;const st=await sessionState(aid);if(U(st.claimStatus)!=='CLAIMED')return null;const next=nextItem(man,item);return {d,man,item,next,meta,st}}
  async function syncFormActions(){ensureCss();const bar=document.querySelector('.toolbar');if(!bar)return;let row=document.getElementById('v324FormActions');if(!row){row=document.createElement('div');row.id='v324FormActions';row.innerHTML='<button id="v324ExportBtn" class="v324FormAction v324Export" type="button" title="Xuất / Chia sẻ">📤 XUẤT</button><button id="v324HandoverBtn" class="v324FormAction v324Handover" type="button"></button>';const nav=document.getElementById('v38CleanNav');if(nav)nav.insertAdjacentElement('beforebegin',row);else bar.appendChild(row);document.getElementById('v324ExportBtn').onclick=()=>{if(typeof root.openExportChoiceMenu==='function')root.openExportChoiceMenu();else alert('Chức năng Xuất/Chia sẻ chưa sẵn sàng.')}}
    let ctx=null;try{ctx=await currentHandoverContext()}catch(_){}if(!ctx){row.classList.remove('show','one');return}row.classList.add('show');row.classList.remove('one');const hb=document.getElementById('v324HandoverBtn');hb.style.display='block';hb.textContent='✓ HOÀN TẤT';hb.title=ctx.next?`Hoàn tất phần hiện tại; phần tiếp theo sẽ sẵn sàng cho ${norm(ctx.next.user||ctx.next.targetUser)}`:'Hoàn tất phần công việc hiện tại';hb.setAttribute('aria-label','Hoàn tất phần của tôi');hb.onclick=()=>root.v324ConfirmRosterHandover?.()
  }

  root.v324ConfirmRosterHandover=async function(){let ctx;try{ctx=await currentHandoverContext();if(!ctx)throw new Error('Không xác định được phần công việc đang thực hiện.');const from=me(),to=ctx.next?norm(ctx.next.user||ctx.next.targetUser):'';const nextText=to?`\nPhần công việc tiếp theo sẽ sẵn sàng cho ${to} theo Daily Roster.`:'\nĐây là phần cuối của assignment hiện tại.';if(!confirm(`HOÀN TẤT PHẦN CỦA TÔI\n\n${rosterLabel(ctx.item)} · ${formLabel(ctx.item.formGroup)}\n\nDữ liệu hiện tại sẽ được lưu lại và phần của ${from} được đánh dấu HOÀN TẤT.${nextText}`))return;try{document.activeElement?.blur?.()}catch(_){}await new Promise(r=>setTimeout(r,30));try{root.persist?.()}catch(_){}await new Promise(r=>setTimeout(r,100));let env={};try{env=root.readFlightSessionEnvelope?.(ctx.meta.id)||{}}catch(_){}env=sanitizeEnvelope(env);const t=Date.now(),aid=S(ctx.item.assignmentId),patch={};patch[`roster_sessions/${safe(aid)}/claimStatus`]='PART_COMPLETED';patch[`roster_sessions/${safe(aid)}/workPartStatus`]='COMPLETED';patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='COMPLETED';patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/completedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/completedBy`]=from;patch[`roster_sessions/${safe(aid)}/completionEnvelope`]=env;patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=t;let nextAid='';if(ctx.next){nextAid=S(ctx.next.assignmentId);patch[`roster_sessions/${safe(nextAid)}/engine`]='daily-roster-v2';patch[`roster_sessions/${safe(nextAid)}/schema`]=1;patch[`roster_sessions/${safe(nextAid)}/assignmentId`]=nextAid;patch[`roster_sessions/${safe(nextAid)}/ownerUser`]=to;patch[`roster_sessions/${safe(nextAid)}/formGroup`]=S(ctx.next.formGroup||env.mainForm);patch[`roster_sessions/${safe(nextAid)}/envelope`]=env;patch[`roster_sessions/${safe(nextAid)}/workPartReady`]=true;patch[`roster_sessions/${safe(nextAid)}/handoverReady`]=true;patch[`roster_sessions/${safe(nextAid)}/previousPartUser`]=from;patch[`roster_sessions/${safe(nextAid)}/previousPartCompletedAtMs`]=t;patch[`roster_sessions/${safe(nextAid)}/claimStatus`]='READY';patch[`roster_sessions/${safe(nextAid)}/taskStatusV333`]='UNCLAIMED';patch[`roster_sessions/${safe(nextAid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(nextAid)}/updatedAtMs`]=t;patch[`roster_sessions/${safe(nextAid)}/updatedBy`]=from;}const ev=`WORK_PART_${t}_${safe(aid)}`;patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/workPartHistory/${safe(ev)}`]={eventId:ev,assignmentId:aid,nextAssignmentId:nextAid||null,fromUser:from,nextUser:to||null,atMs:t,type:'WORK_PART_COMPLETED',status:'COMPLETED',draftSaved:true,formGroup:S(ctx.item.formGroup),sourceColumn:S(ctx.item.sourceColumn)};patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/taskClaims/${safe(from)}/${safe(aid)}/status`]='PART_COMPLETED';patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/taskClaims/${safe(from)}/${safe(aid)}/taskStatus`]='COMPLETED';patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/taskClaims/${safe(from)}/${safe(aid)}/completedAtMs`]=t;patch[`flight_records/${safe(ctx.d)}/${safe(ctx.item.flightId)}/taskClaims/${safe(from)}/${safe(aid)}/nextUser`]=to||null;await db('').update(patch);multiRemove(ctx.item.flightId,ctx.d);await addAudit('WORK_PART_COMPLETED',{flightId:S(ctx.item.flightId),flightLabel:rosterLabel(ctx.item),assignmentId:aid,nextAssignmentId:nextAid||null,fromUser:from,nextUser:to||null,formGroup:S(ctx.item.formGroup),sourceColumn:S(ctx.item.sourceColumn),draftSaved:true});alert(to?`✓ ĐÃ HOÀN TẤT PHẦN CỦA TÔI.\nDữ liệu đã lưu; ${to} sẽ thấy phần tiếp theo trong MY FLIGHT và bấm NHẬN CHUYẾN.`:'✓ ĐÃ HOÀN TẤT PHẦN CỦA TÔI.\nDữ liệu hiện tại đã được lưu.');try{root.flightWorkspaceOpenList?.(ctx.d)}catch(_){}setTimeout(()=>decorateList(ctx.d),250)}catch(e){alert('Không hoàn tất được phần công việc: '+S(e?.message||e))}};


  function patchList(){if(typeof root.flightWorkspaceOpenList==='function'&&!root.flightWorkspaceOpenList.__v324){const b=root.flightWorkspaceOpenList;const w=function(d){d=S(d)||opDate();const r=b.apply(this,arguments);Promise.resolve(r).finally(()=>{setTimeout(()=>decorateList(d),130);setTimeout(()=>decorateList(d),520)});return r};w.__v324=1;root.flightWorkspaceOpenList=w}}
  function patchMulti(){if(typeof root.sagsV36SwitchFlight==='function'&&!root.sagsV36SwitchFlight.__v324){const w=function(fid){root.sagsV36CloseMultitask?.();return root.v324ReceiveOrOpen?.(fid)};w.__v324=1;root.sagsV36SwitchFlight=w}}
  function patchFormHooks(){for(const name of ['switchFlightSession','showFormGroup','showRoleHomeIdle','hideRoleHomeIdle']){const fn=root[name];if(typeof fn!=='function'||fn.__v324)continue;const w=function(){const r=fn.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(syncFormActions,70));return r};w.__v324=1;root[name]=w;try{if(name==='switchFlightSession')switchFlightSession=w;else if(name==='showFormGroup')showFormGroup=w;else if(name==='showRoleHomeIdle')showRoleHomeIdle=w;else if(name==='hideRoleHomeIdle')hideRoleHomeIdle=w}catch(_){}}}
  function install(){ensureCss();patchList();patchMulti();patchFormHooks();setTimeout(syncFormActions,120);const h=document.getElementById('v38FlowHint');if(h)h.textContent='MY FLIGHT · V3.25'}
  install();setTimeout(install,350);setTimeout(install,1200);
  root.__SAGS_V324_BUILD=BUILD;
  root.__SAGS_V337_HDSD='V3.37: Daily Roster bổ sung cột Grnd_Ls làm nguồn phân công CBTT. Mỗi username ở Grnd_Ls sinh assignment CBTT · FINAL/CROSSCHECK cho đúng chuyến; thứ tự A / B / C vẫn khóa nhận tuần tự. MY FLIGHT của CBTT bấm NHẬN CHUYẾN sẽ mở thẳng quản lý FINAL; không tạo session FSAGS/RAMP giả. Preview hiển thị Grnd_Ls và FINAL; Flight Workspace/roster reconciliation cũng nhận diện CBTT từ Grnd_Ls.';
  root.__SAGS_V325_HDSD='V3.25: Giữ toàn bộ V3.24. NHẬP GIỜ NHANH có nút XÓA GIỜ nhỏ cạnh CẬP NHẬT; người dùng chạm đúng ô giờ cần sửa rồi bấm XÓA GIỜ để xóa giá trị của ô đó trong draft, tự focus lại ô và nhập giờ mới bằng bàn phím số. Không xóa các mốc khác; chỉ ghi chính thức khi bấm CẬP NHẬT.';
})(typeof window!=='undefined'?window:globalThis);
/* ===== END v324-direct-myflight-handover.js ===== */



/* ===== BEGIN dynamic-permission-actions-v326.js ===== */
/* E-REPORT SAGS · V3.26 DYNAMIC PERMISSION ACTIONS
 * Extra permissions explicitly granted by AD surface as compact direct action buttons.
 * Context-only permissions (forms / Quick Time / Export) keep their controls inside the relevant flight/form.
 */
(function(root){
  'use strict';
  const BUILD='V3.26-20260821-01';
  const DIRECT=[
    {key:'DAILY_ROSTER',label:'📋 DAILY ROSTER',run:()=>root.openDailyRosterManager?.()},
    {key:'AC_LIMITS',label:'⚠ A/C LIMITS',run:()=>{if(typeof root.aclSimpleOpen==='function')return root.aclSimpleOpen();return root.aclOpenAdmin?.();}},
    {key:'FLEET',label:'🛫 FLEET',run:()=>root.openFleetManager?.()},
    {key:'FSAGS09',label:'PVHK · FSAGS 09',run:()=>root.openFS09SheetManager?.()},
    {key:'FSAGS208',label:'KH · FSAGS 208',run:()=>root.openKH208Manager?.()},
    {key:'FINAL',label:'FINAL',run:()=>root.openFinalSheetManager?.()}
  ];
  const S=v=>String(v??'').trim();
  const U=v=>S(v).toUpperCase();
  let toolbarObserver=null,navObserver=null,syncTimer=0;
  function profile(){try{return (typeof currentUserProfile!=='undefined'&&currentUserProfile)||root.currentUserProfile||{}}catch(_){return root.currentUserProfile||{}}}
  function role(){try{return U((typeof currentRole!=='undefined'&&currentRole)||profile().role||root.currentRole)}catch(_){return U(profile().role||root.currentRole)}}
  function defaultsFor(r){try{const fn=root.v485RoleDefaults||(typeof v485RoleDefaults==='function'?v485RoleDefaults:null);return typeof fn==='function'?(fn(r)||{}):{}}catch(_){return {}}}
  function ready(){const def=root.v485RoleDefaults||(typeof v485RoleDefaults==='function'?v485RoleDefaults:null);return !!document.querySelector('script[data-phase="control"][src*="app.js"]')&&typeof root.v485Can==='function'&&typeof def==='function'&&typeof root.applyRoleUI==='function';}
  function extras(){
    if(role()==='AD')return [];
    const o=profile().featureOverridesV485;
    if(!o||typeof o!=='object')return [];
    const d=defaultsFor(role());
    return DIRECT.filter(x=>o[x.key]===true&&!d[x.key]&&root.v485Can(x.key));
  }
  function css(){
    if(document.getElementById('v326GrantedPermissionStyle'))return;
    const st=document.createElement('style');st.id='v326GrantedPermissionStyle';st.textContent=`
body.v38-clean-workflow #v38CleanNav .v326GrantedPermission{background:#ecfdf7!important;color:#0f6b55!important;border-color:#a9dccd!important}
body.v38-clean-workflow #v38CleanNav .v326GrantedPermission:active{transform:translateY(1px)}
body.v38-clean-workflow #v38CleanNav .v326GrantedPermission::after{content:'+';display:inline-flex;align-items:center;justify-content:center;margin-left:5px;width:14px;height:14px;border-radius:99px;background:#0f766e;color:#fff;font:900 9px Arial}
`;
    document.head.appendChild(st);
  }
  function invoke(key){
    const a=DIRECT.find(x=>x.key===key);if(!a)return;
    if(!root.v485Can?.(key)){try{root.roleDenied?.('Quyền này đã bị thu hồi.');}catch(_){}schedule();return;}
    try{const r=a.run();if(r&&typeof r.catch==='function')r.catch(e=>alert('Không mở được chức năng: '+S(e?.message||e)));}catch(e){alert('Không mở được chức năng: '+S(e?.message||e));}
  }
  function schedule(){clearTimeout(syncTimer);syncTimer=setTimeout(sync,30);}
  function sync(){
    css();const nav=document.getElementById('v38CleanNav');if(!nav)return;
    const wanted=extras(),keys=new Set(wanted.map(x=>x.key));
    nav.querySelectorAll('[data-v326-feature]').forEach(b=>{if(!keys.has(b.dataset.v326Feature))b.remove();});
    const anchor=document.getElementById('v38NavAdmin')||nav.querySelector('.v38NavSpacer')||null;
    let cursor=anchor;
    for(const a of [...wanted].reverse()){
      let b=nav.querySelector(`[data-v326-feature="${a.key}"]`);
      if(!b){b=document.createElement('button');b.type='button';b.className='v38NavBtn v326GrantedPermission';b.dataset.v326Feature=a.key;b.title='Chức năng được AD cấp thêm';b.onclick=()=>invoke(a.key);}
      if(b.textContent!==a.label)b.textContent=a.label;
      if(cursor){if(b.nextElementSibling!==cursor)nav.insertBefore(b,cursor);}else if(b.parentNode!==nav||b!==nav.lastElementChild)nav.appendChild(b);
      cursor=b;
    }
    // Permission-dependent existing chips keep their native location.
    const shift=document.getElementById('v310ShiftNav');if(shift)shift.style.display=root.v485Can?.('HANDOVER')?'':'none';
    attachNavObserver(nav);
  }
  function attachNavObserver(nav){
    if(navObserver&&navObserver.__nav===nav)return;
    try{navObserver?.disconnect?.()}catch(_){}
    navObserver=new MutationObserver(()=>schedule());navObserver.__nav=nav;navObserver.observe(nav,{childList:true});
  }
  function install(){
    if(root.__SAGS_V326_PERMISSION_ACTIONS)return true;if(!ready())return false;
    root.__SAGS_V326_PERMISSION_ACTIONS=BUILD;css();
    const base=root.applyRoleUI;
    if(!base.__v326Wrapped){
      const wrapped=function(){const out=base.apply(this,arguments);schedule();return out;};wrapped.__v326Wrapped=true;wrapped.__v326Base=base;root.applyRoleUI=wrapped;try{applyRoleUI=wrapped}catch(_){}
    }
    const tb=document.querySelector('.toolbar.compact-main-toolbar')||document.querySelector('.toolbar');
    if(tb){toolbarObserver=new MutationObserver(()=>schedule());toolbarObserver.observe(tb,{childList:true,subtree:true});}
    root.sagsV326RefreshGrantedActions=sync;
    root.__SAGS_V326_HDSD='V3.26: Quyền AD cấp thêm cho từng tài khoản tự sinh nút chức năng tương ứng trên thanh CLEAN khi chức năng có điểm vào trực tiếp. Ví dụ Ca Phó được cấp DAILY ROSTER sẽ thấy nút 📋 DAILY ROSTER mà không cần đổi role. Thu hồi quyền thì nút tự mất sau tín hiệu permission. Các quyền theo ngữ cảnh như NHẬP GIỜ NHANH/XUẤT vẫn chỉ hiện trong đúng biểu mẫu.';
    schedule();window.addEventListener('pageshow',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});return true;
  }
  let tries=0;const t=setInterval(()=>{if(install()||++tries>80)clearInterval(t)},100);
})(typeof window!=='undefined'?window:globalThis);
/* ===== END dynamic-permission-actions-v326.js ===== */

/* ===== BEGIN reassign-direct-handover-v327.js ===== */
/* E-REPORT SAGS · V3.27
 * - Add per-account permission PHÂN CÔNG LẠI CHUYẾN.
 * - Mobile reassign A -> B without modifying the original Daily Roster source.
 * - Retire the old batch GIAO CA approval flow from the CLEAN UI.
 * - Roster sequence handover inside the active form remains direct: current user confirms, draft is saved,
 *   next roster user receives READY and later presses NHẬN CHUYẾN.
 */
(function(root){
  'use strict';
  const BUILD='V3.27-20260821-01';
  const FEATURE='REASSIGN_FLIGHT';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  function sess(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return sess().profile||root.currentUserProfile||{}}
  function role(){return U(sess().role||profile().role)}
  function me(){return norm(profile().username||(role()==='AD'?'AD':''))}
  function opDate(){const x=S(sessionStorage.getItem('sagsV36FwcDate'))||S(document.getElementById('fwcDate')?.value);if(x)return x;const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  async function userCatalog(force=false){try{return typeof root.v466GetUserCatalog==='function'?await root.v466GetUserCatalog(force):[]}catch(_){return []}}
  function unitParts(p){p=p||{};return {group:U(p.groupCode||p.group),dep:U(p.departmentCode||p.systemDepartment||p.department),unit:U(p.unit||p.workUnit),role:U(p.role)}}
  function sameUnit(a,b){if(!a||!b)return false;const x=unitParts(a),y=unitParts(b);if(x.group&&y.group)return x.group===y.group;if(x.dep&&y.dep)return x.dep===y.dep;if(x.unit&&y.unit)return x.unit===y.unit;return !!x.role&&x.role===y.role}
  function canReassign(){try{return role()==='AD'||!!root.v485Can?.(FEATURE)}catch(_){return role()==='AD'}}
  function canTouchAssignment(item,users){if(role()==='AD')return true;const actor=users.find(x=>norm(x.username)===me()),old=users.find(x=>norm(x.username)===norm(item?.user||item?.targetUser));return !!actor&&!!old&&sameUnit(actor,old)}
  function labelForm(g){g=U(g);return g==='FINAL'?'CBTT · FINAL':g==='FSAGS421'?'FSAGS 42.1':g==='FSAGS551'?'FSAGS 55.1':g==='FSAGS09'?'F/SAGS-CXR/09':g==='LOADING208'?'F/SAGS-CXR/208':'FSAGS 42.3'}
  async function audit(event,detail){try{const p=profile();await db('ops_audit_v331').push({schema:1,event,systemTimestamp:root.firebase?.database?.ServerValue?.TIMESTAMP||Date.now(),clientAtMs:Date.now(),actor:{username:me(),name:S(p.name||p.fullName||me()),role:role()},flightId:S(detail?.flightId),flightLabel:S(detail?.flightLabel),detail:detail||{}})}catch(e){console.info('V3.27 audit',e?.message||e)}}

  function installPermission(){
    try{
      if(typeof SAGS_FEATURES_V485!=='object'||!Array.isArray(V485_FEATURE_KEYS))return false;
      SAGS_FEATURES_V485[FEATURE]={label:'PHÂN CÔNG LẠI CHUYẾN',note:'Đổi người thực tế A → B trên Daily Roster đã xác nhận; giữ người kế hoạch gốc và Audit'};
      if(!V485_FEATURE_KEYS.includes(FEATURE))V485_FEATURE_KEYS.push(FEATURE);
      // Legacy batch handover (approve -> accept) is retired from the active permission list.
      const hi=V485_FEATURE_KEYS.indexOf('HANDOVER');if(hi>=0)V485_FEATURE_KEYS.splice(hi,1);
      try{delete SAGS_FEATURES_V485.HANDOVER}catch(_){}
      if(typeof root.v485Can==='function'&&!root.v485Can.__v327){
        const base=root.v485Can;
        const wrapped=function(feature){if(U(feature)==='HANDOVER')return false;return base.apply(this,arguments)};
        wrapped.__v327=true;wrapped.__v327Base=base;root.v485Can=wrapped;try{v485Can=wrapped}catch(_){}
      }
      return true;
    }catch(e){console.warn('V3.27 permission install',e);return false}
  }

  function ensureCss(){if(document.getElementById('sagsV327Style'))return;const st=document.createElement('style');st.id='sagsV327Style';st.textContent=`
#v310ShiftNav,#roleBtnHandover,#v310ShiftModal{display:none!important}
#v327ReassignModal{position:fixed;inset:0;z-index:10240;background:rgba(7,22,38,.62);display:none;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;font-family:Arial,sans-serif}
#v327ReassignModal.show{display:flex}.v327Panel{width:min(96vw,760px);max-height:90vh;overflow:auto;background:#f8fbfe;border-radius:16px;padding:12px;box-shadow:0 18px 55px rgba(0,0,0,.3);color:#17324a}.v327Head{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}.v327Head h3{margin:0;color:#0b4d8b;font:900 18px Arial}.v327Sub{font:700 11px/1.35 Arial;color:#63778b;margin-top:4px}.v327Tools{display:grid;grid-template-columns:145px 1fr auto;gap:6px;margin:10px 0}.v327Tools input,.v327Tools select{min-width:0;border:1px solid #cbd9e6;border-radius:9px;background:#fff;padding:8px;font:700 12px Arial;color:#17324a}.v327Btn{border:0;border-radius:9px;padding:8px 10px;font:900 11px Arial;cursor:pointer}.v327Btn.blue{background:#0b6aa9;color:#fff}.v327Btn.gray{background:#e8eef4;color:#27425a}.v327Btn.orange{background:#fff1df;color:#934a00;border:1px solid #e8bd87}.v327List{display:grid;gap:7px}.v327Card{background:#fff;border:1px solid #d8e2eb;border-radius:11px;padding:9px}.v327Top{display:flex;justify-content:space-between;gap:7px;align-items:flex-start}.v327Flight{font:900 14px Arial;color:#0b4d8b}.v327Meta{font:700 10.5px/1.35 Arial;color:#708196;margin-top:2px}.v327Assign{display:grid;grid-template-columns:minmax(0,1fr) minmax(145px,.85fr) auto;gap:6px;align-items:center;margin-top:7px;padding-top:7px;border-top:1px dashed #dde6ee}.v327Current{font:800 11px/1.35 Arial}.v327Current b{color:#9a4d00}.v327Assign select{min-width:0;border:1px solid #cbd9e6;border-radius:8px;padding:7px;background:#fff;font:700 11px Arial}.v327Empty{padding:18px;text-align:center;color:#687b8f;font:800 12px Arial}.v327Status{margin:7px 0;padding:7px 9px;border-radius:8px;background:#eef7ff;color:#28587d;font:800 11px/1.35 Arial}.v327ReassignChip{background:#fff1df!important;color:#934a00!important;border-color:#e8bd87!important}
@media(max-width:560px){.v327Tools{grid-template-columns:120px 1fr}.v327Tools .v327Reload{grid-column:1/-1}.v327Assign{grid-template-columns:1fr auto}.v327Assign select{grid-column:1/2}.v327Assign .v327Go{grid-column:2/3;grid-row:2}.v327Current{grid-column:1/-1}}
`;document.head.appendChild(st)}

  function ensureModal(){ensureCss();if(document.getElementById('v327ReassignModal'))return;const m=document.createElement('div');m.id='v327ReassignModal';m.innerHTML=`<div class="v327Panel"><div class="v327Head"><div><h3>🔁 PHÂN CÔNG LẠI CHUYẾN</h3><div class="v327Sub">Đổi người thực tế A → B trên điện thoại. Daily Roster gốc vẫn được giữ trong originalUser/Audit; không cần upload roster lại.</div></div><button class="v327Btn gray" onclick="v327CloseReassign()">ĐÓNG</button></div><div class="v327Tools"><input id="v327Date" type="date"><input id="v327Search" placeholder="Tìm Flight / người đang làm" oninput="v327RenderReassign()"><button class="v327Btn blue v327Reload" onclick="v327LoadReassign(true)">TẢI LẠI</button></div><div id="v327Status" class="v327Status">Đang tải...</div><div id="v327List" class="v327List"></div></div>`;document.body.appendChild(m)}
  let cache={date:'',manifest:null,users:[]};
  function setStatus(t,err=false){const e=document.getElementById('v327Status');if(!e)return;e.textContent=t||'';e.style.background=err?'#fff0f0':'#eef7ff';e.style.color=err?'#a32626':'#28587d'}
  function candidateOptions(item){const users=cache.users||[],oldU=norm(item.user||item.targetUser),old=users.find(x=>norm(x.username)===oldU),actor=users.find(x=>norm(x.username)===me());let list=users.filter(x=>x&&x.active!==false&&norm(x.username)&&norm(x.username)!==oldU);
    if(old)list=list.filter(x=>sameUnit(old,x));else if(role()!=='AD'&&actor)list=list.filter(x=>sameUnit(actor,x));
    list.sort((a,b)=>S(a.name||a.username).localeCompare(S(b.name||b.username),'vi'));
    return `<option value="">-- Chọn người mới --</option>`+list.map(x=>`<option value="${esc(norm(x.username))}">${esc(S(x.name||x.username))} · ${esc(norm(x.username))}</option>`).join('')}
  function visibleItems(){const q=U(document.getElementById('v327Search')?.value),all=Object.values(cache.manifest?.items||{}).filter(x=>x&&x.active!==false&&canTouchAssignment(x,cache.users));return all.filter(x=>!q||U([x.flightRaw,x.flightName,x.arrFlight,x.depFlight,x.user,x.targetUser,x.sourceColumn,x.formGroup].join(' ')).includes(q)).sort((a,b)=>S(a.std).localeCompare(S(b.std))||S(a.flightRaw).localeCompare(S(b.flightRaw))||S(a.sourceColumn).localeCompare(S(b.sourceColumn)))}
  root.v327RenderReassign=function(){const host=document.getElementById('v327List');if(!host)return;const items=visibleItems(),groups=new Map();for(const x of items){const k=S(x.flightId||x.flightRaw||x.flightName||x.assignmentId);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)}if(!items.length){host.innerHTML='<div class="v327Empty">Không có phân công phù hợp trong ngày này.</div>';return}host.innerHTML=[...groups.entries()].map(([fid,arr])=>{const a=arr[0],name=S(a.flightName||a.flightRaw||[a.arrFlight,a.depFlight].filter(Boolean).join(' / ')||fid);return `<div class="v327Card"><div class="v327Top"><div><div class="v327Flight">✈ ${esc(name)}</div><div class="v327Meta">STD ${esc(a.std||'—')} · STA ${esc(a.sta||'—')} · A/C ${esc(a.acReg||'—')}</div></div></div>${arr.map(x=>`<div class="v327Assign"><div class="v327Current"><b>${esc(norm(x.user||x.targetUser)||'—')}</b> · ${esc(x.sourceColumn||x.roleKey||'')} · ${esc(labelForm(x.formGroup))}${x.manualOverride?'<br><span class="v327Meta">Kế hoạch gốc: '+esc(norm(x.originalUser||x.originalTargetUser)||'—')+'</span>':''}</div><select id="v327To_${esc(safe(x.assignmentId))}">${candidateOptions(x)}</select><button class="v327Btn orange v327Go" onclick="v327Reassign('${esc(S(x.assignmentId))}')">ĐỔI NGƯỜI</button></div>`).join('')}</div>`}).join('')}
  root.v327LoadReassign=async function(force=false){if(!canReassign())return;ensureModal();const d=S(document.getElementById('v327Date')?.value)||opDate();try{setStatus('Đang tải phân công...');const [ms,users]=await Promise.all([db(`roster_manifests/${safe(d)}`).once('value'),userCatalog(force)]);cache={date:d,manifest:ms.val()||{},users:users||[]};root.v327RenderReassign();setStatus(`✓ ${visibleItems().length} phân công có thể quản lý · ${d}.`)}catch(e){setStatus('Không tải được: '+S(e?.message||e),true)}};
  root.v327OpenReassign=async function(){if(!canReassign())return root.roleDenied?.('Tài khoản chưa được AD cấp quyền PHÂN CÔNG LẠI CHUYẾN.');ensureModal();document.getElementById('v327Date').value=opDate();document.getElementById('v327ReassignModal').classList.add('show');await root.v327LoadReassign(false)};
  root.v327CloseReassign=function(){document.getElementById('v327ReassignModal')?.classList.remove('show')};
  root.v327Reassign=async function(aid){if(!canReassign())return;aid=S(aid);const item=cache.manifest?.items?.[aid];if(!item)return alert('Không tìm thấy assignment. Hãy tải lại.');const sel=document.getElementById(`v327To_${safe(aid)}`),target=norm(sel?.value),old=norm(item.user||item.targetUser);if(!target)return alert('Chọn người mới.');if(target===old)return alert('Người mới đang là người phụ trách hiện tại.');const oldP=cache.users.find(x=>norm(x.username)===old),toP=cache.users.find(x=>norm(x.username)===target);if(!toP||toP.active===false)return alert('Tài khoản người mới không ACTIVE.');if(oldP&&!sameUnit(oldP,toP))return alert('Người mới phải cùng đơn vị với người đang được phân công.');if(!canTouchAssignment(item,cache.users))return alert('Tài khoản của bạn không được phân công lại assignment này.');if(!confirm(`ĐỔI NGƯỜI PHỤ TRÁCH\n\n${item.flightRaw||item.flightName||''} · ${labelForm(item.formGroup)}\n${old} → ${target}\n\nDaily Roster kế hoạch gốc vẫn được giữ. Người mới sẽ thấy chuyến trong MY FLIGHT và bấm NHẬN CHUYẾN.`))return;
    try{const d=cache.date||opDate(),t=Date.now(),actor=me();let payload=null;try{payload=(await db(`roster_mail/${safe(old)}/items/${safe(aid)}`).once('value')).val()}catch(_){}payload=payload||{engine:'daily-roster-v2',schema:2,assignmentId:aid,opDate:d,flightRaw:S(item.flightRaw),flightName:S(item.flightName),arrFlight:S(item.arrFlight),depFlight:S(item.depFlight),sta:S(item.sta),std:S(item.std),acReg:S(item.acReg),acType:S(item.acType),route:S(item.route),formGroup:S(item.formGroup),sourceColumn:S(item.sourceColumn),roleKey:S(item.roleKey),workPartOrder:Number(item.workPartOrder||1),workPartTotal:Number(item.workPartTotal||1),workPartSequenceSource:S(item.workPartSequenceSource||item.sourceColumn),active:true};
      const original=norm(item.originalUser||item.originalTargetUser||payload.originalTargetUser||old)||old;
      const nextPayload={...payload,targetUser:target,originalTargetUser:original,manualOverride:true,reassignedFrom:old,reassignedAtMs:t,reassignedBy:actor,active:true};
      const patch={};patch[`roster_mail/${safe(old)}/items/${safe(aid)}`]=null;patch[`roster_mail/${safe(target)}/items/${safe(aid)}`]=nextPayload;patch[`roster_revocations/${safe(old)}/items/${safe(aid)}`]={assignmentId:aid,reason:'MANUAL_REASSIGN',toUser:target,atMs:t,by:actor};patch[`roster_revocations/${safe(target)}/items/${safe(aid)}`]=null;patch[`roster_manifests/${safe(d)}/items/${safe(aid)}`]={...item,user:target,targetUser:target,originalUser:original,manualOverride:true,assignmentId:aid,lastReassignedAtMs:t,lastReassignedBy:actor,lastReassignedFrom:old};patch[`roster_sessions/${safe(aid)}/ownerUser`]=target;patch[`roster_sessions/${safe(aid)}/claimStatus`]='READY';patch[`roster_sessions/${safe(aid)}/taskStatusV333`]='UNCLAIMED';patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/handoverReady`]=true;patch[`roster_sessions/${safe(aid)}/reassignedFrom`]=old;patch[`roster_sessions/${safe(aid)}/reassignedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/reassignedBy`]=actor;patch[`roster_sessions/${safe(aid)}/claimedBy`]=null;patch[`roster_sessions/${safe(aid)}/claimedAtMs`]=null;patch[`roster_sessions/${safe(aid)}/updatedAtMs`]=t;const ev=`REASSIGN_${t}_${safe(aid)}`;const fid=S(item.flightId);if(fid){patch[`flight_records/${safe(d)}/${safe(fid)}/assignmentOverrideHistory/${safe(ev)}`]={eventId:ev,type:'MANUAL_REASSIGN',assignmentId:aid,fromUser:old,toUser:target,originalUser:original,sourceColumn:S(item.sourceColumn),formGroup:S(item.formGroup),atMs:t,by:actor};patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(old)}/${safe(aid)}/status`]='REASSIGNED';patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(old)}/${safe(aid)}/reassignedAtMs`]=t;patch[`flight_records/${safe(d)}/${safe(fid)}/taskClaims/${safe(old)}/${safe(aid)}/reassignedTo`]=target;}
      await db('').update(patch);await audit('FLIGHT_ASSIGNMENT_REASSIGNED',{flightId:fid,flightLabel:S(item.flightName||item.flightRaw),assignmentId:aid,fromUser:old,toUser:target,originalUser:original,sourceColumn:S(item.sourceColumn),formGroup:S(item.formGroup)});alert(`✓ ĐÃ ĐỔI NGƯỜI: ${old} → ${target}.\n${target} sẽ thấy chuyến trong MY FLIGHT và bấm NHẬN CHUYẾN.`);await root.v327LoadReassign(true);try{root.dailyRosterRestartMailbox?.()}catch(_){}try{root.flightWorkspaceOpenList?.(d)}catch(_){}
    }catch(e){alert('Không đổi người được: '+S(e?.message||e))}}

  function syncNav(){ensureCss();const nav=document.getElementById('v38CleanNav');if(!nav)return;document.getElementById('v310ShiftNav')?.remove();const old=document.getElementById('roleBtnHandover');if(old)old.style.display='none';let b=document.getElementById('v327ReassignNav');if(!canReassign()){b?.remove();return}if(!b){b=document.createElement('button');b.id='v327ReassignNav';b.className='v38NavBtn v327ReassignChip';b.textContent='🔁 ĐỔI NGƯỜI';b.onclick=()=>root.v327OpenReassign();const admin=document.getElementById('v38NavAdmin');if(admin)nav.insertBefore(b,admin);else nav.appendChild(b)} }

  function disableLegacyHandover(){
    try{root.v310ShiftOpen=function(){alert('GIAO CA có duyệt đã ngừng dùng. Trong biểu mẫu chuyến, người đang làm bấm HOÀN TẤT PHẦN CỦA TÔI; dữ liệu được lưu và phần tiếp theo tự sẵn sàng theo Daily Roster.')}}catch(_){}
    try{if(typeof root.openHandoverMenu==='function')root.openHandoverMenu=function(){alert('Trong biểu mẫu chuyến, dùng HOÀN TẤT PHẦN CỦA TÔI để lưu phần hiện tại và mở phần tiếp theo theo Daily Roster.')}}catch(_){}
  }

  function install(){if(root.__SAGS_V327_INSTALLED===BUILD){syncNav();return true}if(!installPermission())return false;root.__SAGS_V327_INSTALLED=BUILD;ensureCss();ensureModal();disableLegacyHandover();syncNav();
    try{const base=root.applyRoleUI;if(typeof base==='function'&&!base.__v327){const w=function(){const r=base.apply(this,arguments);setTimeout(syncNav,20);return r};w.__v327=true;w.__v327Base=base;root.applyRoleUI=w;try{applyRoleUI=w}catch(_){} }}catch(_){}
    const mo=new MutationObserver(()=>syncNav());try{mo.observe(document.body,{childList:true,subtree:true})}catch(_){}root.__SAGS_V327_NAV_OBSERVER=mo;
    root.__SAGS_V327_HDSD='V3.27: thêm quyền PHÂN CÔNG LẠI CHUYẾN. Người được AD cấp quyền có nút 🔁 ĐỔI NGƯỜI để đổi A → B trực tiếp trên điện thoại, giữ originalUser/Daily Roster kế hoạch và Audit; B nhận MY FLIGHT rồi bấm NHẬN CHUYẾN. Bỏ luồng GIAO CA batch có DUYỆT/TIẾP NHẬN khỏi CLEAN; giao ca tờ RAMP chỉ dùng XÁC NHẬN GIAO CA trong biểu mẫu, tự lưu draft và chuyển cho người kế tiếp theo thứ tự Daily Roster.';
    return true}
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>120)clearInterval(timer)},100);setTimeout(()=>install(),0);setTimeout(()=>install(),700);
})(typeof window!=='undefined'?window:globalThis);
/* ===== END reassign-direct-handover-v327.js ===== */



/* ===== BEGIN work-part-continuity-v330.js ===== */
(function(root){root.__SAGS_V330_BUILD='V3.30-20260821-02';root.__SAGS_V330_HDSD='V3.30: thay GIAO CA cả chuyến bằng HOÀN TẤT PHẦN CỦA TÔI. Một cặp chuyến/biểu mẫu dùng chung một hồ sơ; người ca trước hoàn tất phần mình, hệ thống lưu snapshot/draft và đánh dấu PART_COMPLETED. Nếu Daily Roster có người kế tiếp trong cùng lane, phần tiếp theo tự chuyển READY cho người đó; người sau vào MY FLIGHT → NHẬN CHUYẾN và tiếp tục trên dữ liệu đã có. Không cần chọn người, không cần duyệt, không cần người sau xác nhận bàn giao. AD đồng thời có phân quyền theo nhóm ngay trong Quản lý tài khoản để cấp/thu hồi nhanh cùng quyền cho một nhóm, không làm mất các quyền khác của từng người.';})(typeof window!=='undefined'?window:globalThis);
/* ===== END work-part-continuity-v330.js ===== */

/* V3.31 · REMOVE UNUSED PILOT CONTROL */
(function(root){root.__SAGS_V331_BUILD='V3.31-20260821-01';root.__SAGS_V331_HDSD='V3.31: đã loại bỏ toàn bộ module PILOT CONTROL chưa sử dụng khỏi runtime và Admin Hub. Các luồng vận hành khác giữ nguyên.';})(typeof window!=='undefined'?window:globalThis);

/* E-REPORT/SAGS V3.32 · NEXT-DAY TIME (+) */
(function(root){root.__SAGS_V332_BUILD='V3.32-20260821-01';root.__SAGS_V332_HDSD='V3.32: DAILY ROSTER hiểu dấu + sau STA/STD/ETA/ETD là NEXT DAY. Ví dụ 0400+ = 04:00 ngày kế tiếp. Parser giữ dấu + khi hiển thị, lưu clock/date/dayOffset/sortMinute vào roster mail, manifest và Flight Record; Preview hiện NEXT DAY; Flight list, MY FLIGHT và MULTITASK sắp xếp theo phút khai thác có cộng ngày thay vì coi 04:00+ là 04:00 cùng ngày. Seed biểu mẫu giữ 04:00+ để nhân viên nhận biết. Operational-day rollover giữ ngày trước qua khung 04:xx.';})(typeof window!=='undefined'?window:globalThis);


/* ===== BEGIN task-status-engine-v333.js ===== */
/* E-REPORT SAGS · V3.33 TASK STATUS STANDARD
 * One canonical task status set for every Daily Roster assignment:
 * UNCLAIMED / IN_PROGRESS / BLOCK / COMPLETED / NOT_APPLICABLE.
 * READY / WAITING_PREVIOUS are availability reasons, not extra task statuses.
 * Existing legacy claimStatus/workPartStatus remain for backward compatibility.
 */
(function(root){
  'use strict';
  const BUILD='V3.33-20260821-01';
  const STATUS=Object.freeze({UNCLAIMED:'UNCLAIMED',IN_PROGRESS:'IN_PROGRESS',BLOCK:'BLOCK',COMPLETED:'COMPLETED',NOT_APPLICABLE:'NOT_APPLICABLE'});
  const LABEL=Object.freeze({UNCLAIMED:'CHƯA NHẬN',IN_PROGRESS:'ĐANG LÀM',BLOCK:'BLOCK',COMPLETED:'HOÀN TẤT',NOT_APPLICABLE:'KHÔNG ÁP DỤNG'});
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function actor(){const x=session(),p=x.profile||{};return {username:norm(p.username||(U(x.role)==='AD'?'AD':'')),name:S(p.name||p.fullName||p.username),role:U(x.role||p.role)}}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function opDate(){return S(sessionStorage.getItem('sagsV36FwcDate'))||S(document.getElementById('fwcDate')?.value)||today()}
  function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function normalize(v){const x=U(v).replace(/[\s-]+/g,'_');if(!x)return '';if(['UNCLAIMED','READY','WAIT','WAITING','WAITING_PREVIOUS','CHUA_NHAN','CHƯA_NHẬN'].includes(x))return STATUS.UNCLAIMED;if(['IN_PROGRESS','CLAIMED','ACTIVE','WORKING','DANG_LAM','ĐANG_LÀM'].includes(x))return STATUS.IN_PROGRESS;if(['BLOCK','BLOCKED','HOLD','ON_HOLD','PAUSED'].includes(x))return STATUS.BLOCK;if(['COMPLETED','PART_COMPLETED','DONE','HANDED_OVER','FINISHED','HOAN_TAT','HOÀN_TẤT'].includes(x))return STATUS.COMPLETED;if(['NOT_APPLICABLE','N/A','NA','NOT_APPLY','KHONG_AP_DUNG','KHÔNG_ÁP_DỤNG'].includes(x))return STATUS.NOT_APPLICABLE;return ''}
  function itemFlightId(man,x,date=''){const fid=S(x?.flightId)||S(root.sagsV346ResolveRosterFlightId?.(S(date||man?.opDate)||opDate(),x,{}));if(fid&&x&&!x.flightId)x.flightId=fid;return fid}
  function laneKey(x){return [S(x?.flightId),U(x?.sourceColumn),U(x?.roleKey),U(x?.formGroup)].join('|')}
  function activeItems(man){return Object.values(man?.items||{}).filter(x=>x&&x.active!==false).map(x=>{itemFlightId(man,x);return x})}
  function lane(man,item){const k=laneKey(item),a=activeItems(man).filter(x=>laneKey(x)===k);return a.map((x,i)=>({x,i,n:Number(x?.workPartOrder)})).sort((p,q)=>{const ph=Number.isFinite(p.n)&&p.n>0,qh=Number.isFinite(q.n)&&q.n>0;if(ph&&qh)return p.n-q.n||p.i-q.i;if(ph!==qh)return ph?-1:1;return p.i-q.i}).map(v=>v.x)}
  function previous(man,item){const a=lane(man,item),i=a.findIndex(x=>S(x.assignmentId)===S(item?.assignmentId));return i>0?a[i-1]:null}
  function derive(st,item,man,allSessions){st=st||{};const explicit=normalize(st.taskStatusV333||st.taskStatus);if(explicit===STATUS.BLOCK||explicit===STATUS.NOT_APPLICABLE)return explicit;const legacy=normalize(st.claimStatus||st.workPartStatus);if(legacy===STATUS.COMPLETED)return STATUS.COMPLETED;if(legacy===STATUS.IN_PROGRESS)return STATUS.IN_PROGRESS;if(explicit===STATUS.COMPLETED||explicit===STATUS.IN_PROGRESS)return explicit;return STATUS.UNCLAIMED}
  function availability(st,item,man,allSessions){const status=derive(st,item,man,allSessions);if(status===STATUS.COMPLETED)return 'COMPLETED';if(status===STATUS.BLOCK)return 'BLOCKED';if(status===STATUS.NOT_APPLICABLE)return 'NOT_APPLICABLE';const prev=previous(man,item);if(prev){const pst=(allSessions||{})[S(prev.assignmentId)]||{};if(derive(pst,prev,man,allSessions)!==STATUS.COMPLETED)return 'WAITING_PREVIOUS'}return status===STATUS.IN_PROGRESS?'ACTIVE':'READY'}
  function label(v){return LABEL[normalize(v)||v]||S(v)||LABEL.UNCLAIMED}
  function summary(item,st,man,allSessions,date){const status=derive(st,item,man,allSessions),avail=availability(st,item,man,allSessions);return {schema:1,engine:'TASK_STATUS_V333',assignmentId:S(item.assignmentId),flightId:itemFlightId(man,item,date),opDate:S(date||item.opDate),flightName:S(item.flightName||item.flightRaw),ownerUser:norm(item.user||item.targetUser||st.ownerUser),sourceColumn:S(item.sourceColumn),roleKey:S(item.roleKey),formGroup:S(item.formGroup),assignmentScope:S(item.assignmentScope||'BOTH'),workPartOrder:Number(item.workPartOrder||1),workPartTotal:Number(item.workPartTotal||1),status,statusLabel:LABEL[status],availability:avail,updatedAtMs:Number(st.taskStatusUpdatedAtMs||st.updatedAtMs||Date.now())||Date.now()}}
  function sameSummary(a,b){if(!a||!b)return false;for(const k of ['assignmentId','flightId','opDate','ownerUser','sourceColumn','roleKey','formGroup','assignmentScope','workPartOrder','workPartTotal','status','statusLabel','availability'])if(S(a[k])!==S(b[k]))return false;return true}
  async function syncDate(date=opDate(),force=false){date=S(date)||opDate();if(!date||typeof root.sagsV470Ref!=='function')return {ok:false,count:0};const mark=`sagsTaskStatusV333:${date}`;if(!force){try{if(sessionStorage.getItem(mark)===BUILD)return {ok:true,skipped:true,count:0}}catch(_){}}
    const [ms,ss,fs]=await Promise.all([db(`roster_manifests/${safe(date)}`).once('value'),db('roster_sessions').once('value'),db(`flight_records/${safe(date)}`).once('value')]);const man=ms.val()||{},sessions=ss.val()||{},flights=fs.val()||{},items=activeItems(man),patch={},now=Date.now();let changed=0;
    for(const item of items){const aid=S(item.assignmentId);if(!aid)continue;const st=sessions[aid]||{},sum=summary(item,st,man,sessions,date),fid=itemFlightId(man,item,date);if(S(st.taskStatusV333)!==sum.status){patch[`roster_sessions/${safe(aid)}/taskStatusV333`]=sum.status;patch[`roster_sessions/${safe(aid)}/taskStatusUpdatedAtMs`]=now;changed++}if(S(st.taskAvailabilityV333)!==sum.availability){patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]=sum.availability;changed++}if(fid){const old=flights?.[fid]?.taskStatus?.[aid];if(!sameSummary(old,sum)){sum.updatedAtMs=now;patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}`]=sum;changed++}}
    }
    if(Object.keys(patch).length)await db('').update(patch);try{sessionStorage.setItem(mark,BUILD)}catch(_){}root.__SAGS_V333_LAST_SYNC={date,atMs:now,assignments:items.length,changes:changed};return {ok:true,count:items.length,changes:changed}
  }
  async function setExplicit(assignmentId,status,reason='',date=opDate()){const aid=S(assignmentId),st=normalize(status);if(!aid||![STATUS.BLOCK,STATUS.NOT_APPLICABLE].includes(st))throw new Error('Chỉ BLOCK hoặc NOT_APPLICABLE được đặt trực tiếp ở lớp chuẩn hóa này.');const t=Date.now(),a=actor();await db(`roster_sessions/${safe(aid)}`).update({taskStatusV333:st,taskStatusReason:S(reason),taskStatusUpdatedAtMs:t,taskStatusUpdatedBy:a.username});try{sessionStorage.removeItem(`sagsTaskStatusV333:${date}`)}catch(_){}await syncDate(date,true);return true}
  root.SAGS_TASK_STATUS_V333=STATUS;root.sagsTaskStatusNormalize=normalize;root.sagsTaskStatusLabel=label;root.sagsTaskStatusDerive=derive;root.sagsTaskStatusAvailability=availability;root.sagsTaskStatusSyncDate=syncDate;root.sagsTaskSetBlocked=(aid,reason,date)=>setExplicit(aid,STATUS.BLOCK,reason,date);root.sagsTaskSetNotApplicable=(aid,reason,date)=>setExplicit(aid,STATUS.NOT_APPLICABLE,reason,date);
  function wrap(name,after,tag){const fn=root[name];if(typeof fn!=='function'||fn[tag])return;const w=async function(){const r=await fn.apply(this,arguments);try{await after(r,arguments)}catch(e){console.info('V3.33 status sync',name,e?.message||e)}return r};w[tag]=true;w[`${tag}Base`]=fn;root[name]=w;try{if(name==='dailyRosterPublish')dailyRosterPublish=w;else if(name==='flightWorkspaceOpenList')flightWorkspaceOpenList=w}catch(_){}}
  function install(){if(root.__SAGS_V333_INSTALLED===BUILD)return true;root.__SAGS_V333_INSTALLED=BUILD;wrap('dailyRosterPublish',async r=>{if(r===true)await syncDate(S(document.getElementById('drManageDate')?.value)||opDate(),true)},'__v333');wrap('flightWorkspaceOpenList',async(_,args)=>{await syncDate(S(args?.[0])||opDate(),false)},'__v333');wrap('v324ReceiveOrOpen',async()=>{await syncDate(opDate(),true)},'__v333');wrap('v324ConfirmRosterHandover',async()=>{await syncDate(opDate(),true)},'__v333');wrap('v327Reassign',async()=>{await syncDate(opDate(),true)},'__v333');setTimeout(()=>syncDate(opDate(),false).catch(()=>{}),800);root.__SAGS_V333_HDSD='V3.33: chuẩn hóa trạng thái mọi assignment Daily Roster về đúng 5 trạng thái: CHƯA NHẬN / ĐANG LÀM / BLOCK / HOÀN TẤT / KHÔNG ÁP DỤNG. READY và CHỜ PHẦN TRƯỚC chỉ là điều kiện sẵn sàng, không tạo thêm trạng thái. Giữ claimStatus/workPartStatus cũ để tương thích, đồng thời ghi taskStatusV333 vào roster_sessions và chỉ mục taskStatus theo flightId để các màn hình sau dùng chung một nguồn trạng thái.';return true}
  install();setTimeout(install,350);setTimeout(install,1200);
})(typeof window!=='undefined'?window:globalThis);
/* ===== END task-status-engine-v333.js ===== */


/* ===== BEGIN strict-roster-sequence-v334.js ===== */
(function(root){
  root.__SAGS_V334_BUILD='V3.34-20260821-01';
  root.__SAGS_V334_HDSD='V3.34: Thứ tự username trong cùng ô DAILY ROSTER là thứ tự bắt buộc nhận/làm. Ví dụ KIENNT / BANGTD => KIENNT là phần 1 và được NHẬN CHUYẾN trước; BANGTD vẫn thấy MY FLIGHT nhưng CHỜ PHẦN TRƯỚC, chỉ được nhận sau khi KIENNT bấm HOÀN TẤT PHẦN CỦA TÔI. A / B / C chạy A → B → C. Phân công lại chuyến có quyền vẫn là override hợp lệ nhưng không cho assignment đứng sau vượt qua phần trước chưa hoàn tất.';
})(typeof window!=='undefined'?window:globalThis);
/* ===== END strict-roster-sequence-v334.js ===== */


/* ===== BEGIN authoritative-roster-sync-v335.js ===== */
/* E-REPORT/SAGS V3.35 · AUTHORITATIVE DAILY ROSTER REPLACEMENT
 * The newest confirmed roster for an operational date is the only ACTIVE assignment set.
 * Stale authority is removed from mailbox, MY FLIGHT, sequence, claims and unit ownership.
 * Business form envelopes and historical/audit data are preserved.
 */
(function(root){'use strict';
  const BUILD='V3.35-20260821-01';
  const S=v=>String(v??'').trim(), U=v=>S(v).toUpperCase();
  const safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const norm=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const db=p=>{if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(p)};
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const opDate=()=>S(document.getElementById('drManageDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today();
  const activeItems=man=>Object.values(man?.items||{}).filter(x=>x&&x.active!==false);
  const unitOf=item=>{const rk=U(item?.roleKey),src=U(item?.sourceColumn),fg=U(item?.formGroup);if(rk==='PAX09'||src.includes('PAX_SUPR')||fg==='FSAGS09')return 'PVHK';if(['COR','LD','BOTH'].includes(rk)||src.includes('GRND_COR')||src.includes('GRND_LD')||['FSAGS','FSAGS421','FSAGS551'].includes(fg))return 'DH';return ''};
  const sameFlight=(a,b)=>{const af=S(a?.flightId),bf=S(b?.flightId);if(af&&bf)return af===bf;const ar=U(a?.flightRaw||a?.flightName),br=U(b?.flightRaw||b?.flightName);return !!ar&&!!br&&ar===br};
  function iso(v){const x=S(v);let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(x);if(m)return x;m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(x);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return ''}
  function sessionDate(st){const e=st?.envelope||{},q=e?.state||{},r=e?.rosterSeed||{};for(const x of [st?.opDate,st?.rosterOpDate,e?.rosterOpDate,q?.f421_date,q?.f551_date,q?.f09_date,q?.date,r?.f421_date,r?.f551_date,r?.f09_date,r?.date]){const d=iso(x);if(d)return d}return ''}
  function currentUsersForFlight(man,rec,unit){const out=[];for(const x of activeItems(man)){if(unitOf(x)!==unit||!sameFlight(x,rec))continue;const u=norm(x.user||x.targetUser);if(u&&!out.includes(u))out.push(u)}return out}
  async function readManifest(date){try{return (await db(`roster_manifests/${safe(date)}`).once('value')).val()||{}}catch(_){return {}}}
  function flightIdFor(date,item){let fid=S(item?.flightId);if(fid)return fid;try{if(typeof root.sagsFlightHubFlightId==='function')fid=S(root.sagsFlightHubFlightId(date,item?.arrFlight||'',item?.depFlight||'',item?.flightRaw||item?.flightName||''))}catch(_){}return fid}

  async function cleanup(date,oldMan,newMan,repair=false){
    const newItems=newMan?.items||{}, activeIds=new Set(Object.keys(newItems).filter(id=>newItems[id]&&newItems[id].active!==false));
    const [mailSnap,sessSnap,flightSnap]=await Promise.all([db('roster_mail').once('value').catch(()=>null),db('roster_sessions').once('value').catch(()=>null),db(`flight_records/${safe(date)}`).once('value').catch(()=>null)]);
    const allMail=mailSnap?.val?.()||{}, sessions=sessSnap?.val?.()||{}, flights=flightSnap?.val?.()||{};
    const stale=new Map();
    const add=(aid,item={})=>{aid=S(aid);if(!aid||activeIds.has(aid))return;stale.set(aid,{...(stale.get(aid)||{}),...item,assignmentId:aid})};
    for(const [aid,x] of Object.entries(oldMan?.items||{}))if(x&&!activeIds.has(aid))add(aid,x);
    for(const [user,node] of Object.entries(allMail||{}))for(const [aid,x] of Object.entries(node?.items||{})){if(!x||S(x.opDate)!==date||activeIds.has(aid))continue;add(aid,{...x,user:norm(x.targetUser||user)})}
    for(const [fid,rec] of Object.entries(flights||{}))for(const [aid,x] of Object.entries(rec?.assignments||{}))if(!activeIds.has(aid))add(aid,{...x,flightId:S(rec?.flightId||fid),flightRaw:S(rec?.flightRaw),flightName:S(rec?.flightName)});
    for(const [key,st] of Object.entries(sessions||{})){const aid=S(st?.assignmentId||key);if(activeIds.has(aid))continue;if(stale.has(aid)||sessionDate(st)===date)add(aid,{ownerUser:norm(st?.ownerUser),sessionMatched:true})}

    const patch={},t=Date.now(),by=norm(root.currentUserProfile?.username||root.currentRole||'SYSTEM');
    for(const [aid,item] of stale){
      const oldUser=norm(item.user||item.targetUser||item.ownerUser||item.originalUser),fid=flightIdFor(date,item),unit=unitOf(item);
      // Remove every stale mailbox copy, not just the username stored in the old manifest.
      for(const [mailUser,node] of Object.entries(allMail||{})){if(node?.items?.[aid]&&S(node.items[aid]?.opDate)===date){patch[`roster_mail/${safe(mailUser)}/items/${safe(aid)}`]=null;patch[`roster_revocations/${safe(mailUser)}/items/${safe(aid)}`]={assignmentId:aid,reason:'ROSTER_REPLACED_BY_LATEST',atMs:t,by,opDate:date,sourceFile:S(newMan?.fileName)}}}
      if(oldUser)patch[`roster_revocations/${safe(oldUser)}/items/${safe(aid)}`]={assignmentId:aid,reason:'ROSTER_REPLACED_BY_LATEST',atMs:t,by,opDate:date,sourceFile:S(newMan?.fileName)};
      // Preserve envelope/draft and historical completion payload, but revoke ACTIVE authority.
      patch[`roster_sessions/${safe(aid)}/rosterActive`]=false;patch[`roster_sessions/${safe(aid)}/active`]=false;patch[`roster_sessions/${safe(aid)}/rosterStatus`]='ROSTER_REMOVED';patch[`roster_sessions/${safe(aid)}/rosterRemovedAtMs`]=t;patch[`roster_sessions/${safe(aid)}/rosterRemovedBy`]=by;patch[`roster_sessions/${safe(aid)}/rosterRemovedSourceFile`]=S(newMan?.fileName);patch[`roster_sessions/${safe(aid)}/handoverReady`]=false;patch[`roster_sessions/${safe(aid)}/workPartReady`]=false;patch[`roster_sessions/${safe(aid)}/taskAvailabilityV333`]='ROSTER_REMOVED';
      if(fid){patch[`flight_records/${safe(date)}/${safe(fid)}/assignments/${safe(aid)}`]=null;patch[`flight_records/${safe(date)}/${safe(fid)}/taskStatus/${safe(aid)}`]=null;if(oldUser){patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(oldUser)}/${safe(aid)}/status`]='ROSTER_REMOVED';patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(oldUser)}/${safe(aid)}/taskStatus`]='ROSTER_REMOVED';patch[`flight_records/${safe(date)}/${safe(fid)}/taskClaims/${safe(oldUser)}/${safe(aid)}/rosterRemovedAtMs`]=t}const ev=`ROSTER_REPLACE_${t}_${safe(aid)}`;patch[`flight_records/${safe(date)}/${safe(fid)}/assignmentHistory/${safe(ev)}`]={eventId:ev,action:'ROSTER_ASSIGNMENT_REMOVED',assignmentId:aid,removedUser:oldUser,unit,atMs:t,by,sourceFile:S(newMan?.fileName)}}
    }
    // Current assignments are explicitly ACTIVE again if they existed historically.
    for(const [aid,item] of Object.entries(newItems)){if(!item||item.active===false)continue;patch[`roster_sessions/${safe(aid)}/rosterActive`]=true;patch[`roster_sessions/${safe(aid)}/active`]=true;patch[`roster_sessions/${safe(aid)}/rosterStatus`]='ACTIVE';patch[`roster_sessions/${safe(aid)}/rosterRemovedAtMs`]=null;patch[`roster_sessions/${safe(aid)}/rosterRemovedBy`]=null;patch[`roster_sessions/${safe(aid)}/rosterRemovedSourceFile`]=null}
    if(Object.keys(patch).length)await db('').update(patch);

    // Reconcile live unit owners against the newest manifest for every flight, including pre-V3.35 ghosts.
    let claims=0;const p2={};
    for(const [fid,rec] of Object.entries(flights||{})){for(const unit of ['DH','CBTT','PVHK']){const a=rec?.unitAssignments?.[unit],owner=norm(a?.username);if(!owner)continue;const allowed=currentUsersForFlight(newMan,{...rec,flightId:S(rec?.flightId||fid)},unit);if(allowed.includes(owner))continue;const ev=`ROSTER_OWNER_CLEAR_${t}_${safe(unit)}`;p2[`flight_records/${safe(date)}/${safe(fid)}/assignmentHistory/${safe(ev)}`]={eventId:ev,action:'INVALID_ROSTER_CLAIM_REMOVED',unit,removedUser:owner,rosterEligibleUsers:allowed,atMs:t,by:'SYSTEM_V3.35'};p2[`flight_records/${safe(date)}/${safe(fid)}/unitAssignments/${safe(unit)}`]=null;claims++}}
    if(Object.keys(p2).length)await db('').update(p2);
    root.__SAGS_V335_LAST={date,removed:stale.size,claims,repair,atMs:t};return {removed:stale.size,claims};
  }

  async function repairCurrent(date=opDate()){const man=await readManifest(date);if(!man?.publishedAtMs||!man?.items)return {removed:0,claims:0};return cleanup(date,{},man,true)}
  function install(){const fn=root.dailyRosterPublish;if(typeof fn!=='function'||fn.__v335)return false;const wrapped=async function(){const date=opDate(),oldMan=await readManifest(date),r=await fn.apply(this,arguments);if(r===true){const newMan=await readManifest(date),c=await cleanup(date,oldMan,newMan,false);try{root.dailyRosterRestartMailbox?.()}catch(_){}try{await root.sagsTaskStatusSync?.(date,true)}catch(_){}const el=document.getElementById('drStatus');if(el&&c.removed)el.textContent+=`\nRoster mới đã thu hồi ${c.removed} assignment cũ; dữ liệu nghiệp vụ cũ vẫn được giữ.`}return r};wrapped.__v335=1;root.dailyRosterPublish=wrapped;return true}
  install();setTimeout(install,350);setTimeout(install,1200);
  // One safe repair pass makes V3.35 also clean ghosts left by earlier builds without requiring another roster upload.
  setTimeout(()=>repairCurrent(opDate()).then(c=>{if(c.removed||c.claims){try{root.dailyRosterRestartMailbox?.()}catch(_){}try{root.flightWorkspaceRefresh?.()}catch(_){}}}).catch(e=>console.info('V3.35 repair',e?.message||e)),1800);
  root.sagsRosterAuthoritativeRepair=repairCurrent;
  root.__SAGS_V335_BUILD=BUILD;
  root.__SAGS_V335_HDSD='V3.35: Daily Roster mới nhất đã XÁC NHẬN là tập assignment ACTIVE duy nhất. Assignment cũ bị loại khỏi roster_mail, MY FLIGHT, thứ tự nhận chuyến, taskStatus/claim và unitAssignment; roster_sessions chỉ bị thu hồi quyền ACTIVE, giữ nguyên envelope/draft và dữ liệu nghiệp vụ để làm lịch sử. Bản này có một lượt repair an toàn để dọn ghost assignment do các bản cũ để lại.';
})(typeof window!=='undefined'?window:globalThis);
/* ===== END authoritative-roster-sync-v335.js ===== */

/* ===== BEGIN manual-flight-v340.js ===== */
/* E-REPORT/SAGS V3.40 · SELF-SERVICE MANUAL FLIGHT
 * Every operational unit may create its own task when roster data is unavailable.
 * The creator always reuses an existing master Flight Record when either flight number matches.
 */
(function(root){'use strict';
  const phase=(document.currentScript&&document.currentScript.dataset&&document.currentScript.dataset.phase)||'';
  const BUILD='V3.42-20260821-01';
  if(phase!=='control'||root.__SAGS_V340_MANUAL_INSTALLED)return;
  root.__SAGS_V340_MANUAL_INSTALLED=BUILD;
  const S=v=>String(v??'').trim(),U=v=>S(v).toUpperCase(),safe=v=>S(v).replace(/[.#$\[\]\/]/g,'_');
  const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normUser=v=>{try{return typeof root.normalizePersonalUsername==='function'?root.normalizePersonalUsername(v):U(v).replace(/\s+/g,'').replace(/[^A-Z0-9._-]/g,'_').slice(0,40)}catch(_){return U(v)}};
  const plain=v=>U(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D');
  const normFlight=v=>U(v).replace(/[^A-Z0-9]/g,'');
  const hash=v=>{let h=2166136261>>>0;for(const ch of String(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h.toString(36).toUpperCase()};
  const canonicalFormGroup=v=>({FSAGS:'fsags',FSAGS421:'fsags421',FSAGS551:'fsags551',FSAGS09:'fsags09',FINAL:'final',UNIT_TASK:'unit_task'}[U(v)]||'');
  const UNITS={DH:'ĐH · ĐIỀU HÀNH',CBTT:'CBTT · CÂN BẰNG TRỌNG TẢI',PVHK:'PVHK · PHỤC VỤ HÀNH KHÁCH',HLNG:'HLNG · HÀNH LÝ NHÀ GA',CARGO:'KHO HÀNG · CARGO',VSTB:'VSTB · VỆ SINH TÀU BAY',VHTTB:'VHTTB · VẬN HÀNH TRANG THIẾT BỊ',KTTB:'KTTB · KỸ THUẬT THIẾT BỊ',LNF:'LNF · LOST & FOUND'};
  function session(){try{return root.__sagsGetSession?.()||{role:root.currentRole||'',profile:root.currentUserProfile||{}}}catch(_){return {role:root.currentRole||'',profile:root.currentUserProfile||{}}}}
  function profile(){return session().profile||root.currentUserProfile||{}}
  function role(){return U(session().role||profile().role)}
  function me(){return normUser(profile().username||(role()==='AD'?'AD':''))}
  function myName(){const p=profile();return S(p.name||p.fullName||p.displayName||p.username||me())}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function db(path){if(typeof root.sagsV470Ref!=='function')throw new Error('Firebase RTDB chưa sẵn sàng.');return root.sagsV470Ref(path)}
  function unitForProfile(){
    const r=role(),direct={DH:'DH',FPL:'DH',CBTT:'CBTT',PVHK:'PVHK',KH:'CARGO',PVHLNG:'HLNG',PVHLSD:'HLNG',VSTB:'VSTB',VHTTB:'VHTTB',KTTB:'KTTB',LOSTFOUND:'LNF',LNF:'LNF'};
    if(direct[r])return direct[r];if(r==='AD')return '';
    const p=profile(),text=plain([p.role,p.roleCode,p.groupCode,p.departmentCode,p.systemDepartment,p.department,p.group,p.jobTitle].filter(Boolean).join(' '));
    const tests=[['CBTT',/(CBTT|CAN BANG TRONG TAI|LOAD CONTROL)/],['PVHK',/(PVHK|PHUC VU HANH KHACH)/],['HLNG',/(HLNG|PVHLNG|HANH LY NHA GA|PHUC VU HANH LY)/],['CARGO',/(KHO HANG|CARGO)/],['VSTB',/(VSTB|VE SINH TAU BAY)/],['VHTTB',/(VHTTB|VAN HANH TRANG THIET BI)/],['KTTB',/(KTTB|KY THUAT THIET BI)/],['LNF',/(LNF|LOST\s*&?\s*FOUND|LOST AND FOUND)/],['DH',/(^|\s)(DH|DIEU HANH|FPL)(\s|$)/]];
    for(const [k,re] of tests)if(re.test(text))return k;return '';
  }
  function formOptions(unit){
    if(unit==='CBTT')return (role()==='AD'||typeof root.v485Can!=='function'||root.v485Can('FINAL'))?[['final','FINAL / CROSSCHECK']]:[];
    if(unit==='PVHK')return (role()==='AD'||typeof root.v485Can!=='function'||root.v485Can('FSAGS09'))?[['fsags09','F/SAGS-CXR/09']]:[];
    if(unit==='DH'){
      const defs=[['fsags','F/SAGS 42.3','FSAGS423'],['fsags421','F/SAGS 42.1','FSAGS421'],['fsags551','F/SAGS 55.1','FSAGS551']];
      const out=defs.filter(x=>role()==='AD'||typeof root.v485Can!=='function'||root.v485Can(x[2])).map(x=>x.slice(0,2));
      return out;
    }
    return [['unit_task','CÔNG VIỆC ĐƠN VỊ']];
  }
  function itemUnit(item){const direct=U(item?.manualUnit);if(UNITS[direct])return direct;const fg=U(item?.formGroup),rk=U(item?.roleKey),src=U(item?.sourceColumn);if(fg==='FINAL'||rk==='CBTT'||src.includes('GRND_LS'))return 'CBTT';if(fg==='FSAGS09'||rk==='PAX09'||src.includes('PAX_SUPR'))return 'PVHK';if(['FSAGS','FSAGS421','FSAGS551'].includes(fg)||['COR','LD','BOTH'].includes(rk)||src.includes('GRND_COR')||src.includes('GRND_LD'))return 'DH';return ''}
  function timeValue(v){const s=U(v).replace(/\s+/g,'');if(!s)return '';if(!/^(?:[01]?\d|2[0-3]):?[0-5]\d\+?$/.test(s))throw new Error('Giờ phải theo HHMM hoặc HH:MM; có thể thêm dấu + cho ngày kế tiếp.');const plus=s.endsWith('+'),d=s.replace(/\D/g,'').padStart(4,'0');return d+(plus?'+':'')}
  function timeScore(v){const s=S(v),d=s.replace(/\D/g,'');if(d.length!==4)return 99999;return (s.includes('+')?1440:0)+Number(d.slice(0,2))*60+Number(d.slice(2))}
  function storedSort(v,fallback){const raw=S(v),n=raw===''?NaN:Number(raw);return Number.isFinite(n)?n:fallback}
  function manualTimeFields(rec,date){return {eta:S(rec?.eta),etd:S(rec?.etd),arrFlightDate:S(rec?.arrFlightDate||date),depFlightDate:S(rec?.depFlightDate||date),etaFlightDate:S(rec?.etaFlightDate||rec?.arrFlightDate||date),etdFlightDate:S(rec?.etdFlightDate||rec?.depFlightDate||date),staClock:S(rec?.staClock),stdClock:S(rec?.stdClock),etaClock:S(rec?.etaClock),etdClock:S(rec?.etdClock),staDayOffset:storedSort(rec?.staDayOffset,0),stdDayOffset:storedSort(rec?.stdDayOffset,0),etaDayOffset:storedSort(rec?.etaDayOffset,0),etdDayOffset:storedSort(rec?.etdDayOffset,0),staSortMinute:storedSort(rec?.staSortMinute,timeScore(rec?.sta)),stdSortMinute:storedSort(rec?.stdSortMinute,timeScore(rec?.std)),etaSortMinute:storedSort(rec?.etaSortMinute,999999),etdSortMinute:storedSort(rec?.etdSortMinute,999999)}}
  function displayDate(v){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S(v));return m?`${m[3]}/${m[2]}/${m[1]}`:S(v)}
  function startPage(group){group=canonicalFormGroup(group);return group==='fsags421'?6:(group==='fsags551'?9:(group==='fsags09'?11:1))}
  function manualSeed(item,group){group=canonicalFormGroup(group);const date=displayDate(item?.opDate||item?.date),route=U(item?.route).split(/[-–—>/]+/).map(S).filter(Boolean),cxr=route.indexOf('CXR'),r1=S(item?.route1||(cxr>=0?route[cxr-1]:route[0])),r3=S(item?.route3||(cxr>=0?route[cxr+1]:route[route.length-1])),base={date,arr:S(item?.arrFlight),dep:S(item?.depFlight),sta:S(item?.sta),std:S(item?.std),reg:S(item?.acReg),type:S(item?.acType),r1,r3,bay:S(item?.bay)},out={};if(group==='fsags421')Object.assign(out,{f421_date:base.date,f421_fltBefore:base.arr,f421_fltAfter:base.dep,f421_sta:base.sta,f421_std:base.std,f421_regn:base.reg,f421_acType:base.type,f421_route1:base.r1,f421_route3:base.r3,f421_bayBefore:base.bay,f421_bayAfter:base.bay});else if(group==='fsags551')Object.assign(out,{f551_date:base.date,f551_fltBefore:base.arr,f551_fltAfter:base.dep,f551_sta:base.sta,f551_std:base.std,f551_regn:base.reg,f551_acType:base.type,f551_route1:base.r1,f551_route3:base.r3,f551_bay:base.bay});else if(group==='fsags09')Object.assign(out,{f09_date:base.date,f09_fltBefore:base.arr,f09_fltAfter:base.dep,f09_sta:base.sta,f09_std:base.std,f09_regn:base.reg,f09_acType:base.type,f09_route1:base.r1,f09_route3:base.r3,f09_parkingArr:base.bay,f09_parkingDep:base.bay});else Object.assign(out,{date:base.date,fltBefore:base.arr,fltAfter:base.dep,sta:base.sta,std:base.std,regn:base.reg,acType:base.type,route1:base.r1,route2:'CXR',route3:base.r3,bayBefore:base.bay,bayAfter:base.bay});for(const k of Object.keys(out))if(!S(out[k]))delete out[k];return out}
  async function ensureLocalSession(item){const group=canonicalFormGroup(item?.formGroup);if(!group||group==='final'||group==='unit_task')return null;if(typeof root.readFlightSessionList!=='function'||typeof root.writeFlightSessionList!=='function'||typeof root.flightSessionStorageKey!=='function')return null;const aid=S(item?.assignmentId);if(!aid)return null;const list=root.readFlightSessionList()||[];let meta=list.find(x=>S(x?.rosterAssignmentId)===aid)||null,id=S(meta?.id),now=Date.now();if(!id){id='roster-'+hash(aid);if(list.some(x=>S(x?.id)===id&&S(x?.rosterAssignmentId)!==aid))id+='-'+hash(S(item?.flightId)).slice(0,4);meta={id,name:S(item?.flightName||item?.flightRaw||[item?.arrFlight,item?.depFlight].filter(Boolean).join(' / ')||item?.flightId),customName:true,initialGroup:group,arrivalOp:'passenger',departureOp:'passenger',createdAt:now,updatedAt:now,rosterAssignmentId:aid,rosterFlightId:S(item?.flightId),rosterAutoReceived:true,rosterSourceColumn:S(item?.sourceColumn),rosterOpDate:S(item?.opDate),rosterOwner:me(),manualCreatedV340:true};list.push(meta)}else{meta.initialGroup=group;meta.rosterAssignmentId=aid;meta.rosterFlightId=S(item?.flightId||meta.rosterFlightId);meta.rosterAutoReceived=true;meta.rosterSourceColumn=S(item?.sourceColumn);meta.rosterOpDate=S(item?.opDate);meta.rosterOwner=me();meta.manualCreatedV340=true;meta.updatedAt=now}root.writeFlightSessionList(list);let env={};try{env=root.readFlightSessionEnvelope?.(id)||{}}catch(_){env={}}env.state=env.state&&typeof env.state==='object'?env.state:{};const seed=manualSeed(item,group),oldSeed=env.rosterSeed&&typeof env.rosterSeed==='object'?env.rosterSeed:{};for(const [k,v] of Object.entries(seed)){const cur=S(env.state[k]),old=S(oldSeed[k]);if(!cur||cur===old)env.state[k]=v}env.mainForm=group;env.activeFormGroup=group;env.currentPage=startPage(group);env.scrollY=0;env.arrivalOp=S(env.arrivalOp||'passenger');env.departureOp=S(env.departureOp||'passenger');env.rosterSeed=seed;env.rosterAssignmentId=aid;env.rosterFlightId=S(item?.flightId);env.rosterAutoReceived=true;env.rosterReceivedAtMs=Number(env.rosterReceivedAtMs||now);env.manualCreatedV340=true;localStorage.setItem(root.flightSessionStorageKey(id),JSON.stringify(env));return meta}
  function flightTokens(rec){const out=new Set();for(const v of [rec?.arrFlight,rec?.depFlight,rec?.flightRaw,rec?.flightName]){const raw=U(v);for(const m of raw.matchAll(/[A-Z0-9]{2,3}\s*\d{1,5}/g)){const x=normFlight(m[0]);if(x)out.add(x)}}return out}
  function matchesFlight(rec,wanted){const have=flightTokens(rec);return [...wanted].some(x=>have.has(x))}
  function field(id){return S(document.getElementById(id)?.value)}
  function ensureUi(){
    if(document.getElementById('v340ManualFlightModal'))return;
    const st=document.createElement('style');st.id='v340ManualFlightStyle';st.textContent=`
    #v340ManualFlightModal{position:fixed;inset:0;z-index:72050;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.58);padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));box-sizing:border-box;font-family:Arial}#v340ManualFlightModal.show{display:flex}.v340Panel{width:min(96vw,720px);max-height:92dvh;overflow:auto;background:#fff;border-radius:16px;padding:14px;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.38)}.v340Head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v340Head h3{margin:0;color:#174766}.v340Sub{margin-top:5px;color:#5d6e7b;font:700 12px/1.45 Arial}.v340Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}.v340Field{display:flex;flex-direction:column;gap:4px}.v340Field.wide{grid-column:1/-1}.v340Field label{font:900 11px Arial;color:#344f63}.v340Field input,.v340Field select{width:100%;box-sizing:border-box;border:1px solid #c5d2dc;border-radius:9px;padding:10px;background:#fff;font:800 14px Arial;color:#183f5e}.v340Field input:focus,.v340Field select:focus{outline:2px solid #79b6e5;border-color:#0b67b2}.v340Actions{display:flex;gap:8px;justify-content:flex-end;margin-top:13px}.v340Btn{border:0;border-radius:9px;padding:10px 13px;font:900 12px Arial;cursor:pointer;background:#0b67b2;color:#fff}.v340Btn.gray{background:#e9eef3;color:#334b5f}.v340Btn.green{background:#15803d}.v340Btn:disabled{opacity:.5}.v340Note{margin-top:10px;padding:9px;border-radius:9px;background:#eef7ff;color:#315169;font:700 11px/1.45 Arial}.v340CreateFlightBtn{background:#15803d!important;color:#fff!important}@media(max-width:620px){.v340Grid{grid-template-columns:1fr}.v340Field.wide{grid-column:1}.v340Actions{display:grid;grid-template-columns:1fr 1fr}.v340Btn{min-height:42px}}
    `;document.head.appendChild(st);
    const m=document.createElement('div');m.id='v340ManualFlightModal';m.innerHTML=`<div class="v340Panel"><div class="v340Head"><div><h3>＋ TẠO CHUYẾN THỦ CÔNG</h3><div class="v340Sub">Dùng khi dữ liệu roster chưa đổ về. Hệ thống chỉ tạo phần việc của đúng tài khoản/đơn vị và luôn dùng chung Flight Record nếu chuyến đã có.</div></div><button class="v340Btn gray" onclick="sagsV340CloseManualFlight()">ĐÓNG</button></div><div class="v340Grid"><div class="v340Field"><label>NGÀY KHAI THÁC *</label><input id="v340Date" type="date"></div><div class="v340Field"><label>ĐƠN VỊ *</label><select id="v340Unit" onchange="sagsV340ManualUnitChanged()"></select></div><div class="v340Field"><label>FLIGHT ĐẾN</label><input id="v340Arr" autocomplete="off" placeholder="VD: VJ839"></div><div class="v340Field"><label>FLIGHT ĐI</label><input id="v340Dep" autocomplete="off" placeholder="VD: VJ838"></div><div class="v340Field"><label>STA</label><input id="v340Sta" inputmode="numeric" placeholder="HHMM hoặc HHMM+"></div><div class="v340Field"><label>STD</label><input id="v340Std" inputmode="numeric" placeholder="HHMM hoặc HHMM+"></div><div class="v340Field"><label>A/C REG</label><input id="v340Reg" autocomplete="off" placeholder="VD: VN-A123"></div><div class="v340Field"><label>A/C TYPE</label><input id="v340Type" autocomplete="off" placeholder="VD: A321 / A330"></div><div class="v340Field wide"><label>ROUTE</label><input id="v340Route" autocomplete="off" placeholder="VD: HAN-CXR-SGN"></div><div class="v340Field"><label>BAY</label><input id="v340Bay" autocomplete="off"></div><div class="v340Field"><label>NGHIỆP VỤ CỦA TÔI *</label><select id="v340Form"></select></div></div><div class="v340Note">Không tạo bản sao chuyến. Nếu Flight đến hoặc Flight đi đã tồn tại, hệ thống tái sử dụng đúng hồ sơ mẹ; dữ liệu có sẵn không bị ghi đè. Nếu đơn vị đã có người phụ trách khác, phải dùng quy trình bàn giao/đổi người.</div><div class="v340Actions"><button class="v340Btn gray" onclick="sagsV340CloseManualFlight()">HỦY</button><button id="v340CreateBtn" class="v340Btn green" onclick="sagsV340CreateManualFlight()">✓ TẠO CHUYẾN</button></div></div>`;document.body.appendChild(m);
  }
  root.sagsV340ManualUnitChanged=function(){const unit=U(document.getElementById('v340Unit')?.value),sel=document.getElementById('v340Form'),opts=formOptions(unit);if(sel)sel.innerHTML=opts.length?opts.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join(''):'<option value="">CHƯA ĐƯỢC CẤP QUYỀN NGHIỆP VỤ</option>'};
  root.sagsV340OpenManualFlight=function(){
    ensureUi();const mine=unitForProfile();if(role()!=='AD'&&!mine)return alert('Tài khoản chưa xác định được đơn vị từ hồ sơ. AD cần kiểm tra Department/Group/Role trước khi tạo chuyến.');
    const unit=document.getElementById('v340Unit');unit.innerHTML=Object.entries(UNITS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('');unit.value=mine||'DH';unit.disabled=role()!=='AD';root.sagsV340ManualUnitChanged();document.getElementById('v340Date').value=S(document.getElementById('fwcDate')?.value)||S(sessionStorage.getItem('sagsV36FwcDate'))||today();for(const id of ['v340Arr','v340Dep','v340Sta','v340Std','v340Reg','v340Type','v340Route','v340Bay'])document.getElementById(id).value='';document.getElementById('v340ManualFlightModal').classList.add('show');setTimeout(()=>document.getElementById('v340Dep')?.focus(),60);
  };
  root.sagsV340CloseManualFlight=()=>document.getElementById('v340ManualFlightModal')?.classList.remove('show');
  root.sagsV340CreateManualFlight=async function(){
    const btn=document.getElementById('v340CreateBtn');if(btn)btn.disabled=true;
    try{
      const date=field('v340Date'),unit=U(field('v340Unit')),formGroup=canonicalFormGroup(field('v340Form')),arr=normFlight(field('v340Arr')),dep=normFlight(field('v340Dep')),sta=timeValue(field('v340Sta')),std=timeValue(field('v340Std')),acReg=U(field('v340Reg')),acType=U(field('v340Type')),route=U(field('v340Route')),bay=U(field('v340Bay')),user=me();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Chưa chọn ngày khai thác hợp lệ.');if(!UNITS[unit])throw new Error('Chưa xác định đúng đơn vị.');if(role()!=='AD'&&unit!==unitForProfile())throw new Error('Tài khoản chỉ được tự tạo công việc cho đúng đơn vị của mình.');if(!user)throw new Error('Không xác định được tài khoản đang đăng nhập.');if(!arr&&!dep)throw new Error('Cần nhập ít nhất Flight đến hoặc Flight đi.');const validFlight=x=>!x||(/^(?=[A-Z0-9]*[A-Z])[A-Z0-9]{2,3}\d{1,5}$/.test(x));if(!validFlight(arr)||!validFlight(dep))throw new Error('Flight phải gồm mã hãng và số chuyến, ví dụ VJ838 hoặc 9G123.');if(!formOptions(unit).some(x=>x[0]===formGroup))throw new Error('Nghiệp vụ không thuộc quyền/đơn vị của tài khoản.');
      const wanted=new Set([arr,dep].filter(Boolean)),flightRaw=[arr,dep].filter((x,i,a)=>x&&a.indexOf(x)===i).join(' / '),flightName=flightRaw;
      const [fs,ms]=await Promise.all([db(`flight_records/${safe(date)}`).once('value'),db(`roster_manifests/${safe(date)}`).once('value')]),flights=fs.val()||{},man=ms.val()||{};
      const hits=Object.entries(flights).filter(([,rec])=>rec&&matchesFlight(rec,wanted));if(hits.length>1)throw new Error('Flight đến/đi đang thuộc nhiều hồ sơ khác nhau. Hãy mở danh sách chuyến và kiểm tra trước khi tạo.');
      let fid='',rec=null,reusedFlight=false;if(hits.length){fid=S(hits[0][1]?.flightId||hits[0][0]);rec=hits[0][1]||{};reusedFlight=true}else{fid=typeof root.sagsFlightHubFlightId==='function'?S(root.sagsFlightHubFlightId(date,arr,dep,flightRaw)):`FLT_${hash(date+'|'+flightRaw)}`;rec=flights[fid]||{}}
      if(!fid)throw new Error('Không tạo được mã Flight Record.');if(U(rec?.dossier?.status)==='ARCHIVED')throw new Error('Hồ sơ chuyến đã AIRBORNE/LƯU; không thể tạo thêm công việc khai thác.');
      const owner=rec?.unitAssignments?.[unit]||{},ownerUser=normUser(owner.username);if(ownerUser&&ownerUser!==user)throw new Error(`${UNITS[unit]} đã có người phụ trách ${S(owner.name||owner.username)}. Hãy dùng quy trình bàn giao/đổi người.`);
      const activeItems=Object.values(man?.items||{}).filter(x=>x&&x.active!==false),sameUnit=activeItems.filter(x=>(S(x.flightId)||S(root.sagsV346ResolveRosterFlightId?.(date,x,flights)))===fid&&itemUnit(x)===unit),other=sameUnit.find(x=>normUser(x.user||x.targetUser)!==user);if(other)throw new Error(`Chuyến đã được phân ${UNITS[unit]} cho ${normUser(other.user||other.targetUser)}. Không được tạo tay để vượt phân công hiện có.`);
      const existing=sameUnit.find(x=>normUser(x.user||x.targetUser)===user),createdAssignment=!existing,aid=S(existing?.assignmentId)||`MA40_${hash([date,fid,unit,user,formGroup].join('|'))}`;
      const routeParts=route.split(/[^A-Z0-9]+/).filter(Boolean),now=Date.now(),p=profile(),sourceColumn=`MANUAL_${unit}`,roleKey=`MANUAL_${unit}`;
      const itemBase=existing||{assignmentId:aid,user,originalUser:user,targetUser:user,flightId:fid,opDate:date,date:displayDate(date),flightRaw,flightName,arrFlight:arr,depFlight:dep,sta,std,acReg,acType,route,route1:routeParts[0]||'',route3:routeParts[routeParts.length-1]||'',bay,formGroup,sourceColumn,roleKey,workPartOrder:1,workPartTotal:1,workPartSequenceSource:sourceColumn,assignmentScope:'MANUAL_SELF',manualUnit:unit,manualCreatedV340:true,manualCreatedAtMs:now,manualCreatedBy:user,active:true},item={...itemBase,...manualTimeFields(itemBase,date)};
      const payload={...item,formGroup:canonicalFormGroup(item.formGroup)||formGroup,engine:'DAILY_ROSTER_V1',schema:2,targetUser:user,originalTargetUser:user,sourceFile:'MANUAL_V340',publishedAtMs:now,publishedBy:user,manualCreatedV340:true,active:true};
      const patch={},base=`flight_records/${safe(date)}/${safe(fid)}`;
      if(!rec?.flightId){Object.assign(patch,{[`${base}/flightId`]:fid,[`${base}/opDate`]:date,[`${base}/flightRaw`]:flightRaw,[`${base}/flightName`]:flightName,[`${base}/arrFlight`]:arr,[`${base}/depFlight`]:dep,[`${base}/sta`]:sta,[`${base}/std`]:std,[`${base}/eta`]:'',[`${base}/etd`]:'',[`${base}/arrFlightDate`]:date,[`${base}/depFlightDate`]:date,[`${base}/etaFlightDate`]:date,[`${base}/etdFlightDate`]:date,[`${base}/staDayOffset`]:0,[`${base}/stdDayOffset`]:0,[`${base}/etaDayOffset`]:0,[`${base}/etdDayOffset`]:0,[`${base}/staSortMinute`]:timeScore(sta),[`${base}/stdSortMinute`]:timeScore(std),[`${base}/etaSortMinute`]:999999,[`${base}/etdSortMinute`]:999999,[`${base}/acReg`]:acReg,[`${base}/acType`]:acType,[`${base}/route`]:route,[`${base}/bay`]:bay,[`${base}/createdFrom`]:'MANUAL_V340',[`${base}/createdAtMs`]:now})}
      else for(const [k,v] of Object.entries({arrFlight:arr,depFlight:dep,flightRaw,flightName,sta,std,acReg,acType,route,bay}))if(S(v)&&!S(rec?.[k]))patch[`${base}/${k}`]=v;
      patch[`${base}/updatedAtMs`]=now;patch[`${base}/manualActive`]=true;patch[`${base}/rosterActive`]=true;patch[`${base}/rosterStatus`]='ACTIVE';patch[`${base}/unitAssignments/${safe(unit)}`]=ownerUser?owner:{unit,username:user,name:myName(),departmentCode:S(p.departmentCode||p.systemDepartment||p.department),groupCode:S(p.groupCode||p.group),claimedAtMs:now,updatedAtMs:now,status:'ACTIVE',claimSource:'MANUAL_SELF_CREATE',manualCreatedV340:true};
      if(createdAssignment){patch[`roster_manifests/${safe(date)}/items/${safe(aid)}`]=item;patch[`roster_mail/${safe(user)}/items/${safe(aid)}`]=payload;patch[`roster_revocations/${safe(user)}/items/${safe(aid)}`]=null;patch[`roster_sessions/${safe(aid)}`]={engine:'daily-roster-v2',schema:1,assignmentId:aid,ownerUser:user,formGroup,claimStatus:'READY',taskStatusV333:'UNCLAIMED',taskAvailabilityV333:'READY',rosterActive:true,rosterStatus:'ACTIVE',manualCreatedV340:true,active:true,createdAtMs:now,updatedAtMs:now};patch[`${base}/assignments/${safe(aid)}`]={assignmentId:aid,user,originalUser:user,formGroup,sourceColumn,roleKey,assignmentScope:'MANUAL_SELF',workPartOrder:1,workPartTotal:1,workPartSequenceSource:sourceColumn,manualUnit:unit,manualCreatedV340:true,active:true};patch[`${base}/taskStatus/${safe(aid)}`]={schema:1,engine:'TASK_STATUS_V333',assignmentId:aid,flightId:fid,opDate:date,flightName,ownerUser:user,sourceColumn,roleKey,formGroup,assignmentScope:'MANUAL_SELF',workPartOrder:1,workPartTotal:1,status:'UNCLAIMED',statusLabel:'CHƯA NHẬN',availability:'READY',updatedAtMs:now}}
      if(!man?.opDate){patch[`roster_manifests/${safe(date)}/engine`]='daily-roster-v2';patch[`roster_manifests/${safe(date)}/schema`]=2;patch[`roster_manifests/${safe(date)}/opDate`]=date}patch[`roster_manifests/${safe(date)}/manualUpdatedAtMs`]=now;patch[`roster_manifests/${safe(date)}/manualUpdatedBy`]=user;
      const ev=`MANUAL_CREATE_${now}_${safe(aid)}`;patch[`${base}/assignmentHistory/${safe(ev)}`]={eventId:ev,action:createdAssignment?'MANUAL_ASSIGNMENT_CREATED':'MANUAL_ASSIGNMENT_REUSED',assignmentId:aid,unit,user,formGroup,reusedFlight,atMs:now,by:user,build:BUILD};
      await db('').update(patch);try{await ensureLocalSession({...item,...payload})}catch(e){console.info('V3.41 manual local session',e?.message||e)}try{root.dailyRosterRestartMailbox?.()}catch(_){}if(U(item.formGroup)==='FINAL'&&typeof root.sagsV340EnsureFinalForRoster==='function')await root.sagsV340EnsureFinalForRoster({...payload,...item},{open:false});try{await root.sagsTaskStatusSyncDate?.(date,true)}catch(_){}
      root.sagsV340CloseManualFlight();if(document.getElementById('fwcModal')?.classList.contains('show'))await root.flightWorkspaceRefresh?.();alert(`${createdAssignment?'✓ ĐÃ TẠO CÔNG VIỆC THỦ CÔNG':'✓ ĐÃ DÙNG LẠI PHÂN CÔNG HIỆN CÓ'}\n\n${flightName} · ${UNITS[unit]}\n${reusedFlight?'Dùng chung Flight Record đã có.':'Đã tạo một Flight Record mới.'}\nKhông tạo chuyến trùng. Bấm CHUYẾN khi muốn mở danh sách.`);
    }catch(e){alert('Không tạo được chuyến thủ công: '+S(e?.message||e))}finally{if(btn)btn.disabled=false}
  };
  async function repairMyManualAssignments(){
    const user=me();if(!user)return 0;let raw={};try{raw=(await db(`roster_mail/${safe(user)}/items`).once('value')).val()||{}}catch(_){return 0}const patch={};let repaired=0;
    for(const [key,rec0] of Object.entries(raw)){if(!rec0||rec0.manualCreatedV340!==true)continue;const rec={...rec0,assignmentId:S(rec0.assignmentId||key)},group=canonicalFormGroup(rec.formGroup);if(!group)continue;const date=S(rec.opDate),aid=S(rec.assignmentId),timeFixed=manualTimeFields(rec,date),fixed={...rec,...timeFixed,formGroup:group,engine:'DAILY_ROSTER_V1',date:displayDate(rec.date||date)};if(S(rec.engine)!=='DAILY_ROSTER_V1')patch[`roster_mail/${safe(user)}/items/${safe(key)}/engine`]='DAILY_ROSTER_V1';if(S(rec.formGroup)!==group)patch[`roster_mail/${safe(user)}/items/${safe(key)}/formGroup`]=group;for(const [fieldName,value] of Object.entries(timeFixed))patch[`roster_mail/${safe(user)}/items/${safe(key)}/${fieldName}`]=value;if(date&&aid){patch[`roster_manifests/${safe(date)}/items/${safe(aid)}/formGroup`]=group;for(const [fieldName,value] of Object.entries(timeFixed))patch[`roster_manifests/${safe(date)}/items/${safe(aid)}/${fieldName}`]=value;patch[`roster_sessions/${safe(aid)}/formGroup`]=group;if(rec.flightId){patch[`flight_records/${safe(date)}/${safe(rec.flightId)}/assignments/${safe(aid)}/formGroup`]=group;patch[`flight_records/${safe(date)}/${safe(rec.flightId)}/taskStatus/${safe(aid)}/formGroup`]=group;for(const fieldName of ['eta','etd','etaFlightDate','etdFlightDate','etaClock','etdClock','etaDayOffset','etdDayOffset','etaSortMinute','etdSortMinute'])patch[`flight_records/${safe(date)}/${safe(rec.flightId)}/${fieldName}`]=timeFixed[fieldName]}}try{await ensureLocalSession(fixed)}catch(e){console.info('V3.41 repair local session',e?.message||e)}repaired++}
    if(Object.keys(patch).length)try{await db('').update(patch)}catch(e){console.info('V3.41 repair manual mailbox',e?.message||e)}if(repaired)try{root.dailyRosterRestartMailbox?.()}catch(_){}return repaired;
  }
  root.sagsV340EnsureLocalSession=ensureLocalSession;
  root.sagsV341RepairManualAssignments=repairMyManualAssignments;
  function injectButton(){const tools=document.querySelector('#fwcBody .fwcTools');if(!tools||document.getElementById('v340CreateFlightBtn'))return;const can=role()==='AD'||!!unitForProfile();if(!can)return;const b=document.createElement('button');b.id='v340CreateFlightBtn';b.className='fwcBtn v340CreateFlightBtn';b.textContent='＋ TẠO CHUYẾN THỦ CÔNG';b.onclick=()=>root.sagsV340OpenManualFlight();tools.appendChild(b)}
  function install(){ensureUi();const fn=root.flightWorkspaceOpenList;if(typeof fn==='function'&&!fn.__v340){const w=function(){const r=fn.apply(this,arguments);Promise.resolve(r).finally(()=>{setTimeout(injectButton,40);setTimeout(injectButton,420)});return r};w.__v340=true;w.__v340Base=fn;root.flightWorkspaceOpenList=w;try{flightWorkspaceOpenList=w}catch(_){}}setTimeout(injectButton,80)}
  install();setTimeout(install,400);setTimeout(install,1300);setTimeout(()=>repairMyManualAssignments().catch(e=>console.info('V3.41 manual repair',e?.message||e)),500);
  root.__SAGS_V340_MANUAL_TEST__={normFlight,flightTokens,matchesFlight,itemUnit,timeValue,timeScore,unitForProfile,canonicalFormGroup,displayDate,manualSeed,startPage};
  root.__SAGS_V340_HDSD='V3.41: sửa chuyến tạo thủ công không mở được biểu mẫu. Mailbox dùng đúng DAILY_ROSTER_V1, formGroup được chuẩn hóa theo engine biểu mẫu và tờ FSAGS được tạo ngay trên thiết bị. Chuyến thủ công đã tạo ở V3.40 được tự sửa engine/mã biểu mẫu và dựng lại tờ cục bộ, không cần xóa chuyến hoặc tạo lại.';
})(typeof window!=='undefined'?window:globalThis);
/* ===== END manual-flight-v340.js ===== */

/* V3.51 · COMPACT MOBILE TOOLBAR */
(function(root){const phase=document.currentScript?.dataset?.phase||'';if(phase!=='control')return;root.__SAGS_V351_BUILD='V3.51-20260822-01';root.__SAGS_V351_HDSD='V3.51: thanh công cụ điện thoại gom thành một hàng chip nhỏ cuộn ngang. ĐH được khôi phục quyền QUICK_TIME mặc định; RAMP và KẾT SỔ dùng chung nhãn nút NHẬP NHANH. Hồ sơ gửi/nhận vẫn tập trung theo flightId.';})(typeof window!=='undefined'?window:globalThis);

/* V3.53 · DAILY ROSTER UPDATE PATH FIX */
(function(root){const phase=document.currentScript?.dataset?.phase||'';if(phase!=='control')return;root.__SAGS_V353_BUILD='V3.53-20260822-01';root.__SAGS_V353_HDSD='V3.53: sửa lỗi Firebase update chứa đồng thời assignments và assignments/<id>/active. Flight Hub nay ghi từng assignment ở các đường dẫn ngang hàng, giữ nguyên thu hồi assignment cũ và phân công mới.';})(typeof window!=='undefined'?window:globalThis);
