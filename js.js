// Requires:
// - WebAudio
// - Chart.js
// - d3

// Version
console.log("v 1.2");

// get audiocontext (WebAudio)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// dsp modules
const gainNode = audioCtx.createGain();

// audio sources
var instrumentPaths = [
	// ["audio/Aestethics_3.mp3", "audio/mpeg"],
	['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Piano_Original_1.wav'], 
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Piano_TD10_Original_1.wav'], 
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Piano_TD5_Original_1.wav'], 
	['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Snare_Original_1.wav'], 
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Snare_td10_Original_1.wav'], 
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Snare_td5_Original_1.wav'], 
	['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/woodblock_Original_1.wav'], 
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/woodblock_td10_Original_1.wav'], 
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/woodblock_td5_Original_1.wav']
];
var ambiencePaths = [
	//["https://hgroenenboom.github.io/hku-hearing-test/audio/aestethics_3.mp3", "audio/wav", "audio/mpeg"], 
	//["https://hgroenenboom.github.io/hku-hearing-test/audio/aestethics_3_h.mp3", "audio/mp3"],
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Backgrounds/162765__dorhel__symphony-orchestra-tuning-before-concert.wav'], 
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Backgrounds/214993__4team__ambient-sound-inside-cafe-dining.wav'], 
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Backgrounds/191350__malupeeters__traffic-mel-1.wav'], 
    ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Backgrounds/orchestra.wav'], 
	['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Backgrounds/party.wav'], 
	['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Backgrounds/traffic.wav'], 
	// ['https://hgroenenboom.github.io/HKU-Hearing-test/audio/samples/Backgrounds/387548__mikikroom__city-milano-traffic-whistle-moto.wav']
];
var buffers = [];

// for debugging: only generates one audio settings
//instrumentPaths = [instrumentPaths[0]];
//ambiencePaths = [ambiencePaths[0]];
//ambiencePaths = [];

// variables used for saving all results
var numResults = 0;
var activeButtonNum = null; // currently active likert button
var results = []; 
var chosenAudio = 0;

var instrument = new Sound(0);
var ambience = new Sound(1);
var calibBuffer = null;
var calibrationAudio = null;
var isAllAudioLoaded = false;
var state = 0;
var pages = ["startscreen", "calibration", "likert", "results"];

// actual values used inside the test
// the amount of values is a multiplication of the number of samples and the amount of random number generated
var maxFrequency = 60;
var startFrequency = 15;
var randomGrabber = [];
for(var i = 0; i < 10; i++) {
	var freq = startFrequency+(maxFrequency-startFrequency)/9*i;
	for(var j = 0; j < instrumentPaths.length; j++) {
		randomGrabber.push([freq, j]); 
	}
}
randomGrabber = d3.shuffle(randomGrabber);


/*--------------------------------------------------------------------------------------------*/
/*--------------------------------------------------------------------------------------------*/

// handle all keyboard input (a bit chaotic still)
var keys = {};
window.onkeyup = function(e) { keys[e.keyCode] = false; }
function handleInput(e) {
    console.log(e.keyCode);
    keys[e.keyCode] = true;
    if(e.keyCode == 32 || true || e == "mouseclick") {
        if(pages[state] == 'startscreen') {
            stateSwitch(e);
        }
    }
    if( ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 96 && e.keyCode <= 105) ) && pages[state] == 'likert') {
        console.log("likert pressed");
        var key =  e.keyCode % 48;
        
        if(key > 0 && key <= 5) {
            var likertButtons = jQuery("#likertbuttons button");
            likertButtons[key-1].click();
        }
    }
    // enter
    if(e.keyCode == 13) {
        if(jQuery("#likert")[0].classList.contains("visible")) {
            nextTest();
        }
    }
    // overload stateswitch with 'a'
    if(e.keyCode == 65) {
        stateSwitch("lol");
    }
}
window.onkeydown = handleInput;

$(window).resize( function(){
  if(state == 3) {
    drawGraph(results);
  }
});

$(window).mousedown( function(){
    mouseClicked();
})

// switch between document states of the test (hoe werkt dit bij andere websites?)
function stateSwitch(e) {
	var divs = document.getElementsByTagName('div');
	
    console.log("stateSwitch: " + pages[state]);
	//console.log(document.getElementById("startscreen").classList.contains("visible"));
    if(state!= pages.length && isAllAudioLoaded) {
        if(document.getElementById(pages[state]).classList.contains("visible")) {
            $("#"+pages[state]).addClass('invisible').removeClass("visible");
            $("#"+pages[state+1]).addClass('visible').removeClass("invisible");
            switch(pages[state]) {
                case "calibration":
                    calibrationAudio.togglePlayback(document.getElementById("calib_button"), 1);
                    nextTest(true);
                    break;
                case "likert":
                    drawTable();
                    instrument.togglePlayback(buffers, 1);
                    ambience.togglePlayback(buffers, 1);
                    break;
                case "startscreen":
                    calibrationAudio.togglePlayback(document.getElementById("calib_button"), 2);
                    break;
            }
            state++;
        }
	}
    console.log("newstate: "+pages[state]); 
}

function mouseClicked() {
    handleInput("mouseclick");
}

likertList = ["Not at all", "Slightly", "Moderately", "Very", "Extremely"];
$(document).ready(function(){
	jQuery("#startscreen_dynamicText")[0].innerHTML = "please wait till all audio has been loaded";
	
	var buttons = document.getElementsByTagName('button');
	for(var i = 0; i < buttons.length; i++) {
        if(buttons[i].classList.contains("buttonOn") || buttons[i].classList.contains("buttonOff")) {
			var id = ""+buttons[i].id
			if(id.substring(0, 7) == "likert") {
				buttons[i].innerHTML = likertList[buttons[i][8]*1];
			}
		}
	}
	
	// get all soundbuffers as soon as the document is loaded (why?)
	var allPaths = instrumentPaths.concat(ambiencePaths);
    paths = allPaths.push(["https://hgroenenboom.github.io/HKU-Hearing-test/audio/calibrationFile.ogg"]);
	buffers = getSoundBuffers(allPaths, true);
});

// starts after all sounds are loaded
function documentReadyPart2() {
    calibBuffer = buffers[buffers.length-1];
    buffers.pop();
    console.log([calibBuffer]);
    console.log(buffers);
    
	jQuery("#startscreen_dynamicText")[0].innerHTML = "Press any button or tap/click screen to continue";
    jQuery("#startscreen_dynamicText")[0].style.color = "Blue";
	
	// initiate audio elements
    audioElement = document.querySelector("audio");
	const track = audioCtx.createMediaElementSource(audioElement);
	const volumeControl = document.querySelector('[data-action="volume"]');
	volumeControl.addEventListener('input', function() {
		gainNode.gain.value = this.value;
	}, false);
	track.connect(gainNode).connect(audioCtx.destination);
	
    calibrationAudio = new SimpleSound(calibBuffer);
	// start audio - necessary?
	audioCtx.resume();
}

// functions returns audioBuffers (WebAudio) by getting html's to audio files.
function getSoundBuffers(soundPaths, shouldWaitTillDone = false) {
	let localBuf = [];
    let loadingProcessIdentifiers = [];
    let loadingProcess = 0;
	let isDone = [];
    
	for(var i = 0; i < soundPaths.length; i++) {
		isDone.push(false);
        loadingProcessIdentifiers[i] = soundPaths[i][0];
		
		let request = new XMLHttpRequest();
		request.open('GET', soundPaths[i][0], true);
		request.responseType = 'arraybuffer';
		
		let showProcess = function (e) {	
			// console.log("inside showprocess with e.loaded: "+e.loaded / e.total * 100 / (instrumentPaths.length*2));
			//console.log("original url = "+e.srcElement.responseURL);
			let n = loadingProcessIdentifiers.indexOf(e.srcElement.responseURL);
			//console.log("n = "+n);
			
			let text = "audioLoadingProcess";
			if( document.getElementById(text) == null ) {
				$( "<div id='"+text+"' class='centered bottomhalf'></div> " ).appendTo( jQuery("#startscreen_dynamicText") );
			} 
			
			let val = e.loaded / e.total * 100 / (instrumentPaths.length*2);
			if(val != NaN) {loadingProcess[n] = val;} else {loadingProcess[n] = 0;}
			// console.log("inside showprocess with loadingprocess: " + loadingProcess);
			
			let total = 0
			for(var j = 0; j < loadingProcess.length; j++) {
				total += loadingProcess[j];
			}
			document.getElementById(text).innerHTML = "loading: "+total+"%";
		}
		
        if(shouldWaitTillDone) {
            request.addEventListener("load", function (e){ console.log("\trequest-load");showProcess(e); });
		}
        request.addEventListener("error", function (e) {console.log("\trequest-error");});
		request.addEventListener("abort", function (e) {console.log("\trequest-abort");});
		request.addEventListener("progress", showProcess);
		
		request.onload = function() {
			let n = loadingProcessIdentifiers.indexOf(this.responseURL);
            console.groupCollapsed(this.responseURL);
			console.log("onload:------------------")
            console.log(loadingProcessIdentifiers);
            console.log("\tURL: "+this.responseURL);
			console.log("\tn = "+n);
			let audioData = this.response;
			audioCtx.decodeAudioData(audioData, function(buffer) {
				localBuf[n] = buffer;
                console.log(localBuf[n]);
                
                if(shouldWaitTillDone) {
                console.log(isDone);
                // check if all buffers are loaded
                isDone[n] = true;
                let allIsDone = true;
                for(var a = 0; a < isDone.length; a++) {
                    if(isDone[a] != true) { allIsDone = false; break; }
                }
                if(allIsDone ) { 
                    console.log("allisloaded");
                    let text = "audioLoadingProcess";
                    document.getElementById(text).innerHTML = "";
                    isAllAudioLoaded = true;
                    documentReadyPart2(); 
                };
            }
			}, function(e){
				console.log("\taudiodata: "+audioData);
				console.log("\tError with decoding audio data" + e.error);
				console.log("\terror url = "+loadingProcessIdentifiers[n]); 
            });
			
            console.groupEnd();
		}
		request.send();
	}
	
	console.log("loadingProcessIdentifiers: ");
	console.log(loadingProcessIdentifiers);
    console.log("soundPaths: ");
	console.log(soundPaths);
	return localBuf;
}

function likertButtonClicked(e, buttonnum) {
	if ( e.classList.contains("buttonOn")) {
		resetAllToggleableButtons();
		e.classList.add("buttonOff");
		e.classList.remove("buttonOn");
	} else {
        activeButtonNum = buttonnum;
		resetAllToggleableButtons();
		e.classList.add("buttonOn");
		e.classList.remove("buttonOff");
		//document.getElementById("next_file_button").disabled = '';
		nextTest();
	}
}

function resetAllToggleableButtons() {
	var buttons = document.getElementsByTagName('button');
	for(var i = 0; i < buttons.length; i++) {
        if(buttons[i].classList.contains("buttonOn")) {
			buttons[i].classList.add("buttonOff");
			buttons[i].classList.remove("buttonOn");
        }
	}
	//document.getElementById("next_file_button").disabled = "disabled";
}

// generate next test data
var counter = 0; // counts through the randomGrabber
function nextTest(override = false) {
	// override toggle can make sure a new sound file is generated even if no rating is selected yet.
	var buttons = document.getElementsByTagName('button');
	var isAButtonToggled = false;
    var activeButton = -1;
	for(var i = 0; i < buttons.length; i++) {
		if(buttons[i].id.includes("likert")) {
			if(buttons[i].classList.contains("buttonOn")) {
				isAButtonToggled = true;
			}
		}
	}
	if(isAButtonToggled) {
        results.push([activeButtonNum, instrument.frequency, instrument.selectedAudio]);
        numResults++;
		resetAllToggleableButtons();
	}
	if(isAButtonToggled || override) {
		// random audio and soundfile
		instrument.frequency = randomGrabber[counter][0];
		chosenAudio = randomGrabber[counter][1];
		instrument.selectedAudio = chosenAudio;
		ambience.selectedAudio = chosenAudio;
		
		counter++; counter %= randomGrabber.length;
		instrument.play(buffers);
		ambience.play(buffers);
		console.log(""+instrument.frequency+ " - " +chosenAudio);
	}
    jQuery("#testTitle")[0].innerHTML = "Hearing test ("+numResults+"/"+randomGrabber.length+")";
	
	if(results.length >= randomGrabber.length) {
		stateSwitch("show results");
	}
}

function Sound(whichPartOfBuffer) { 
	this.part = whichPartOfBuffer;
	this.source = null;   
	this.isplaying = false;
	this.frequency = null;
	this.selectedAudio = 0;
	
    this.togglePlayback = function(buffers, mode=3, shouldLoop=false) {
        // mode 1 = stop, mode 2 = start, mode 3 = toggle
        var e = jQuery("#likert_audio_control")[0];
		
        //if(mode == 0) { e.currentTime=0; }
        if(mode==2) {
            this.play(buffers, shouldLoop);
            jQuery("#play_sound_button")[0].innerHTML = "Stop sound";
        } else if (mode==1) {
            this.stop(shouldLoop);
            jQuery("#play_sound_button")[0].innerHTML = "Start sound";
        } else if (mode==3) {
			if(this.isplaying) {
				this.stop(shouldLoop);
				jQuery("#play_sound_button")[0].innerHTML = "Start sound";
			} else {
				this.play(buffers, shouldLoop);
				jQuery("#play_sound_button")[0].innerHTML = "Stop sound";
			}
		}
    }
	
	this.play = function(buffers, shouldLoop=true) {
		if(this.source) {this.source.stop();}
		this.source = audioCtx.createBufferSource();
		console.log(this.selectedAudio + this.part*buffers.length*0.5);
		this.source.buffer = buffers[this.selectedAudio + this.part*buffers.length*0.5];
		// console.log(buffers);
		this.source.loop = shouldLoop; 
		if(this.frequency != null) {
			this.source.loopEnd = 1 / this.frequency;
		}
		this.source.connect(gainNode).connect(audioCtx.destination);
		this.source.start();
		this.isplaying = true;
	}
	
	this.stop = function() {
		this.source.stop();
		this.isplaying = false;
	}
}

function SimpleSound(bufferToPlay, sl = true) {
    console.groupCollapsed("SimpleSound created:");
	this.buf = bufferToPlay;
    console.log(this.buf);
	this.src = null;   
	this.isNowPlaying = false;
    this.shouldLoop = sl;
    console.groupEnd();
	
    this.togglePlayback = function(e, mode=3) {
        // mode 1 = stop, mode 2 = start, mode 3 = toggle
        console.log(e);
        console.log(mode);
        
        if(mode==2) {
            this.play();
            e.innerHTML = "Stop sound";
        } else if (mode==1) {
            this.stop();
            e.innerHTML = "Start sound";
        } else if (mode==3) {
			if(this.isNowPlaying) {
				this.stop();
				e.innerHTML = "Start sound";
			} else {
				this.play();
				e.innerHTML = "Stop sound";
			}
		}
    }
	
	this.play = function() {
		if(this.src != null) {this.src.stop();}
		this.src = audioCtx.createBufferSource();
        console.log(this.src);
        console.log(this.buf);
        
        this.src.buffer = this.buf;
		this.src.loop = this.shouldLoop; 
        this.src.endLoop = this.buf.duration;
		this.src.connect(gainNode).connect(audioCtx.destination);
		this.src.start();
		this.isNowPlaying = true;
	}
	
	this.stop = function() {
		this.src.stop();
		this.isNowPlaying = false;
        console.log("isNowPlaying: "+ this.isNowPlaying);
	}
}

function drawTable() {

    data = "All data: ["
    for (var i = 0; i < results.length; i++) {
        // data += "("+i+") ";
        data += ("["+results[i][1]).substring(0,4)+", ";
        data += "\""+likertList[results[i][0]] + "\", ";
		data += ""+results[i][2]+"], ";
    }
    data += "]"
    
    //console.log(data);
    jQuery("#how_to_change_text_in_html")[0].innerHTML = data;
    
    /////////////////////////////////////////////////////////

    dataForGraph = [];
    for(var v = 0; v < likertList.length; v++) {
        count = 0;
        addedFrequencies = 0;
        for(var i = 0; i < results.length; i++) {
            if(results[i][0] == v) {
                addedFrequencies += results[i][1];
                count++;
            }
        }
        if(count != 0) {
            dataForGraph.push(addedFrequencies/count);
        } else {
            dataForGraph.push(0);
        }
    }
	
	/////////////////////////////////////////////////
    
    var body = document.getElementById("results_table");
    var tbl = document.createElement("table");
    var tblBody = document.createElement("tbody");

    for (var i = 0; i < likertList.length; i++) {
        var row = document.createElement("tr");

        var cell = document.createElement("td");
        var cellText = document.createTextNode((""+dataForGraph[i]).substring(0,4)+"Hz");
        cell.appendChild(cellText);
        row.appendChild(cell);
        
        var cell = document.createElement("td");
        var cellText = document.createTextNode(likertList[i]);
        cell.appendChild(cellText);
        row.appendChild(cell);
		
        tblBody.appendChild(row);
    }

    tbl.appendChild(tblBody);
    body.appendChild(tbl);
    tbl.setAttribute("border", "2");
	
	
    drawGraph(results);
}

// TODO:
// create data elements outside of drawGraph, make drawGraphs argument MDArray. (example: [[data], [data2], [data3]])
// use forloop to iterate through data and to show in graph. 
//      All this will make sure this drawGraph object is able to draw multiple graphs.
//      It will probably also need params like: dataLabels, dataColours='def', x_axis_label='x', y_axis_label='x', fontsize=20, title='graph', xRange='def' [0,4], yRange='def'[0,4], xTickscallback='def', yTickscallback='def', xsteps='def', ysteps='def'
// for this example it would be:
//      drawGraph([[datPia],[datSna],[datWoo],[allData]], ["Piano","Snare","Woodblock","Average"], ['#8789ff','#c1f9ff','#ffc1c1','#000000'], 'Playback frequency', 'Distinguishability', 20, 'Distinguishability of individual notes with different playback frequencies', 'def', [0,4], function(value, index, values) {return value+"Hz";}, function(value, index, values) {return likertList[Math.floor(value)];}, 'def', 1);
function drawGraph(dat) {
	// dat[0] = rating, dat[1] = freq, dat[2] = instrument
	var accuracy = 4;
	//console.log(dat);
	datPia = [];
	datSna = [];
	datWoo = [];
	allData = [];
	
	// dat[0] = freq, dat[1] = rating
	for(var i = 0; i < dat.length; i++) {
		var dataP = [dat[i][1], dat[i][0]];
		switch (dat[i][2]) {
			case 0:
				datPia.push(dataP);
				break;
			case 1:
				datSna.push(dataP);
				break;
			case 2:
				datWoo.push(dataP);
				break;
		}
		allData.push(dataP);
	}
	
	var getAveraged = function(data) {
		var freqRange = maxFrequency-startFrequency;
		var freqIncr = freqRange / accuracy;
		newData = [];
		for(var v = 0; v < accuracy; v++) {
			var freq = startFrequency+0.5*freqIncr*(v+1);
			count = 0;
			addedResults = 0;
			for(var i = 0; i < data.length; i++) {
				if(data[i][0] >= freq && data[i][0] < freq+freqIncr) {
					addedResults += data[i][1];
					count++;
				}
			}
			console.log(addedResults);
			newData.push(addedResults/count);
		}
		return newData;
	}
	
	allData = getAveraged(allData);
	datPia = getAveraged(datPia);
	datSna = getAveraged(datSna);
	datWoo = getAveraged(datWoo);
	
	console.log(allData);
	console.log(datPia);
	console.log(datSna);
	console.log(datWoo);
	
	lab = [];
	for(var i = 0; i < accuracy; i++) {
		var freqIncr = (maxFrequency-startFrequency)/(accuracy-1);
		lab.push(startFrequency+freqIncr*i);
	}
	console.log(lab);
	
    scaleY = $(window).height() / 1080;
    scaleX = $(window).width() / 1920;
    scale = Math.min(scaleX, scaleY);
    console.log("scale = "+scale);
    
    //var Chart = require('chart.js'); 
	Chart.defaults.global.elements.line.fill = false;
	Chart.defaults.global.defaultFontSize = scale*25;
    var c = new Chart(document.getElementById("myChart"), {
        type: 'line',
        data: {
            labels: lab,
            datasets: [{
                label: 'Piano',
                data: datPia,
				borderColor: "#8789ff",
                borderWidth: scale*4
            }, {
                label: 'Snare',
                data: datSna,
				borderColor: "#c1f9ff",
                borderWidth: scale*4
            }, {
                label: 'Woodblock',
                data: datWoo,
				borderColor: "#ffc1c1",
                borderWidth: scale*4
            }, {
                label: 'Average',
                data: allData,
				borderColor: "#000000",
                borderWidth: scale*6
            }
			]
        },
        options: {
            scales: {
                yAxes: [{
					scaleLabel: {
						display: true,
						labelString: 'Distinguishability'
					  },
                    ticks: {
                        beginAtZero:true,
						min: 0, // minimum value
						max: 4, // maximum value
						stepSize: 1,
						callback: function(value, index, values) {
							return likertList[Math.floor(value)];
						},
						fontSize: scale*15
                    },
                }],
				xAxes: [{
					scaleLabel: {
						display: true,
						labelString: 'Playback frequency'
					  },
                    ticks: {               
						callback: function(value, index, values) {
							return value.toFixed(1)+"Hz";
						},
						fontSize: scale*15
                    },
                }]
            },
			title: {
				display: true,
				text: 'Distinguishability of individual notes with different playback frequencies',
				fontSize: scale*25
			},
			legend: {
				fontSize: scale*15
			}
        }
    });
	console.log(c);
	document.getElementById("myChart").style.backgroundColor = 'rgba(255,255,255,255)';
}