//<script>

var settingsIsOpen = false;
var playlistIsOpen = false;
var giSettingsPos = 0;
var gsSettingsNames = new Array("SRSSettings", "AudioSettings", "VideoSettings");

var closedWidth = 422;
var closedHeight = 378;

var rightMove = 179;
var bottomMove = 102;

var movingDrawer = 0;
var g_SetPlayPauseFocus=false;

function InitCompact()
{
    playlist.setColumnResizeMode( 0, "Stretches" );
    playlist.setColumnResizeMode( 1, "AutoSizeData" );
    InitCompactControls();
    OnStateChange();
    InitEQ();
    InitSRS();
    OnModeChange();

    // load saved settings
    var s = "";    

    s = theme.loadPreference("SettingsTab");
    for (var i = 0; i < gsSettingsNames.length; i++)
    {
        if (s == gsSettingsNames[i])
        {
            giSettingsPos = i;
        }
    }
    ChangeSettingsTab(0); // Init settings tab
    
    s = theme.loadPreference("SettingsDrawer");
    if (s == "True")
        ToggleSettings();

    s = theme.loadPreference("PlaylistDrawer");
    if (s == "True")
        TogglePlaylist();

    SetAlignment( true );
    DoSnapToSize();
}

function InitCompactControls()
{
    g_bufferingProgress = player.network.bufferingProgress;
    OnOpenStateChangeTransport(player.openState);
    OnPlayStateChangeTransport(player.playState);
    OnStatusChangeTransport(player.status);
}

function CloseCompact()
{
    theme.savePreference("SettingsTab", gsSettingsNames[giSettingsPos]);
    theme.savePreference("SettingsDrawer", settingsIsOpen);
    theme.savePreference("PlaylistDrawer", playlistIsOpen);
}

var g_lastVideoHeight=-1;
var g_lastVideoWidth=-1;
var g_lastUserAudioHeight=-1;
var g_lastUserAudioWidth=-1;
var g_fNeedSnap = false;

function DoSnapToSize()
{
    if (movingDrawer != 0)
    {
        g_fNeedSnap = true;
    }
    else if (player.openState==osMediaOpen)
    {
        g_fNeedSnap = false;

        var h = player.currentMedia.imageSourceHeight; 
        var w = player.currentMedia.imageSourceWidth;
        // do this only if it is different than the previous file's height/width
        if ( (h!=g_lastVideoHeight) || (w!=g_lastVideoWidth) )
        {
            if ( (h!=0) && (w!=0) )
            {
                if (g_lastVideoHeight==0)
                {
                    g_lastUserAudioHeight=view.height;
                    g_lastUserAudioWidth=view.width;
                }             
                SnapToVideoSize(h,w);
            }
            else
            {
                if ( (g_lastVideoHeight>0) && (g_lastUserAudioHeight>0))
                {
                    settingsDrawer.verticalAlignment    = "bottom";
                    playlistDrawer.horizontalAlignment  = "right";

                    view.height = g_lastUserAudioHeight;
                    view.width  = g_lastUserAudioWidth;

                    settingsDrawer.verticalAlignment    = "top";
                    playlistDrawer.horizontalAlignment  = "left";
                }
            }
            g_lastVideoHeight = h;
            g_lastVideoWidth = w;
        }
    }
}

function SnapToVideoSize(isHeight,isWidth)
{
    settingsDrawer.verticalAlignment    = "bottom";
    playlistDrawer.horizontalAlignment  = "right";

    if (null!=isHeight)
    {    
        isHeight = isHeight*(mediacenter.videoZoom/100);
        var nonVideoHeight = view.height - video1.height;
        var newWindowHeight = isHeight+nonVideoHeight;
        view.height = newWindowHeight;
    }
    
    if (null!=isWidth)
    {
        isWidth = isWidth*(mediacenter.videoZoom/100);
        var nonVideoWidth = view.width - video1.width;
        var newWindowWidth = isWidth+nonVideoWidth;
        view.width = newWindowWidth;
    }

    settingsDrawer.verticalAlignment    = "top";
    playlistDrawer.horizontalAlignment  = "left";
}


function DoSize()
{
    if (movingDrawer == 0)
    {
        settingsDrawer.verticalAlignment    = "bottom";
        playlistDrawer.horizontalAlignment  = "right";

        movingDrawer++;
        view.size( 'bottomright' );
        movingDrawer--;

        settingsDrawer.verticalAlignment    = "top";
        playlistDrawer.horizontalAlignment  = "left";

        if (g_fNeedSnap)
        {
            DoSnapToSize();
        }
    }
}

function SetAlignment( value )
{
    if (!value)
    {
        playerView.horizontalAlignment      = "left";
        playerView.verticalAlignment        = "top";
        playlistDrawer.verticalAlignment    = "top";
    }
    else
    {
        playerView.horizontalAlignment      = "stretch";
        playerView.verticalAlignment        = "stretch";
        playlistDrawer.verticalAlignment    = "stretch";
    }
}

function ToggleSettings()
{
    if(settingsIsOpen==true)
    {
        settingsDrawer.moveTo(settingsDrawer.left, view.height - bottomMove - settingsDrawer.height,1000);
        settingsIsOpen=false;
    }
    else
    {
        SetAlignment( false );
        view.maxHeight = event.screenHeight;
        view.height += bottomMove;
        view.minHeight = closedHeight + bottomMove;
        SetAlignment( true );
        settingsTab.visible = true;
        settingsDrawer.moveTo(settingsDrawer.left,view.height - settingsDrawer.height,1000);
        settingsIsOpen=true;
        ChangeSettingsTab(0);
    }
    movingDrawer++;
 }

function TogglePlaylist()
{
    if(playlistIsOpen==true)
    {
        playlist.visible=false;
        playlistDrawer.moveTo(view.width - rightMove - playlistDrawer.width, playlistDrawer.top,1000);
        playlistIsOpen=false;
    }
    else
    {
        SetAlignment( false );
        view.maxWidth = event.screenWidth;
        view.width += rightMove;
        view.minWidth = closedWidth + rightMove;
        SetAlignment( true );
        playlistDrawer.moveTo(view.width - playlistDrawer.width, playlistDrawer.top,1000);
        playlistIsOpen=true;
    }
    movingDrawer++;
}

function OnModeChange()
{
    shuffle.down = player.settings.GetMode("shuffle");
}

function EndDrawerMove()
{
    movingDrawer--;

    if (g_fNeedSnap)
    {
        DoSnapToSize();
    }
}

function Playlist_OnEndMove()
{
    if(playlistIsOpen==true)
    {
        playlist.visible=true;
    }
    else
    {
        playlist.visible=false;
        SetAlignment( false );
        view.minWidth = closedWidth;
        view.width -= rightMove;
        view.maxWidth = event.screenWidth - rightMove;
        SetAlignment( true );
    }
    EndDrawerMove();
}

function Settings_OnEndMove()
{
    if (!settingsIsOpen)
    {
        SRSSettings.visible = false;
        AudioSettings.visible = false;
        VideoSettings.visible = false;
        settingsTab.visible   = false;
        SetAlignment( false );
        view.minHeight = closedHeight;
        view.height -= bottomMove;
        view.maxHeight = event.screenHeight - bottomMove;
        SetAlignment( true );
    }
    EndDrawerMove();
}

function ChangeSettingsTab(iWhichDir)
{
    var iPos = giSettingsPos;
    iPos = iPos + iWhichDir;

    if (iPos < 0) 
    {
        iPos = gsSettingsNames.length -1;
    } 
    else if (iPos >= gsSettingsNames.length)
    {
        iPos = 0;
    }
    
    if (settingsIsOpen)
    {
        switch (iPos)
        {
            case 0:
                AudioSettings.visible = false;
                VideoSettings.visible = false;
                SRSSettings.visible = true;
                tabTitle.value = "res://wmploc.dll/RT_STRING/#1827";
                break;

            case 1:
                SRSSettings.visible = false;
                VideoSettings.visible = false;
                AudioSettings.visible = true;
                tabTitle.value = "res://wmploc.dll/RT_STRING/#1848";
                break;

            case 2:
                SRSSettings.visible = false;
                AudioSettings.visible = false;
                VideoSettings.visible = true;
                tabTitle.value = "res://wmploc.dll/RT_STRING/#1849";
                break;
        }
    }

    giSettingsPos = iPos;    
}

function OnShowTitles()
{        
    UpdateTitles();
    SizeViz();
}

function SizeViz()
{
    myeffect.top = mediacenter.showtitles ? 50 : 1;
    var height = svScreen.height - myeffect.top - 24;
    if (svBanner.visible)
    {
        myeffect.height -= svBanner.height;
    }
    myeffect.height = height;
}

function UpdateTitles()
{
    if (!player.currentMedia) return;
    if( (mediacenter.showtitles == true) && player.currentMedia.ImageSourceWidth == 0)
    {
        playlistArtist.visible = true;
        trackname.visible = true;
        playlistArtist.value = player.currentmedia.getiteminfo("artist");
        trackname.value = player.currentmedia.name;
        SizeViz();
    }
    else if(mediacenter.showtitles == false || player.currentMedia.ImageSourceWidth > 0)
    {
        playlistArtist.visible = false;
        trackname.visible = false;
        SizeViz();
    }
}

function OnDownloadingMediaViz(bstrItemName)
{
    if (bstrItemName=="WMPImage_AdBanner")
    {
        AdBanner.image=bstrItemName;
        var strToolTip = player.currentmedia.getItemInfo("BannerAbstract");
        AdBanner.upToolTip = strToolTip;
    }
}

function OnBannerClick()
{
    var strTargetURL = player.currentmedia.getItemInfo("BannerInfoURL");
    if ( strTargetURL != "")
    {
        player.launchURL(strTargetURL);   
    }
}

function OnBannerMouseOver()
{
    if ( player.currentmedia.getItemInfo("BannerInfoURL") != "")
    {
        AdBanner.cursor = "hand";
    }
    else
    {
        AdBanner.cursor = "system";
    }
}

function VizPrev()
{
    if (event.shiftKey)
    {
        myeffect.previousEffect();
    }
    else
    {
        myeffect.previous();
    }
    SynchVis();
}

function VizNext()
{
    if (event.shiftKey)
    {
        myeffect.nextEffect();
    }
    else
    {
        myeffect.next();
    }
    SynchVis();
}

function OnStateChange()
{
    var osState = player.openState;

    if (osPlaylistOpenNoMedia == osState || osMediaChanging == osState || osPlaylistChanged == osState)
    {
        ShowVisualizations(false);
        video1.visible=false;
    }
    else if (osMediaOpen == player.OpenState)
    {
        if (player.currentmedia.getItemInfo("BannerURL") != "")
        {
            ShowBanner(true);
        }
        else
        {
            ShowBanner(false);
        }
    
        if (player.currentMedia.ImageSourceWidth > 0)
        {
            ShowVisualizations(false);
            video1.visible=true;
        } 
        else 
        { 
            ShowVisualizations(true);
            video1.visible=false;
        }
    }
    else if (osPlaylistChanging == player.OpenState)
    {
        ShowVisualizations(false);
        video1.visible=false;
        ShowBanner(false);
    }
    UpdateTitles();
}

function ShowVisualizations(state)
{
    if(state)
    {
        myeffect.visible=mediacenter.showEffects;
        video1.visible=false;
    }
    else
    {
        myeffect.visible=false;
    }
}

function myOnVideoStart()
{
    video1.visible=true;
    ShowVisualizations(false);
}

function myOnVideoEnd()
{
    video1.visible=false;
    ShowVisualizations(true);
}

function ShowBanner(state)
{
    svBanner.visible = state;
}

function SynchVis()
{
    var nPreset = myeffect.currentPreset;
    mediacenter.effectType = myeffect.currentEffectType;
    mediacenter.effectPreset = nPreset;
}

function GetVizTitle()
{
    var CombinedTitle = myeffect.currentEffectTitle + ": " + myeffect.currentPresetTitle;
    if (": " == CombinedTitle) CombinedTitle = "";
    return CombinedTitle;
}

var g_kAlphaToTime = 330;
var g_kAlphaDisabled = 0x80;

function InitEQ()
{
    UpdateEQOnOff();
}

function UpdateEQOnOff()
{
    if (eq.bypass == true)
    {
        nextPreset.enabled=false;
        eqOnOffLabel.value="res://wmploc.dll/RT_STRING/#1851";
    }
    else
    {
        nextPreset.enabled=true;
        eqOnOffLabel.value="res://wmploc.dll/RT_STRING/#1846";
    }
}

function InitSRS()
{
    UpdateSRSOnOff();
}

function UpdateSRSOnOff()
{

    if (eq.enhancedAudio == true)
    {
        nextSpeakerSize.enabled=true;
        srsOnOffLabel.value="res://wmploc.dll/RT_STRING/#1846";
    }
    else
    {
        nextSpeakerSize.enabled=false;
        srsOnOffLabel.value="res://wmploc.dll/RT_STRING/#1851";
    }

}

function NextSpeakerSize()
{
    var index = eq.speakerSize;

    index++;
    if (index > 2)
        index = 0;

    eq.speakerSize = index;
}

function ResetVideoSettings()
{
    vs.brightness=0;
    vs.contrast=0;
    vs.hue=0;
    vs.saturation=0;
}

function InitVideoSettingsView()
{
    if ( PlayingDVD() )
    {
        videoResetButton.enabled = false;
        videoResetButton.alphaBlendTo(0x80,330); 
    }
    else
    {
        videoResetButton.enabled = true;
        videoResetButton.alphaBlendTo(0xff,330); 
    }
}
         
function VideoSettings_OnOpenStateChangeEvent(NewState)
{
    switch (NewState)
    {
        case osPlaylistOpenNoMedia:
        case osMediaOpen:
            InitVideoSettingsView();
            break;
    }
}

function DoShiftSensitiveEQ(level,newVal)
{
    if (eq.enableSplineTension && event.shiftKey) 
    {
        eq.enableSplineTension=false; 
        eq.gainLevels(level) = newVal; 
        eq.enableSplineTension=true;
    }
}

function PlayingDVD()
{
    return ( (player.currentPlaylist.count>0) && (player.currentPlaylist.item(0).sourceURL.indexOf("wmpdvd:")==0));
}