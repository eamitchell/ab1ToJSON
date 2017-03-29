
//Will call bindButtons after the DOM loads
document.addEventListener('DOMContentLoaded', bindButtons);

var counter = 0;
var tagDict = {"baseCalls1":{"tagName":"PBAS", "tagNum":1, "typeToReturn":"getChar"},
    "baseCalls2":{"tagName":"PBAS", "tagNum":2, "typeToReturn":"getChar"},
    "qualNums":{"tagName":"PCON", "tagNum":2, "typeToReturn":"getNumber"},
    "peakLocations":{"tagName":"PLOC", "tagNum":2, "typeToReturn":"getShort"},
    "peakDev":{"tagName":"P1RL", "tagNum":1, "typeToReturn":"getShort"},
    "peakOneAmp":{"tagName":"P1AM", "tagNum":1, "typeToReturn":"getShort"},
    "colorDataA":{"tagName":"DATA", "tagNum":10, "typeToReturn":"getShort"},
    "colorDataT":{"tagName":"DATA", "tagNum":11, "typeToReturn":"getShort"},
    "colorDataG":{"tagName":"DATA", "tagNum":9, "typeToReturn":"getShort"},
    "colorDataC":{"tagName":"DATA", "tagNum":12, "typeToReturn":"getShort"}
    };

function bindButtons(){
    document.getElementById('fileName').addEventListener('change', function subBind(event){

        var fileName = document.getElementById("fileName").value;
        //Regex to remove the pathname and just keep filename
        fileName = fileName.replace(/.*[\/\\]/, '');
        document.getElementById("selectedFile").value = fileName;
        //Regex to remove file extension
        fileName = fileName.replace(/\.[^/.]+$/, '');
        document.getElementById("newFileName").value = fileName;
        document.getElementById("seqID").value = fileName;
        var oFiles = document.getElementById("fileName").files;
        var oneFile = oFiles[0];
        
        var fileObj = new FileReader();
        var output = "";
        fileObj.onload = function (e){
            var contents = e.target.result;
            var dataview = new DataView(contents);
            var converter = new abConverter(dataview);
            var painter = new drawTrace(converter.getTraceData());
            
            document.getElementById("fileType").innerHTML = converter.getFileID();
            document.getElementById("fileVersion").innerHTML = converter.getFileVersion();
            

            painter.paintCanvas();
            var header = fileName;
            var baseCalls = converter.getDataTag(tagDict.baseCalls2);
            var qualScores = converter.getDataTag(tagDict.qualNums);
            mottTrim(baseCalls, qualScores);
            var basesString = "";
            var scoreString = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
            var convertedScores = "";
            for (var baseCounter = 0; baseCounter < baseCalls.length; baseCounter++) {
                if (baseCounter != 0 && baseCounter % 80 === 0) {
                    basesString += "\r\n";
                    basesString += baseCalls[baseCounter];
                }
                else {
                    basesString += baseCalls[baseCounter];
                }
                
                convertedScores += scoreString.charAt(qualScores[baseCounter]);
            }
            var fasta = ">" + header + "\r\n" + basesString; 
            var fastq = "@" + header + "\r\n" + basesString + "\r\n" + "+" + "\r\n" + convertedScores;
            document.getElementById("bases").textContent = basesString;

            var fastaDownload = document.getElementById('downloadFASTA');
            fastaDownload.onclick = function () {
                header = document.getElementById("seqID").value;
                fasta = ">" + header + "\r\n" + basesString; 
                fastaDownload.href = window.URL.createObjectURL(new Blob([fasta], {type: 'text/plain'}));
                fastaDownload.download = document.getElementById("newFileName").value + '.fasta';
            }
            
            var fastqDownload = document.getElementById('downloadFASTQ');
            fastqDownload.onclick = function () {
                header = document.getElementById("seqID").value;
                fastq = "@" + header + "\r\n" + basesString + "\r\n" + "+" + "\r\n" + convertedScores;
                fastqDownload.href = window.URL.createObjectURL(new Blob([fastq], {type: 'text/plain'}));
                fastqDownload.download = document.getElementById("newFileName").value + '.fastq';
            }

        }
        fileObj.readAsArrayBuffer(oneFile);

        event.preventDefault();
    })
};

function abConverter(inputArrayBuffer) {
    var dirLocation = inputArrayBuffer.getInt32(26);
    var numElements = inputArrayBuffer.getInt32(18);
    var lastEntry = dirLocation + (numElements * 28);
    
    this.getFileID = function() {
        var output = "";
        for (var offset = 0; offset < 4; offset++) {
            output += String.fromCharCode(inputArrayBuffer.getInt8(offset));
        }
        return output;
    }
    
    this.getFileVersion = function () {
        return inputArrayBuffer.getInt16(4);
    }
    
    this.getDirectoryStruct = function () {
        var br = "<br>";
        var indent = "  ";
        var output = br;
        var name = "";
        for (var offset = 6; offset < 10; offset++) {
            name += String.fromCharCode(inputArrayBuffer.getInt8(offset));
        }
        output += ("- tag name: " + name + br);
        output += ("- tag number: " + inputArrayBuffer.getInt32(10) + br);
        output += ("- element type: " + inputArrayBuffer.getInt16(14) + br);
        output += ("- element size: " + inputArrayBuffer.getInt16(16) + br);
        output += ("- num elements: " + inputArrayBuffer.getInt32(18) + br);
        output += ("- data size: " + inputArrayBuffer.getInt32(22) + br);
        output += ("- data offset: " + inputArrayBuffer.getInt32(26) + br);
        return output;
    }
    
    this.getNumber = function (inOffset, numEntries) {
        var retArray = [];
        for (var counter = 0; counter < numEntries; counter += 1) {
            retArray.push(inputArrayBuffer.getInt8(inOffset + counter));
        }
        return retArray;
    }.bind(this);

    this.getChar = function (inOffset, numEntries) {
        var retArray = [];
        for (var counter = 0; counter < numEntries; counter += 1) {
            retArray.push(String.fromCharCode(inputArrayBuffer.getInt8(inOffset + counter)));
        }
        return retArray;
    }.bind(this);

    this.getShort = function (inOffset, numEntries) { 
        var retArray = [];
        for (var counter = 0; counter < numEntries; counter += 2) {
            retArray.push(inputArrayBuffer.getInt16(inOffset + counter));
        }
        return retArray;

    }.bind(this);

    this.getByte = function (inOffset, counter) {
        return inputArrayBuffer.getUint8(inOffset + counter);
    }.bind(this);

    this.getWord = function (inOffset, numEntries) {
        var retVal = "";
        for (var counter = 0; counter < numEntries; counter += 2) {
            retVal += inputArrayBuffer.getUint16(inOffset + counter);
        }
        return retVal;

    }.bind(this);

    this.getLong = function (inOffset, counter) {
        return inputArrayBuffer.getInt32(inOffset);
    }.bind(this);

    this.getFloat = function (inOffset, counter) {
        return inputArrayBuffer.getFloat32(inOffset);
    }.bind(this);

    this.getDouble = function (inOffset, counter) {
        return inputArrayBuffer.getFloat64(inOffset);
    }.bind(this);

    this.getDate = function (inOffset, counter) {
        var date = "";
        date += inputArrayBuffer.getInt16(inOffset);
        date += inputArrayBuffer.getUint8(inOffset + 2);
        date += inputArrayBuffer.getUint8(inOffset + 3);
        return date;
    }.bind(this);

    this.getTime = function (inOffset, counter) {
        var time = "";
        time += inputArrayBuffer.getUint8(inOffset);
        time += inputArrayBuffer.getUint8(inOffset + 1);
        time += inputArrayBuffer.getUint8(inOffset + 2);
        time += inputArrayBuffer.getUint8(inOffset + 3);
        return time;
    }.bind(this);

    this.getPString = function (inOffset, counter) {
        var outString = "";
        for (var count = 1; count < inputArrayBuffer.getInt8(inOffset); count++) {
            outString += inputArrayBuffer.getInt8(inOffset + count);    
        }
    }.bind(this);

    this.getCString = function (inOffset, counter) {
        var outString = "";
        var offset = inOffset;
        var currentByte = inputArrayBuffer.getInt8(offset);
        while (currentByte != 0) {
            outString += String.fromCharCode(currentByte);
            offset++;
            currentByte = inputArrayBuffer.getInt8(offset);
        }
        return outString;
    }.bind(this);

    this.getTagName = function (inOffset) {
        var name = "";
        for (var loopOffset = inOffset; loopOffset < inOffset + 4; loopOffset++) {
            name += String.fromCharCode(inputArrayBuffer.getInt8(loopOffset));
        }
        return name;
    }.bind(this);

    this.getDataTag = function (inTag) {
        var output;
        var curElem = dirLocation;
        do {
            var currTagName = this.getTagName(curElem); 
            var tagNum = inputArrayBuffer.getInt32(curElem + 4);
            if (currTagName == inTag.tagName && tagNum === inTag.tagNum) {
                var numEntries = inputArrayBuffer.getInt32(curElem + 16);
                var entryOffset = inputArrayBuffer.getInt32(curElem + 20);
                output = this[inTag.typeToReturn](entryOffset, numEntries);
            }
            curElem += 28;
        } while (curElem < lastEntry);
        return output;
    }
    
    this.getTraceData = function () {
        var traceData = {};
        traceData.aTrace = this.getDataTag(tagDict.colorDataA);
        traceData.tTrace = this.getDataTag(tagDict.colorDataT);
        traceData.gTrace = this.getDataTag(tagDict.colorDataG);
        traceData.cTrace = this.getDataTag(tagDict.colorDataC);
        traceData.basePos = this.getDataTag(tagDict.peakLocations);
        traceData.baseCalls = this.getDataTag(tagDict.baseCalls2);
        traceData.qualNums = this.getDataTag(tagDict.qualNums);

        return traceData;
    }

    this.getFirstEntry = function () {

        var output = "";
        for (var curElem = dirLocation; curElem < lastEntry; curElem += 28) {
            var name = "";
            for (var offset = curElem; offset < curElem + 4; offset++) {
                name += String.fromCharCode(inputArrayBuffer.getInt8(offset));
            }
            output += (" - " + name);
        }
        return output;
    }
}

function drawTrace (traceData) {
    console.log("in draw trace");
    var colors = {adenine:"green", thymine:"red", guanine:"black", cytosine:"blue", other:"pink"};
    var peakCanvas = document.getElementById("peakCanvas");
    var ctx = peakCanvas.getContext("2d");
    
    var formattedPeaks = {a:[], t:[], g:[], c:[]};
    var bottomBuffer = 50;
    var baseBuffer = 35;
    var maxHeight = peakCanvas.height;
    var maxWidth = traceData.basePos[traceData.basePos.length - 1];
    peakCanvas.width = maxWidth;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, maxWidth, peakCanvas.height);
    var scaledHeight = maxHeight - bottomBuffer;
    var scalePct = 0;

    this.findTallest = function () {
        var aMax = Math.max(...traceData.aTrace);
        var tMax = Math.max(...traceData.tTrace);
        var gMax = Math.max(...traceData.gTrace);
        var cMax = Math.max(...traceData.cTrace);
        scalePct = scaledHeight / Math.max(aMax, tMax, gMax, cMax);
    }

    this.scalePeaks = function (traceIn) {
        var newPeaks = [];
        for (var count = 0; count < traceIn.length; count++) {
            newPeaks[count] = scalePct * traceIn[count]; 
        }
        return newPeaks;
    }

    this.preparePeaks = function () {
        this.findTallest();
        formattedPeaks.a = this.scalePeaks(traceData.aTrace);
        formattedPeaks.t = this.scalePeaks(traceData.tTrace);
        formattedPeaks.g = this.scalePeaks(traceData.gTrace);
        formattedPeaks.c = this.scalePeaks(traceData.cTrace);
    }

    this.drawPeaks = function(trace, lineColor) {
        ctx.beginPath();
        ctx.moveTo(0, scaledHeight - trace[0])
        for (var counter = 1; counter < trace.length; counter++) {
            ctx.lineTo(counter, scaledHeight - trace[counter]);
            ctx.moveTo(counter, scaledHeight - trace[counter]);
        }
        ctx.strokeStyle = lineColor;
        ctx.stroke();
    }

    this.drawBases = function () {
        console.log("in drawbases");
        //ctx.font = "24px serif";
        var xOffset = -2;
        for (var count = 0; count < traceData.baseCalls.length; count++) {
            var baseCall = traceData.baseCalls[count];
            switch(baseCall) {
                case "A":
                    ctx.fillStyle = colors.adenine;
                    break;
                case "T":
                    ctx.fillStyle = colors.thymine;
                    break;
                case "G":
                    ctx.fillStyle = colors.guanine;
                    break;
                case "C":
                    ctx.fillStyle = colors.cytosine;
                    break;
                default:
                    ctx.fillStyle = colors.other;
            }
            ctx.fillText(baseCall, traceData.basePos[count] + xOffset, maxHeight - baseBuffer);
        }
    }

    this.paintCanvas = function () {
        this.preparePeaks();
        this.drawPeaks(formattedPeaks.a, colors.adenine);
        this.drawPeaks(formattedPeaks.t, colors.thymine);
        this.drawPeaks(formattedPeaks.g, colors.guanine);
        this.drawPeaks(formattedPeaks.c, colors.cytosine);
        this.drawBases();
    }
}

function mottTrim(baseCalls, qualScores) {
    
    console.log(qualScores);
    var startPos = 0;
    var endPos = 0;
    var tempStart = 0;
    var tempEnd;
    var score = 0;
    var cutoff = 0.01;
    for (var count = 0; count < qualScores.length; count++) {
        //console.log(Math.pow(10,(qualScores[count])/-10));
        score = score + cutoff - Math.pow(10,(qualScores[count])/-10);
        //console.log(score);
        if (score < 0) {
            tempStart = count;
        }
        if (count - tempStart > endPos - startPos) {
            startPos = tempStart;
            endPos = count;
        }
        //console.log(startPos);
    }
    var trimmed = baseCalls.slice(startPos, endPos + 1);
    console.log(trimmed);
}