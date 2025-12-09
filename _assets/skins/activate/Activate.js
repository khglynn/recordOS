// constants
var NORMAL_PANE     = 0;
var EQUALIZER_PANE  = 1;
var VIDEO_PANE      = 2;
var MINI_PANE	    = 3;

var speed = 500;
var currentPane = 0;
var vidIsRunning = false;
var playlistIsOpen = false;
var largeVideoIsOpen = false;

function OnTimerTick()
{
/*    var mm = ((seek.value < 600)   ? "0" : "")
        + Math.floor(seek.value / 60);
    var ss = ((seek.value%60) < 10 ? "0" : "")
        + Math.floor(seek.value % 60);
    metadataTime.value = mm + ":" + ss;
    metadataTime2.value = mm + ":" + ss;
*/
    var bw = player.network.bandWidth / 1000;
//    bw = bw.toString().slice(0,-2);
//    bw = Math.round(bw);
bw = bw.toString();
var intDecimal = bw.indexOf('.');
bw = bw.substring(0,intDecimal+2)

    metadataBandWidth2.value = bw;
}


function Init()
{
    plPlaylist.setColumnResizeMode(0, "Stretches");
    plPlaylist.setColumnResizeMode(1, "AutoSizeData");

    checkLocality();
//	metadataName.value = player.currentmedia.getiteminfo("name");	
	metadataName.value = player.currentmedia.name;	
	metadataArtist.value = player.currentmedia.getiteminfo("artist");
	metadataAlbum.value = player.currentmedia.getiteminfo("album");

    if(player.OpenState==osMediaOpen)
    {
        OnPlayStateChange();
    }
}

function OnOpenStateChange()
{
    if(player.OpenState == osMediaOpen)
    {
	Init();  
    }else{
	metadataName.value = player.currentmedia.name;	
	metadataArtist.value = player.currentmedia.getiteminfo("artist");
	metadataAlbum.value = player.currentmedia.getiteminfo("album");
    }
}

function OnPlayStateChange()
{
    vidIsRunning = (player.currentMedia.ImageSourceWidth>0);
    checkLocality();
    switch(player.PlayState)
    {
    case psStopped:
	break;
    case psPaused:
        break;
    case psPlaying:
	if(vidIsRunning){
		openDoor();
		bePokey();
		Startvideo();
	}else{
		if(vMini.visible == false){	
			openDoor();	//if audio is playing auto open doors, but not for mini
		}
	}
	break;
	}
}

function SetVisibility(newPane)
{
	 switch(newPane)
    {
    case NORMAL_PANE:
     	vNormal.visible = true;
	vControls.visible = true;
	vPlaylist.visible = true;
 		vEq.visible  = false;
 		vidVideo.visible = false;
 		vVideo.visible = false;
		vMini.visible = false;
        break;
    case EQUALIZER_PANE:
 		vEq.visible  = true;
 		vNormal.visible = false;
 		vidVideo.visible = false;
 		vVideo.visible = false;
		vMini.visible = false;
        break;
    case VIDEO_PANE:
 		vidVideo.visible = true;
 		vNormal.visible = false;
 		vEq.visible  = false;
 		vVideo.visible = true;
		vMini.visible = false;
        break;
    case MINI_PANE:
 		vidVideo.visible = false;
 		vNormal.visible = false;
 		vEq.visible  = false;
 		vVideo.visible = false;
		vControls.visible = false;	//only hide this for MINI
		vPlaylist.visible = false;	//only hide this for MINI
		vMini.visible = true;

        break;
    }
    currentPane = newPane;
}

function openPl() {
    if(playlistIsOpen){
		plPlaylist.visible = false;
		vPlaylist.moveto(95,160,speed);
    } else {
		vPlaylist.moveto(95,323,speed);
    }
    playlistIsOpen = !playlistIsOpen
}

function playlistOnEndMove(){
	if(playlistIsOpen){
		plPlaylist.visible = true;
	}
}


/* ------------------------EQUALIZER-------------------------*/ 
function resetEqualizerSettings() {
	eq1.value = 0;
	eq2.value = 0;
	eq3.value = 0;
	eq4.value = 0;
	eq5.value = 0;
	eq6.value = 0;
	eq7.value = 0;
	eq8.value = 0;
	eq9.value = 0;
	eq10.value = 0;
	player.settings.balance=0;
	bHighlight1.visible = false;
	bHighlight2.visible = false;
	bHighlight3.visible = false;
}

function rockEqualizerSettings() {
	eq1.value = 1;
	eq2.value = 4;
	eq3.value = 1;
	eq4.value = 3;
	eq5.value = 6;
	eq6.value = 3;
	eq7.value = 6;
	eq8.value = 7;
	eq9.value = 8;
	eq10.value = 9;
	bHighlight1.visible = true;
	bHighlight2.visible = false;
	bHighlight3.visible = false;
}

function jazzEqualizerSettings() {
	eq1.value = -8;
	eq2.value = -4;
	eq3.value = 0;
	eq4.value = 2;
	eq5.value = 3;
	eq6.value = 6;
	eq7.value = 2;
	eq8.value = 3;
	eq9.value = 5;
	eq10.value = 7;
	bHighlight1.visible = false;
	bHighlight2.visible = true;
	bHighlight3.visible = false;
}

function danceEqualizerSettings() {
	eq1.value = 2;
	eq2.value = 5;
	eq3.value = 8;
	eq4.value = 5;
	eq5.value = 2;
	eq6.value = 0;
	eq7.value = 4;
	eq8.value = 6;
	eq9.value = 4;
	eq10.value = 0;
	bHighlight1.visible = false;
	bHighlight2.visible = false;
	bHighlight3.visible = true;
}

function clearHighlight(){
	bHighlight1.visible = false;
	bHighlight2.visible = false;
	bHighlight3.visible = false;
}

/* ------------------------OPENING SCREEN-------------------------*/
function openDoor(){
	bOpen.visible = false;
	bLeftDoor.moveto(-200,0,speed);
	bRightDoor.moveto(450,0,speed);
}

function doorOnEndMove(){
	vOpen.visible=false;
	vControls.visible = true;
	vNormal.visible = true;
}


/* ------------------------VIDEO STUFF-------------------------*/
function resetVideoSettings() {
	brightness.value=0;
	hue.value=0;
	contrast.value=0;
	saturation.value=0;
}

function StartVideo() {
    vidIsRunning = true;
    SetVisibility(VIDEO_PANE);	
}

function EndVideo() {
    vidIsRunning = false;
    if(largeVideoIsOpen) {
        vidLargeVideo.visible = false;
	vLargeVideo.visible = false;
    }
}

function showLargeVideo() {
	if(largeVideoIsOpen){
		vidLargeVideo.visible = false;
		vLargeVideo.visible = false;
		vidLargeVideo.enabled = false;
	}else{
		vLargeVideo.visible = true;
		vidLargeVideo.visible = true;		
		vidLargeVideo.enabled = true;
	}
	largeVideoIsOpen = !largeVideoIsOpen;
}


/* ------------------------MEDIA SOURCE-------------------------*/
function checkLocality() {
	var strSourceURL = player.currentMedia.sourceURL;
	
	if (strSourceURL.search(/cd:/i) != -1) {
		bLocal.visible = false;
		bCD.visible = true;
		bNet.visible = false;
	} else if (strSourceURL.search(/\\/i) != -1) {
		bLocal.visible = true;
		bCD.visible = false;
		bNet.visible = false;
	} else {
		bLocal.visible = false;
		bCD.visible = false;
		bNet.visible = true;
	}	
}

/* ------------------------AD ROTATION-------------------------*/
currentAdNumber = 0;
arrAds = new Array("logo_animation.gif", "showcase_24.bmp", "glance_24.bmp");
arrAdToolTip = new Array("Activate web site" , "showcase", "at a glance");
arrAdURL = new Array("http://www.activate.net/Default_Flash.asp" ,"http://www.activate.net/WeekClip_Frames.asp?HomePage=Default_Flash.asp" , "http://www.activate.net/Default_Flash.asp");


function nextAd() {
	if (currentAdNumber == (arrAds.length-1)) {
		currentAdNumber = 0;
	} else {
		currentAdNumber ++;
	}
	bAnimation.image = arrAds[currentAdNumber];
	bAnimation.upToolTip = arrAdToolTip[currentAdNumber];
	bAnimation.onClick = arrAdURL[currentAdNumber];
	
}

function previousAd() {
	if (currentAdNumber == 0) {
		currentAdNumber = (arrAds.length-1);
	} else {
		currentAdNumber --;
	}
	
	bAnimation.image = arrAds[currentAdNumber];
	bAnimation.upToolTip = arrAdToolTip[currentAdNumber];
	bAnimation.onClick = arrAdURL[currentAdNumber];
}

function launchURL(){
	player.launchURL(arrAdURL[currentAdNumber]);
}


/* ------------------------DELAY FUNCTION-------------------------*/
function bePokey() {
	var i=0;
	
	i = 69566.9807 / 3456.899080;
}