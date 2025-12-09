/*
Microsoft Windows Media Player
Copyright (C) Microsoft Corporation, 2002.  All Rights Reserved.
File: netgen.js
Description: Revert skin script file
*/
var g_kVolumeTimeout = 3000;
var g_kTimerFrequency = 1000;
var g_currentVolumeStatusVal = 0;
var g_SetPlayPauseFocus = false;

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// OnTimer
//

function OnTimer()
{
    if(VolumeSlider.visible)  
    {
        CheckVolumeVisibility();
    }
    else
    {
        view.timerInterval = 0;
    }
}

function CheckVolumeVisibility()
{
    g_currentVolumeStatusVal = g_currentVolumeStatusVal + g_kTimerFrequency;
    if(g_currentVolumeStatusVal > g_kVolumeTimeout)
    {
        SetVolumeVisible(false);
    }
}

function SetVolumeVisible(bShow)
{
    if (bShow)
    {
        VolumeSlider.visible=true;
        view.focusObjectID="VolumeSliderControl";
        g_currentVolumeStatusVal = 0;
        view.timerInterval = 0;
        view.timerInterval = g_kTimerFrequency;
    }
    else
    {
        g_currentVolumeStatusVal = 0;
        view.timerInterval = 0;
        if (view.focusObjectID=="VolumeSliderControl")
        {
            view.focusObjectID="ShowVolumeButton";
        }
        VolumeSlider.visible=false;   
    }
}

function DoShiftSensitiveEQ(event,level,newVal)
{
    if (eq.enableSplineTension && event.shiftKey) 
    {
        eq.enableSplineTension=false; 
        eq.gainLevels(level) = newVal; 
        eq.enableSplineTension=true;
    }
}

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
//
// vwPlayer
//
// 
//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

var vwPlayer_fVizOpened = false;
var vwPlayer_fVideo = false;
var g_SetPlayPauseFocus = false;

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// EQSelectMenu
//
function EQSelectMenu()
{
    var index = 0;
    var max = eq.presetCount;

    mnuEQSelect.deleteAll();

    for (index=0; index<max; index++)
    {
        mnuEQSelect.AppendItem( eq.presetTitle(index) );
    }
    
    mnuEQSelect.selectedItem = eq.currentPreset;
    mnuEQSelect.show();
}
//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// vwPlayer_UpdateShuffleRepeat()
//
function vwPlayer_UpdateShuffleRepeat()
{
    if (player.settings.getMode('shuffle')) {
        cmdShuffle.down = true;
    }
    else {
        cmdShuffle.down = false;
    }

    if (player.settings.getMode('loop')) {
        cmdRepeat.down = true;
    }
    else {
        cmdRepeat.down = false;
    }
}



//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// vwPlayer_SelectVideoOrVis
//
function vwPlayer_SelectVideoOrVis()
{
    var fVideo = false;

    if (player.openState == 13)
    {
        if (!vwPlayer_fVizOpened)
        {
            if ((player.currentMedia.imageSourceWidth > 0) && (player.currentMedia.imageSourceHeight > 0))
            {
                fVideo = true;
            }
        }
    }
    
    ctrlVis.visible = !fVideo;
    ctrlVideo.visible = fVideo;

/*
    if( vwPlayer_fVideo != fVideo )
    {
        vwPlayer_fVideo = fVideo;
        
        if( fVideo )
        {
            ctrlVideo.visible = true;
            ctrlVideo.left = 184;
            ctrlVis.MoveTo( -92, 0, 500 );
            ctrlVideo.MoveTo( 0, 0, 500 );
        }
        else
        {
            ctrlVis.visible = true;
            ctrlVis.left = 184;
            ctrlVideo.Moveto( -92, 0, 500 );
            ctrlVis.MoveTo( 0, 0, 500 );
        }    
    }
*/
}


//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// vwPlayer_UpdateMetadata
//
function vwPlayer_UpdateMetadata()
{
    var sz1;
    var sz2;
    var sz3;

    if (player.openState == 13)
    {
        //
        // Figure out the text for the top line:
        //
        sz1 = player.currentMedia.getItemInfo( 'Author' );
        if( sz1 == "" )
        {
            sz1 = player.currentMedia.getItemInfo( 'Copyright' );
        }

        //
        // Figure out the text for the middle line:
        //
        sz2 = player.currentMedia.name;
        if( sz2 == "" )
        {
            sz2 = player.currentMedia.getItemInfo( 'Title' );
        }
        if( sz2 == "" )
        {
            sz2 = player.currentMedia.sourceURL;
        }

        //
        // Figure out the text for the last line:
        //
        sz3 = player.currentMedia.getItemInfo('Album');
        if (sz3 == "")
        {
            sz3 = player.currentMedia.getItemInfo('Band');
        }
        if (sz3 == "")
        {
            var bitrateString = theme.loadString("res://wmploc/RT_STRING/#2066");
            var kbps = Math.floor(player.network.bitrate / 1000);
            if (kbps==0)
            {
                sz3 = "";
            }
            else
            {
                sz3 = sz3.sprintf(bitrateString, kbps.toFixed(0));
            }
        }
    }

    if( sz1 != null )
    {
        txt1.value = sz1;
    }
    
    if( sz2 != null )
    {    
        txt2.value = sz2;
    }
    
    if( sz3 != null )
    {
        txt3.value = sz3;
    }
}


//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// vwPlayer_OnLoad
//
function vwPlayer_OnLoad()
{
    vwPlayer_UpdateMetadata();
    vwPlayer_SelectVideoOrVis();

    cmdMute.down = player.settings.mute;
    cmdRepeat.down = player.settings.getMode("loop");
    cmdShuffle.down = player.settings.getMode("shuffle");

    if( theme.loadPreference( "vwEQ" ) == "true" )
    {
        theme.openViewRelative( 'vwEQ', 0, 130 );
    }
    if( theme.loadPreference( "vwPL" ) == "true" )
    {
        theme.openViewRelative( "vwPL", 256, 0 );
    }
}


//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// UpdateEQMode
//
function UpdateEQMode()
{   
    eq1.enabled = !eq.bypass;
    eq2.enabled = !eq.bypass;
    eq3.enabled = !eq.bypass;
    eq4.enabled = !eq.bypass;
    eq5.enabled = !eq.bypass;
    eq6.enabled = !eq.bypass;
    eq7.enabled = !eq.bypass;
    eq8.enabled = !eq.bypass;
    eq9.enabled = !eq.bypass;
    eq10.enabled = !eq.bypass;
    cmdEQ.down = !eq.bypass;
}

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// vwPlayer_OnOpenStateChange
//
function vwPlayer_OnOpenStateChange(NewState)
{
    vwPlayer_UpdateMetadata();
    vwPlayer_SelectVideoOrVis();

    ctrlAlbumArt.backgroundImage = "WMPImage_AlbumArtSmall"; 
    vwPlayer.timerInterval=1000;
}


//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// GetImageString
//
function GetImageString()
{
    if( !player.currentMedia )
    {   
        return "res://wmploc.dll/RT_BITMAP/#521";
    }

    return "WMPImage_AlbumArtSmall";
}


//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// ToggleEQ
//
function ToggleEQ()
{
    var EQOn;
    EQOn = theme.loadPreference('vwEQ');
    if (EQOn!='true') {
        theme.savePreference( 'vwEQ', 'true' ); theme.openViewRelative('vwEQ',0,130);
        }
    else {
        theme.savePreference( 'vwEQ', 'false' ); theme.closeView('vwEQ');
        }
}

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//
// TogglePlaylist
//
function TogglePlaylist()
{
    var PLOn;
    PLOn = theme.loadPreference('vwPL');
    if (PLOn!='true') {
        theme.savePreference( 'vwPL', 'true' ); theme.openViewRelative('vwPL',256,0);
        }
    else {
        theme.savePreference( 'vwPL', 'false' ); theme.closeView('vwPL');
        }
}
