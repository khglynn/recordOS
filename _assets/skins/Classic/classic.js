/*
    ©2000 Microsoft Corporation. All rights reserved.
*/


var g_fExpectingSizeChange  = false;
var g_fUserHasSized         = false;


function OnLoad()
{
    OnOpenStateChange();
    OnPlayStateChange();
}


function OnURLChange()
{
    if (player.URL == "")
        view.title = xWMP.toolTip;
    else
        view.title = player.URL;
}


function SizeChange()
{
    if (!g_fExpectingSizeChange)
    {
        g_fUserHasSized = true;
    }
}

function StartPlaying()
{
    if (player.currentMedia.ImageSourceHeight == 0)
    {
        view.height = 359 - 183;
    }
    else
    {
        wmlogo.visible = false;

        // resize to the video size
        // we'll do this if we're stretch to fit and the user hasn't sized us yet,
        // or if we're not stretch to fit (zoom level is set)

        if ((!g_fUserHasSized && mediacenter.videoStretchToFit) || !mediacenter.videoStretchToFit)
        {
            var zoom = mediacenter.videoStretchToFit ? 100 : mediacenter.videoZoom;

            var x = (player.currentMedia.imageSourceWidth * (zoom / 100.0));
            if (x < 285) 
            {
                x = 285;
            }
            var y = (player.currentMedia.imageSourceHeight * (zoom / 100.0));

            g_fExpectingSizeChange = true;
            view.width = x;
            view.height = 359 - 183 + y;
            g_fExpectingSizeChange = false;
        }
    }
    stereo.backgroundImage = 'icon_stereo.bmp';
    UpdateMetadata();
}


function StopPlaying()
{
    stereo.backgroundImage  = '';
    wmlogo.visible = true;
}


function OnPlayStateChange()
{
    if(player.PlayState == psUndefined ||
        player.PlayState == psReady)
    {
        StopPlaying();
    }
    else if (player.PlayState == psPlaying)
    {
        StartPlaying();
    }
    info.value =
        info.tooltip = player.status;
}

function OnOpenStateChange()
{
    if(player.OpenState == osMediaOpen)
    {
        UpdateMetadata();
    }
}

function UpdateMetadata()
{
	clip.value = player.currentmedia.getiteminfo("title");
	if(clip.value == "")
		clip.value = player.currentmedia.name;

	show.value = player.currentplaylist.getiteminfo("title");
	if(show.value == "")
		show.value = player.currentmedia.getiteminfo("Album");

	author.value = player.currentmedia.getiteminfo("author");

	copyright.value = player.currentmedia.getiteminfo("copyright");
}