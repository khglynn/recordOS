// Windows Media Player  - Copyright 2001 Microsoft Corporation.

function OnStatusChangeTransport()
{
    metadata.value=player.status;
}

function OnFFWD()
{
    if (player.PlayState == psScanForward)
    {
        player.controls.play();
    }
    else
    {
        player.controls.FastForward();
    }
}
        
function OnREW()
{
    if (player.PlayState == psScanReverse)
    {
        player.controls.play();
    }
    else
    {
        player.controls.FastReverse();
    }
}

function volumeOnChange()
{
    player.settings.mute=false;
}

function muteOnClick()
{
    player.settings.mute = (player.settings.mute == true) ? false : true;
}

function OnPlayStateChangeTransport(NewState)
{
    g_psPlayState=NewState;
   
    switch (NewState)
    {
    case psUndefined:
            seek.foregroundProgress = 0;
            rew.down=false;
            ffwd.down=false;
        break;

    case psTransitioning:
            rew.down=false;
            ffwd.down=false;
        break;            
        
    case psReady:
            seek.foregroundProgress = 0;
            rew.down=false;
            ffwd.down=false;
        break;

    case psStopped:
            ffwd.down=false;
            rew.down=false;
        break;
        
    case psPaused:
            ffwd.down=false;
            rew.down=false;
        break;
        
    case psPlaying:
            ffwd.down=false;
            rew.down=false;
        break;
        
    case psWaiting:
            rew.down=false;
            ffwd.down=false;
        break;
        
    case psScanForward:
            rew.down=false;
            ffwd.down=true;
        break;
        
    case psScanReverse:
            rew.down=true;
            ffwd.down=false;
        break;
        
    case psBuffering:
        break;
    }
}

function OnOpenStateChangeTransport(NewState)
{
    g_osOpenState=NewState;
    switch (NewState)
    {
    case osUndefined:
        tracktime.visible=false;
        g_fIsLiveBroadcast=false;
        break;
        
    case osPlaylistChanging:
        break;

    case osPlaylistLocating:
        break;

    case osPlaylistConnecting:
        break;

    case osPlaylistLoading:
        break;

    case osPlaylistOpening:
        break;

    case osPlaylistOpenNoMedia:
        break;

    case osPlaylistChanged:
        break;

    case osMediaChanging:
        break;

    case osMediaLocating:
        break;

    case osMediaConnecting:
        break;

    case osMediaLoading:
        break;

    case osMediaWaiting:
        g_fIsLiveBroadcast = (player.currentMedia.getItemInfo("Type") == "broadcast");
        seek.enabled = !g_fIsLiveBroadcast;
        break;

    case osMediaOpening:
        break;

    case osMediaOpen: 
        tracktime.visible=true;
        g_fIsLiveBroadcast = (player.currentmedia.getiteminfo("Type") == "broadcast");
        seek.enabled = !g_fIsLiveBroadcast;
        break;

    case osBeginLicenseAcquisition:
        break;

    case osEndLicenseAcquisition:
        break;

    case osBeginIndividualization:
        break;

    case osEndIndividualization:
        break;

    default:
        break;
    }    
}
